import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuizAttempt } from '../common/entities/attempt.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { AnswerCorrectness } from '../utils/enums';
import { CreateAttemptDto } from './dto/attempt/create-attempt.dto';
import Redis from 'ioredis';
import { QuestionAttemptSnapshot } from '../common/interfaces/question-attempt-snapshot.interface';

@Injectable()
export class AttemptService {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptsRepository: Repository<QuizAttempt>,
    private readonly quizService: QuizService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
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

  async getUserRating(userId: string, companyId?: string): Promise<number> {
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

    return correct / total;
  }

  private gradeAnswers(questions: any[], userSubmittedAnswers: Record<string, string[]>) {
    let totalScore = 0;
    const snapshots: QuestionAttemptSnapshot[] = [];

    for (const question of questions) {
      const correctAnswers = question.answers.filter(
        (a) => a.correctness === AnswerCorrectness.CORRECT,
      );
      const correctAnswerIds = correctAnswers.map((a) => a.id);
      const userSubmittedIds = userSubmittedAnswers[question.id] || [];

      if (question.type === 'single_choice' && userSubmittedIds.length > 1) {
        throw new BadRequestException(`Question ${question.id} is single-choice.`);
      }

      let correctlySelected = 0;
      let incorrectlySelected = 0;

      for (const id of userSubmittedIds) {
        correctAnswerIds.includes(id) ? correctlySelected++ : incorrectlySelected++;
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
          .filter((answer) => userSubmittedIds.includes(answer.id))
          .map((answer) => ({
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
      await this.redis.set(redisKey, JSON.stringify(attempt), 'EX', TTL_SECONDS);
    } catch (error) {
      this.logger.error(`Failed to save attempt to Redis: ${attempt.id}`, error);
    }
  }
}
