import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Company } from '../common/entities/company.entity';
import { CompanyUser } from '../common/entities/company-user.entity';
import { DataSource, Repository, DeleteResult } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyRole, CompanyStatus } from '../utils/enums';
import { mockUser } from '../mock/user-tests.mock';
import {
  mockCompany,
  mockCompanyRepository,
  mockDataSource,
  mockEntityManager,
  mockQueryBuilder,
} from '../mock/company-tests.mock';

describe('CompanyService', () => {
  let service: CompanyService;
  let companyRepo: Repository<Company>;
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
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    companyRepo = module.get<Repository<Company>>(getRepositoryToken(Company));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
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

      const result = await service.create(mockUser.id, createDto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(Company);
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(CompanyUser);

      expect(mockCompanyRepository.save).toHaveBeenCalledWith(mockCompany);
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
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result).toEqual({ items: [mockCompany], totalCount: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should return a company if found', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.findOneBy({ id: '1' });

      expect(companyRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
        }),
      );
      expect(result).toEqual(mockCompany);
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
});
