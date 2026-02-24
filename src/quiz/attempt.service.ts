import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuestionAttemptSnapshot, QuizAttempt } from '../common/entities/attempt.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { AnswerCorrectness } from '../utils/enums';
import { CreateAttemptDto } from './dto/attempt/create-attempt.dto';
import { QuestionAttemptSnapshot } from '../common/interfaces/question-attempt-snapshot.interface';

@Injectable()
export class AttemptService {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    private readonly quizService: QuizService,
  ) {}

  async submitAttempt(userId: string, companyId: string, quizId: string, data: CreateAttemptDto) {
    const quiz = await this.quizService.findOneBy(
      { id: quizId, company: { id: companyId } },
      { relations: ['questions', 'questions.answers'] },
    );

    if (!quiz) {
      throw new NotFoundException('Quiz not found in this company.');
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new BadRequestException('Cannot attempt a quiz with no questions.');
    }

    let totalScore = 0;
    const userAnswersSnapshot: QuestionAttemptSnapshot[] = [];

    for (const question of quiz.questions) {
      const correctAnswers = question.answers.filter(
        (answer) => answer.correctness === AnswerCorrectness.CORRECT,
      );
      const correctAnswerIds = correctAnswers.map((answer) => answer.id);

      const userSubmittedIds = data.userAnswers[question.id] || [];

      if (question.type === 'single_choice' && userSubmittedIds.length > 1) {
        throw new BadRequestException(
          `Question ${question.id} is single-choice, but multiple answers were provided.`,
        );
      }

      const submittedAnswerSnapshots = question.answers
        .filter((answer) => userSubmittedIds.includes(answer.id))
        .map((answer) => ({
          answerId: answer.id,
          content: answer.content,
        }));

      userAnswersSnapshot.push({
        questionId: question.id,
        prompt: question.prompt,
        submittedAnswers: submittedAnswerSnapshots,
      });

      const totalCorrectOptions = correctAnswerIds.length;

      let correctlySelected = 0;
      let incorrectlySelected = 0;

      for (const id of userSubmittedIds) {
        if (correctAnswerIds.includes(id)) {
          correctlySelected++;
        } else {
          incorrectlySelected++;
        }
      }

      if (totalCorrectOptions > 0) {
        let questionScore = (correctlySelected - incorrectlySelected) / totalCorrectOptions;

        if (questionScore < 0) {
          questionScore = 0;
        }

        totalScore += questionScore;
      }
    }

    return this.attemptRepository.save({
      user: { id: userId },
      company: { id: companyId },
      quiz: { id: quizId },
      quizTitleSnapshot: quiz.title,
      correctAnswersCount: totalScore,
      totalQuestionsCount: quiz.questions.length,
      userAnswers: userAnswersSnapshot,
    });
  }

  async getUserRating(userId: string, companyId?: string): Promise<number> {
    const qb = this.attemptRepository
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
}
