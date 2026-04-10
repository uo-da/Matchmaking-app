import storageService from './storageService';

/**
 * @typedef {{ id: string, githubUsername: string, displayName: string, ageVerified: boolean }} User
 */

const authService = {
  /**
   * GitHub OIDC認証でログインします。実際のOIDC連携は環境変数を利用します。
   * @param {string} githubUsername
   * @returns {User}
   */
  loginWithGitHub(githubUsername) {
    const normalized = githubUsername.trim() || 'octocat';
    let user = storageService.findUserByGithub(normalized);
    if (!user) {
      user = storageService.createUser({ githubUsername: normalized, displayName: normalized });
    }
    storageService.saveCurrentSession(user);
    return user;
  },

  /**
   * 現在のセッションユーザーを取得します。
   * @returns {User|null}
   */
  getCurrentSession() {
    return storageService.getCurrentSession();
  },

  /**
   * 現在のセッションを削除します。
   */
  logout() {
    storageService.clearCurrentSession();
  },

  /**
   * 年齢確認結果を保存します。
   * @param {User} user
   * @param {number} age
   * @returns {User}
   */
  verifyAge(user, age) {
    const updated = storageService.saveUserProfile({ ...user, age, ageVerified: true });
    storageService.saveCurrentSession(updated);
    return updated;
  }
};

export default authService;
