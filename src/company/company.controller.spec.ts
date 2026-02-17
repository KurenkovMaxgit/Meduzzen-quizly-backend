import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUser } from '../common/entities/company-user.entity';
import { Company } from '../common/entities/company.entity';
import { CompanyService } from './company.service';
import { DataSource } from 'typeorm';
import { mockCompanyRepository, mockDataSource } from '../mock/company-tests.mock';

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
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
      controllers: [CompanyController],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
