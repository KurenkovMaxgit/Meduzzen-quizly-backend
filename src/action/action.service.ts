import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  DeleteResult,
  In,
  DataSource,
  FindOptionsWhere,
} from 'typeorm';
import { Action } from '../common/entities/action.entity';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';
import { PaginatedData } from '../utils/response.interface';
import { CreateActionDto } from './dto/create-action.dto';
import { FindAllActionsDto, FindActionDto } from './dto/find-action.dto';
import { ActionStatus, ActionType } from '../utils/enums';
import { CompanyService } from '../company/company.service';
import { User } from '../common/entities/user.entity';

const ALLOWED_ACTION_RELATIONS = ['createdBy', 'subject', 'company'];
export enum ActionDecision {
  ACCEPT = 'accept',
  DECLINE = 'decline',
}

@Injectable()
export class ActionService {
  constructor(
    @InjectRepository(Action)
    private readonly actionsRepository: Repository<Action>,
    private readonly companyService: CompanyService,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {}

  async create(createdBy: string, data: CreateActionDto): Promise<Action> {
    const existing = await this.actionsRepository.findOne({
      where: {
        subject: { id: data.subject },
        company: { id: data.company },
        status: In([ActionStatus.PENDING, ActionStatus.ACCEPTED]),
        type: data.type,
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member or has a pending company action.');
    }

    return this.actionsRepository.save({
      createdBy: { id: createdBy },
      subject: { id: data.subject },
      company: { id: data.company },
      type: data.type,
    });
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
      relations: ['subject', 'company'],
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

    return this.applyDecision(action, decision);
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

    return this.applyDecision(action, decision);
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

  async cancelAction(id: string, currentUserId: string) {
    const action = await this.actionsRepository.findOne({
      where: { id },
      relations: ['company', 'createdBy'],
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

    return this.actionsRepository.softRemove(action);
  }
}
