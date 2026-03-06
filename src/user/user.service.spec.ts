import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { Repository, DeleteResult, Brackets } from 'typeorm';
import { Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mockQueryBuilder, mockUser, mockUserRepository } from '../mock/user-tests.mock';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_secret'),
}));

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
        Logger,
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed_secret',
      });

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          passwordHash: 'hashed_secret',
        }),
      );

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokenHash');
      expect(result.firstName).toEqual('John');
    });

    it('should create user without password (e.g. OAuth)', async () => {
      const dto = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };

      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.create(dto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated data with filters', async () => {
      const query = {
        take: 10,
        skip: 0,
        search: 'john',
        where: { role: 'member' },
        order: { createdAt: 'DESC' },
      };

      const result = await service.findAll(query as any);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('user.role = :user_role'),
        expect.anything(),
      );

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
      expect(result).toEqual({ items: [mockUser], totalCount: 1 });
    });

    it('should handle empty query parameters', async () => {
      await service.findAll({});

      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
      expect(mockQueryBuilder.skip).not.toHaveBeenCalled();

      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });
  });

  describe('findOneBy', () => {
    it('should return a user if found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneBy({ id: '1' });
      expect(result).toEqual(mockUser);
    });

    it('should return null if not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneBy({ id: '999' });
      expect(result).toBeNull();
    });
  });

  describe('updateBy', () => {
    it('should throw NotFoundException if user to update does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.updateBy({ id: '999' }, { firstName: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update user fields and return updated user', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.updateBy({ id: '1' }, { firstName: 'Updated' });

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Updated',
        }),
      );
      expect(result.firstName).toBe('Updated');
    });

    it('should hash new password if provided', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockImplementation((u) => Promise.resolve(u));

      await service.updateBy({ id: '1' }, { password: 'newPassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed_secret',
        }),
      );
    });
  });

  describe('deleteBy', () => {
    it('should delete user if found', async () => {
      const deleteResult: DeleteResult = { raw: [], affected: 1 };
      mockUserRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.deleteBy({ id: '1' });

      expect(repository.delete).toHaveBeenCalledWith({ id: '1' });
      expect(result).toEqual(deleteResult);
    });

    it('should throw NotFoundException if no user affected', async () => {
      const deleteResult: DeleteResult = { raw: [], affected: 0 };
      mockUserRepository.delete.mockResolvedValue(deleteResult);

      await expect(service.deleteBy({ id: '999' })).rejects.toThrow(NotFoundException);
    });
  });
});
