import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { ActionController } from '../src/action/action.controller';
import { ActionService } from '../src/action/action.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';
import { ActionDecision, ActionType } from '../src/utils/enums';
import { mockUser } from '../src/mock/user-tests.mock';
import { mockCompany } from '../src/mock/company-tests.mock';
import { mockInvite, mockActionService, mockRequest } from '../src/mock/actions-tests.mock';
import { mockCompanyRolesGuard, mockJwtAuthGuard } from '../src/mock/auth-tests.mock';

describe('ActionController (e2e)', () => {
  let app: INestApplication;
  let actionService: ActionService;
  const baseUrl = `/action`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ActionController],
      providers: [
        {
          provide: ActionService,
          useValue: mockActionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(CompanyRolesGuard)
      .useValue(mockCompanyRolesGuard)
      .compile();

    actionService = moduleFixture.get<ActionService>(ActionService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /action/invite/:subject/to/:companyId', () => {
    it('should create an invite', () => {
      const targetUserId = '5a0e32a7-5d95-42a1-bb0e-d4ad33c4c1bb';

      return request(app.getHttpServer())
        .post(`${baseUrl}/invite/${targetUserId}/to/${mockCompany.id}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toEqual(mockInvite.id);
          expect(actionService.create).toHaveBeenCalledWith(
            mockUser.id,
            mockCompany.id,
            expect.objectContaining({
              subject: targetUserId,
              type: ActionType.INVITE,
            }),
          );
        });
    });

    it('should fail with 400 if UUIDs are invalid', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/invite/bad-id/to/bad-company`)
        .expect(400);
    });
  });

  describe('POST /action/invite/:id/cancel', () => {
    it('should cancel an invite', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/invite/${mockInvite.id}/cancel`)
        .expect(201)
        .expect((res) => {
          expect(actionService.cancelAction).toHaveBeenCalledWith(mockInvite.id, mockUser.id);
        });
    });
  });

  describe('POST /action/invite/:id/:action', () => {
    it('should accept an invite', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/invite/${mockInvite.id}/${ActionDecision.ACCEPT}`)
        .expect(201)
        .expect((res) => {
          expect(actionService.manageInvite).toHaveBeenCalledWith(
            mockInvite.id,
            mockUser.id,
            ActionDecision.ACCEPT,
          );
        });
    });

    it('should fail with 400 if action is invalid enum', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/invite/${mockInvite.id}/invalid-decision`)
        .expect(400);
    });
  });

  describe('POST /action/request/:companyId', () => {
    it('should create a join request', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/request/${mockCompany.id}`)
        .expect(201)
        .expect((res) => {
          expect(actionService.create).toHaveBeenCalledWith(
            mockUser.id,
            mockCompany.id,
            expect.objectContaining({
              subject: mockUser.id,
              type: ActionType.REQUEST,
            }),
          );
        });
    });
  });

  describe('POST /action/request/:id/cancel', () => {
    it('should cancel a join request', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/request/${mockRequest.id}/cancel`)
        .expect(201)
        .expect(() => {
          expect(actionService.cancelAction).toHaveBeenCalledWith(mockRequest.id, mockUser.id);
        });
    });
  });

  describe('POST /action/request/:id/:action', () => {
    it('should accept a join request', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/request/${mockRequest.id}/${ActionDecision.ACCEPT}`)
        .expect(201)
        .expect(() => {
          expect(actionService.manageRequest).toHaveBeenCalledWith(
            mockRequest.id,
            mockUser.id,
            ActionDecision.ACCEPT,
          );
        });
    });
  });

  describe('GET /action/list/:actionType', () => {
    it('should return user actions (my actions)', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/list/${ActionType.INVITE}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(actionService.findAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              subject: { id: mockUser.id },
              type: ActionType.INVITE,
            }),
          );
        });
    });
  });

  describe('GET /action/list/:companyId/:actionType', () => {
    it('should return company actions', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/list/${mockCompany.id}/${ActionType.REQUEST}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(actionService.findAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              company: { id: mockCompany.id },
              type: ActionType.REQUEST,
            }),
          );
        });
    });

    it('should fail with 400 on invalid enum type', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/list/${mockCompany.id}/invalid-type`)
        .expect(400);
    });
  });
});
