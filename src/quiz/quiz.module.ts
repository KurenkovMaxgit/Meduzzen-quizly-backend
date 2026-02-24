import { Logger, Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz } from '../common/entities/quiz.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { AttemptService } from './attempt.service';
import { QuizAttempt } from '../common/entities/attempt.entity';
import { AttemptController } from './attempt.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt]), CompanyModule],
  controllers: [QuizController, AttemptController],
  providers: [QuizService, AttemptService, Logger],
})
export class QuizModule {}
