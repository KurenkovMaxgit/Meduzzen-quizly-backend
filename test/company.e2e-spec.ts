import { Test, TestingModule } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyModule } from '../src/company/company.module';
import { Company } from '../src/common/entities/company.entity';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CreateCompanyDto } from '../src/company/dto/create-company.dto';
import { DataSource } from 'typeorm';
import { mockCompanyRepository, mockDataSource, mockCompany } from '../src/mock/company-tests.mock';
import { mockUser } from '../src/mock/user-tests.mock';
import { CompanyUser } from '../src/common/entities/company-user.entity';

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useValue: mockDataSource,
    },
  ],
  exports: [DataSource], // Export it so other modules can use it
})
class MockDatabaseModule {}

const mockJwtAuthGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  },
};

describe('CompanyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CompanyModule, MockDatabaseModule],
    })
      .overrideProvider(getRepositoryToken(Company))
      .useValue(mockCompanyRepository)
      .overrideProvider(getRepositoryToken(CompanyUser))
      .useValue(mockCompanyRepository)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/company (POST)', () => {
    it('should create a company', () => {
      const createDto: CreateCompanyDto = {
        name: 'Hubabuba Corp',
        description: 'We make hubabuba',
      };

      return request(app.getHttpServer())
        .post('/company')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toEqual(createDto.name);
          expect(mockDataSource.transaction).toHaveBeenCalled();
        });
    });

    it('should fail with 400 on invalid data', () => {
      return request(app.getHttpServer()).post('/company').send({ name: '' }).expect(400);
    });
  });

  describe('/company (GET)', () => {
    it('should return paginated list', () => {
      return request(app.getHttpServer())
        .get('/company?take=10&skip=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toBeInstanceOf(Array);
          expect(res.body.totalCount).toBe(1);
        });
    });
  });

  describe('/company/:id (GET)', () => {
    it('should return a company by ID', () => {
      mockCompanyRepository.findOne.mockResolvedValue(mockCompany);

      return request(app.getHttpServer())
        .get(`/company/${mockCompany.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockCompany.id);
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer()).get('/company/not-a-uuid').expect(400);
    });
  });

  describe('/company/:id (PATCH)', () => {
    it('should update a company', () => {
      mockCompanyRepository.findOneBy.mockResolvedValue(mockCompany);
      mockCompanyRepository.save.mockResolvedValue({
        ...mockCompany,
        name: 'Updated Name',
      });

      return request(app.getHttpServer())
        .patch(`/company/${mockCompany.id}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toEqual('Updated Name');
        });
    });

    it('should return 404 if company not found', () => {
      mockCompanyRepository.findOneBy.mockResolvedValue(null);

      return request(app.getHttpServer())
        .patch(`/company/${mockCompany.id}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('/company/:id (DELETE)', () => {
    it('should delete a company', () => {
      mockCompanyRepository.delete.mockResolvedValue({ affected: 1 });

      return request(app.getHttpServer()).delete(`/company/${mockCompany.id}`).expect(200);
    });

    it('should return 404 if nothing deleted', () => {
      mockCompanyRepository.delete.mockResolvedValue({ affected: 0 });

      return request(app.getHttpServer()).delete(`/company/${mockCompany.id}`).expect(404);
    });
  });
});
