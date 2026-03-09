import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification.service';

@Injectable()
export class NotificationScheduleService {
  private readonly logger = new Logger(NotificationScheduleService.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyQuizReminder() {
    this.logger.log('Starting daily quiz completion check...');

    try {
      await this.notificationService.checkAndNotifyLapsedUsers();

      this.logger.log('Daily quiz completion check finished successfully.');
    } catch (error) {
      this.logger.error('Failed to run daily quiz reminder', (error as Error).stack);
    }
  }
}
