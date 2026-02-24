import { Test, TestingModule } from '@nestjs/testing';
import { AttemptController } from './attempt.controller';
import { AttemptService } from './attempt.service';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../company/guards/company-role.guard';
import { mockAttemptService } from '../mock/attempts-tests.mock';
import { mockCompany } from '../mock/company-tests.mock';
import { mockQuiz } from '../mock/quiz-tests.mock';
import { mockUser } from '../mock/user-tests.mock';

describe('AttemptController', () => {
  let controller: AttemptController;
  let service: AttemptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttemptController],
      providers: [
        {
          provide: AttemptService,
          useValue: mockAttemptService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyRolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AttemptController>(AttemptController);
    service = module.get<AttemptService>(AttemptService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitAttempt', () => {
    it('should submit an attempt', async () => {
      const dto = { userAnswers: {} };
      const result = await controller.submitAttempt(mockUser.id, mockCompany.id, mockQuiz.id, dto);

      expect(service.submitAttempt).toHaveBeenCalledWith(
        mockUser.id,
        mockCompany.id,
        mockQuiz.id,
        dto,
      );
      expect(result).toEqual({ id: 'attempt-uuid-123', correctAnswersCount: 2 });
    });
  });

  describe('getCompanyRating', () => {
    it('should get rating for a specific company', async () => {
      const result = await controller.getCompanyRating(mockUser.id, mockCompany.id);

      expect(service.getUserRating).toHaveBeenCalledWith(mockUser.id, mockCompany.id);
      expect(result).toEqual({ rating: 0.8 });
    });
  });

  describe('getOverallRating', () => {
    it('should get overall system rating', async () => {
      const result = await controller.getOverallRating(mockUser.id);

      expect(service.getUserRating).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ rating: 0.75 });
    });
  });
});
