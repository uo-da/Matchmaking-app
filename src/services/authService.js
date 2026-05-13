const API_BASE = 'http://localhost:5000';

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
    window.location.href = `${API_BASE}/auth/github`;
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
      const response = await fetch(`${API_BASE}/auth/user`, {
        credentials: 'include'
      });
      if (response.ok) {
        return await response.json();
      }
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
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
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
  demoLogin() {
    const usernames = ['octocat', 'torvalds', 'gaearon', 'tj', 'sindresorhus'];
    const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
    const user = {
      id: `demo-${Date.now()}`,
      githubUsername: randomUsername,
      displayName: randomUsername,
      bio: '',
      age: null,
      ageVerified: false,
      experienceYears: 0,
      stackTags: [],
      hobbies: '',
      likedUserIds: [],
      superLikedUserIds: [],
      matches: [],
      avatar: `https://github.com/${randomUsername}.png`
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }
};

module.exports = authService;
