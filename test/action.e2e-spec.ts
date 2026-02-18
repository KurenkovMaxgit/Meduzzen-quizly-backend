import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { ActionController } from '../src/action/action.controller';
import { ActionService, ActionDecision } from '../src/action/action.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';
import { ActionStatus, ActionType } from '../src/utils/enums';
import { mockUser } from '../src/mock/user-tests.mock';
import { mockCompany } from '../src/mock/company-tests.mock';

describe('ActionController (e2e)', () => {
  let app: INestApplication;
  let actionService: ActionService;

  const mockAction = {
    id: '5a0e32a7-5d95-42a1-bb0e-d4ad33c4c1bb',
    type: ActionType.INVITE,
    status: ActionStatus.PENDING,
    company: mockCompany,
    subject: mockUser,
  };

  const mockActionService = {
    create: jest.fn().mockResolvedValue(mockAction),
    cancelAction: jest.fn().mockResolvedValue({ ...mockAction, status: 'canceled' }),
    manageInvite: jest.fn().mockResolvedValue({ ...mockAction, status: 'accepted' }),
    manageRequest: jest.fn().mockResolvedValue({ ...mockAction, status: 'accepted' }),
    findAll: jest.fn().mockResolvedValue({ items: [mockAction], totalCount: 1 }),
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
        .post(`/action/invite/${targetUserId}/to/${mockCompany.id}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toEqual(mockAction.id);
          expect(actionService.create).toHaveBeenCalledWith(
            mockUser.id,
            expect.objectContaining({
              subject: targetUserId,
              company: mockCompany.id,
              type: ActionType.INVITE,
            }),
          );
        });
    });

    it('should fail with 400 if UUIDs are invalid', () => {
      return request(app.getHttpServer()).post(`/action/invite/bad-id/to/bad-company`).expect(400);
    });
  });

  describe('POST /action/invite/:id/cancel', () => {
    it('should cancel an invite', () => {
      return request(app.getHttpServer())
        .post(`/action/invite/${mockAction.id}/cancel`)
        .expect(201)
        .expect((res) => {
          expect(actionService.cancelAction).toHaveBeenCalledWith(mockAction.id, mockUser.id);
        });
    });
  });

  describe('POST /action/invite/:id/:action', () => {
    it('should accept an invite', () => {
      return request(app.getHttpServer())
        .post(`/action/invite/${mockAction.id}/${ActionDecision.ACCEPT}`)
        .expect(201)
        .expect((res) => {
          expect(actionService.manageInvite).toHaveBeenCalledWith(
            mockAction.id,
            mockUser.id,
            ActionDecision.ACCEPT,
          );
        });
    });

    it('should fail with 400 if action is invalid enum', () => {
      return request(app.getHttpServer())
        .post(`/action/invite/${mockAction.id}/invalid-decision`)
        .expect(400);
    });
  });

  describe('POST /action/request/:companyId', () => {
    it('should create a join request', () => {
      return request(app.getHttpServer())
        .post(`/action/request/${mockCompany.id}`)
        .expect(201)
        .expect((res) => {
          expect(actionService.create).toHaveBeenCalledWith(
            mockUser.id,
            expect.objectContaining({
              subject: mockUser.id,
              company: mockCompany.id,
              type: ActionType.REQUEST,
            }),
          );
        });
    });
  });

  describe('POST /action/request/:id/cancel', () => {
    it('should cancel a join request', () => {
      return request(app.getHttpServer())
        .post(`/action/request/${mockAction.id}/cancel`)
        .expect(201)
        .expect(() => {
          expect(actionService.cancelAction).toHaveBeenCalledWith(mockAction.id, mockUser.id);
        });
    });
  });

  describe('POST /action/request/:id/:action', () => {
    it('should accept a join request', () => {
      return request(app.getHttpServer())
        .post(`/action/request/${mockAction.id}/${ActionDecision.ACCEPT}`)
        .expect(201)
        .expect(() => {
          expect(actionService.manageRequest).toHaveBeenCalledWith(
            mockAction.id,
            mockUser.id,
            ActionDecision.ACCEPT,
          );
        });
    });
  });

  describe('GET /action/list/:actionType', () => {
    it('should return user actions (my actions)', () => {
      return request(app.getHttpServer())
        .get(`/action/list/${ActionType.INVITE}`)
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
        .get(`/action/list/${mockCompany.id}/${ActionType.REQUEST}`)
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
        .get(`/action/list/${mockCompany.id}/invalid-type`)
        .expect(400);
    });
  });
});
