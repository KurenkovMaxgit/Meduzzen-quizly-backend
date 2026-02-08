import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, QueryDeepPartialEntity, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users.dto';
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
      refreshToken: 'HULUMULU256', // TODO: add refresh token generating/passing when implementing auth flow
    });
    const { password, passwordHash, refreshToken, ...rest } = user;

    return { ...rest } as ReturnUserDto;
  }

  async findAll(query: FindAllUsersQueryDto): Promise<PaginatedData<User>> {
    const finalWhere = {
      ...query.where,
      ...query.search,
    };
    const users = await this.usersRepository.find({
      where: finalWhere,
      take: query.take,
      skip: query.skip,
      order: query.order,
    });
    const totalCount = await this.usersRepository.count({ where: finalWhere });
    return { items: users, totalCount };
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateById(id: string, data: UpdateUserDto): Promise<User | null> {
    const { password, ...params } = data;
    const updatePayload: QueryDeepPartialEntity<User> = { ...params };

    if (password) {
      updatePayload.passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await this.usersRepository.update({ id }, updatePayload);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return await this.usersRepository.findOneBy({ id });
  }

  async deleteById(id: string): Promise<DeleteResult> {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return result;
  }
}
