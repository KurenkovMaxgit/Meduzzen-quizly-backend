import { Test, TestingModule } from '@nestjs/testing';
import { ActionController } from './action.controller';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Action } from 'rxjs/internal/scheduler/Action';
import { DataSource } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { ActionService } from './action.service';
import { mockActionRepository } from '../mock/actions-tests.mock';
import { mockCompanyService } from '../mock/company-tests.mock';
import { mockDataSource, mockLogger } from '../mock/common-tests.mock';

describe('ActionController', () => {
  let controller: ActionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionController],
      providers: [
        ActionService,
        {
          provide: getRepositoryToken(Action),
          useValue: mockActionRepository,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ActionController>(ActionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
