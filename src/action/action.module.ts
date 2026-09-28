import { Logger, Module } from '@nestjs/common';
import { ActionController } from './action.controller';
import { ActionService } from './action.service';
import { Action } from '../common/entities/action.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Action]), CompanyModule, NotificationModule],
  controllers: [ActionController],
  providers: [ActionService, Logger],
})
export class ActionModule {}
