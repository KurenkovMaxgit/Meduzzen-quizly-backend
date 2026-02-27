import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { CompanyController } from '../src/company/company.controller';
import { CompanyService } from '../src/company/company.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';
import { mockCompany, mockCompanyService } from '../src/mock/company-tests.mock';
import { mockUser } from '../src/mock/user-tests.mock';
import { CreateCompanyDto } from '../src/company/dto/create-company.dto';
import { mockCompanyRolesGuard, mockJwtAuthGuard } from '../src/mock/auth-tests.mock';

describe('CompanyController (e2e)', () => {
  let app: INestApplication;
  let companyService: CompanyService;
  const baseUrl = `/company`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(CompanyRolesGuard)
      .useValue(mockCompanyRolesGuard)
      .compile();

    companyService = moduleFixture.get<CompanyService>(CompanyService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /company', () => {
    it('should create a company for the authenticated user', () => {
      const createDto: CreateCompanyDto = {
        name: 'Hubabuba Corp',
        description: 'We make hubabuba',
      };

      return request(app.getHttpServer())
        .post(baseUrl)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toEqual(mockCompany.name);
          expect(companyService.create).toHaveBeenCalledWith(
            mockUser.id,
            expect.objectContaining(createDto),
          );
        });
    });

    it('should fail with 400 on invalid data', () => {
      return request(app.getHttpServer()).post(baseUrl).send({ name: '' }).expect(400);
    });
  });

  describe('GET /company/list', () => {
    it('should return paginated companies', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/list`)
        .query({ take: 10, skip: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalCount).toBe(1);
          expect(companyService.findAll).toHaveBeenCalled();
        });
    });
  });
  ``;
  describe('GET /company/:id', () => {
    it('should return a company by valid UUID', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/${mockCompany.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockCompany.id);
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer()).get('/company/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /company/:id', () => {
    it('should update the company', () => {
      const updateDto = { name: 'Updated Name' };

      return request(app.getHttpServer())
        .patch(`${baseUrl}/${mockCompany.id}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toEqual('Updated Name');
          expect(companyService.updateBy).toHaveBeenCalledWith(
            { id: mockCompany.id },
            expect.objectContaining(updateDto),
          );
        });
    });
  });

  describe('DELETE /company/:id', () => {
    it('should delete the company', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/${mockCompany.id}`)
        .expect(200)
        .expect(() => {
          expect(companyService.deleteBy).toHaveBeenCalledWith({ id: mockCompany.id });
        });
    });
  });

  describe('PATCH /company/:companyId/users/:newRole', () => {
    const userIds = [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ];

    it('should update user roles to ADMIN', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/${mockCompany.id}/users/admin`)
        .send({ userIds })
        .expect(200)
        .expect(() => {
          expect(companyService.updateCompanyUsersRole).toHaveBeenCalledWith(
            mockCompany.id,
            userIds,
            'admin',
          );
        });
    });

    it('should fail with 400 if role is invalid enum', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/${mockCompany.id}/users/super_god_mode`)
        .send({ userIds })
        .expect(400);
    });

    it('should fail with 400 if userIds body is invalid', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/${mockCompany.id}/users/admin`)
        .send({ userIds: ['not-a-uuid'] })
        .expect(400);
    });
  });

  describe('PATCH /company/:companyId/add/owner/:userId', () => {
    const targetUserId = '123e4567-e89b-12d3-a456-426614174099';

    it('should promote a member to owner', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/${mockCompany.id}/add/owner/${targetUserId}`)
        .expect(200)
        .expect(() => {
          expect(companyService.addNewCompanyOwner).toHaveBeenCalledWith(
            mockCompany.id,
            targetUserId,
          );
        });
    });

    it('should fail with 400 if userId is not a UUID', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/${mockCompany.id}/add/owner/not-a-uuid`)
        .expect(400);
    });
  });

  describe('DELETE /company/leave/:companyId', () => {
    it('should allow user to leave company', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/leave/${mockCompany.id}`)
        .expect(200)
        .expect(() => {
          expect(companyService.deleteCompanyUsers).toHaveBeenCalledWith(mockCompany.id, [
            mockUser.id,
          ]);
        });
    });
  });

  describe('DELETE /company/:companyId/users', () => {
    const userIdsToKick = [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ];

    it('should kick provided users', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/${mockCompany.id}/users`)
        .send({ userIds: userIdsToKick })
        .expect(200)
        .expect(() => {
          expect(companyService.deleteCompanyUsers).toHaveBeenCalledWith(
            mockCompany.id,
            userIdsToKick,
          );
        });
    });

    it('should fail with 400 if userIds is not an array (Pipe Validation)', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/${mockCompany.id}/users`)
        .send({ userIds: 'not-an-array' })
        .expect(400);
    });

    it('should fail with 400 if userIds contains invalid UUIDs (Pipe Validation)', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/${mockCompany.id}/users`)
        .send({ userIds: ['valid-uuid', 'invalid-uuid'] })
        .expect(400);
    });
  });
});
