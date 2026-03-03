import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';
import { QuizAttempt } from '../../common/entities/attempt.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizService } from '../quiz.service';
import { AnswerCorrectness } from '../../utils/enums';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { RedisService } from '../../redis/redis.service';
import { QuestionAttemptSnapshot } from '../../common/interfaces/question-attempt-snapshot.interface';
import { User } from '../../common/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { applyQueryFilters } from '../../utils/find-all-query-builder.util';
import { ReturnAttemptDto } from './dto/return-attempt.dto';
import { FindAllAttemptsDto, FindAttemptDto } from './dto/find-attempt.dto';
import { PaginatedData } from '../../utils/response.interface';

const ALLOWED_ATTEMPT_RELATIONS = ['user', 'quiz'];

@Injectable()
export class AttemptService {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptsRepository: Repository<QuizAttempt>,
    private readonly quizService: QuizService,
    @Inject(RedisService) private readonly redisService: RedisService,
    private readonly logger: Logger,
  ) {}

  async submitAttempt(user: User, companyId: string, quizId: string, data: CreateAttemptDto) {
    const quiz = await this.quizService.findOneBy(
      { id: quizId, company: { id: companyId } },
      { relations: ['questions', 'questions.answers'] },
    );

    if (!quiz || !quiz.questions?.length) {
      throw new BadRequestException('Invalid quiz or quiz has no questions.');
    }

    const { totalScore, snapshots } = this.gradeAnswers(quiz.questions, data.userAnswers);

    const savedAttempt = await this.attemptsRepository.save({
      user,
      company: { id: companyId },
      quiz: { id: quizId },
      quizTitleSnapshot: quiz.title,
      correctAnswersCount: totalScore,
      totalQuestionsCount: quiz.questions.length,
      userAnswers: snapshots,
    });

    await this.cacheAttemptToRedis(savedAttempt);

    return savedAttempt;
  }
  async findAll(
    companyId: string,
    query: FindAllAttemptsDto,
    userId?: string,
  ): Promise<PaginatedData<ReturnAttemptDto>> {
    const qb = this.attemptsRepository.createQueryBuilder('attempt');
    qb.where('attempt.companyId = :companyId', { companyId });

    if (userId) {
      qb.andWhere('attempt.userId = :userId', { userId });
    }

    applyQueryFilters<FindAttemptDto>(qb, query, {
      searchableFields: ['quizTitleSnapshot'],
      allowedRelations: ALLOWED_ATTEMPT_RELATIONS,
    });

    if (!query.order) {
      qb.orderBy('attempt.createdAt', 'DESC');
    }

    const [attempts, totalCount] = await qb.getManyAndCount();

    const items = plainToInstance(ReturnAttemptDto, attempts, {
      excludeExtraneousValues: true,
    });

    return { items, totalCount };
  }

  async findOneBy(
    where: FindAttemptDto,
    options: FindOneOptions<QuizAttempt> = {},
  ): Promise<QuizAttempt | null> {
    if (where.id) {
      const redisKey = `attempt:${where.id}`;
      const cachedData = await this.redisService.get(redisKey);

      if (cachedData) {
        const parsedAttempt = plainToInstance(QuizAttempt, JSON.parse(cachedData));

        if (where.company?.id && parsedAttempt.company?.id !== where.company.id) {
          return null;
        }

        if (where.user?.id && parsedAttempt.user.id !== where.user?.id) {
          return null;
        }

        return parsedAttempt;
      }
    }

    let { relations } = options;

    if (Array.isArray(relations)) {
      const safeRelations = relations.filter((relation) =>
        ALLOWED_ATTEMPT_RELATIONS.includes(relation),
      );

      if (relations.length !== safeRelations.length) {
        this.logger.warn(
          `Blocked attempt to access invalid relations. Requested: ${relations}, Allowed: ${safeRelations}`,
        );
      }

      relations = safeRelations;
    }

    const attempt = await this.attemptsRepository.findOne({
      ...options,
      where,
      relations,
    });

    if (attempt) {
      await this.cacheAttemptToRedis(attempt);
    }

    return attempt;
  }

  private gradeAnswers(questions: any[], userSubmittedAnswers: Record<string, string[]>) {
    let totalScore = 0;
    const snapshots: QuestionAttemptSnapshot[] = [];

    for (const question of questions) {
      const correctAnswers = question.answers.filter(
        (a: { correctness: AnswerCorrectness }) => a.correctness === AnswerCorrectness.CORRECT,
      );
      const correctAnswerIds = correctAnswers.map((a: { id: any }) => a.id);
      const userSubmittedIds = userSubmittedAnswers[question.id] || [];

      if (question.type === 'single_choice' && userSubmittedIds.length > 1) {
        throw new BadRequestException(`Question ${question.id} is single-choice.`);
      }

      let correctlySelected = 0;
      let incorrectlySelected = 0;

      for (const id of userSubmittedIds) {
        if (correctAnswerIds.includes(id)) {
          correctlySelected++;
        } else {
          incorrectlySelected++;
        }
      }

      const totalCorrectOptions = correctAnswerIds.length;
      let questionScore = 0;

      if (totalCorrectOptions > 0) {
        questionScore = Math.max(
          0,
          (correctlySelected - incorrectlySelected) / totalCorrectOptions,
        );
        totalScore += questionScore;
      }

      snapshots.push({
        questionId: question.id,
        prompt: question.prompt,
        userAnswers: question.answers
          .filter((answer: { id: string }) => userSubmittedIds.includes(answer.id))
          .map((answer: { id: any; content: any }) => ({
            answerId: answer.id,
            content: answer.content,
            isCorrect: correctAnswerIds.includes(answer.id),
          })),
        wasQuestionAnsweredCorrectly: questionScore,
      });
    }

    return { totalScore, snapshots };
  }

  private async cacheAttemptToRedis(attempt: QuizAttempt) {
    const redisKey = `attempt:${attempt.id}`;
    const TTL_SECONDS = 48 * 60 * 60;

    try {
      await this.redisService.set(redisKey, JSON.stringify(attempt), TTL_SECONDS);
    } catch (error) {
      this.logger.error(`Failed to save attempt to Redis: ${attempt.id}`, error);
    }
  }

  async exportAttemptsToCsv(companyId: string, quizId: string): Promise<Buffer> {
    const attempts = await this.attemptsRepository.find({
      where: {
        company: { id: companyId },
        quiz: { id: quizId },
      },
      relations: ['user', 'quiz'],
      order: { createdAt: 'DESC' },
    });

    if (!attempts.length) {
      throw new NotFoundException('No attempts found for this quiz to export.');
    }

    const headers = [
      'Attempt ID',
      'User ID',
      'First Name',
      'Last Name',
      'Email',
      'Quiz ID',
      'Quiz Title',
      'Score',
      'Total Questions',
      'Attempted At',
    ].join(',');

    const rows = attempts.map((attempt) => {
      const rowData = [
        attempt.id,
        attempt.user?.id || '',
        attempt.user?.firstName || '',
        attempt.user?.lastName || '',
        attempt.user?.email || '',
        attempt.quiz?.id || '',
        attempt.quizTitleSnapshot || '',
        Number(attempt.correctAnswersCount) || 0,
        attempt.totalQuestionsCount || 0,
        attempt.createdAt.toISOString(),
      ];

      return rowData.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csvString = [headers, ...rows].join('\n');

    return Buffer.from(csvString, 'utf-8');
  }
}
