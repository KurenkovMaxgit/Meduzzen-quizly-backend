import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyUser } from '../common/entities/company-user.entity';
import { Company } from '../common/entities/company.entity';
import { CompanyService } from './company.service';
import { DataSource } from 'typeorm';
import { mockCompanyRepository, mockCompanyUserRepository } from '../mock/company-tests.mock';
import { Logger } from '@nestjs/common';
import { mockDataSource } from '../mock/common-tests.mock';

describe('CompanyController', () => {
  let controller: CompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: getRepositoryToken(CompanyUser),
          useValue: mockCompanyUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        Logger,
      ],
      controllers: [CompanyController],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
