import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../../company/guards/company-role.guard';
import {
  mockAnalyticsService,
  mockCompanyScoresRaw,
  mockCompanyUsersRaw,
  mockDynamicsRaw,
  mockLastCompletionsRaw,
} from '../../mock/analytics-tests.mock';
import { mockCompany } from '../../mock/company-tests.mock';
import { mockUser } from '../../mock/user-tests.mock';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyRolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPersonalRating', () => {
    it('should return user average question performance', async () => {
      const result = await controller.getPersonalRating(mockUser.id);
      expect(service.getUserAverageQuestionPerformance).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ rating: 80 });
    });
  });

  describe('getPersonalAverageScore', () => {
    it('should return user average quiz performance', async () => {
      const result = await controller.getPersonalAverageScore(mockUser.id);
      expect(service.getUserAverageQuizPerformance).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ averageScore: 75.5 });
    });
  });

  describe('getPersonalScoresDynamics', () => {
    it('should return user scores with time dynamics mapped to DTO', async () => {
      const result = await controller.getPersonalScoresDynamics(mockUser.id);
      expect(service.getUserScoresWithTimeDynamics).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject(mockDynamicsRaw[0]);
    });
  });

  describe('getPersonalLastCompletions', () => {
    it('should return user last completions mapped to DTO', async () => {
      const result = await controller.getPersonalLastCompletions(mockUser.id);
      expect(service.getUserLastCompletions).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        ...mockLastCompletionsRaw[0],
        lastCompletionTime: new Date(mockLastCompletionsRaw[0].lastCompletionTime),
      });
    });
  });

  describe('getCompanyScoresDynamics', () => {
    it('should return company scores dynamics mapped to DTO', async () => {
      const result = await controller.getCompanyScoresDynamics(mockCompany.id);
      expect(service.getCompanyScoresWithTimeDynamics).toHaveBeenCalledWith(mockCompany.id);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        ...mockCompanyScoresRaw[0],
        date: new Date(mockCompanyScoresRaw[0].date),
      });
    });
  });

  describe('getCompanyUserScoresDynamics', () => {
    it('should return specific user scores dynamics mapped to DTO', async () => {
      const result = await controller.getCompanyUserScoresDynamics(mockCompany.id, mockUser.id);
      expect(service.getUserScoresWithTimeDynamics).toHaveBeenCalledWith(
        mockUser.id,
        mockCompany.id,
      );
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject(mockDynamicsRaw[0]);
    });
  });

  describe('getCompanyUsersLastCompletions', () => {
    it('should return company users last completions mapped to DTO', async () => {
      const result = await controller.getCompanyUsersLastCompletions(mockCompany.id);
      expect(service.getCompanyUsersLastCompletions).toHaveBeenCalledWith(mockCompany.id);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        ...mockCompanyUsersRaw[0],
        lastCompletionTime: new Date(mockCompanyUsersRaw[0].lastCompletionTime),
      });
    });
  });
});
