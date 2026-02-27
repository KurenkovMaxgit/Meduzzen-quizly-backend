import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Quiz } from '../common/entities/quiz.entity';
import { Repository, DeleteResult } from 'typeorm';
import {
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuizQuestionType, AnswerCorrectness, NotificationType } from '../utils/enums';
import { mockCompany } from '../mock/company-tests.mock';
import { mockQuizQueryBuilder, mockQuiz, mockQuizRepository } from '../mock/quiz-tests.mock';
import { mockLogger } from '../mock/common-tests.mock';

describe('QuizService', () => {
  let service: QuizService;
  let repository: Repository<Quiz>;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepository,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    repository = module.get<Repository<Quiz>>(getRepositoryToken(Quiz));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Quiz',
      questions: [
        {
          type: QuizQuestionType.SINGLE_CHOICE,
          answers: [
            { text: 'A', correctness: AnswerCorrectness.CORRECT },
            { text: 'B', correctness: AnswerCorrectness.INCORRECT },
          ],
        },
      ],
    } as any;

    it('should create, return a fully populated quiz, and emit notification', async () => {
      mockQuizRepository.save.mockResolvedValue({ id: 'new-quiz-id' });
      mockQuizRepository.findOne.mockResolvedValue({ ...mockQuiz, id: 'new-quiz-id' });

      const result = await service.create(mockCompany.id, createDto);

      expect(repository.save).toHaveBeenCalledWith({
        ...createDto,
        company: { id: mockCompany.id },
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'new-quiz-id' },
        relations: ['company', 'questions', 'questions.answers'],
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.broadcast_to_company', {
        companyId: mockQuiz.company.id,
        type: NotificationType.QUIZ_CREATED,
        message: `A new quiz "${mockQuiz.title}" is available!`,
        metadata: { quizId: 'new-quiz-id' },
      });

      expect(result).toEqual({ ...mockQuiz, id: 'new-quiz-id' });
    });

    it('should throw InternalServerErrorException if findOne fails after save', async () => {
      mockQuizRepository.save.mockResolvedValue({ id: 'new-quiz-id' });
      mockQuizRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockCompany.id, createDto)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if SINGLE_CHOICE question has 0 correct answers', async () => {
      const invalidDto = {
        title: 'Bad Quiz',
        questions: [
          {
            type: QuizQuestionType.SINGLE_CHOICE,
            answers: [{ correctness: AnswerCorrectness.INCORRECT }],
          },
        ],
      } as any;

      await expect(service.create(mockCompany.id, invalidDto)).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if MULTIPLE_CHOICE question has 0 correct answers', async () => {
      const invalidDto = {
        title: 'Bad Quiz',
        questions: [
          {
            type: QuizQuestionType.MULTIPLE_CHOICE,
            answers: [{ correctness: AnswerCorrectness.INCORRECT }],
          },
        ],
      } as any;

      await expect(service.create(mockCompany.id, invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated quizzes for a specific company', async () => {
      const query = { take: 10, skip: 0, search: 'Test' };

      const result = await service.findAll(mockCompany.id, query as any);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('quiz');
      expect(mockQuizQueryBuilder.andWhere).toHaveBeenCalledWith('quiz.companyId = :companyId', {
        companyId: mockCompany.id,
      });
      expect(mockQuizQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({ items: [mockQuiz], totalCount: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should return a quiz if found', async () => {
      mockQuizRepository.findOne.mockResolvedValue(mockQuiz);

      const result = await service.findOneBy({ id: mockQuiz.id });
      expect(result).toEqual(mockQuiz);
    });

    it('should filter invalid relations and log a warning', async () => {
      mockQuizRepository.findOne.mockResolvedValue(mockQuiz);

      await service.findOneBy({ id: mockQuiz.id }, { relations: ['questions', 'invalidRelation'] });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Blocked attempt to access invalid relations'),
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['questions'],
        }),
      );
    });
  });

  describe('updateBy', () => {
    const updateDto = {
      title: 'Updated Quiz',
      questions: [
        {
          type: QuizQuestionType.SINGLE_CHOICE,
          answers: [{ correctness: AnswerCorrectness.CORRECT }],
        },
      ],
    } as any;

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockQuizRepository.findOne.mockResolvedValue(null);

      await expect(service.updateBy({ id: '999' }, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate questions, save, and return updated quiz', async () => {
      mockQuizRepository.findOne.mockResolvedValueOnce(mockQuiz);
      mockQuizRepository.save.mockResolvedValue({ id: mockQuiz.id });
      mockQuizRepository.findOne.mockResolvedValueOnce({ ...mockQuiz, title: 'Updated Quiz' });

      const result = await service.updateBy({ id: mockQuiz.id }, updateDto);

      expect(repository.save).toHaveBeenCalledWith({
        id: mockQuiz.id,
        ...updateDto,
      });
      expect(result.title).toEqual('Updated Quiz');
    });
  });

  describe('deleteBy', () => {
    it('should delete quiz if found', async () => {
      mockQuizRepository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      const result = await service.deleteBy({ id: mockQuiz.id });

      expect(repository.delete).toHaveBeenCalledWith({ id: mockQuiz.id });
      expect(result.affected).toEqual(1);
    });

    it('should throw NotFoundException if no quiz affected', async () => {
      mockQuizRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.deleteBy({ id: '999' })).rejects.toThrow(NotFoundException);
    });
  });
});
