import { IsEnum, IsUUID } from 'class-validator';
import { ActionType } from '../../utils/enums';

export class CreateActionDto {
  @IsUUID()
  subject!: string;

  @IsEnum(ActionType)
  type!: ActionType;
}
