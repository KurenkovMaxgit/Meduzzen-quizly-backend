import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class CreateAttemptDto {
  @ApiProperty({
    example: {
      'question-uuid-1': ['answer-uuid-a'],
      'question-uuid-2': ['answer-uuid-b', 'answer-uuid-c'],
    },
    description: 'Map of question IDs to an array of selected answer IDs',
  })
  @IsObject()
  userAnswers!: Record<string, string[]>;
}
