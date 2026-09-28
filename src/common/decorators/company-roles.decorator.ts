import { Reflector } from '@nestjs/core';

export const AllowedCompanyRoles = Reflector.createDecorator<string[]>();
