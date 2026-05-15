const API_BASE = process.env.REACT_APP_API_BASE || '';

const getFallbackApiBase = () => {
  if (API_BASE) {
    return API_BASE;
  }
  if (typeof window === 'undefined') {
    return '';
  }
  const { protocol, host, hostname, port } = window.location;
  if (host.includes('-3000.app.github.dev')) {
    return `${protocol}//${host.replace('-3000.app.github.dev', '-5000.app.github.dev')}`;
  }
  if (port === '3000') {
    return `${protocol}//${hostname}:5000`;
  }
  return '';
};

const attemptFetchBase = async (base, path, options = {}) => {
  return fetch(`${base}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });
};

const fetchAuthResponse = async (path, options = {}) => {
  const fallbackBase = getFallbackApiBase();
  try {
    const response = await attemptFetchBase(API_BASE, path, options);
    if (!response.ok && fallbackBase && fallbackBase !== API_BASE) {
      return await attemptFetchBase(fallbackBase, path, options);
    }
    return response;
  } catch (error) {
    if (fallbackBase && fallbackBase !== API_BASE) {
      return await attemptFetchBase(fallbackBase, path, options);
    }
    throw error;
  }
};

const authService = {
  /**
   * GitHub OIDC認証でログインします。
   * @returns {Promise<User>}
   */
  async loginWithGitHub() {
    if (process.env.NODE_ENV === 'test') {
      // テスト時はローカルストレージを使用
      const usernames = ['octocat', 'torvalds', 'gaearon', 'tj', 'sindresorhus'];
      const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
      const user = {
        id: randomUsername,
        githubUsername: randomUsername,
        displayName: randomUsername
      };
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    // GitHub認証ページにリダイレクト
    const authHost = API_BASE || getFallbackApiBase() || '';
    window.location.href = `${authHost}/auth/github`;
  },

  /**
   * 現在のセッションユーザーを取得します。
   * @returns {Promise<User|null>}
   */
  async getCurrentSession() {
    if (process.env.NODE_ENV === 'test') {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    }
    try {
      const response = await fetchAuthResponse('/auth/user');
      if (response.ok) {
        return await response.json();
      }
      console.error('Failed to get current session:', response.status, await response.text());
    } catch (error) {
      console.error('Failed to get current session:', error);
    }
    return null;
  },

  /**
   * ログアウトします。
   * @returns {Promise<boolean>}
   */
  async logout() {
    if (process.env.NODE_ENV === 'test') {
      localStorage.removeItem('currentUser');
      return true;
    }
    try {
      const response = await fetchAuthResponse('/auth/logout', {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  },

  /**
   * 年齢確認結果を保存します。
   * @param {Object} user
   * @param {number} age
   * @returns {Object}
   */
  verifyAge(user, age) {
    const updated = { ...user, age, ageVerified: true };
    if (process.env.NODE_ENV === 'test') {
      localStorage.setItem('currentUser', JSON.stringify(updated));
    }
    return updated;
  },

  /**
   * 仮ログイン（テスト用）
   * @returns {User}
   */
  async demoLogin() {
    const usernames = ['octocat', 'torvalds', 'gaearon', 'tj', 'sindresorhus'];
    const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
    const demoUser = {
      id: `demo-${Date.now()}`,
      githubUsername: randomUsername,
      displayName: `${randomUsername} (Demo)`,
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
      avatar: `https://github.com/${randomUsername}.png`
    };

    if (process.env.NODE_ENV !== 'production') {
      localStorage.setItem('currentUser', JSON.stringify(demoUser));
      return demoUser;
    }

    try {
      const response = await fetch('/api/users/guest', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          githubUsername: demoUser.githubUsername,
          displayName: demoUser.displayName,
          avatar: demoUser.avatar
        })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Guest login failed: ${response.status} ${message}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to create guest user:', error);
      return null;
    }
  }
};

export default authService;
