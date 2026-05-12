import React, { useEffect, useMemo, useState } from 'react';
import AgeVerification from './components/AgeVerification';
import LoginPage from './components/LoginPage';
import ProfileEditor from './components/ProfileEditor';
import SettingsPanel from './components/SettingsPanel';
import TinderDeck from './components/TinderDeck';
import MatchList from './components/MatchList';
import MatchChat from './components/MatchChat';
import Footer from './components/Footer';
import authService from './services/authService';
import storageService from './services/storageService';
import chatService from './services/chatService';
import { filterUsersByCriteria } from './utils/matchUtils';

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

  const filteredUsers = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return filterUsersByCriteria(allUsers.filter((user) => user.id !== currentUser.id), filter);
  }, [allUsers, currentUser, filter]);

  const matchedUserIds = useMemo(() => {
    return new Set(currentUser?.matches || []);
  }, [currentUser]);

  const handleLogin = (username) => {
    const user = authService.loginWithGitHub(username);
    setCurrentUser(user);
    setSelectedTab('users');
  };

  const handleAgeConfirm = (age) => {
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

  const handleSelectMatch = (matchId) => {
    if (!matchedUserIds.has(matchId)) {
      window.alert('マッチ成立前のユーザーとはチャットできません。');
      return;
    }
    setSelectedMatchId(matchId);
    setSelectedTab('chat');
  };

  const handleSendMessage = async (matchId, text) => {
    if (!currentUser) {
      return null;
    }
    if (!matchedUserIds.has(matchId)) {
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
    <div
      className={[
        'app-shell',
        selectedTab === 'users' ? 'app-shell--users' : '',
        selectedTab === 'matches' ? 'app-shell--likes' : ''
      ].filter(Boolean).join(' ')}
    >
      <header className="app-header">
        <div className="header-brand">
          <img src="/vendor-logo.svg" alt="Vendor Logo" className="tinder-logo" />
        </div>
        <div className="header-actions">
          {selectedTab === 'users' && (
            <button type="button" className="icon-button icon-button--search" aria-label="検索">
              <img src="/images/search.png" alt="" className="icon-button__image" />
            </button>
          )}
          <button type="button" className="icon-button icon-button--bell" aria-label="通知">
            <img src="/images/bell.png" alt="" className="icon-button__image" />
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
          <MatchList
            currentUser={currentUser}
            users={allUsers}
            matchedUserIds={matchedUserIds}
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
      <Footer activeTab={selectedTab} onTabChange={setSelectedTab} />
    </div>
  );
}

export default App;
