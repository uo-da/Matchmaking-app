import React, { useEffect, useMemo, useState } from 'react';
import AgeVerification from './components/AgeVerification';
import LoginPage from './components/LoginPage';
import ProfileEditor from './components/ProfileEditor';
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

  useEffect(() => {
    storageService.seedSampleData();
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
  };

  const handleSelectMatch = (matchId) => {
    setSelectedMatchId(matchId);
    setSelectedTab('chat');
  };

  const handleSendMessage = async (matchId, text) => {
    if (!currentUser) {
      return;
    }
    await chatService.sendMessage(currentUser.id, matchId, text);
    setRefreshToggle((value) => !value);
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
        <div>
          <h1>エンジニア向けマッチング</h1>
          <p>{currentUser.displayName} さん、ようこそ</p>
        </div>
        <button type="button" onClick={handleLogout} className="secondary-button">
          ログアウト
        </button>
      </header>
      <nav className="app-nav">
        <button type="button" className={selectedTab === 'users' ? 'active' : ''} onClick={() => setSelectedTab('users')}>
          カード
        </button>
        <button type="button" className={selectedTab === 'profile' ? 'active' : ''} onClick={() => setSelectedTab('profile')}>
          プロフィール
        </button>
        <button type="button" className={selectedTab === 'matches' ? 'active' : ''} onClick={() => setSelectedTab('matches')}>
          マッチング ({allMatches.length})
        </button>
      </nav>
      <main className="app-main">
        {selectedTab === 'profile' && <ProfileEditor user={currentUser} onSave={handleProfileSave} />}
        {selectedTab === 'users' && (
          <TinderDeck
            currentUser={currentUser}
            users={filteredUsers}
            filter={filter}
            onFilterChange={setFilter}
            onLike={handleLike}
            onSuperLike={(targetId) => handleLike(targetId, true)}
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
    </div>
  );
}

export default App;
