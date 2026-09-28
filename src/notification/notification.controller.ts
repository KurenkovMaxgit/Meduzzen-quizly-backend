import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationStatus } from '../utils/enums';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FindAllNotificationsDto } from './dto/find-notification.dto';
import { ParseUUIDArrayPipe } from '../common/pipes/parse-uuid-array.pipe';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get all notifications by query parameters.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get('list')
  async findAll(@CurrentUser('id') userId: string, @Query() query: FindAllNotificationsDto) {
    return this.notificationService.findAll(userId, query);
  }

  @ApiOperation({ summary: 'Get the count of notifications by status.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get('count')
  async getCount(
    @CurrentUser('id') userId: string,
    @Query('status', new ParseEnumPipe(NotificationStatus, { optional: true }))
    status?: NotificationStatus,
  ) {
    const targetStatus = status || NotificationStatus.UNREAD;
    const count = await this.notificationService.getCountByStatus(userId, targetStatus);

    return { count, status: targetStatus };
  }

  @ApiOperation({ summary: 'Bulk update the status of specific notifications.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Patch('status/:status')
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('status', new ParseEnumPipe(NotificationStatus)) status: NotificationStatus,
    @Body('notificationIds', ParseUUIDArrayPipe)
    notificationIds: string[],
  ) {
    const result = await this.notificationService.updateStatus(notificationIds, userId, status);

    return { updatedCount: result.affected || 0 };
  }
}
