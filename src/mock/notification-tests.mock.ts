import { NotificationStatus } from '../utils/enums';

export const mockNotification = {
  id: 'acf2a030-6dd2-4134-a9fc-5754c0e14800',
  status: NotificationStatus.UNREAD,
};

export const mockNotificationService = {
  findAll: jest.fn().mockResolvedValue({ items: [mockNotification], totalCount: 1 }),
  getCountByStatus: jest.fn().mockResolvedValue(5),
  updateStatus: jest.fn().mockResolvedValue({ affected: 2 }),
};
