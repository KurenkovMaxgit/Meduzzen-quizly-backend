import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
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
