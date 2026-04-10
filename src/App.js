import React, { useEffect, useMemo, useState } from 'react';
import AgeVerification from './components/AgeVerification';
import LoginPage from './components/LoginPage';
import ProfileEditor from './components/ProfileEditor';
import SettingsPanel from './components/SettingsPanel';
import TinderDeck from './components/TinderDeck';
import MatchChat from './components/MatchChat';
import authService from './services/authService';
import storageService from './services/storageService';
import chatService from './services/chatService';
import { filterUsersByCriteria, getMatchesForUser } from './utils/matchUtils';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState('users');
  const [filter, setFilter] = useState({ stackTag: '', minYears: 0 });
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [matchModal, setMatchModal] = useState(null);

  useEffect(() => {
    storageService.seedSampleData();
    chatService.seedSampleMessages();
    const saved = authService.getCurrentSession();
    setCurrentUser(saved);
    setAllUsers(storageService.getUsers());
  }, []);

  useEffect(() => {
    if (currentUser) {
      storageService.saveCurrentSession(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    setAllUsers(storageService.getUsers());
  }, [refreshToggle]);

  const allMatches = useMemo(() => (currentUser ? getMatchesForUser(currentUser.id, allUsers) : []), [currentUser, allUsers]);

  const filteredUsers = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return filterUsersByCriteria(allUsers.filter((user) => user.id !== currentUser.id), filter);
  }, [allUsers, currentUser, filter]);

  const handleLogin = (username) => {
    const user = authService.loginWithGitHub(username);
    setCurrentUser(user);
    setSelectedTab('users');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setSelectedMatchId(null);
  };

  const handleAgeConfirm = (age) => {
    const updated = authService.verifyAge(currentUser, age);
    storageService.saveUserProfile(updated);
    setCurrentUser(updated);
  };

  const handleProfileSave = (profile) => {
    const updated = storageService.saveUserProfile({ ...currentUser, ...profile });
    setCurrentUser(updated);
  };

  const handleLike = (targetId, isSuperLike = false) => {
    const updated = storageService.saveUserReaction(currentUser.id, targetId, isSuperLike);
    setCurrentUser(storageService.getUserById(updated.id));
    setRefreshToggle((value) => !value);
    
    // マッチ成立処理
    const targetUser = storageService.getUserById(targetId);
    if (targetUser && targetUser.likedUserIds.includes(currentUser.id)) {
      setMatchModal(targetUser);
    }
  };

  const handleSelectMatch = (matchId) => {
    setSelectedMatchId(matchId);
    setSelectedTab('chat');
  };

  const handleSendMessage = async (matchId, text) => {
    if (!currentUser) {
      return null;
    }
    const message = await chatService.sendMessage(currentUser.id, matchId, text);
    setRefreshToggle((value) => !value);
    return message;
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!currentUser.ageVerified) {
    return <AgeVerification onConfirm={handleAgeConfirm} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <img src="/vendor-logo.svg" alt="Vendor Logo" className="tinder-logo" />
          <p>{currentUser.displayName} さん、ようこそ</p>
        </div>
        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="検索">🔍</button>
          <button type="button" className="icon-button" aria-label="通知">🔔</button>
          <button type="button" className="icon-button" aria-label="プロフィール">👤</button>
          <button type="button" onClick={handleLogout} className="secondary-button">
            ログアウト
          </button>
        </div>
      </header>
      <main className="app-main">
        {selectedTab === 'profile' && <ProfileEditor user={currentUser} onSave={handleProfileSave} />}
        {selectedTab === 'settings' && <SettingsPanel filter={filter} onFilterChange={setFilter} />}
        {selectedTab === 'users' && (
          <TinderDeck
            currentUser={currentUser}
            users={filteredUsers}
            onLike={handleLike}
          />
        )}
        {selectedTab === 'matches' && (
          <div className="match-panel">
            {allMatches.length === 0 ? (
              <div className="empty-state">まだマッチしたユーザがいません。いいねを送ってみましょう。</div>
            ) : (
              <div>
                <div className="match-grid">
                  {allMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      className="match-chip"
                      onClick={() => handleSelectMatch(match.id)}
                    >
                      {match.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {selectedTab === 'chat' && selectedMatchId && (
          <MatchChat matchId={selectedMatchId} currentUser={currentUser} onSend={handleSendMessage} />
        )}
      </main>
      {matchModal && (
        <div className="modal-overlay" onClick={() => setMatchModal(null)}>
          <div className="match-modal" onClick={(e) => e.stopPropagation()}>
            <div className="match-modal__hearts">💗</div>
            <h2 className="match-modal__title">It's a Match!</h2>
            <div className="match-modal__photos">
              <img
                className="match-modal__photo"
                src={`https://github.com/${currentUser.githubUsername}.png?size=200`}
                alt={currentUser.displayName}
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/200'; }}
              />
              <div className="match-modal__divider" />
              <img
                className="match-modal__photo"
                src={`https://github.com/${matchModal.githubUsername}.png?size=200`}
                alt={matchModal.displayName}
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/200'; }}
              />
            </div>
            <p className="match-modal__subtitle">{matchModal.displayName} さんとマッチングしました！</p>
            <button type="button" className="primary-button" onClick={() => {
              setMatchModal(null);
              handleSelectMatch(matchModal.id);
            }}>
              メッセージを送る
            </button>
            <button type="button" className="secondary-button" onClick={() => setMatchModal(null)}>
              後で
            </button>
          </div>
        </div>
      )}
      <nav className="app-nav">
        <button type="button" className={selectedTab === 'users' ? 'active' : ''} onClick={() => setSelectedTab('users')}>
          カード
        </button>
        <button type="button" className={selectedTab === 'matches' ? 'active' : ''} onClick={() => setSelectedTab('matches')}>
          マッチ
        </button>
        <button type="button" className={selectedTab === 'profile' ? 'active' : ''} onClick={() => setSelectedTab('profile')}>
          プロフィール
        </button>
        <button type="button" className={selectedTab === 'settings' ? 'active' : ''} onClick={() => setSelectedTab('settings')}>
          設定
        </button>
      </nav>
    </div>
  );
}

export default App;
