import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AllowedCompanyRoles } from '../../common/decorators/company-roles.decorator';
import { CompanyService } from '../company.service';

@Injectable()
export class CompanyRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly companyService: CompanyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get(AllowedCompanyRoles, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const userRole = await this.companyService.getCompanyUserRole(
      request.user.id,
      request.params.companyId,
    );
    return roles.includes(userRole);
  }
}
