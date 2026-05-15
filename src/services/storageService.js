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

const sampleUsers = [
  {
    id: 'user-1',
    githubUsername: 'octocat',
    displayName: 'Nao',
    bio: 'ReactとNode.jsでプロダクト開発をしています。',
    age: 28,
    ageVerified: true,
    experienceYears: 5,
    stackTags: ['React', 'Node.js', 'TypeScript'],
    hobbies: '読書, カフェ巡り',
    likedUserIds: ['user-2'],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: ['user-2']
  },
  {
    id: 'user-2',
    githubUsername: 'mona',
    displayName: 'Mona',
    bio: 'インフラとインシデント対応が得意です。',
    age: 32,
    ageVerified: true,
    experienceYears: 8,
    stackTags: ['AWS', 'Docker', 'Kubernetes'],
    hobbies: 'キャンプ, 写真',
    likedUserIds: ['user-1'],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: ['user-1']
  },
  {
    id: 'user-3',
    githubUsername: 'ramen',
    displayName: 'Raita',
    bio: 'フロントエンドのUX改善が好きです。',
    age: 26,
    ageVerified: true,
    experienceYears: 4,
    stackTags: ['React', 'Vue', 'CSS'],
    hobbies: 'ラーメン, 映画',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  }
];

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
    throw new Error(error.message || 'Network request failed');
  }
};

const storageService = {
  getUsers() {
    if (isLocalMode) {
      try {
        const raw = window.localStorage.getItem('matchmaking_users');
        const users = raw ? JSON.parse(raw) : sampleUsers;
        const currentRaw = window.localStorage.getItem('currentUser');
        if (currentRaw) {
          try {
            const currentUser = JSON.parse(currentRaw);
            if (currentUser && !users.some((user) => user.id === currentUser.id)) {
              const nextUsers = [...users, currentUser];
              window.localStorage.setItem('matchmaking_users', JSON.stringify(nextUsers));
              return nextUsers;
            }
          } catch {
            // ignore malformed currentUser
          }
        }
        return users;
      } catch {
        return sampleUsers;
      }
    }
    return fetchJson('/api/users');
  },

  setUsers(users) {
    if (isLocalMode) {
      window.localStorage.setItem('matchmaking_users', JSON.stringify(users));
      return users;
    }
    throw new Error('setUsers is not supported in production');
  },

  getUserById(id) {
    if (isLocalMode) {
      const users = this.getUsers();
      return users.find((user) => user.id === id) || null;
    }
    return fetchJson(`/api/users/${id}`);
  },

  findUserByGithub(githubUsername) {
    if (isLocalMode) {
      const users = this.getUsers();
      return users.find((user) => user.githubUsername === githubUsername) || null;
    }
    throw new Error('findUserByGithub is not supported in production');
  },

  getCurrentSession() {
    if (isLocalMode) {
      try {
        const raw = window.localStorage.getItem('matchmaking_session');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  },

  saveCurrentSession(user) {
    if (isLocalMode) {
      window.localStorage.setItem('matchmaking_session', JSON.stringify(user));
      return user;
    }
    return user;
  },

  clearCurrentSession() {
    if (isLocalMode) {
      window.localStorage.removeItem('matchmaking_session');
    }
  },

  createUser({ githubUsername, displayName, avatar = '' }) {
    if (isLocalMode) {
      const users = this.getUsers();
      const newUser = {
        id: `user-${Date.now()}`,
        githubUsername,
        displayName,
        bio: '',
        age: null,
        ageVerified: false,
        experienceYears: 0,
        stackTags: [],
        hobbies: '',
        likedUserIds: [],
        superLikedUserIds: [],
        nopedUserIds: [],
        matches: [],
        avatar
      };
      users.push(newUser);
      this.setUsers(users);
      return newUser;
    }
    throw new Error('createUser is not supported in production');
  },

  async saveUserProfile(profile) {
    if (isLocalMode) {
      const users = this.getUsers();
      let found = false;
      const updatedUsers = users.map((user) => {
        if (user.id === profile.id) {
          found = true;
          return { ...user, ...profile };
        }
        return user;
      });
      const nextUsers = found ? updatedUsers : [...updatedUsers, profile];
      this.setUsers(nextUsers);
      return nextUsers.find((user) => user.id === profile.id);
    }
    return fetchJson(`/api/users/${profile.id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  },

  async saveUserReaction(userId, targetId, isSuperLike = false) {
    if (isLocalMode) {
      const users = this.getUsers();
      const user = users.find((item) => item.id === userId);
      const target = users.find((item) => item.id === targetId);
      if (!user || !target || userId === targetId) {
        return user;
      }

      const normalizeArray = (arr) => (Array.isArray(arr) ? arr : []);
      const addUnique = (list, value) => (list.includes(value) ? list : [...list, value]);
      const userLikes = normalizeArray(user.likedUserIds);
      const userSuperLikes = normalizeArray(user.superLikedUserIds);
      const userNopes = normalizeArray(user.nopedUserIds);
      const targetLikes = normalizeArray(target.likedUserIds);
      const targetSuperLikes = normalizeArray(target.superLikedUserIds);
      const userMatches = normalizeArray(user.matches);
      const targetMatches = normalizeArray(target.matches);

      if (isSuperLike) {
        user.superLikedUserIds = addUnique(userSuperLikes, targetId);
      } else {
        user.likedUserIds = addUnique(userLikes, targetId);
      }
      user.nopedUserIds = userNopes.filter((id) => id !== targetId);

      const isMutual = targetLikes.includes(userId) || targetSuperLikes.includes(userId);
      if (isMutual) {
        user.matches = addUnique(userMatches, targetId);
        target.matches = addUnique(targetMatches, userId);
      }

      const updatedUsers = users.map((item) => {
        if (item.id === user.id) {
          return { ...item, ...user };
        }
        if (item.id === target.id) {
          return { ...item, ...target };
        }
        return item;
      });
      this.setUsers(updatedUsers);
      return updatedUsers.find((item) => item.id === userId);
    }

    return fetchJson(`/api/users/${userId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ targetId, isSuperLike })
    });
  },

  async saveUserNope(userId, targetId) {
    if (isLocalMode) {
      const users = this.getUsers();
      const user = users.find((item) => item.id === userId);
      if (!user || userId === targetId) {
        return user;
      }

      const normalizeArray = (arr) => (Array.isArray(arr) ? arr : []);
      const addUnique = (list, value) => (list.includes(value) ? list : [...list, value]);
      user.nopedUserIds = addUnique(normalizeArray(user.nopedUserIds), targetId);
      const updatedUsers = users.map((item) => (item.id === user.id ? { ...item, ...user } : item));
      this.setUsers(updatedUsers);
      return updatedUsers.find((item) => item.id === userId);
    }

    return fetchJson(`/api/users/${userId}/nope`, {
      method: 'POST',
      body: JSON.stringify({ targetId })
    });
  },

  seedSampleData() {
    const existing = this.getUsers();
    if (existing.length > 0) {
      return existing;
    }
    this.setUsers(sampleUsers);
    return sampleUsers;
  }
};

export default storageService;
