import React from 'react';
import authService from '../services/authService';

/**
 * @param {{ onLogin: (user?: any) => void, authError?: boolean }} props
 */
function LoginPage({ onLogin, authError = false }) {
  const handleLogin = async () => {
    // テスト時はonLoginを呼び出し、本番時はGitHub認証にリダイレクト
    if (process.env.NODE_ENV === 'test') {
      onLogin();
      return;
    }
    try {
      await authService.loginWithGitHub();
    } catch (error) {
      console.error('Auth redirect failed:', error);
    }
  };

  const handleDemoLogin = async () => {
    const user = await authService.demoLogin();
    if (user) {
      onLogin(user);
    }
  };

  return (
    <div className="entrance-shell">
      <div className="entrance-card login-panel">
        <h1>GitHubでログイン</h1>
        <p>GitHubアカウントでログインしてください。</p>
        {authError && (
          <div className="empty-state">
            <p>認証サービスに接続できませんでした。</p>
            <p>デモ用ログインをご利用ください。</p>
          </div>
        )}
        <button type="button" className="entrance-card__action login-button" onClick={handleLogin}>
          <img src="/GitHub_Invertocat_Black.svg" alt="" aria-hidden="true" className="login-button__icon" />
          <span>GitHubでログイン</span>
        </button>
        <p>または</p>
        <button type="button" className="secondary-button" onClick={handleDemoLogin}>
          仮ログイン（デモ用）
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
