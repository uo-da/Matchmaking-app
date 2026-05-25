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

  test('deleteAccount removes user and related local data', async () => {
    storageService.seedSampleData();
    storageService.saveCurrentSession({ id: 'user-1' });
    window.localStorage.setItem('currentUser', JSON.stringify({ id: 'user-1' }));
    window.localStorage.setItem(
      'matchmaking_chat_user-1-user-2',
      JSON.stringify([{ id: 'm1', text: 'hello' }])
    );
    window.localStorage.setItem(
      'matchmaking_editor_files_user-1-user-2',
      JSON.stringify([{ id: 'f1', name: 'memo.txt', content: '' }])
    );
    window.localStorage.setItem('matchmaking_notifications', JSON.stringify([
      { id: 'n1', fromUserId: 'user-1', toUserId: 'user-2', read: false },
      { id: 'n2', fromUserId: 'user-2', toUserId: 'user-1', read: false },
      { id: 'n3', fromUserId: 'user-3', toUserId: 'user-2', read: false }
    ]));

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    const deleted = await storageService.deleteAccount('user-1');
    expect(deleted).toBe(true);

    const users = storageService.getUsers();
    expect(users.find((user) => user.id === 'user-1')).toBeUndefined();
    expect(users.some((user) => (user.matches || []).includes('user-1'))).toBe(false);
    expect(users.some((user) => (user.likedUserIds || []).includes('user-1'))).toBe(false);
    expect(users.some((user) => (user.superLikedUserIds || []).includes('user-1'))).toBe(false);
    expect(users.some((user) => (user.nopedUserIds || []).includes('user-1'))).toBe(false);
    expect(window.localStorage.getItem('matchmaking_chat_user-1-user-2')).toBeNull();
    expect(window.localStorage.getItem('matchmaking_editor_files_user-1-user-2')).toBeNull();
    expect(window.localStorage.getItem('matchmaking_session')).toBeNull();
    expect(window.localStorage.getItem('currentUser')).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('matchmaking_notifications'))).toEqual([
      { id: 'n3', fromUserId: 'user-3', toUserId: 'user-2', read: false }
    ]);
  });

  test('deleteAccount throws when server-side delete fails for non-demo users', async () => {
    storageService.seedSampleData();
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(storageService.deleteAccount('user-1')).rejects.toThrow('network down');
  });
});
