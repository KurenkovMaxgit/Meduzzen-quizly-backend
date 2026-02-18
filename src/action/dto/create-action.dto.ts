import { IsEnum, IsUUID } from 'class-validator';
import { ActionType } from '../../utils/enums';

export class CreateActionDto {
  @IsUUID()
  subject!: string;

  @IsUUID()
  company!: string;

  @IsEnum(ActionType)
  type!: ActionType;
}
