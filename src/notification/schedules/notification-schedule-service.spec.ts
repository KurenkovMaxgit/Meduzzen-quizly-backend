import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification.service';
import { Logger } from '@nestjs/common';
import { NotificationScheduleService } from './notification-schedule-service';
import { mockNotificationService } from '../../mock/notification-tests.mock';

describe('NotificationScheduleService', () => {
  let service: NotificationScheduleService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationScheduleService,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<NotificationScheduleService>(NotificationScheduleService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyQuizReminder', () => {
    it('should log start, call checkAndNotifyLapsedUsers, and log success', async () => {
      mockNotificationService.checkAndNotifyLapsedUsers.mockResolvedValueOnce(undefined);

      await service.handleDailyQuizReminder();

      expect(Logger.prototype.log).toHaveBeenCalledWith('Starting daily quiz completion check...');
      expect(notificationService.checkAndNotifyLapsedUsers).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Daily quiz completion check finished successfully.',
      );
    });

    it('should catch errors and log them using Logger.error', async () => {
      const testError = new Error('Database connection failed');
      mockNotificationService.checkAndNotifyLapsedUsers.mockRejectedValueOnce(testError);

      await service.handleDailyQuizReminder();

      expect(Logger.prototype.log).toHaveBeenCalledWith('Starting daily quiz completion check...');
      expect(notificationService.checkAndNotifyLapsedUsers).toHaveBeenCalledTimes(1);

      expect(Logger.prototype.log).not.toHaveBeenCalledWith(
        'Daily quiz completion check finished successfully.',
      );

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to run daily quiz reminder',
        testError.stack,
      );
    });
  });
});
