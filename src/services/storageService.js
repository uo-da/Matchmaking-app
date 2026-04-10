const STORAGE_USERS_KEY = 'matchmaking_users';
const STORAGE_SESSION_KEY = 'matchmaking_session';

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
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
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
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
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
    matches: []
  },
  {
    id: 'user-4',
    githubUsername: 'kumi-dev',
    displayName: 'Kumi',
    bio: 'GoとKubernetesの設計でパフォーマンスにこだわります。',
    age: 30,
    ageVerified: true,
    experienceYears: 7,
    stackTags: ['Go', 'Kubernetes', 'Terraform'],
    hobbies: '登山, 写真',
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
  },
  {
    id: 'user-5',
    githubUsername: 'dev-miyu',
    displayName: 'Miyu',
    bio: 'UI/UX改善とデザインシステムが得意です。',
    age: 27,
    ageVerified: true,
    experienceYears: 5,
    stackTags: ['Figma', 'React', 'CSS'],
    hobbies: 'カフェ, イラスト',
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
  },
  {
    id: 'user-6',
    githubUsername: 'arisa-k',
    displayName: 'Arisa',
    bio: 'モバイルアプリとAndroidネイティブが好きです。',
    age: 29,
    ageVerified: true,
    experienceYears: 6,
    stackTags: ['Kotlin', 'Android', 'Jetpack'],
    hobbies: 'ゲーム, ハイキング',
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
  },
  {
    id: 'user-7',
    githubUsername: 'takumi-rs',
    displayName: 'Takumi',
    bio: 'RustとWebAssemblyで高速なWeb体験を作ります。',
    age: 31,
    ageVerified: true,
    experienceYears: 7,
    stackTags: ['Rust', 'WebAssembly', 'React'],
    hobbies: 'ギター, キャンプ',
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
  },
  {
    id: 'user-8',
    githubUsername: 'jun-ml',
    displayName: 'Junya',
    bio: '機械学習とデータパイプラインの設計を担当しています。',
    age: 33,
    ageVerified: true,
    experienceYears: 9,
    stackTags: ['Python', 'TensorFlow', 'Airflow'],
    hobbies: 'ロードバイク, 料理',
    likedUserIds: [],
    superLikedUserIds: [],
    matches: []
  }
];

const storageService = {
  getUsers() {
    try {
      const raw = window.localStorage.getItem(STORAGE_USERS_KEY);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  setUsers(users) {
    window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return users;
  },

  getUserById(id) {
    return this.getUsers().find((user) => user.id === id) || null;
  },

  findUserByGithub(githubUsername) {
    return this.getUsers().find((user) => user.githubUsername === githubUsername) || null;
  },

  getCurrentSession() {
    try {
      const raw = window.localStorage.getItem(STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveCurrentSession(user) {
    window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    return user;
  },

  clearCurrentSession() {
    window.localStorage.removeItem(STORAGE_SESSION_KEY);
  },

  createUser({ githubUsername, displayName }) {
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
      matches: []
    };
    users.push(newUser);
    this.setUsers(users);
    return newUser;
  },

  saveUserProfile(profile) {
    const users = this.getUsers();
    const updatedUsers = users.map((user) => (user.id === profile.id ? { ...user, ...profile } : user));
    this.setUsers(updatedUsers);
    return updatedUsers.find((user) => user.id === profile.id);
  },

  saveUserReaction(userId, targetId, isSuperLike = false) {
    const users = this.getUsers();
    const user = users.find((item) => item.id === userId);
    const target = users.find((item) => item.id === targetId);
    if (!user || !target || userId === targetId) {
      return user;
    }

    const normalizeArray = (arr) => (Array.isArray(arr) ? arr : []);
    const userLikes = normalizeArray(user.likedUserIds);
    const userSuperLikes = normalizeArray(user.superLikedUserIds);
    const targetLikes = normalizeArray(target.likedUserIds);
    const targetSuperLikes = normalizeArray(target.superLikedUserIds);
    const userMatches = normalizeArray(user.matches);
    const targetMatches = normalizeArray(target.matches);

    const addUnique = (list, value) => (list.includes(value) ? list : [...list, value]);
    if (isSuperLike) {
      user.superLikedUserIds = addUnique(userSuperLikes, targetId);
    } else {
      user.likedUserIds = addUnique(userLikes, targetId);
    }

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
