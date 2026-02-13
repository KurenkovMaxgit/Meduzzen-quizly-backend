import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeepPartial, DeleteResult, FindOneOptions, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { PaginatedData } from '../utils/response.interface';
import { FindAllUsersDto, FindUserDto } from './dto/find-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
    const searchableFields = ['firstName', 'lastName', 'email'];
    const qb = this.usersRepository.createQueryBuilder('user');
    if (query.where) {
      Object.keys(query.where).forEach((key) => {
        qb.andWhere(`user.${key} = :${key}`, {
          [key]: (query.where as Record<string, unknown>)[key],
        });
      });
    }
    if (query.search) {
      qb.andWhere(
        new Brackets((subQb) => {
          searchableFields.forEach((field) => {
            subQb.orWhere(`user.${field} ILIKE :search`, { search: `%${query.search}%` });
          });
        }),
      );
    }

    if (query.order) {
      Object.keys(query.order).forEach((key) => {
        qb.addOrderBy(`user.${key}`, query.order![key] as 'ASC' | 'DESC');
      });
    }

    qb.take(query.take);
    qb.skip(query.skip);

    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async findOneBy(where: FindUserDto, options?: FindOneOptions<User>): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where, ...options });
    return user;
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
