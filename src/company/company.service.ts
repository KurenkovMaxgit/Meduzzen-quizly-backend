import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeleteResult, EntityManager, FindOneOptions, In, Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyRole } from '../utils/enums';
import { CompanyUser } from '../common/entities/company-user.entity';
import { FindAllCompaniesDto, FindCompanyDto } from './dto/find-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '../common/entities/company.entity';
import { PaginatedData } from '../utils/response.interface';
import { applyQueryFilters } from '../utils/find-all-query-builder.util';

const ALLOWED_COMPANY_RELATIONS = ['members', 'members.user'];

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(CompanyUser)
    private readonly companyUserRepository: Repository<CompanyUser>,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
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
    const qb = this.companiesRepository.createQueryBuilder('company');

    applyQueryFilters<FindCompanyDto>(qb, query, {
      searchableFields: ['name', 'description'],
      allowedRelations: ALLOWED_COMPANY_RELATIONS,
    });

    const [items, totalCount] = await qb.getManyAndCount();

    return { items, totalCount };
  }

  async findOneBy(
    where: FindCompanyDto,
    options: FindOneOptions<Company> = {},
  ): Promise<Company | null> {
    let { relations } = options;

    if (Array.isArray(relations)) {
      const safeRelations = relations.filter((relation) =>
        ALLOWED_COMPANY_RELATIONS.includes(relation),
      );

      if (relations.length !== safeRelations.length) {
        this.logger.warn(
          `Blocked attempt to access invalid relations. Requested: ${relations}, Allowed: ${safeRelations}`,
        );
      }

      relations = safeRelations;
    }

    return this.companiesRepository.findOne({
      ...options,
      where,
      relations,
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

  async getCompanyUserRole(userId: string, companyId: string) {
    const membership = await this.companyUserRepository.findOne({
      select: ['id', 'role'],
      where: {
        user: { id: userId },
        company: { id: companyId },
      },
      relations: { user: true, company: true },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this company');
    }

    return membership.role;
  }

  async addMember(companyId: string, userId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(CompanyUser) : this.companyUserRepository;

    const existingMember = await repo.findOne({
      where: {
        company: { id: companyId },
        user: { id: userId },
      },
    });

    if (existingMember) return;

    return repo.save({
      company: { id: companyId },
      user: { id: userId },
    });
  }

  async updateCompanyUsersRole(companyId: string, userIds: string[], newRole: CompanyRole) {
    if (newRole === CompanyRole.OWNER) {
      throw new BadRequestException('Ownership cannot be transferred via bulk update.');
    }

    const existingMembersCount = await this.companyUserRepository.count({
      where: { company: { id: companyId }, user: { id: In(userIds) } },
    });

    if (existingMembersCount !== userIds.length) {
      throw new BadRequestException(`One or more users are not members of this company`);
    }

    await this.companyUserRepository.update(
      { company: { id: companyId }, user: { id: In(userIds) } },
      { role: newRole },
    );

    return { success: true, count: userIds.length };
  }

  async addNewCompanyOwner(companyId: string, userId: string) {
    const result = await this.companyUserRepository.update(
      { company: { id: companyId }, user: { id: userId } },
      { role: CompanyRole.OWNER },
    );

    if (result.affected === 0) {
      throw new NotFoundException('User is not a member of this company');
    }

    return result;
  }

  async deleteCompanyUsers(companyId: string, userIds: string[]) {
    const ownersBeingKicked = await this.companyUserRepository.count({
      where: {
        company: { id: companyId },
        user: { id: In(userIds) },
        role: CompanyRole.OWNER,
      },
    });

    if (ownersBeingKicked > 0) {
      throw new BadRequestException('You cannot remove the company owner');
    }

    const result = await this.companyUserRepository.delete({
      company: { id: companyId },
      user: { id: In(userIds) },
    });

    if (result.affected === 0) {
      throw new NotFoundException(`No company members found to delete`);
    }

    return result;
  }
}
