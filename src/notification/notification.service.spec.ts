import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../common/entities/notification.entity';
import { CompanyService } from '../company/company.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { NotificationStatus, NotificationType } from '../utils/enums';
import { mockCompany, mockCompanyService } from '../mock/company-tests.mock';
import { mockUser } from '../mock/user-tests.mock';
import {
  mockNotificationManagerQueryBuilder,
  mockNotificationRepository,
  mockNotificationQueryBuilder,
} from '../mock/notification-tests.mock';
import { mockEventEmitter, mockLogger } from '../mock/common-tests.mock';

describe('NotificationService', () => {
  let service: NotificationService;
  let companyService: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    companyService = module.get<CompanyService>(CompanyService);

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

      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();

      mockCompanyService.findOneBy.mockResolvedValueOnce({ members: [] });

      await service.handleUniversalCompanyNotification(payload);

      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
    });

    it('should bulk save notifications and emit websocket event for company members', async () => {
      const mockMembers = [{ user: { id: 'user-1' } }, { user: { id: 'user-2' } }];
      mockCompanyService.findOneBy.mockResolvedValueOnce({ members: mockMembers });

      const savedMocks = [{ id: 'notification-1' }, { id: 'notification-2' }];
      mockNotificationRepository.save.mockResolvedValueOnce(savedMocks);

      await service.handleUniversalCompanyNotification(payload);

      expect(companyService.findOneBy).toHaveBeenCalledWith(
        { id: mockCompany.id },
        { relations: ['members', 'members.user'] },
      );

      expect(mockNotificationRepository.save).toHaveBeenCalledWith([
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

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ws.send_notification', {
        notifications: savedMocks,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications for a user', async () => {
      const query = { skip: 0, take: 10 };

      const result = await service.findAll(mockUser.id, query as any);

      expect(mockNotificationRepository.createQueryBuilder).toHaveBeenCalledWith('notification');
      expect(mockNotificationQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.userId = :userId',
        {
          userId: mockUser.id,
        },
      );
      expect(result.items.length).toBe(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should return 0 affected rows if notificationIds array is empty', async () => {
      const result = await service.updateStatus([], mockUser.id, NotificationStatus.READ);

      expect(result).toEqual({ affected: 0, raw: [], generatedMaps: [] });
      expect(mockNotificationRepository.update).not.toHaveBeenCalled();
    });

    it('should call update and return UpdateResult for valid array', async () => {
      mockNotificationRepository.update.mockResolvedValueOnce({ affected: 2 });

      const ids = ['2836e21b-7a90-4a2a-8eda-4f34c3531cf5', 'c2a5d714-59e8-46f8-a37f-2e6f5fd716da'];
      const result = await service.updateStatus(ids, mockUser.id, NotificationStatus.READ);

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUser.id }),
        { status: NotificationStatus.READ },
      );
      expect(result.affected).toBe(2);
    });
  });

  describe('getCountByStatus', () => {
    it('should return the count of notifications with specific status', async () => {
      mockNotificationRepository.count.mockResolvedValueOnce(5);

      const result = await service.getCountByStatus(mockUser.id, NotificationStatus.UNREAD);

      expect(mockNotificationRepository.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: NotificationStatus.UNREAD },
      });
      expect(result).toBe(5);
    });
  });

  describe('checkAndNotifyLapsedUsers', () => {
    it('should log and return early if no overdue users are found', async () => {
      mockNotificationManagerQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      await service.checkAndNotifyLapsedUsers();

      expect(mockLogger.log).toHaveBeenCalledWith('No new overdue users to notify.');
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
    });

    it('should map overdue users, save notifications, and emit websocket event', async () => {
      const overdueUsersMock = [
        { user_id: 'user-1', quiz_id: 'quiz-1', quiz_title: 'Math Quiz' },
        { user_id: 'user-2', quiz_id: 'quiz-1', quiz_title: 'Math Quiz' },
      ];
      mockNotificationManagerQueryBuilder.getRawMany.mockResolvedValueOnce(overdueUsersMock);

      const savedNotificationsMock = [{ id: 'notification-1' }, { id: 'notification-2' }];
      mockNotificationRepository.save.mockResolvedValueOnce(savedNotificationsMock);

      await service.checkAndNotifyLapsedUsers();

      expect(mockNotificationRepository.save).toHaveBeenCalledWith([
        {
          user: { id: 'user-1' },
          text: `Reminder: It's time to take the quiz "Math Quiz"!`,
          type: NotificationType.QUIZ_REMINDER,
          metadata: { quizId: 'quiz-1', quizTitle: 'Math Quiz' },
          status: NotificationStatus.UNREAD,
        },
        {
          user: { id: 'user-2' },
          text: `Reminder: It's time to take the quiz "Math Quiz"!`,
          type: NotificationType.QUIZ_REMINDER,
          metadata: { quizId: 'quiz-1', quizTitle: 'Math Quiz' },
          status: NotificationStatus.UNREAD,
        },
      ]);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ws.send_notification', {
        notifications: savedNotificationsMock,
      });

      expect(mockLogger.log).toHaveBeenCalledWith('Sent reminders to 2 users.');
    });
  });
});
