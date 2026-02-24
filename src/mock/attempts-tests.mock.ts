export const mockAttemptService = {
  submitAttempt: jest.fn().mockResolvedValue({ id: 'attempt-uuid-123', correctAnswersCount: 2 }),
  getUserRating: jest.fn().mockImplementation((userId, companyId) => {
    if (companyId) return Promise.resolve(0.8);
    return Promise.resolve(0.75);
  }),
};
