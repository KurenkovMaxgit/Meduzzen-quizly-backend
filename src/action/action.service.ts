import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, In, DataSource, FindOptionsWhere } from 'typeorm';
import { Action } from '../common/entities/action.entity';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';
import { PaginatedData } from '../utils/response.interface';
import { CreateActionDto } from './dto/create-action.dto';
import { FindAllActionsDto, FindActionDto } from './dto/find-action.dto';
import { ActionDecision, ActionStatus, ActionType, CompanyRole } from '../utils/enums';
import { CompanyService } from '../company/company.service';
import { User } from '../common/entities/user.entity';
import { NotificationService } from '../notification/notification.service';

const ALLOWED_ACTION_RELATIONS = ['createdBy', 'subject', 'company'];

@Injectable()
export class ActionService {
  constructor(
    @InjectRepository(Action)
    private readonly actionsRepository: Repository<Action>,
    private readonly companyService: CompanyService,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createdBy: string, companyId: string, data: CreateActionDto): Promise<Action> {
    const existing = await this.actionsRepository.findOne({
      where: {
        subject: { id: data.subject },
        company: { id: companyId },
        status: In([ActionStatus.PENDING, ActionStatus.ACCEPTED]),
        type: data.type,
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member or has a pending company action.');
    }

    const action = await this.actionsRepository.save({
      createdBy: { id: createdBy },
      subject: { id: data.subject },
      company: { id: companyId },
      type: data.type,
    });

    const isInvite = data.type === ActionType.INVITE;
    let recipients = [data.subject];
    let audience = 'invitee';
    let message = 'You have received a company invitation.';

    if (!isInvite) {
      recipients = await this.getCompanyAdminIds(companyId);
      audience = 'company_admin';
      message = 'A user has requested to join your company.';
    }

    await this.notifyActionUsers(recipients, createdBy, companyId, message, {
      actionId: action.id,
      actionType: data.type,
      audience,
      actionStatus: ActionStatus.PENDING,
    });

    return action;
  }

  async findAll(
    query: FindAllActionsDto,
    overrides?: FindOptionsWhere<Action>,
  ): Promise<PaginatedData<Action>> {
    if (!query.where) {
      query.where = {};
    }

    Object.assign(query.where, overrides);

    const qb = this.actionsRepository.createQueryBuilder('action');

    applyQueryFilters<FindActionDto>(qb, query, {
      searchableFields: [],
      allowedRelations: ALLOWED_ACTION_RELATIONS,
    });

    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async findOneBy(
    where: FindActionDto,
    options: FindOneOptions<Action> = {},
  ): Promise<Action | null> {
    let { relations } = options;

    if (Array.isArray(relations)) {
      const safeRelations = relations.filter((relation) =>
        ALLOWED_ACTION_RELATIONS.includes(relation),
      );

      if (relations.length !== safeRelations.length) {
        this.logger.warn(
          `Blocked attempt to access invalid relations. Requested: ${relations}, Allowed: ${safeRelations}`,
        );
      }

      relations = safeRelations;
    }

    return this.actionsRepository.findOne({
      ...options,
      where,
      relations,
    });
  }

  async manageInvite(id: string, currentUserId: string, decision: ActionDecision) {
    const action = await this.actionsRepository.findOne({
      where: { id },
      relations: ['subject', 'company', 'createdBy'],
    });

    if (!action) throw new NotFoundException(`Action not found`);

    if (action.type !== ActionType.INVITE) {
      throw new BadRequestException('This action is not an invitation');
    }

    if (action.subject.id !== currentUserId) {
      throw new ForbiddenException('You cannot manage an invitation meant for someone else');
    }

    if (action.status !== ActionStatus.PENDING) {
      throw new BadRequestException(`Invitation is already ${action.status}`);
    }

    const updatedAction = await this.applyDecision(action, decision);
    const outcome = decision === ActionDecision.ACCEPT ? 'accepted' : 'declined';
    if (action.createdBy?.id) {
      await this.notifyActionUsers(
        [action.createdBy.id],
        currentUserId,
        action.company.id,
        `Your company invitation was ${outcome}.`,
        {
          actionId: action.id,
          actionType: ActionType.INVITE,
          audience: 'inviter',
          actionStatus: outcome,
        },
      );
    }

    return updatedAction;
  }

  async manageRequest(id: string, currentUserId: string, decision: ActionDecision) {
    const action = await this.actionsRepository.findOne({
      where: { id },
      relations: ['subject', 'company'],
    });

    if (!action) throw new NotFoundException(`Action not found`);

    if (action.type !== ActionType.REQUEST) {
      throw new BadRequestException('This action is not a join request');
    }

    const role = await this.companyService.getCompanyUserRole(currentUserId, action.company.id);
    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenException(
        'You do not have permission to manage requests for this company',
      );
    }

    if (action.status !== ActionStatus.PENDING) {
      throw new BadRequestException(`Request is already ${action.status}`);
    }

    const updatedAction = await this.applyDecision(action, decision);
    const outcome = decision === ActionDecision.ACCEPT ? 'accepted' : 'declined';
    await this.notifyActionUsers(
      [action.subject.id],
      currentUserId,
      action.company.id,
      `Your company membership request was ${outcome}.`,
      {
        actionId: action.id,
        actionType: ActionType.REQUEST,
        audience: 'requester',
        actionStatus: outcome,
      },
    );

    return updatedAction;
  }

  private async applyDecision(action: Action, decision: ActionDecision) {
    if (decision === ActionDecision.DECLINE) {
      action.status = ActionStatus.DECLINED;
      return this.actionsRepository.save(action);
    }

    return this.dataSource.transaction(async (manager) => {
      await this.companyService.addMember(action.company.id, action.subject.id, manager);

      action.status = ActionStatus.ACCEPTED;
      return manager.save(action);
    });
  }

  private async notifyActionUsers(
    recipientIds: string[],
    actorId: string,
    companyId: string,
    message: string,
    metadata: Record<string, string>,
  ) {
    const userIds = [...new Set(recipientIds)].filter((userId) => userId && userId !== actorId);
    if (userIds.length === 0) return;

    try {
      await this.notificationService.createForUsers({
        userIds,
        companyId,
        message,
        metadata,
      });
    } catch (error) {
      this.logger.warn(
        `Company action completed, but its notification could not be created: ${String(error)}`,
      );
    }
  }

  private async getCompanyAdminIds(companyId: string) {
    try {
      const company = await this.companyService.findOneBy(
        { id: companyId },
        { relations: ['members', 'members.user'] },
      );

      return (
        company?.members
          ?.filter(
            (member) => member.role === CompanyRole.OWNER || member.role === CompanyRole.ADMIN,
          )
          .map((member) => member.user.id) ?? []
      );
    } catch (error) {
      this.logger.warn(
        `Could not find company admins for an action notification: ${String(error)}`,
      );
      return [];
    }
  }

  async cancelAction(id: string, currentUserId: string) {
    const action = await this.actionsRepository.findOne({
      where: { id },
      relations: ['company', 'createdBy', 'subject'],
    });

    if (!action) throw new NotFoundException(`Action not found`);

    if (action.status !== ActionStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel an action that is already ${action.status}`);
    }

    let isAllowed = false;

    if ((action.createdBy as User).id === currentUserId) {
      isAllowed = true;
    } else if (action.type === ActionType.INVITE) {
      const role = await this.companyService.getCompanyUserRole(currentUserId, action.company.id);
      if (['owner', 'admin'].includes(role)) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      throw new ForbiddenException('You do not have permission to cancel this action');
    }

    const removedAction = await this.actionsRepository.softRemove(action);

    if (action.type === ActionType.INVITE) {
      await this.notifyActionUsers(
        [action.subject.id],
        currentUserId,
        action.company.id,
        'A company invitation was withdrawn.',
        {
          actionId: action.id,
          actionType: ActionType.INVITE,
          audience: 'invitee',
          actionStatus: 'cancelled',
        },
      );
    } else {
      const adminIds = await this.getCompanyAdminIds(action.company.id);
      await this.notifyActionUsers(
        adminIds,
        currentUserId,
        action.company.id,
        'A user withdrew a company membership request.',
        {
          actionId: action.id,
          actionType: ActionType.REQUEST,
          audience: 'company_admin',
          actionStatus: 'cancelled',
        },
      );
    }

    return removedAction;
  }
}
