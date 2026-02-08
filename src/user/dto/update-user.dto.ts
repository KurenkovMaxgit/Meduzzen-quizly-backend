import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  PartialType(OmitType(CreateUserDto, ['email', 'role'])),
) {}
