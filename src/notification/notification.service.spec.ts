import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../common/entities/notification.entity';
import { CompanyService } from '../company/company.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationStatus, NotificationType } from '../utils/enums';
import { mockCompany } from '../mock/company-tests.mock';
import { mockUser } from '../mock/user-tests.mock';
import { mockNotification } from '../mock/notification-tests.mock';

describe('NotificationService', () => {
  let service: NotificationService;
  let companyService: CompanyService;
  let eventEmitter: EventEmitter2;

  let localMockQueryBuilder: any;
  let localMockNotificationRepo: any;

  const mockCompanyService = {
    findOneBy: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    localMockQueryBuilder = {
      alias: 'notification',
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: mockNotification.id }], 1]),

      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    localMockNotificationRepo = {
      createQueryBuilder: jest.fn(() => localMockQueryBuilder),
      update: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: localMockNotificationRepo,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    companyService = module.get<CompanyService>(CompanyService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleUniversalCompanyNotification', () => {
    const payload = {
      companyId: mockCompany.id,
      type: NotificationType.QUIZ_CREATED,
      message: 'A new quiz is ready!',
      metadata: { quizId: '123' },
    };

    it('should early return if company or company members are not found', async () => {
      mockCompanyService.findOneBy.mockResolvedValueOnce(null);

      await service.handleUniversalCompanyNotification(payload);

      expect(localMockQueryBuilder.insert).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();

      mockCompanyService.findOneBy.mockResolvedValueOnce({ members: [] });

      await service.handleUniversalCompanyNotification(payload);

      expect(localMockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it('should bulk insert notifications and emit websocket event for company members', async () => {
      const mockMembers = [{ user: { id: 'user-1' } }, { user: { id: 'user-2' } }];
      mockCompanyService.findOneBy.mockResolvedValueOnce({ members: mockMembers });

      await service.handleUniversalCompanyNotification(payload);

      expect(companyService.findOneBy).toHaveBeenCalledWith(
        { id: mockCompany.id },
        { relations: ['members', 'members.user'] },
      );

      expect(localMockQueryBuilder.insert).toHaveBeenCalled();
      expect(localMockQueryBuilder.into).toHaveBeenCalledWith(Notification);
      expect(localMockQueryBuilder.values).toHaveBeenCalledWith([
        {
          user: { id: 'user-1' },
          company: { id: mockCompany.id },
          type: payload.type,
          text: payload.message,
          metadata: payload.metadata,
          status: NotificationStatus.UNREAD,
        },
        {
          user: { id: 'user-2' },
          company: { id: mockCompany.id },
          type: payload.type,
          text: payload.message,
          metadata: payload.metadata,
          status: NotificationStatus.UNREAD,
        },
      ]);
      expect(localMockQueryBuilder.execute).toHaveBeenCalled();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ws.send_notification', {
        userIds: ['user-1', 'user-2'],
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications for a user', async () => {
      const query = { skip: 0, take: 10 };

      const result = await service.findAll(mockUser.id, query as any);

      expect(localMockNotificationRepo.createQueryBuilder).toHaveBeenCalledWith('notification');
      expect(localMockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.userId = :userId', {
        userId: mockUser.id,
      });
      expect(result.items.length).toBe(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should return 0 affected rows if notificationIds array is empty', async () => {
      const result = await service.updateStatus([], mockUser.id, NotificationStatus.READ);

      expect(result).toEqual({ affected: 0, raw: [], generatedMaps: [] });
      expect(localMockNotificationRepo.update).not.toHaveBeenCalled();
    });

    it('should call update and return UpdateResult for valid array', async () => {
      localMockNotificationRepo.update.mockResolvedValueOnce({ affected: 2 });

      const ids = ['2836e21b-7a90-4a2a-8eda-4f34c3531cf5', 'c2a5d714-59e8-46f8-a37f-2e6f5fd716da'];
      const result = await service.updateStatus(ids, mockUser.id, NotificationStatus.READ);

      expect(localMockNotificationRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUser.id }),
        { status: NotificationStatus.READ },
      );
      expect(result.affected).toBe(2);
    });
  });

  describe('getCountByStatus', () => {
    it('should return the count of notifications with specific status', async () => {
      localMockNotificationRepo.count.mockResolvedValueOnce(5);

      const result = await service.getCountByStatus(mockUser.id, NotificationStatus.UNREAD);

      expect(localMockNotificationRepo.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: NotificationStatus.UNREAD },
      });
      expect(result).toBe(5);
    });
  });
});
