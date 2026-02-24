import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../company/guards/company-role.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActionService } from './action.service';
import { AllowedCompanyRoles } from '../common/decorators/company-roles.decorator';
import { ActionDecision, ActionType, CompanyRole } from '../utils/enums';
import { FindAllActionsDto } from './dto/find-action.dto';

@ApiTags('Actions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
@Controller('action')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  // INVITES //

  @ApiOperation({
    summary: 'Creates invite from authenticated company owner',
    description:
      'Returns invite action created by authenticated owner to existing user in existing company',
  })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Post('invite/:subject/to/:companyId')
  async inviteUser(
    @CurrentUser('id') senderId: string,
    @Param('companyId', ParseUUIDPipe) company: string,
    @Param('subject', ParseUUIDPipe) subject: string,
  ) {
    return this.actionService.create(senderId, company, {
      subject,
      type: ActionType.INVITE,
    });
  }

  @ApiOperation({ summary: 'Revoke a sent invitation' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('invite/:id/cancel')
  async cancelInvite(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.actionService.cancelAction(id, userId);
  }

  @ApiOperation({ summary: 'Accept/decline an invitation' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('invite/:id/:action')
  async manageInvite(
    @CurrentUser('id') subject: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action', new ParseEnumPipe(ActionDecision)) action: ActionDecision,
  ) {
    console.log(subject);
    return this.actionService.manageInvite(id, subject, action);
  }

  // REQUESTS //

  @ApiOperation({
    summary: 'Creates request from authenticated user',
    description: 'Returns request action created by authenticated user to existing company',
  })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('request/:companyId')
  async requestJoin(
    @CurrentUser('id') senderId: string,
    @Param('companyId', ParseUUIDPipe) company: string,
  ) {
    return this.actionService.create(senderId, company, {
      subject: senderId,
      type: ActionType.REQUEST,
    });
  }

  @ApiOperation({ summary: 'Cancel a join request' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('request/:id/cancel')
  async cancelRequest(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.actionService.cancelAction(id, userId);
  }

  @ApiOperation({ summary: 'Accept/decline a join request' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('request/:id/:action')
  async acceptRequest(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action', new ParseEnumPipe(ActionDecision)) action: ActionDecision,
  ) {
    return this.actionService.manageRequest(id, adminId, action);
  }

  // GET ENDPOINTS //

  @Get('list/:actionType')
  async getUserActions(
    @CurrentUser('id') userId: string,
    @Param('actionType', new ParseEnumPipe(ActionType)) type: ActionType,
    @Query() query: FindAllActionsDto,
  ) {
    return this.actionService.findAll(query, { subject: { id: userId }, type });
  }

  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('list/:companyId/:actionType')
  async getCompanyActions(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('actionType', new ParseEnumPipe(ActionType))
    type: ActionType,
    @Query() query: FindAllActionsDto,
  ) {
    return this.actionService.findAll(query, { company: { id: companyId }, type });
  }
}
