import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeleteResult, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FindAllUsersDto, FindUserDto } from './dto/find-user.dto';
import * as bcrypt from 'bcrypt';
import { ReturnUserDto } from './dto/return-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedData } from '../utils/response.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(data: CreateUserDto): Promise<ReturnUserDto> {
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.usersRepository.save({
      ...data,
      passwordHash: hash,
    });
    const { password, passwordHash, refreshToken, ...rest } = user;

    return { ...rest } as ReturnUserDto;
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

  async findOneBy(where: FindUserDto): Promise<User> {
    const user = await this.usersRepository.findOneBy({ ...where });
    if (!user) {
      throw new NotFoundException(`User with fields ${JSON.stringify({ ...where })} not found`);
    }
    return user;
  }

  async updateBy(where: FindUserDto, data: UpdateUserDto): Promise<User | null> {
    const { password, ...params } = data;
    const updatePayload: Partial<User> = { ...params };

    if (password) {
      updatePayload.passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await this.usersRepository.update(where, updatePayload);

    if (result.affected === 0) {
      throw new NotFoundException(`User with fields ${JSON.stringify({ ...where })} not found`);
    }
    return await this.usersRepository.findOneBy({ ...where });
  }

  async deleteBy(where: FindUserDto): Promise<DeleteResult> {
    const result = await this.usersRepository.delete({ ...where });

    if (result.affected === 0) {
      throw new NotFoundException(`User with fields ${JSON.stringify({ ...where })} not found`);
    }

    return result;
  }
}
