import { Logger, Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz } from '../common/entities/quiz.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz]), CompanyModule],
  controllers: [QuizController],
  providers: [QuizService, Logger],
})
export class QuizModule {}
