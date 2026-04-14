import chatService from '../services/chatService';

const CHAT_PREFIX = 'matchmaking_chat_';

beforeEach(() => {
  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith(CHAT_PREFIX) || key === 'matchmaking_chat_event') {
      window.localStorage.removeItem(key);
    }
  });
});

test('sendMessage stores a message as unread', async () => {
  const message = await chatService.sendMessage('user-1', 'user-2', 'こんにちは');
  expect(message).toMatchObject({ senderId: 'user-1', receiverId: 'user-2', text: 'こんにちは', isRead: false, type: 'message' });

  const stored = await chatService.getMessages('user-1', 'user-2');
  expect(stored).toHaveLength(1);
  expect(stored[0].isRead).toBe(false);
});

test('markMessagesAsRead marks incoming messages as read', async () => {
  await chatService.sendMessage('user-1', 'user-2', 'こんにちは');
  const updated = await chatService.markMessagesAsRead('user-2', 'user-1');

  expect(updated[0].isRead).toBe(true);
  const stored = await chatService.getMessages('user-2', 'user-1');
  expect(stored[0].isRead).toBe(true);
});
