import React, { useState } from 'react';

/**
 * @param {{ onLogin: (username:string) => void }} props
 */
function LoginPage({ onLogin }) {
  const [githubUsername, setGithubUsername] = useState('');
  const oidcIssuer = process.env.REACT_APP_GITHUB_OIDC_ISSUER || '';

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(githubUsername.trim() || 'octocat');
  };

  return (
    <div className="app-shell">
      <div className="card">
        <h1>GitHubでログイン</h1>
        <p>GitHub連携ログインはOIDCを利用します。適切な環境変数を設定してください。</p>
        <form onSubmit={handleSubmit} className="field">
          <label htmlFor="githubUsername">GitHubユーザ名</label>
          <input
            id="githubUsername"
            value={githubUsername}
            onChange={(event) => setGithubUsername(event.target.value)}
            placeholder="例: octocat"
          />
          <button type="submit" className="primary-button">
            GitHubでログイン
          </button>
        </form>
        {!oidcIssuer && (
          <div className="empty-state">
            <p>OIDC発行者が設定されていません。</p>
            <p>環境変数 `REACT_APP_GITHUB_OIDC_ISSUER` を `.env` に追加してください。</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
