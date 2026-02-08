import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../common/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../utils/enums';
import { mockUserRepository, mockUser } from '../mock/user-tests.mock';
import { NotFoundException } from '@nestjs/common';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should hash password, create user, and return DTO without sensitive fields', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        ...createUserDto,
        passwordHash: 'hashed_password',
        refreshToken: 'HULUMULU256',
      });

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...createUserDto,
        passwordHash: 'hashed_password',
        refreshToken: 'HULUMULU256',
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result.email).toEqual(createUserDto.email);
    });
  });

  describe('findAll', () => {
    it('should return paginated data and merge search/where values', async () => {
      const query: FindAllUsersQueryDto = {
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
        where: { role: UserRole.ADMIN },
        search: { firstName: 'John' },
      };

      const expectedWhere = { role: 'admin', firstName: 'John' };
      const usersList = [mockUser];

      mockUserRepository.find.mockResolvedValue(usersList);
      mockUserRepository.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: expectedWhere,
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
      });
      expect(mockUserRepository.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(result).toEqual({ items: usersList, totalCount: 1 });
    });
  });

  describe('findOneById', () => {
    it('should return a user if found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      const result = await service.findOneById('uuid-example');
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-example' });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOneById('uuid-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateById', () => {
    const mockUser = {
      id: 'uuid-example',
      firstName: 'Jane',
      email: 'test@example.com',
      role: UserRole.CANDIDATE,
    } as User;

    it('should update user directly and return the updated entity if no password is provided', async () => {
      const updateUserDto: UpdateUserDto = { firstName: 'Jane' };
      const updateResult: UpdateResult = { generatedMaps: [], raw: [], affected: 1 };

      mockUserRepository.update.mockResolvedValue(updateResult);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.updateById('uuid-example', updateUserDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'uuid-example' },
        { firstName: 'Jane' },
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-example' });
      expect(result).toEqual(mockUser);
    });

    it('should hash password, update user, and return entity if password is provided', async () => {
      const updateUserDto: UpdateUserDto = { password: 'newPassword123', firstName: 'Jane' };
      const updateResult: UpdateResult = { generatedMaps: [], raw: [], affected: 1 };

      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockUserRepository.update.mockResolvedValue(updateResult);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.updateById('uuid-example', updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'uuid-example' },
        {
          firstName: 'Jane',
          passwordHash: 'new_hashed_password',
        },
      );

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-example' });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      const updateUserDto: UpdateUserDto = { firstName: 'Ghost' };
      const updateResult: UpdateResult = { generatedMaps: [], raw: [], affected: 0 };

      mockUserRepository.update.mockResolvedValue(updateResult);

      await expect(service.updateById('uuid-example', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockUserRepository.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('should delete a user by id', async () => {
      const deleteResult: DeleteResult = { raw: [], affected: 1 };
      mockUserRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.deleteById('uuid-example');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('uuid-example');
      expect(result).toEqual(deleteResult);
    });
  });
});
