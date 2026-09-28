import { NotificationStatus } from '../utils/enums';

export const mockNotification = {
  id: 'acf2a030-6dd2-4134-a9fc-5754c0e14800',
  status: NotificationStatus.UNREAD,
};

export const mockNotificationRepository = {
  createQueryBuilder: jest.fn(() => mockNotificationQueryBuilder),
  save: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  manager: {
    createQueryBuilder: jest.fn(() => mockNotificationManagerQueryBuilder),
  },
};

export const mockNotificationQueryBuilder = {
  alias: 'notification',
  andWhere: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[{ id: mockNotification.id }], 1]),
};

export const mockNotificationManagerQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
};

export const mockNotificationService = {
  findAll: jest.fn().mockResolvedValue({ items: [mockNotification], totalCount: 1 }),
  getCountByStatus: jest.fn().mockResolvedValue(5),
  updateStatus: jest.fn().mockResolvedValue({ affected: 2 }),
  checkAndNotifyLapsedUsers: jest.fn(),
};
