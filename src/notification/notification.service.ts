import { Injectable, Logger } from '@nestjs/common';
import { In, Repository, UpdateResult } from 'typeorm';
import { Notification } from '../common/entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationStatus, NotificationType } from '../utils/enums';
import { PaginatedData } from '../utils/response.interface';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';
import { FindAllNotificationsDto, FindNotificationDto } from './dto/find-notification.dto';
import { CompanyService } from '../company/company.service';
import { QuizAttempt } from '../common/entities/attempt.entity';
import { User } from '../common/entities/user.entity';

const ALLOWED_NOTIFICATION_RELATIONS = ['company'];

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly companyService: CompanyService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: Logger,
  ) {}

  @OnEvent('notification.broadcast_to_company')
  async handleUniversalCompanyNotification(payload: {
    companyId: string;
    type: NotificationType;
    message: string;
    metadata?: Record<string, any>;
  }) {
    const company = await this.companyService.findOneBy(
      { id: payload.companyId },
      { relations: ['members', 'members.user'] },
    );

    if (!company?.members?.length) return;

    const notificationsToInsert = company.members.map((companyUser) => ({
      user: { id: companyUser.user.id },
      company: { id: payload.companyId },
      type: payload.type,
      text: payload.message,
      metadata: payload.metadata,
      status: NotificationStatus.UNREAD,
    }));

    const savedNotifications = await this.notificationsRepository.save(notificationsToInsert);

    this.eventEmitter.emit('ws.send_notification', {
      notifications: savedNotifications,
    });
  }

  async findAll(
    userId: string,
    query: FindAllNotificationsDto,
  ): Promise<PaginatedData<Notification>> {
    const qb = this.notificationsRepository.createQueryBuilder('notification');
    qb.andWhere('notification.userId = :userId', { userId });
    applyQueryFilters<FindNotificationDto>(qb, query, {
      searchableFields: ['text'],
      allowedRelations: ALLOWED_NOTIFICATION_RELATIONS,
    });
    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async updateStatus(
    notificationIds: string[],
    userId: string,
    newStatus: NotificationStatus,
  ): Promise<UpdateResult> {
    if (!notificationIds || notificationIds.length === 0) {
      return { affected: 0, raw: [], generatedMaps: [] } as UpdateResult;
    }

    return this.notificationsRepository.update(
      { id: In(notificationIds), userId: userId },
      { status: newStatus },
    );
  }

  async getCountByStatus(userId: string, status: NotificationStatus): Promise<number> {
    return this.notificationsRepository.count({ where: { userId, status } });
  }

  async checkAndNotifyLapsedUsers() {
    const overdueUsers = await this.notificationsRepository.manager
      .createQueryBuilder(User, 'user')
      .select(['user.id AS user_id', 'quiz.id AS quiz_id', 'quiz.title AS quiz_title'])
      .innerJoin('user.memberships', 'companyUser')
      .innerJoin('companyUser.company', 'company')
      .innerJoin('company.quizzes', 'quiz')
      .leftJoin(
        (subQuery) => {
          return subQuery
            .select('quizAttempt.userId', 'userId')
            .addSelect('quizAttempt.quizId', 'quizId')
            .addSelect('MAX(quizAttempt.createdAt)', 'lastAttemptDate')
            .from(QuizAttempt, 'quizAttempt')
            .groupBy('quizAttempt.userId')
            .addGroupBy('quizAttempt.quizId');
        },
        'last_attempt',
        'last_attempt."userId" = user.id AND last_attempt."quizId" = quiz.id',
      )
      .leftJoin(
        'notification',
        'existing_notification',
        `existing_notification.userId = user.id AND 
       existing_notification.type = :notificationType AND 
       existing_notification.status = :notificationStatus AND
       existing_notification.metadata->>'quizId' = CAST(quiz.id AS VARCHAR)`,
        {
          notificationType: NotificationType.QUIZ_REMINDER,
          notificationStatus: NotificationStatus.UNREAD,
        },
      )
      .where(
        `(last_attempt."lastAttemptDate" IS NULL OR 
        last_attempt."lastAttemptDate" < NOW() - (quiz."completionFrequency" * INTERVAL '1 day'))`,
      )
      .andWhere('existing_notification.id IS NULL')
      .getRawMany();

    if (overdueUsers.length === 0) {
      this.logger.log('No new overdue users to notify.');
      return;
    }

    const notifications = overdueUsers.map((record) => ({
      user: { id: record.user_id },
      text: `Reminder: It's time to take the quiz "${record.quiz_title}"!`,
      type: NotificationType.QUIZ_REMINDER,
      metadata: { quizId: record.quiz_id, quizTitle: record.quiz_title },
      status: NotificationStatus.UNREAD,
    }));

    const savedNotifications = await this.notificationsRepository.save(notifications);

    this.eventEmitter.emit('ws.send_notification', {
      notifications: savedNotifications,
    });

    const uniqueUserIds = [...new Set(overdueUsers.map((u) => u.user_id))];
    this.logger.log(`Sent reminders to ${uniqueUserIds.length} users.`);
  }
}
