import React from 'react';

/**
 * @param {{ onEnter: () => void }} props
 */
function EntrancePage({ onEnter }) {
  return (
    <div className="entrance-shell">
      <div className="entrance-card">
        <div className="entrance-card__logo">
          <img src="/vendor-logo-heart.png" alt="Vendor heart logo" />
        </div>
        <div className="entrance-card__brand">
          <img src="/vendor-logo.svg" alt="Vendor logo" />
        </div>
        <div className="entrance-card__tagline">技術でつながるあらたなマッチング</div>
        <button type="button" className="entrance-card__action" onClick={onEnter}>
          ログイン・新規登録
        </button>
        <p className="entrance-card__hint">*ログインにGitHubアカウントを使用します。</p>
      </div>
    </div>
  );
}

export default EntrancePage;
