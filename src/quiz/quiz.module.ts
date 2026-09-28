import { Logger, Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz } from '../common/entities/quiz.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { AttemptService } from './attempt/attempt.service';
import { QuizAttempt } from '../common/entities/attempt.entity';
import { AttemptController } from './attempt/attempt.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt]), CompanyModule],
  controllers: [QuizController, AttemptController, AnalyticsController],
  providers: [QuizService, AttemptService, Logger, AnalyticsService],
})
export class QuizModule {}
