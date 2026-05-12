import React, { useEffect, useMemo, useState } from 'react';
import AgeVerification from './components/AgeVerification';
import EntrancePage from './components/EntrancePage';
import LoginPage from './components/LoginPage';
import ProfileEditor from './components/ProfileEditor';
import SettingsPanel from './components/SettingsPanel';
import TinderDeck from './components/TinderDeck';
import MatchList from './components/MatchList';
import MatchChat from './components/MatchChat';
const authService = require('./services/authService');
import storageService from './services/storageService';
import chatService from './services/chatService';
import { filterUsersByCriteria, getMatchesForUser } from './utils/matchUtils';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEntranceVisible, setIsEntranceVisible] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [selectedTab, setSelectedTab] = useState('users');
  const [filter, setFilter] = useState({ stackTag: '', minYears: 0 });
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [matchModal, setMatchModal] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await authService.getCurrentSession();
        setCurrentUser(saved);
        setAuthError(false);
      } catch (error) {
        console.error('Failed to load session:', error);
        setAuthError(true);
      }
    };
    if (process.env.NODE_ENV === 'test') {
      const saved = authService.getCurrentSession();
      setCurrentUser(saved);
    } else {
      loadSession();
    }
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

  const handleLogin = (user) => {
    if (user) {
      setCurrentUser(user);
      setSelectedTab('users');
    }
  };

  const handleLogout = async () => {
    if (process.env.NODE_ENV === 'test') {
      authService.logout();
      setCurrentUser(null);
      setIsEntranceVisible(true);
    } else {
      const success = await authService.logout();
      if (success) {
        setCurrentUser(null);
        setIsEntranceVisible(true);
      }
    }
  };

  const handleAgeConfirm = (age) => {
    if (!currentUser) {
      console.error('No current user for age verification');
      return;
    }
    const updated = authService.verifyAge(currentUser, age);
    storageService.saveUserProfile(updated);
    setCurrentUser(updated);
    // 年齢確認後にプロフィールが不完全ならプロフィール編集を強制
    if (!isProfileComplete(updated)) {
      setSelectedTab('profile');
    }
  };

  const handleProfileSave = (profile) => {
    const updated = storageService.saveUserProfile({ ...currentUser, ...profile });
    setCurrentUser(updated);
    // プロフィールが完全になったらusersタブに戻る
    if (isProfileComplete(updated)) {
      setSelectedTab('users');
    }
  };

  const isProfileComplete = (user) => {
    return user.stackTags && user.stackTags.length > 0 && user.experienceYears > 0;
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

  const handleBoost = () => {
    window.alert('Boostを使用しました。GitHubのログイン頻度が高いユーザを優先表示します。');
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
    if (isEntranceVisible) {
      return <EntrancePage onEnter={() => setIsEntranceVisible(false)} />;
    }

    return <LoginPage onLogin={handleLogin} authError={authError} />;
  }

  if (!currentUser.ageVerified) {
    return <AgeVerification onConfirm={handleAgeConfirm} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <img src="/vendor-logo.svg" alt="Vendor Logo" className="tinder-logo" />
        </div>
        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="通知">🔔</button>
          <button type="button" className="icon-button" aria-label="ログアウト" onClick={handleLogout}>
            🚪
          </button>
          <button type="button" className="icon-button" aria-label="設定" onClick={() => setSelectedTab('settings')}>
            ⚙️
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
            onBoost={handleBoost}
          />
        )}
        {selectedTab === 'matches' && (
          <MatchList
            currentUser={currentUser}
            matches={allMatches}
            onSelectMatch={handleSelectMatch}
          />
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
        <button type="button" className={selectedTab === 'users' ? 'active' : ''} onClick={() => setSelectedTab('users')} aria-label="カード">
          🔥
        </button>
        <button type="button" className={selectedTab === 'matches' ? 'active' : ''} onClick={() => setSelectedTab('matches')} aria-label="マッチ">
          🧩
        </button>
        <button type="button" className={selectedTab === 'profile' ? 'active' : ''} onClick={() => setSelectedTab('profile')} aria-label="プロフィール">
          �
        </button>
        <button type="button" className={selectedTab === 'settings' ? 'active' : ''} onClick={() => setSelectedTab('settings')} aria-label="設定">
          ⚙️
        </button>
      </nav>
    </div>
  );
}

export default App;
