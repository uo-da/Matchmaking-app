const CHAT_PREFIX = 'matchmaking_chat_';
const CHAT_EVENT_KEY = 'matchmaking_chat_event';

const API_BASE = process.env.REACT_APP_API_BASE || '';
const isLocalMode = process.env.NODE_ENV !== 'production';

const getFallbackApiBase = () => {
  if (API_BASE) {
    return API_BASE;
  }
  if (typeof window === 'undefined') {
    return '';
  }
  const host = window.location.host;
  if (host.includes('-3000.app.github.dev')) {
    return `${window.location.protocol}//${host.replace('-3000.app.github.dev', '-5000.app.github.dev')}`;
  }
  return '';
};

const fetchJson = async (path, options = {}) => {
  const attemptFetch = async (base) => {
    const response = await fetch(`${base}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`API request failed: ${response.status} ${message}`);
    }
    return response.json();
  };

  try {
    return await attemptFetch(API_BASE);
  } catch (error) {
    const fallbackBase = getFallbackApiBase();
    if (fallbackBase && fallbackBase !== API_BASE) {
      return await attemptFetch(fallbackBase);
    }
    throw error;
  }
};

let socket = null;
const listeners = new Set();

const readLocalMessages = (matchKey) => {
  if (typeof window === 'undefined') {
    return [];
  }
  const key = CHAT_PREFIX + matchKey;
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalMessages = (matchKey, messages) => {
  if (typeof window === 'undefined') {
    return;
  }
  const key = CHAT_PREFIX + matchKey;
  try {
    window.localStorage.setItem(key, JSON.stringify(messages));
  } catch {
    // ignore write errors
  }
};

const connectWebSocket = () => {
  if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
    return;
  }

  let endpoint = '';
  const base = API_BASE || getFallbackApiBase();
  try {
    if (base) {
      const url = new URL(base, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      endpoint = url.toString();
    } else {
      const url = new URL(window.location.origin);
      url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      endpoint = url.toString();
    }
  } catch (error) {
    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    endpoint = `${scheme}//${window.location.host}`;
  }

  socket = new WebSocket(endpoint);

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      listeners.forEach((callback) => callback(payload));
    } catch {
      // ignore malformed messages
    }
  });

  socket.addEventListener('close', () => {
    socket = null;
    setTimeout(connectWebSocket, 1500);
  });
};

const chatService = {
  getMatchKey(userId, matchId) {
    return [userId, matchId].sort().join('-');
  },

  async seedSampleMessages() {
    if (!isLocalMode || typeof window === 'undefined') {
      return;
    }
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
    if (isLocalMode) {
      const matchKey = this.getMatchKey(userId, matchId);
      return readLocalMessages(matchKey);
    }
    return fetchJson(`/api/chats/${matchId}/messages`);
  },

  async sendMessage(senderId, receiverId, text) {
    if (isLocalMode) {
      const matchKey = this.getMatchKey(senderId, receiverId);
      const messages = await this.getMessages(senderId, receiverId);
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        senderId,
        receiverId,
        text,
        timestamp: Date.now(),
        matchKey,
        isRead: false,
        type: 'message'
      };
      const next = [...messages, message];
      writeLocalMessages(matchKey, next);
      this.notify(message);
      return message;
    }
    return fetchJson(`/api/chats/${receiverId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async markMessagesAsRead(userId, matchId) {
    if (isLocalMode) {
      const matchKey = this.getMatchKey(userId, matchId);
      const messages = await this.getMessages(userId, matchId);
      let changed = false;
      const updated = messages.map((message) => {
        if (message.receiverId === userId && !message.isRead) {
          changed = true;
          return { ...message, isRead: true };
        }
        return message;
      });
      if (changed) {
        writeLocalMessages(matchKey, updated);
        this.notify({
          type: 'read',
          matchKey,
          matchId,
          readBy: userId,
          timestamp: Date.now()
        });
      }
      return updated;
    }
    return fetchJson(`/api/chats/${matchId}/read`, {
      method: 'POST'
    });
  },

  notify(message) {
    if (isLocalMode) {
      const payload = { ...message, timestamp: Date.now() };
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('matchmaking-chat');
        channel.postMessage(payload);
        channel.close();
      } else {
        window.localStorage.setItem(CHAT_EVENT_KEY, JSON.stringify(payload));
      }
    }
  },

  subscribe(callback) {
    if (isLocalMode) {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('matchmaking-chat');
        channel.onmessage = (event) => callback(event.data);
        return {
          unsubscribe: () => channel.close()
        };
      }

      const handler = (event) => {
        if (event.key === CHAT_EVENT_KEY && event.newValue) {
          callback(JSON.parse(event.newValue));
        }
      };
      window.addEventListener('storage', handler);
      return {
        unsubscribe: () => window.removeEventListener('storage', handler)
      };
    }

    listeners.add(callback);
    connectWebSocket();

    return {
      unsubscribe: () => {
        listeners.delete(callback);
      }
    };
  }
};

export default chatService;
