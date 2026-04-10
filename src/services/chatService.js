const CHAT_PREFIX = 'matchmaking_chat_';

const chatService = {
  getMatchKey(userId, matchId) {
    return [userId, matchId].sort().join('-');
  },

  async seedSampleMessages() {
    const matchKey = this.getMatchKey('user-1', 'user-2');
    const storageKey = CHAT_PREFIX + matchKey;
    if (window.localStorage.getItem(storageKey)) {
      return;
    }
    const messages = [
      {
        senderId: 'user-1',
        receiverId: 'user-2',
        text: 'こんにちは！プロジェクトの話をしてみませんか？',
        timestamp: 1710000000000,
        matchKey
      },
      {
        senderId: 'user-2',
        receiverId: 'user-1',
        text: 'いいですね。どんなスタックで進めていますか？',
        timestamp: 1710000005000,
        matchKey
      }
    ];
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  },

  async getMessages(userId, matchId) {
    const key = CHAT_PREFIX + this.getMatchKey(userId, matchId);
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async sendMessage(senderId, receiverId, text) {
    const matchKey = this.getMatchKey(senderId, receiverId);
    const key = CHAT_PREFIX + matchKey;
    const messages = await this.getMessages(senderId, receiverId);
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      senderId,
      receiverId,
      text,
      timestamp: Date.now(),
      matchKey
    };
    const next = [...messages, message];
    window.localStorage.setItem(key, JSON.stringify(next));
    this.notify(message);
    return message;
  },

  notify(message) {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('matchmaking-chat');
      channel.postMessage(message);
      channel.close();
    } else {
      window.localStorage.setItem('matchmaking_chat_event', JSON.stringify({ ...message, timestamp: Date.now() }));
    }
  },

  subscribe(callback) {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('matchmaking-chat');
      channel.onmessage = (event) => callback(event.data);
      return {
        unsubscribe: () => channel.close()
      };
    }
    const handler = (event) => {
      if (event.key === 'matchmaking_chat_event' && event.newValue) {
        callback(JSON.parse(event.newValue));
      }
    };
    window.addEventListener('storage', handler);
    return {
      unsubscribe: () => window.removeEventListener('storage', handler)
    };
  }
};

export default chatService;
