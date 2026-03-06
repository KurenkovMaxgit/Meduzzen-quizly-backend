import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeleteResult, FindOneOptions, Repository } from 'typeorm';
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

const ALLOWED_QUIZ_RELATIONS = ['questions', 'questions.answers'];

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizzesRepository: Repository<Quiz>,
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
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
