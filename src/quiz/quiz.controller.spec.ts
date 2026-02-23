import { Test, TestingModule } from '@nestjs/testing';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../company/guards/company-role.guard';
import { PrivateReturnQuizDto } from './dto/quiz/return-quiz.dto';
import { mockQuiz, mockQuizService } from '../mock/quiz-tests.mock';
import { mockCompany } from '../mock/company-tests.mock';

describe('QuizController', () => {
  let controller: QuizController;
  let service: QuizService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CompanyRolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<QuizController>(QuizController);
    service = module.get<QuizService>(QuizService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a quiz and return it mapped to PrivateReturnQuizDto', async () => {
      const createDto = { title: 'Test Quiz', questions: [] };

      const result = await controller.create(mockCompany.id, createDto as any);

      expect(service.create).toHaveBeenCalledWith(mockCompany.id, createDto);
      expect(result).toBeInstanceOf(PrivateReturnQuizDto);
      expect(result.id).toEqual(mockQuiz.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated quizzes mapped to PrivateReturnQuizDto', async () => {
      const query = { take: 10, skip: 0 };

      const result = await controller.findAll(mockCompany.id, query as any);

      expect(service.findAll).toHaveBeenCalledWith(mockCompany.id, query);
      expect(result.items[0]).toBeInstanceOf(PrivateReturnQuizDto);
      expect(result.totalCount).toBe(1);
      expect(result.items[0].id).toEqual(mockQuiz.id);
    });
  });

  describe('updateOneById', () => {
    it('should update a quiz and return it mapped to PrivateReturnQuizDto', async () => {
      const updateDto = { title: 'Updated' };

      const result = await controller.updateOneById(mockQuiz.id, mockCompany.id, updateDto as any);

      expect(service.updateBy).toHaveBeenCalledWith(
        { id: mockQuiz.id, company: { id: mockCompany.id } },
        updateDto,
      );
      expect(result).toBeInstanceOf(PrivateReturnQuizDto);
      expect(result.title).toEqual('Updated');
    });
  });

  describe('deleteOneById', () => {
    it('should delete a quiz', async () => {
      const result = await controller.deleteOneById(mockQuiz.id, mockCompany.id);

      expect(service.deleteBy).toHaveBeenCalledWith({
        id: mockQuiz.id,
        company: { id: mockCompany.id },
      });
      expect(result).toEqual({ affected: 1 });
    });
  });
});
