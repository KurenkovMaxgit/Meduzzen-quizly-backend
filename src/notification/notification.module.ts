import { Logger, Module } from '@nestjs/common';
import { Notification } from '../common/entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { NotificationGateway } from './notification.gateway';
import { AuthModule } from '../auth/auth.module';
import { NotificationScheduleService } from './schedules/notification-schedule-service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), CompanyModule, AuthModule, ScheduleModule],
  providers: [NotificationService, Logger, NotificationGateway, NotificationScheduleService],
  controllers: [NotificationController],
})
export class NotificationModule {}
