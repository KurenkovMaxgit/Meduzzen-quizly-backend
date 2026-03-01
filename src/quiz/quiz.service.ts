import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, DeleteResult, FindOneOptions, Repository } from 'typeorm';
import { Quiz } from '../common/entities/quiz.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizQuestionType, AnswerCorrectness, NotificationType } from '../utils/enums';
import { CreateQuestionDto } from './question/dto/question/create-question.dto';
import { UpdateQuestionDto } from './question/dto/question/update-question.dto';
import { PaginatedData } from '../utils/response.interface';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { FindAllQuizzesDto, FindQuizDto } from './dto/find-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ExcelJS from 'exceljs';
import { QuizQuestion } from '../common/entities/question.entity';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Readable } from 'stream';
import { Notification } from '../common/entities/notification.entity';

const ALLOWED_QUIZ_RELATIONS = ['questions', 'questions.answers'];

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizzesRepository: Repository<Quiz>,
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
    private dataSource: DataSource,
  ) {}

  async create(companyId: string, data: CreateQuizDto): Promise<Quiz> {
    this.validateQuestions(data.questions);
    const savedQuiz = await this.quizzesRepository.save({
      ...data,
      company: { id: companyId },
    });

    const populatedQuiz = await this.quizzesRepository.findOne({
      where: { id: savedQuiz.id },
      relations: ['company', 'questions', 'questions.answers'],
    });

    if (!populatedQuiz) {
      throw new InternalServerErrorException('Failed to retrieve the created quiz');
    }

    this.eventEmitter.emit('notification.broadcast_to_company', {
      companyId: populatedQuiz.company.id,
      type: NotificationType.QUIZ_CREATED,
      message: `A new quiz "${populatedQuiz.title}" is available!`,
      metadata: { quizId: populatedQuiz.id },
    });

    return populatedQuiz;
  }

  async findAll(companyId: string, query: FindAllQuizzesDto): Promise<PaginatedData<Quiz>> {
    const qb = this.quizzesRepository.createQueryBuilder('quiz');
    qb.andWhere('quiz.companyId = :companyId', { companyId });
    applyQueryFilters<FindQuizDto>(qb, query, {
      searchableFields: ['title', 'description'],
      allowedRelations: ALLOWED_QUIZ_RELATIONS,
    });
    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async findOneBy(where: FindQuizDto, options: FindOneOptions<Quiz> = {}): Promise<Quiz | null> {
    let { relations } = options;

    if (Array.isArray(relations)) {
      const safeRelations = relations.filter((relation) =>
        ALLOWED_QUIZ_RELATIONS.includes(relation),
      );

      if (relations.length !== safeRelations.length) {
        this.logger.warn(
          `Blocked attempt to access invalid relations. Requested: ${relations}, Allowed: ${safeRelations}`,
        );
      }

      relations = safeRelations;
    }

    return this.quizzesRepository.findOne({
      ...options,
      where,
      relations,
    });
  }

  async updateBy(where: FindQuizDto, data: UpdateQuizDto): Promise<Quiz> {
    const existingQuiz = await this.quizzesRepository.findOne({ where });

    if (!existingQuiz) {
      throw new NotFoundException(`Quiz with fields ${JSON.stringify({ ...where })} not found`);
    }

    this.validateQuestions(data.questions);

    const savedQuiz = await this.quizzesRepository.save({
      id: existingQuiz.id,
      ...data,
    });

    return this.quizzesRepository.findOne({
      where: { id: savedQuiz.id },
      relations: ALLOWED_QUIZ_RELATIONS,
    }) as Promise<Quiz>;
  }

  async deleteBy(where: FindQuizDto): Promise<DeleteResult> {
    const result = await this.quizzesRepository.delete({ ...where });

    if (result.affected === 0) {
      throw new NotFoundException(`Quiz with fields ${JSON.stringify({ ...where })} not found`);
    }

    return result;
  }

  async parseExcel(file: Buffer, companyId: string) {
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(file);
    await workbook.xlsx.read(stream);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new BadRequestException('Invalid file provided');
    }

    const quizzesMap = new Map<string, any>();
    const rows = worksheet.getRows(2, worksheet.rowCount) || [];

    for (const row of rows) {
      const rawValues = row.values as any[];

      const title = rawValues[1] as string;
      const description = rawValues[2];
      const completionFrequency = rawValues[3];
      const prompt = rawValues[4];
      const type = rawValues[5];
      const correctIds = rawValues[6];

      if (!title && !prompt) continue;

      if (!title || !prompt) {
        throw new BadRequestException(`Row ${row.number} is missing a required Title or Prompt.`);
      }

      const rawOptions = rawValues.slice(7);

      const options = rawOptions.filter(
        (val) => val !== undefined && val !== null && String(val).trim() !== '',
      );

      const correctIndexes = correctIds
        ? String(correctIds)
            .split(',')
            .map((v) => parseInt(v.trim(), 10))
            .filter((v) => !isNaN(v))
        : [];

      const answers = options.map((content, index) => ({
        content: String(content),
        correctness: correctIndexes.includes(index + 1)
          ? AnswerCorrectness.CORRECT
          : AnswerCorrectness.INCORRECT,
      }));

      if (!quizzesMap.has(title)) {
        quizzesMap.set(title, {
          title: String(title),
          description: description ? String(description) : '',
          completionFrequency: Number(completionFrequency) || 0,
          questions: [],
        });
      }

      quizzesMap.get(title).questions.push({
        prompt: String(prompt),
        type: type as QuizQuestionType,
        answers,
      });
    }

    const pendingNotifications: unknown[] = [];

    await this.dataSource.transaction(async (manager) => {
      for (const [title, rawQuizData] of quizzesMap.entries()) {
        const quizDto = plainToInstance(CreateQuizDto, rawQuizData);

        try {
          await validateOrReject(quizDto);
        } catch (_error) {
          throw new BadRequestException(
            `Validation failed for quiz "${title}". Please check your Excel formatting. Error: $`,
          );
        }

        this.validateQuestions(quizDto.questions);

        const existingQuiz = await manager.findOne(Quiz, {
          where: { title, company: { id: companyId } },
          relations: ['questions'],
        });

        if (existingQuiz) {
          const newQuestions = manager.create(QuizQuestion, quizDto.questions);
          existingQuiz.questions = [...existingQuiz.questions, ...newQuestions];
          await manager.save(existingQuiz);
        } else {
          const newQuiz = manager.create(Quiz, {
            ...quizDto,
            company: { id: companyId },
          });
          const savedQuiz = await manager.save(newQuiz);
          const populatedQuiz = await manager.findOne(Quiz, {
            where: { id: savedQuiz.id },
            relations: ['company', 'questions', 'questions.answers'],
          });

          if (!populatedQuiz) {
            throw new InternalServerErrorException('Failed to retrieve the created quiz');
          }

          pendingNotifications.push({
            companyId: populatedQuiz.company.id,
            type: NotificationType.QUIZ_CREATED,
            message: `A new quiz "${populatedQuiz.title}" is available!`,
            metadata: { quizId: populatedQuiz.id },
          });
        }
      }
    });

    for (const notification of pendingNotifications) {
      this.eventEmitter.emit('notification.broadcast_to_company', notification);
    }

    return { message: 'Import completed and validated successfully' };
  }

  private validateQuestions(questions: (CreateQuestionDto | UpdateQuestionDto)[]): void {
    questions.forEach((question, index) => {
      const correctAnswersCount = question.answers.filter(
        (answer) => answer.correctness === AnswerCorrectness.CORRECT,
      ).length;

      if (question.type === QuizQuestionType.SINGLE_CHOICE) {
        if (correctAnswersCount !== 1) {
          throw new BadRequestException(
            `Question ${index + 1} is single choice and must have exactly one correct answer. You provided ${correctAnswersCount}.`,
          );
        }
      }

      if (question.type === QuizQuestionType.MULTIPLE_CHOICE) {
        if (correctAnswersCount < 1) {
          throw new BadRequestException(
            `Question ${index + 1} is multiple choice and must have at least one correct answer. You provided 0.`,
          );
        }
      }
    });
  }
}
