import { Injectable } from '@nestjs/common';
import { In, Repository, UpdateResult } from 'typeorm';
import { Notification } from '../common/entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationStatus, NotificationType } from '../utils/enums';
import { PaginatedData } from '../utils/response.interface';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';
import { FindAllNotificationsDto, FindNotificationDto } from './dto/find-notification.dto';
import { CompanyService } from '../company/company.service';

const ALLOWED_NOTIFICATION_RELATIONS = ['company'];

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly companyService: CompanyService,
    private readonly eventEmitter: EventEmitter2,
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

    await this.notificationsRepository
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values(notificationsToInsert)
      .execute();

    const userIds = company.members.map((member) => member.user.id);
    this.eventEmitter.emit('ws.send_notification', { userIds });
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
}
