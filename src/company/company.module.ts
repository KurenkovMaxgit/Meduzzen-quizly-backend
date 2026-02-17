import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { CompanyUser } from '../common/entities/company-user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../common/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyUser])],
  providers: [CompanyService],
  controllers: [CompanyController],
})
export class CompanyModule {}
