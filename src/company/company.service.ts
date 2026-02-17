import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, DeleteResult, FindOneOptions, Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyRole } from '../utils/enums';
import { CompanyUser } from '../common/entities/company-user.entity';
import { FindAllCompaniesDto, FindCompanyDto } from './dto/find-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '../common/entities/company.entity';
import { PaginatedData } from '../utils/response.interface';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, data: CreateCompanyDto): Promise<Company> {
    return this.dataSource.transaction(async (manager) => {
      const companyRepo = manager.getRepository(Company);
      const memberRepo = manager.getRepository(CompanyUser);

      const company = companyRepo.create(data);
      await companyRepo.save(company);

      const membership = memberRepo.create({
        user: { id: userId },
        company: company,
        role: CompanyRole.OWNER,
      });
      await memberRepo.save(membership);

      return company;
    });
  }

  async findAll(query: FindAllCompaniesDto): Promise<PaginatedData<Company>> {
    const searchableFields = ['name', 'description'];
    const qb = this.companiesRepository.createQueryBuilder('company');
    if (query.where) {
      Object.keys(query.where).forEach((key) => {
        qb.andWhere(`company.${key} = :${key}`, {
          [key]: (query.where as Record<string, unknown>)[key],
        });
      });
    }
    if (query.search) {
      qb.andWhere(
        new Brackets((subQb) => {
          searchableFields.forEach((field) => {
            subQb.orWhere(`company.${field} ILIKE :search`, { search: `%${query.search}%` });
          });
        }),
      );
    }

    if (query.order) {
      Object.keys(query.order).forEach((key) => {
        qb.addOrderBy(`company.${key}`, query.order![key] as 'ASC' | 'DESC');
      });
    }

    qb.take(query.take);
    qb.skip(query.skip);

    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async findOneBy(
    where: FindCompanyDto,
    options?: FindOneOptions<Company>,
  ): Promise<Company | null> {
    return this.companiesRepository.findOne({
      ...options,
      where,
    });
  }

  async updateBy(where: FindCompanyDto, data: UpdateCompanyDto): Promise<Company> {
    const company = await this.companiesRepository.findOneBy({ ...where });

    if (!company) {
      throw new NotFoundException(`Company with fields ${JSON.stringify(where)} not found`);
    }

    this.companiesRepository.merge(company, data);

    return this.companiesRepository.save(company);
  }

  async deleteBy(where: FindCompanyDto): Promise<DeleteResult> {
    const result = await this.companiesRepository.delete({ ...where });

    if (result.affected === 0) {
      throw new NotFoundException(`Company with fields ${JSON.stringify({ ...where })} not found`);
    }

    return result;
  }
}
