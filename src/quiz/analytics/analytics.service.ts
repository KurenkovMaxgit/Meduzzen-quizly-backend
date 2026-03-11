import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttempt } from '../../common/entities/attempt.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptsRepository: Repository<QuizAttempt>,
  ) {}

  async getUserAverageQuestionPerformance(userId: string, companyId?: string): Promise<number> {
    const qb = this.attemptsRepository
      .createQueryBuilder('attempt')
      .select('SUM(attempt.correctAnswersCount)', 'totalCorrect')
      .addSelect('SUM(attempt.totalQuestionsCount)', 'totalQuestions')
      .where('attempt.userId = :userId', { userId });

    if (companyId) {
      qb.andWhere('attempt.companyId = :companyId', { companyId });
    }

    const result = await qb.getRawOne();

    const correct = Number(result.totalCorrect) || 0;
    const total = Number(result.totalQuestions) || 0;

    if (total === 0) return 0;

    return (correct / total) * 100;
  }

  async getUserAverageQuizPerformance(userId: string, companyId?: string): Promise<number> {
    const qb = this.attemptsRepository
      .createQueryBuilder('attempt')
      .select(
        'AVG((attempt.correctAnswersCount * 100.0) / NULLIF(attempt.totalQuestionsCount, 0))',
        'averageScore',
      )
      .where('attempt.userId = :userId', { userId });

    if (companyId) {
      qb.andWhere('attempt.companyId = :companyId', { companyId });
    }

    const result = await qb.getRawOne();
    return parseFloat(result?.averageScore as string) || 0;
  }

  async getUserScoresWithTimeDynamics(userId: string, companyId?: string) {
    const qb = this.attemptsRepository
      .createQueryBuilder('attempt')
      .select('attempt.quizId', 'quizId')
      .addSelect('attempt.quizTitleSnapshot', 'quizTitle')
      .addSelect('DATE(attempt.createdAt)', 'date')
      .addSelect(
        'AVG((attempt.correctAnswersCount * 100.0) / NULLIF(attempt.totalQuestionsCount, 0))',
        'averageScore',
      )
      .where('attempt.userId = :userId', { userId })
      .groupBy('attempt.quizId')
      .addGroupBy('attempt.quizTitleSnapshot')
      .addGroupBy('DATE(attempt.createdAt)')
      .orderBy('DATE(attempt.createdAt)', 'ASC');

    if (companyId) {
      qb.andWhere('attempt.companyId = :companyId', { companyId });
    }

    return qb.getRawMany();
  }

  async getUserLastCompletions(userId: string, companyId?: string) {
    const qb = this.attemptsRepository
      .createQueryBuilder('attempt')
      .select('attempt.quizId', 'quizId')
      .addSelect('attempt.quizTitleSnapshot', 'quizTitle')
      .addSelect('MAX(attempt.createdAt)', 'lastCompletionTime')
      .where('attempt.userId = :userId', { userId })
      .groupBy('attempt.quizId')
      .addGroupBy('attempt.quizTitleSnapshot');

    if (companyId) {
      qb.andWhere('attempt.companyId = :companyId', { companyId });
    }

    return qb.getRawMany();
  }

  async getCompanyScoresWithTimeDynamics(companyId: string) {
    return this.attemptsRepository
      .createQueryBuilder('attempt')
      .select('DATE(attempt.createdAt)', 'date')
      .addSelect(
        'AVG((attempt.correctAnswersCount * 100.0) / NULLIF(attempt.totalQuestionsCount, 0))',
        'averageScore',
      )
      .where('attempt.companyId = :companyId', { companyId })
      .groupBy('DATE(attempt.createdAt)')
      .orderBy('DATE(attempt.createdAt)', 'ASC')
      .getRawMany();
  }

  async getCompanyUsersLastCompletions(companyId: string) {
    return this.attemptsRepository
      .createQueryBuilder('attempt')
      .leftJoin('attempt.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('attempt.createdAt', 'lastCompletionTime')
      .addSelect('attempt.quizId', 'quizId')
      .addSelect('attempt.quizTitleSnapshot', 'quizTitle')
      .where('attempt.companyId = :companyId', { companyId })
      .distinctOn(['user.id'])
      .orderBy('user.id', 'ASC')
      .addOrderBy('attempt.createdAt', 'DESC')
      .getRawMany();
  }
}
