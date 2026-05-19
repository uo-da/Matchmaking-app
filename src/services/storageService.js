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
    photoUrls: [
      'https://picsum.photos/seed/user-1-1/800/1200',
      'https://picsum.photos/seed/user-1-2/800/1200',
      'https://picsum.photos/seed/user-1-3/800/1200'
    ],
    displayName: 'Nao',
    avatar: 'https://github.com/octocat.png',
    bio: 'ReactとNode.jsでプロダクト開発をしています。',
    age: 28,
    gender: '男性',
    scoutNg: false,
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
    photoUrls: [
      'https://picsum.photos/seed/user-2-1/800/1200',
      'https://picsum.photos/seed/user-2-2/800/1200',
      'https://picsum.photos/seed/user-2-3/800/1200',
      'https://picsum.photos/seed/user-2-4/800/1200',
      'https://picsum.photos/seed/user-2-5/800/1200'
    ],
    displayName: 'Mona',
    avatar: 'https://github.com/mona.png',
    bio: 'インフラとインシデント対応が得意です。',
    age: 32,
    gender: '女性',
    scoutNg: false,
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
    photoUrls: [
      'https://picsum.photos/seed/user-3-1/800/1200',
      'https://picsum.photos/seed/user-3-2/800/1200'
    ],
    displayName: 'Raita',
    avatar: 'https://github.com/ramen.png',
    bio: 'フロントエンドのUX改善が好きです。',
    age: 26,
    gender: '男性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 4,
    stackTags: ['React', 'Vue', 'CSS'],
    hobbies: 'ラーメン, 映画',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-4',
    githubUsername: 'kumi-dev',
    photoUrls: [
      'https://picsum.photos/seed/user-4-1/800/1200'
    ],
    displayName: 'Kumi',
    bio: 'GoとKubernetesの設計でパフォーマンスにこだわります。',
    age: 30,
    gender: '女性',
    scoutNg: true,
    ageVerified: true,
    experienceYears: 7,
    stackTags: ['Go', 'Kubernetes', 'Terraform'],
    hobbies: '登山, 写真',
    likedUserIds: ['user-1'],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-5',
    githubUsername: 'dev-miyu',
    photoUrls: [
      'https://picsum.photos/seed/user-5-1/800/1200',
      'https://picsum.photos/seed/user-5-2/800/1200',
      'https://picsum.photos/seed/user-5-3/800/1200',
      'https://picsum.photos/seed/user-5-4/800/1200'
    ],
    displayName: 'Miyu',
    bio: 'UI/UX改善とデザインシステムが得意です。',
    age: 27,
    gender: '女性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 5,
    stackTags: ['Figma', 'React', 'CSS'],
    hobbies: 'カフェ, イラスト',
    likedUserIds: [],
    superLikedUserIds: ['user-1'],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-6',
    githubUsername: 'arisa-k',
    photoUrls: [
      'https://picsum.photos/seed/user-6-1/800/1200',
      'https://picsum.photos/seed/user-6-2/800/1200',
      'https://picsum.photos/seed/user-6-3/800/1200',
      'https://picsum.photos/seed/user-6-4/800/1200',
      'https://picsum.photos/seed/user-6-5/800/1200'
    ],
    displayName: 'Arisa',
    bio: 'モバイルアプリとAndroidネイティブが好きです。',
    age: 29,
    gender: '女性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 6,
    stackTags: ['Kotlin', 'Android', 'Jetpack'],
    hobbies: 'ゲーム, ハイキング',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-7',
    githubUsername: 'takumi-rs',
    photoUrls: [
      'https://picsum.photos/seed/user-7-1/800/1200',
      'https://picsum.photos/seed/user-7-2/800/1200'
    ],
    displayName: 'Takumi',
    bio: 'RustとWebAssemblyで高速なWeb体験を作ります。',
    age: 31,
    gender: '男性',
    scoutNg: true,
    ageVerified: true,
    experienceYears: 7,
    stackTags: ['Rust', 'WebAssembly', 'React'],
    hobbies: 'ギター, キャンプ',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-8',
    githubUsername: 'jun-ml',
    photoUrls: [
      'https://picsum.photos/seed/user-8-1/800/1200',
      'https://picsum.photos/seed/user-8-2/800/1200',
      'https://picsum.photos/seed/user-8-3/800/1200'
    ],
    displayName: 'Junya',
    bio: '機械学習とデータパイプラインの設計を担当しています。',
    age: 33,
    gender: '男性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 9,
    stackTags: ['Python', 'TensorFlow', 'Airflow'],
    hobbies: 'ロードバイク, 料理',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi49',
    githubUsername: 'wasabi49',
    photoUrls: [
      'https://picsum.photos/seed/user-wasabi49-1/800/1200',
      'https://picsum.photos/seed/user-wasabi49-2/800/1200'
    ],
    displayName: 'wasabi49',
    avatar: 'https://github.com/wasabi49.png',
    bio: 'チャット機能の検証用アカウントです。',
    age: 28,
    gender: '男性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 5,
    stackTags: ['React', 'Node.js', 'TypeScript'],
    hobbies: 'テスト, 検証',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi-dummy-1',
    githubUsername: 'wasabi49-dummy-1',
    photoUrls: [
      'https://picsum.photos/seed/user-wasabi-dummy-1-1/800/1200'
    ],
    displayName: 'Dummy Akari',
    avatar: 'https://github.com/identicons/wasabi49-dummy-1.png',
    bio: 'wasabi49の検証用ダミーアカウントです。',
    age: 27,
    gender: '女性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 4,
    stackTags: ['React', 'Figma'],
    hobbies: '散歩, 読書',
    likedUserIds: ['user-wasabi49'],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi-dummy-2',
    githubUsername: 'wasabi49-dummy-2',
    photoUrls: [
      'https://picsum.photos/seed/user-wasabi-dummy-2-1/800/1200',
      'https://picsum.photos/seed/user-wasabi-dummy-2-2/800/1200'
    ],
    displayName: 'Dummy Ren',
    avatar: 'https://github.com/identicons/wasabi49-dummy-2.png',
    bio: 'wasabi49の検証用ダミーアカウントです。',
    age: 30,
    gender: '男性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 6,
    stackTags: ['Python', 'AWS'],
    hobbies: '映画, カフェ',
    likedUserIds: ['user-wasabi49'],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi-dummy-3',
    githubUsername: 'wasabi49-dummy-3',
    photoUrls: [
      'https://picsum.photos/seed/user-wasabi-dummy-3-1/800/1200'
    ],
    displayName: 'Dummy Mei',
    avatar: 'https://github.com/identicons/wasabi49-dummy-3.png',
    bio: 'wasabi49の検証用ダミーアカウントです。',
    age: 25,
    gender: '女性',
    scoutNg: false,
    ageVerified: true,
    experienceYears: 3,
    stackTags: ['Go', 'Kubernetes'],
    hobbies: '写真, 旅行',
    likedUserIds: [],
    superLikedUserIds: ['user-wasabi49'],
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
        photoUrls: [],
        bio: '',
        age: null,
        gender: '',
        scoutNg: false,
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

  saveUserProfile(profile) {
    if (isLocalMode) {
      const users = this.getUsers();
      const normalizedProfile = {
        photoUrls: [],
        bio: '',
        age: null,
        gender: '',
        scoutNg: false,
        ageVerified: false,
        experienceYears: 0,
        stackTags: [],
        hobbies: '',
        likedUserIds: [],
        superLikedUserIds: [],
        nopedUserIds: [],
        matches: [],
        avatar: '',
        ...profile
      };
      const exists = users.some((user) => user.id === normalizedProfile.id);
      const updatedUsers = exists
        ? users.map((user) => (user.id === normalizedProfile.id ? { ...user, ...normalizedProfile } : user))
        : [...users, normalizedProfile];
      this.setUsers(updatedUsers);
      return updatedUsers.find((user) => user.id === normalizedProfile.id);
    }

    return fetchJson(`/api/users/${profile.id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  },

  saveUserReaction(userId, targetId, isSuperLike = false) {
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

  saveUserNope(userId, targetId) {
    if (isLocalMode) {
      const users = this.getUsers();
      const user = users.find((item) => item.id === userId);
      const target = users.find((item) => item.id === targetId);
      if (!user || !target || userId === targetId) {
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
    if (!isLocalMode) {
      return [];
    }
    const existing = this.getUsers();
    if (existing.length > 0) {
      return existing;
    }
    this.setUsers(sampleUsers);
    return sampleUsers;
  },

  // 通知関連メソッド
  getNotifications(userId) {
    if (isLocalMode) {
      try {
        const raw = window.localStorage.getItem('matchmaking_notifications');
        const notifications = raw ? JSON.parse(raw) : [];
        return notifications.filter(notification => notification.toUserId === userId);
      } catch {
        return [];
      }
    }
    // TODO: API実装
    return [];
  },

  addNotification(type, fromUserId, toUserId) {
    if (isLocalMode) {
      const notifications = this.getAllNotifications();
      const newNotification = {
        id: `notification-${Date.now()}`,
        type, // 'superLike' or 'match'
        fromUserId,
        toUserId,
        createdAt: new Date().toISOString(),
        read: false
      };
      notifications.push(newNotification);
      window.localStorage.setItem('matchmaking_notifications', JSON.stringify(notifications));
      return newNotification;
    }
    // TODO: API実装
    return null;
  },

  markNotificationAsRead(notificationId) {
    if (isLocalMode) {
      const notifications = this.getAllNotifications();
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      window.localStorage.setItem('matchmaking_notifications', JSON.stringify(updatedNotifications));
      return true;
    }
    // TODO: API実装
    return false;
  },

  getAllNotifications() {
    if (isLocalMode) {
      try {
        const raw = window.localStorage.getItem('matchmaking_notifications');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export default storageService;
