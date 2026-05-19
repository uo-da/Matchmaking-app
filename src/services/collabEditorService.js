import chatService from './chatService';

const API_BASE = process.env.REACT_APP_API_BASE || '';
const LOCAL_EDITOR_PREFIX = 'matchmaking_editor_files_';
const LOCAL_EDITOR_EVENT_KEY = 'matchmaking_editor_event';

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
      return attemptFetch(fallbackBase);
    }
    throw error;
  }
};

const getLocalStorageKey = (userId, matchId) => `${LOCAL_EDITOR_PREFIX}${chatService.getMatchKey(userId, matchId)}`;

const readLocalFiles = (userId, matchId) => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(userId, matchId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalFiles = (userId, matchId, files) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(getLocalStorageKey(userId, matchId), JSON.stringify(files));
  } catch {
    // ignore storage write failures
  }
};

const emitLocalEditorEvent = (event) => {
  if (typeof window === 'undefined') {
    return;
  }
  const payload = { ...event, timestamp: Date.now() };
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('matchmaking-editor');
    channel.postMessage(payload);
    channel.close();
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_EDITOR_EVENT_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage write failures
  }
};

const toLocalEditorFile = (userId, matchId, file) => ({
  id: file.id,
  name: file.name,
  content: file.content || '',
  updatedBy: file.updatedBy || userId,
  updatedAt: file.updatedAt || Date.now(),
  matchKey: file.matchKey || chatService.getMatchKey(userId, matchId)
});

const collabEditorService = {
  async getFiles(userId, matchId) {
    if (!userId || !matchId) {
      return [];
    }
    try {
      const files = await fetchJson(`/api/chats/${matchId}/editor/files`);
      if (Array.isArray(files)) {
        writeLocalFiles(userId, matchId, files);
        return files;
      }
      return [];
    } catch {
      return readLocalFiles(userId, matchId);
    }
  },

  async createFile(userId, matchId, name) {
    if (!userId || !matchId) {
      return null;
    }
    try {
      const created = await fetchJson(`/api/chats/${matchId}/editor/files`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const localFiles = readLocalFiles(userId, matchId);
      const nextLocalFiles = localFiles.some((file) => file.id === created.id)
        ? localFiles.map((file) => (file.id === created.id ? created : file))
        : [...localFiles, created];
      writeLocalFiles(userId, matchId, nextLocalFiles);
      return created;
    } catch {
      const localFile = toLocalEditorFile(userId, matchId, {
        id: `local-file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: typeof name === 'string' && name.trim() ? name.trim() : 'memo.txt',
        content: '',
        updatedBy: userId
      });
      const localFiles = readLocalFiles(userId, matchId);
      const nextLocalFiles = [...localFiles, localFile];
      writeLocalFiles(userId, matchId, nextLocalFiles);
      emitLocalEditorEvent({ type: 'editor:file-created', matchKey: localFile.matchKey, file: localFile });
      return localFile;
    }
  },

  async updateFile(userId, matchId, fileId, payload) {
    if (!userId || !matchId || !fileId) {
      return null;
    }
    try {
      const updated = await fetchJson(`/api/chats/${matchId}/editor/files/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify(payload || {})
      });
      const localFiles = readLocalFiles(userId, matchId);
      const nextLocalFiles = localFiles.map((file) => (file.id === fileId ? updated : file));
      writeLocalFiles(userId, matchId, nextLocalFiles);
      return updated;
    } catch {
      const localFiles = readLocalFiles(userId, matchId);
      const existing = localFiles.find((file) => file.id === fileId);
      if (!existing) {
        return null;
      }
      const updated = toLocalEditorFile(userId, matchId, {
        ...existing,
        ...payload,
        id: fileId,
        updatedBy: userId,
        updatedAt: Date.now()
      });
      const nextLocalFiles = localFiles.map((file) => (file.id === fileId ? updated : file));
      writeLocalFiles(userId, matchId, nextLocalFiles);
      emitLocalEditorEvent({ type: 'editor:file-updated', matchKey: updated.matchKey, file: updated });
      return updated;
    }
  },

  async deleteFile(userId, matchId, fileId) {
    if (!userId || !matchId || !fileId) {
      return null;
    }
    try {
      const removed = await fetchJson(`/api/chats/${matchId}/editor/files/${fileId}`, {
        method: 'DELETE'
      });
      const localFiles = readLocalFiles(userId, matchId);
      const nextLocalFiles = localFiles.filter((file) => file.id !== fileId);
      writeLocalFiles(userId, matchId, nextLocalFiles);
      return removed;
    } catch {
      const localFiles = readLocalFiles(userId, matchId);
      const exists = localFiles.some((file) => file.id === fileId);
      if (!exists) {
        return null;
      }
      const nextLocalFiles = localFiles.filter((file) => file.id !== fileId);
      writeLocalFiles(userId, matchId, nextLocalFiles);
      emitLocalEditorEvent({
        type: 'editor:file-deleted',
        matchKey: chatService.getMatchKey(userId, matchId),
        fileId
      });
      return {
        id: fileId,
        matchKey: chatService.getMatchKey(userId, matchId)
      };
    }
  },

  subscribe(userId, matchId, callback) {
    const matchKey = chatService.getMatchKey(userId, matchId);
    const chatChannel = chatService.subscribe((event) => {
      if (!event || !event.type || !event.type.startsWith('editor:')) {
        return;
      }
      if (event.matchKey !== matchKey) {
        return;
      }
      callback(event);
    });

    let broadcastChannel = null;
    let storageHandler = null;

    if (typeof window !== 'undefined') {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('matchmaking-editor');
        broadcastChannel.onmessage = (event) => {
          if (!event?.data || event.data.matchKey !== matchKey) {
            return;
          }
          callback(event.data);
        };
      } else {
        storageHandler = (event) => {
          if (event.key !== LOCAL_EDITOR_EVENT_KEY || !event.newValue) {
            return;
          }
          try {
            const payload = JSON.parse(event.newValue);
            if (payload.matchKey !== matchKey) {
              return;
            }
            callback(payload);
          } catch {
            // ignore malformed event
          }
        };
        window.addEventListener('storage', storageHandler);
      }
    }

    return {
      unsubscribe: () => {
        chatChannel.unsubscribe();
        if (broadcastChannel) {
          broadcastChannel.close();
        }
        if (storageHandler) {
          window.removeEventListener('storage', storageHandler);
        }
      }
    };
  }
};

export default collabEditorService;
