import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Company } from '../common/entities/company.entity';
import { CompanyUser } from '../common/entities/company-user.entity';
import { DataSource, Repository, DeleteResult, In } from 'typeorm';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyRole, CompanyStatus } from '../utils/enums';
import { mockUser } from '../mock/user-tests.mock';
import {
  mockCompany,
  mockCompanyRepository,
  mockCompanyUser,
  mockCompanyUserRepository,
  mockDataSource,
  mockEntityManager,
  mockQueryBuilder,
} from '../mock/company-tests.mock';
import { mockLogger } from '../mock/actions-tests.mock';

describe('CompanyService', () => {
  let service: CompanyService;
  let companyRepo: Repository<Company>;
  let companyUserRepo: Repository<CompanyUser>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: getRepositoryToken(CompanyUser),
          useValue: mockCompanyUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    companyRepo = module.get<Repository<Company>>(getRepositoryToken(Company));
    companyUserRepo = module.get<Repository<CompanyUser>>(getRepositoryToken(CompanyUser));
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a company and assign owner inside a transaction', async () => {
      const createDto: CreateCompanyDto = { name: 'Hubabuba', description: 'Desc' };

      mockCompanyRepository.create.mockReturnValue(mockCompany);
      mockCompanyRepository.save.mockResolvedValue(mockCompany);
      mockCompanyUserRepository.create.mockReturnValue(mockCompanyUser);
      mockCompanyUserRepository.save.mockResolvedValue(mockCompanyUser);

      const result = await service.create(mockUser.id, createDto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(Company);
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(CompanyUser);

      expect(mockCompanyRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockCompanyRepository.save).toHaveBeenCalledWith(mockCompany);
      expect(mockCompanyUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: CompanyRole.OWNER,
          user: { id: mockUser.id },
        }),
      );

      expect(result).toEqual(mockCompany);
    });
  });

  describe('findAll', () => {
    it('should return paginated data with filters', async () => {
      const query = {
        take: 10,
        skip: 0,
        search: 'Hubabuba',
        where: { status: CompanyStatus.VISIBLE },
      };

      const result = await service.findAll(query);

      expect(companyRepo.createQueryBuilder).toHaveBeenCalledWith('company');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('company.status = :company_status'),
        expect.anything(),
      );

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result).toEqual({ items: [mockCompany], totalCount: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should return a company if found', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.findOneBy({ id: '1' });

      expect(companyRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } }),
      );
      expect(result).toEqual(mockCompany);
    });

    it('should filter invalid relations and warn logger', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(mockCompany);

      await service.findOneBy({ id: '1' }, { relations: ['members', 'dangerousRelation'] });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Blocked attempt to access invalid relations'),
      );

      expect(companyRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['members'],
        }),
      );
    });

    it('should return null if not found', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(null);
      const result = await service.findOneBy({ id: '999' });
      expect(result).toBeNull();
    });
  });

  describe('updateBy', () => {
    it('should update a company if found', async () => {
      const updateDto = { name: 'New Name' };

      mockCompanyRepository.findOneBy.mockResolvedValue(mockCompany);
      mockCompanyRepository.save.mockResolvedValue({ ...mockCompany, ...updateDto });

      const result = await service.updateBy({ id: '1' }, updateDto);

      expect(companyRepo.findOneBy).toHaveBeenCalled();
      expect(companyRepo.merge).toHaveBeenCalledWith(mockCompany, updateDto);
      expect(companyRepo.save).toHaveBeenCalled();
      expect(result.name).toEqual('New Name');
    });

    it('should throw NotFoundException if company does not exist', async () => {
      mockCompanyRepository.findOneBy.mockResolvedValue(null);
      await expect(service.updateBy({ id: '999' }, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBy', () => {
    it('should delete a company if found', async () => {
      mockCompanyRepository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      const result = await service.deleteBy({ id: '1' });

      expect(companyRepo.delete).toHaveBeenCalledWith({ id: '1' });
      expect(result.affected).toEqual(1);
    });

    it('should throw NotFoundException if nothing was deleted', async () => {
      mockCompanyRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);
      await expect(service.deleteBy({ id: '999' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompanyUserRole', () => {
    it('should return the role if member exists', async () => {
      mockCompanyUserRepository.findOne.mockResolvedValue(mockCompanyUser);

      const result = await service.getCompanyUserRole(mockUser.id, mockCompany.id);

      expect(companyUserRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: mockUser.id }, company: { id: mockCompany.id } },
        }),
      );
      expect(result).toEqual(CompanyRole.OWNER);
    });

    it('should throw NotFoundException if member not found', async () => {
      mockCompanyUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getCompanyUserRole(mockUser.id, mockCompany.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a member if they do not exist', async () => {
      mockCompanyUserRepository.findOne.mockResolvedValue(null);
      mockCompanyUserRepository.save.mockResolvedValue(mockCompanyUser);

      await service.addMember(mockCompany.id, mockUser.id);

      expect(companyUserRepo.save).toHaveBeenCalledWith({
        company: { id: mockCompany.id },
        user: { id: mockUser.id },
      });
    });

    it('should do nothing if member already exists', async () => {
      mockCompanyUserRepository.findOne.mockResolvedValue(mockCompanyUser);

      const result = await service.addMember(mockCompany.id, mockUser.id);

      expect(companyUserRepo.save).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should use provided EntityManager if passed', async () => {
      mockCompanyUserRepository.findOne.mockResolvedValue(null);

      await service.addMember(mockCompany.id, mockUser.id, mockEntityManager);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(CompanyUser);
      expect(mockCompanyUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateCompanyUsersRole', () => {
    it('should update roles for valid members', async () => {
      mockCompanyUserRepository.count.mockResolvedValue(2);
      mockCompanyUserRepository.update.mockResolvedValue({ affected: 2 });

      const userIds = ['user-1', 'user-2'];
      const result = await service.updateCompanyUsersRole(
        mockCompany.id,
        userIds,
        CompanyRole.ADMIN,
      );

      expect(companyUserRepo.count).toHaveBeenCalledWith({
        where: {
          company: { id: mockCompany.id },
          user: { id: In(userIds) },
        },
      });

      expect(companyUserRepo.update).toHaveBeenCalledWith(
        { company: { id: mockCompany.id }, user: { id: In(userIds) } },
        { role: CompanyRole.ADMIN },
      );

      expect(result).toEqual({ success: true, count: 2 });
    });

    it('should throw BadRequestException if trying to set OWNER role', async () => {
      await expect(
        service.updateCompanyUsersRole(mockCompany.id, ['user-1'], CompanyRole.OWNER),
      ).rejects.toThrow(BadRequestException);

      expect(companyUserRepo.count).not.toHaveBeenCalled();
      expect(companyUserRepo.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if some users are not members', async () => {
      mockCompanyUserRepository.count.mockResolvedValue(1);

      const userIds = ['user-1', 'user-2'];

      await expect(
        service.updateCompanyUsersRole(mockCompany.id, userIds, CompanyRole.ADMIN),
      ).rejects.toThrow(BadRequestException);

      expect(companyUserRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('addNewCompanyOwner', () => {
    it('should promote a member to owner if found', async () => {
      mockCompanyUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.addNewCompanyOwner(mockCompany.id, mockUser.id);

      expect(companyUserRepo.update).toHaveBeenCalledWith(
        { company: { id: mockCompany.id }, user: { id: mockUser.id } },
        { role: CompanyRole.OWNER },
      );
      expect(result.affected).toBe(1);
    });

    it('should throw NotFoundException if user is not a member', async () => {
      mockCompanyUserRepository.update.mockResolvedValue({ affected: 0 });

      await expect(service.addNewCompanyOwner(mockCompany.id, 'non-member-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCompanyUsers', () => {
    it('should throw BadRequestException if trying to delete an owner', async () => {
      mockCompanyUserRepository.count.mockResolvedValue(1);

      await expect(service.deleteCompanyUsers(mockCompany.id, ['owner-id'])).rejects.toThrow(
        BadRequestException,
      );

      expect(companyUserRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: CompanyRole.OWNER }),
        }),
      );
      expect(companyUserRepo.delete).not.toHaveBeenCalled();
    });

    it('should delete users if valid and return result', async () => {
      mockCompanyUserRepository.count.mockResolvedValue(0);
      mockCompanyUserRepository.delete.mockResolvedValue({ affected: 2 } as DeleteResult);

      const result = await service.deleteCompanyUsers(mockCompany.id, ['user-1', 'user-2']);

      expect(companyUserRepo.delete).toHaveBeenCalled();
      expect(result.affected).toEqual(2);
    });

    it('should throw NotFoundException if no users were affected', async () => {
      mockCompanyUserRepository.count.mockResolvedValue(0);
      mockCompanyUserRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.deleteCompanyUsers(mockCompany.id, ['user-1'])).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
