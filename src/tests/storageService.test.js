import storageService from '../services/storageService';

beforeEach(() => {
  window.localStorage.clear();
});

describe('storageService', () => {
  test('seedSampleData stores and returns multiple sample users', () => {
    const users = storageService.seedSampleData();
    expect(users.length).toBeGreaterThanOrEqual(6);
    expect(storageService.getUsers().length).toBe(users.length);
  });

  test('saveUserReaction creates a mutual match when likes are reciprocal', () => {
    const users = storageService.seedSampleData();
    const first = users[0];
    const second = users[1];

    storageService.saveUserReaction(first.id, second.id);
    storageService.saveUserReaction(second.id, first.id);

    const updatedFirst = storageService.getUserById(first.id);
    const updatedSecond = storageService.getUserById(second.id);

    expect(updatedFirst.matches).toContain(second.id);
    expect(updatedSecond.matches).toContain(first.id);
  });
});
