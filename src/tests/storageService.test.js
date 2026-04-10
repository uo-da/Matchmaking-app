import storageService from '../services/storageService';
import chatService from '../services/chatService';

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

  test('seedSampleData includes incoming likes to the current user', () => {
    const users = storageService.seedSampleData();
    const current = users.find((user) => user.id === 'user-1');
    const pending = users.filter((user) => user.likedUserIds.includes('user-1') || user.superLikedUserIds.includes('user-1'));

    expect(current).toBeDefined();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.map((user) => user.id)).toContain('user-4');
  });

  test('seedSampleMessages stores a seeded conversation for matched users', async () => {
    storageService.seedSampleData();
    await chatService.seedSampleMessages();

    const messages = await chatService.getMessages('user-1', 'user-2');
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]).toMatchObject({ senderId: 'user-1', receiverId: 'user-2' });
    expect(messages[1]).toMatchObject({ senderId: 'user-2', receiverId: 'user-1' });
  });
});
