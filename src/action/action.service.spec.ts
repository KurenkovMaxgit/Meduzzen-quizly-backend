import { Test, TestingModule } from '@nestjs/testing';
import { ActionService, ActionDecision } from './action.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Action } from '../common/entities/action.entity';
import { CompanyService } from '../company/company.service';
import { DataSource, Repository } from 'typeorm';
import { Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ActionStatus, ActionType } from '../utils/enums';
import {
  mockActionRepository,
  mockQueryBuilder,
  mockCompanyService,
  mockLogger,
  mockAction,
} from '../mock/actions-tests.mock';
import { mockDataSource, mockEntityManager, mockCompany } from '../mock/company-tests.mock';
import { mockUser } from '../mock/user-tests.mock';

describe('ActionService', () => {
  let service: ActionService;
  let repository: Repository<Action>;
  let companyService: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<ActionService>(ActionService);
    repository = module.get<Repository<Action>>(getRepositoryToken(Action));
    companyService = module.get<CompanyService>(CompanyService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an action if no pending action exists', async () => {
      const dto = {
        subject: 'user-123',
        company: 'company-123',
        type: ActionType.INVITE,
      };

      mockActionRepository.findOne.mockResolvedValue(null);
      mockActionRepository.save.mockResolvedValue(mockAction);

      const result = await service.create('creator-id', dto);

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: { id: 'creator-id' },
          subject: { id: dto.subject },
          company: { id: dto.company },
          type: dto.type,
        }),
      );
      expect(result).toEqual(mockAction);
    });

    it('should throw BadRequestException if pending action exists', async () => {
      const dto = {
        subject: 'user-123',
        company: 'company-123',
        type: ActionType.INVITE,
      };

      mockActionRepository.findOne.mockResolvedValue(mockAction);

      await expect(service.create('creator-id', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated data with filters', async () => {
      const query = {
        take: 10,
        skip: 0,
        where: { type: ActionType.INVITE },
      };

      const result = await service.findAll(query as any);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('action');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('action.type = :action_type'),
        expect.anything(),
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result).toEqual({ items: [mockAction], totalCount: 1 });
    });

    it('should handle empty query parameters', async () => {
      await service.findAll({});
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });
  });

  describe('findOneBy', () => {
    it('should return an action if found', async () => {
      mockActionRepository.findOne.mockResolvedValue(mockAction);

      const result = await service.findOneBy({ id: 'action-123' });
      expect(result).toEqual(mockAction);
    });

    it('should filter invalid relations and warn logger', async () => {
      mockActionRepository.findOne.mockResolvedValue(mockAction);

      await service.findOneBy(
        { id: 'action-123' },
        { relations: ['createdBy', 'invalidRelation'] },
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Blocked attempt to access invalid relations'),
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['createdBy'],
        }),
      );
    });
  });

  describe('manageInvite', () => {
    it('should accept invite and add member to company', async () => {
      const inviteAction = { ...mockAction, type: ActionType.INVITE };
      mockActionRepository.findOne.mockResolvedValue(inviteAction);
      mockEntityManager.save.mockResolvedValue({ ...inviteAction, status: ActionStatus.ACCEPTED });

      await service.manageInvite('action-123', mockUser.id, ActionDecision.ACCEPT);

      // Should run inside transaction
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(companyService.addMember).toHaveBeenCalledWith(
        mockCompany.id,
        mockUser.id,
        mockEntityManager,
      );
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActionStatus.ACCEPTED }),
      );
    });

    it('should decline invite', async () => {
      const inviteAction = { ...mockAction, type: ActionType.INVITE };
      mockActionRepository.findOne.mockResolvedValue(inviteAction);

      await service.manageInvite('action-123', mockUser.id, ActionDecision.DECLINE);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActionStatus.DECLINED }),
      );
      expect(companyService.addMember).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the subject', async () => {
      mockActionRepository.findOne.mockResolvedValue(mockAction);

      await expect(
        service.manageInvite('action-123', 'wrong-user-id', ActionDecision.ACCEPT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if action is not an invite', async () => {
      mockActionRepository.findOne.mockResolvedValue({ ...mockAction, type: ActionType.REQUEST });

      await expect(
        service.manageInvite('action-123', mockUser.id, ActionDecision.ACCEPT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('manageRequest', () => {
    it('should allow admin/owner to accept request', async () => {
      const requestAction = { ...mockAction, type: ActionType.REQUEST };
      mockActionRepository.findOne.mockResolvedValue(requestAction);
      mockCompanyService.getCompanyUserRole.mockResolvedValue('admin');

      await service.manageRequest('action-123', 'admin-id', ActionDecision.ACCEPT);

      expect(companyService.addMember).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActionStatus.ACCEPTED }),
      );
    });

    it('should throw ForbiddenException if user is not admin/owner', async () => {
      const requestAction = { ...mockAction, type: ActionType.REQUEST };
      mockActionRepository.findOne.mockResolvedValue(requestAction);
      mockCompanyService.getCompanyUserRole.mockResolvedValue('member');

      await expect(
        service.manageRequest('action-123', 'member-id', ActionDecision.ACCEPT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if action is already handled', async () => {
      const doneAction = {
        ...mockAction,
        type: ActionType.REQUEST,
        status: ActionStatus.ACCEPTED,
      };
      mockActionRepository.findOne.mockResolvedValue(doneAction);
      mockCompanyService.getCompanyUserRole.mockResolvedValue('owner');

      await expect(
        service.manageRequest('action-123', 'owner-id', ActionDecision.DECLINE),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAction', () => {
    it('should allow creator to cancel action', async () => {
      mockActionRepository.findOne.mockResolvedValue(mockAction);

      await service.cancelAction('action-123', mockUser.id);

      expect(repository.softRemove).toHaveBeenCalledWith(mockAction);
    });

    it('should allow company admin to cancel invite', async () => {
      const inviteAction = { ...mockAction, type: ActionType.INVITE, createdBy: { id: 'other' } };
      mockActionRepository.findOne.mockResolvedValue(inviteAction);
      mockCompanyService.getCompanyUserRole.mockResolvedValue('admin');

      await service.cancelAction('action-123', 'admin-id');

      expect(repository.softRemove).toHaveBeenCalledWith(inviteAction);
    });

    it('should throw ForbiddenException if random user tries to cancel', async () => {
      const inviteAction = { ...mockAction, createdBy: { id: 'other' } };
      mockActionRepository.findOne.mockResolvedValue(inviteAction);
      mockCompanyService.getCompanyUserRole.mockResolvedValue('member');

      await expect(service.cancelAction('action-123', 'random-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if action is not pending', async () => {
      const acceptedAction = { ...mockAction, status: ActionStatus.ACCEPTED };
      mockActionRepository.findOne.mockResolvedValue(acceptedAction);

      await expect(service.cancelAction('action-123', mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
