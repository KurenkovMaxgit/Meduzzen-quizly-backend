import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { NotificationStatus } from '../utils/enums';
import { mockUser } from '../mock/user-tests.mock';
import { mockNotification, mockNotificationService } from '../mock/notification-tests.mock';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const query = { skip: 0, take: 10 };

      const result = await controller.findAll(mockUser.id, query as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual({ items: [{ id: mockNotification }], totalCount: 1 });
    });
  });

  describe('getCount', () => {
    it('should return count for the specified status', async () => {
      const result = await controller.getCount(mockUser.id, NotificationStatus.READ);

      expect(service.getCountByStatus).toHaveBeenCalledWith(mockUser.id, NotificationStatus.READ);
      expect(result).toEqual({ count: 5, status: NotificationStatus.READ });
    });

    it('should default to UNREAD if no status is provided', async () => {
      const result = await controller.getCount(mockUser.id);

      expect(service.getCountByStatus).toHaveBeenCalledWith(mockUser.id, NotificationStatus.UNREAD);
      expect(result).toEqual({ count: 5, status: NotificationStatus.UNREAD });
    });
  });

  describe('updateStatus', () => {
    it('should bulk update status and return affected count', async () => {
      const notificationIds = [mockNotification.id];

      const result = await controller.updateStatus(
        mockUser.id,
        NotificationStatus.READ,
        notificationIds,
      );

      expect(service.updateStatus).toHaveBeenCalledWith(
        notificationIds,
        mockUser.id,
        NotificationStatus.READ,
      );
      expect(result).toEqual({ updatedCount: 2 });
    });

    it('should return 0 if affected is undefined', async () => {
      mockNotificationService.updateStatus.mockResolvedValueOnce({});

      const result = await controller.updateStatus(mockUser.id, NotificationStatus.READ, []);

      expect(result).toEqual({ updatedCount: 0 });
    });
  });
});
