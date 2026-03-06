import { Test, TestingModule } from '@nestjs/testing';
import { AttemptController } from './attempt.controller';
import { JwtAuthGuard } from '../../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../../company/guards/company-role.guard';
import { mockAttemptService } from '../../mock/attempts-tests.mock';
import { mockCompany } from '../../mock/company-tests.mock';
import { mockQuiz } from '../../mock/quiz-tests.mock';
import { mockUser } from '../../mock/user-tests.mock';
import { AttemptService } from './attempt.service';

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
      const result = await controller.submitAttempt(mockUser, mockCompany.id, mockQuiz.id, dto);

      expect(service.submitAttempt).toHaveBeenCalledWith(
        mockUser,
        mockCompany.id,
        mockQuiz.id,
        dto,
      );
      expect(result).toEqual({ id: 'attempt-uuid-123', correctAnswersCount: 2 });
    });
  });
});
