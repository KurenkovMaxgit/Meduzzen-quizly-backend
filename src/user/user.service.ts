import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, DeleteResult, FindOneOptions, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { PaginatedData } from '../utils/response.interface';
import { FindAllUsersDto, FindUserDto } from './dto/find-user.dto';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';

const ALLOWED_USER_RELATIONS = ['memberships', 'memberships.company'];

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly logger: Logger,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    let user: User;
    if (data.password) {
      const { password, ...payload } = data;
      const hash = await bcrypt.hash(password, 10);
      user = await this.usersRepository.save({
        ...payload,
        passwordHash: hash,
      });
    } else {
      user = await this.usersRepository.save({
        ...data,
      });
    }
    const { passwordHash, refreshTokenHash, ...rest } = user;
    return rest;
  }

  async findAll(query: FindAllUsersDto): Promise<PaginatedData<User>> {
    const qb = this.usersRepository.createQueryBuilder('user');
    applyQueryFilters<FindUserDto>(qb, query, {
      searchableFields: ['firstName', 'lastName', 'email'],
      allowedRelations: ALLOWED_USER_RELATIONS,
    });
    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async findOneBy(where: FindUserDto, options: FindOneOptions<User> = {}): Promise<User | null> {
    let { relations } = options;

    if (Array.isArray(relations)) {
      const safeRelations = relations.filter((relation) =>
        ALLOWED_USER_RELATIONS.includes(relation),
      );

      if (relations.length !== safeRelations.length) {
        this.logger.warn(
          `Blocked attempt to access invalid relations. Requested: ${relations}, Allowed: ${safeRelations}`,
        );
      }

      relations = safeRelations;
    }

    return this.usersRepository.findOne({
      ...options,
      where,
      relations,
    });
  }

  async updateBy(
    where: FindUserDto,
    data: DeepPartial<User> & { password?: string; refreshToken?: string | null },
  ): Promise<User> {
    const user = await this.usersRepository.findOneBy({ ...where });

    if (!user) {
      throw new NotFoundException(`User with fields ${JSON.stringify(where)} not found`);
    }

    if (data.password) {
      user.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const { password, ...params } = data;
    Object.assign(user, params);

    return await this.usersRepository.save(user);
  }

  async deleteBy(where: FindUserDto): Promise<DeleteResult> {
    const result = await this.usersRepository.delete({ ...where });

    if (result.affected === 0) {
      throw new NotFoundException(`User with fields ${JSON.stringify({ ...where })} not found`);
    }

    return result;
  }
}
