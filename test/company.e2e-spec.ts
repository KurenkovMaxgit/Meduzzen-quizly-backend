import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { CompanyController } from '../src/company/company.controller';
import { CompanyService } from '../src/company/company.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { mockCompany } from '../src/mock/company-tests.mock';
import { mockUser } from '../src/mock/user-tests.mock';
import { CreateCompanyDto } from '../src/company/dto/create-company.dto';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';

describe('CompanyController (e2e)', () => {
  let app: INestApplication;
  let companyService: CompanyService;

  const mockCompanyService = {
    create: jest.fn().mockResolvedValue(mockCompany),
    findAll: jest.fn().mockResolvedValue({ items: [mockCompany], totalCount: 1 }),
    findOneBy: jest.fn().mockImplementation((where) => {
      if (where.id === mockCompany.id) return Promise.resolve(mockCompany);
      return Promise.resolve(null);
    }),
    updateBy: jest.fn().mockResolvedValue({ ...mockCompany, name: 'Updated Name' }),
    deleteBy: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  const mockCompanyRolesGuard = {
    canActivate: () => true,
  };

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
        .post('/company')
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
      return request(app.getHttpServer()).post('/company').send({ name: '' }).expect(400);
    });
  });

  describe('GET /company/list (findAll)', () => {
    it('should return paginated companies', () => {
      return request(app.getHttpServer())
        .get('/company/list')
        .query({ take: 10, skip: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalCount).toBe(1);
          expect(companyService.findAll).toHaveBeenCalled();
        });
    });

    it('should validate query params (e.g. invalid json in where)', () => {
      return request(app.getHttpServer()).get('/company/list').query({ take: -5 }).expect(400);
    });
  });

  describe('GET /company/:id', () => {
    it('should return a company by valid UUID', () => {
      return request(app.getHttpServer())
        .get(`/company/${mockCompany.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockCompany.id);
          expect(companyService.findOneBy).toHaveBeenCalledWith(
            { id: mockCompany.id },
            expect.anything(),
          );
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer()).get('/company/not-a-uuid').expect(400);
    });

    it('should handle company not found (returning null or 404)', () => {
      const randomId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      return request(app.getHttpServer()).get(`/company/${randomId}`).expect(200);
    });
  });

  describe('PATCH /company/:id', () => {
    it('should update the company', () => {
      const updateDto = { name: 'Updated Name' };

      return request(app.getHttpServer())
        .patch(`/company/${mockCompany.id}`)
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
        .delete(`/company/${mockCompany.id}`)
        .expect(200)
        .expect(() => {
          expect(companyService.deleteBy).toHaveBeenCalledWith({ id: mockCompany.id });
        });
    });
  });
});
