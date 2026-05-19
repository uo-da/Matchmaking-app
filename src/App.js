import React, { useEffect, useMemo, useState, useRef } from 'react';
import AgeVerification from './components/AgeVerification';
import EntrancePage from './components/EntrancePage';
import LoginPage from './components/LoginPage';
import ProfileEditor from './components/ProfileEditor';
import SettingsPanel from './components/SettingsPanel';
import TinderDeck from './components/TinderDeck';
import MatchList from './components/MatchList';
import TalkList from './components/TalkList';
import MatchChat from './components/MatchChat';
import Footer from './components/Footer';
import NotificationList from './components/NotificationList';
import authService from './services/authService';
import storageService from './services/storageService';
import chatService from './services/chatService';
import { filterUsersByCriteria } from './utils/matchUtils';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEntranceVisible, setIsEntranceVisible] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [selectedTab, setSelectedTab] = useState('users');
  const [filter, setFilter] = useState({
    query: '',
    stackTag: '',
    stackTags: [],
    minYears: 0,
    minAge: 18,
    maxAge: 80,
    genders: ['女性', '男性'],
    excludeScoutNg: true
  });
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [matchModal, setMatchModal] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const notificationButtonRef = useRef(null);

  useEffect(() => {
    const initializeData = async () => {
      storageService.seedSampleData();
      await chatService.seedSampleMessages();
      const users = await storageService.getUsers();
      setAllUsers(users);
    };

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
    initializeData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      storageService.saveCurrentSession(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await storageService.getUsers();
        setAllUsers(users);
      } catch (error) {
        console.error('Failed to load users:', error);
        setAllUsers([]);
      }
    };

    if (process.env.NODE_ENV === 'test') {
      setAllUsers(storageService.getUsers());
    } else {
      loadUsers();
    }
  }, [refreshToggle]);

  useEffect(() => {
    if (currentUser) {
      const userNotifications = storageService.getNotifications(currentUser.id);
      setNotifications(userNotifications);
    }
  }, [currentUser, refreshToggle]);

  const filteredUsers = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    const likedIds = Array.isArray(currentUser.likedUserIds) ? currentUser.likedUserIds : [];
    const superLikedIds = Array.isArray(currentUser.superLikedUserIds) ? currentUser.superLikedUserIds : [];
    const nopedIds = Array.isArray(currentUser.nopedUserIds) ? currentUser.nopedUserIds : [];
    const reactedUserIds = new Set([...likedIds, ...superLikedIds, ...nopedIds]);

    return filterUsersByCriteria(
      allUsers.filter((user) => user.id !== currentUser.id && !reactedUserIds.has(user.id)),
      filter
    );
  }, [allUsers, currentUser, filter]);

  const matchedUserIds = useMemo(() => {
    return new Set(currentUser?.matches || []);
  }, [currentUser]);

  const handleLogin = async (user) => {
    if (!user && process.env.NODE_ENV === 'test') {
      user = await authService.demoLogin();
    }
    if (!user) {
      return;
    }
    setCurrentUser(user);
    setSelectedTab('users');
  };

  const handleAgeConfirm = async (age) => {
    if (!currentUser) {
      console.error('No current user for age verification');
      return;
    }
    try {
      const updated = authService.verifyAge(currentUser, age);
      const saved = await storageService.saveUserProfile(updated);
      setCurrentUser(saved);
      // 年齢確認後にプロフィールが不完全ならプロフィール編集を強制
      if (!isProfileComplete(saved)) {
        setSelectedTab('profile');
      }
    } catch (error) {
      console.error('Failed to confirm age:', error);
      window.alert('サーバーとの通信に失敗しました。しばらくしてからもう一度お試しください。');
    }
  };

  const handleProfileSave = async (profile) => {
    try {
      const updated = await storageService.saveUserProfile({ ...currentUser, ...profile });
      setCurrentUser(updated);
      // プロフィールが完全になったらusersタブに戻る
      if (isProfileComplete(updated)) {
        setSelectedTab('users');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      window.alert('プロフィールの保存に失敗しました。');
    }
  };

  const isProfileComplete = (user) => {
    return user.stackTags && user.stackTags.length > 0 && user.experienceYears > 0;
  };

  const handleLike = async (targetId, isSuperLike = false) => {
    if (!currentUser?.id || !targetId) {
      return;
    }
    const updated = await storageService.saveUserReaction(currentUser.id, targetId, isSuperLike);
    if (!updated) {
      setRefreshToggle((value) => !value);
      return;
    }
    const refreshedUser = await storageService.getUserById(updated.id);
    setCurrentUser(refreshedUser || updated);
    setRefreshToggle((value) => !value);

    // スーパーライクの場合は通知を追加
    if (isSuperLike) {
      storageService.addNotification('superLike', currentUser.id, targetId);
    }

    const targetUser = await storageService.getUserById(targetId);
    const targetLikedCurrent = targetUser
      && ((targetUser.likedUserIds || []).includes(currentUser.id) || (targetUser.superLikedUserIds || []).includes(currentUser.id));

    if (targetLikedCurrent) {
      // マッチ成立の場合は通知を追加
      storageService.addNotification('match', currentUser.id, targetId);
      storageService.addNotification('match', targetId, currentUser.id);
      setMatchModal(targetUser);
    }
  };

  const handleNope = async (targetId) => {
    if (!currentUser?.id || !targetId) {
      return;
    }
    const updated = await storageService.saveUserNope(currentUser.id, targetId);
    if (!updated) {
      setRefreshToggle((value) => !value);
      return;
    }
    const refreshedUser = await storageService.getUserById(updated.id);
    setCurrentUser(refreshedUser || updated);
    setRefreshToggle((value) => !value);
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

  const handleTabChange = (tabId) => {
    if (tabId === 'chat') {
      setSelectedMatchId(null);
    }
    setSelectedTab(tabId);
  };

  const handleNotificationClick = () => {
    console.log('Notification button clicked');
    setShowNotificationList(!showNotificationList);
  };

  const handleNotificationClose = () => {
    setShowNotificationList(false);
  };

  // 通知ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationButtonRef.current && !notificationButtonRef.current.contains(event.target)) {
        setShowNotificationList(false);
      }
    };

    if (showNotificationList) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationList]);

  const handleMarkNotificationAsRead = (notificationId) => {
    storageService.markNotificationAsRead(notificationId);
    setRefreshToggle((value) => !value);
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
    <div
      className={[
        'app-shell',
        selectedTab === 'users' ? 'app-shell--users' : '',
        selectedTab === 'matches' ? 'app-shell--likes' : '',
        selectedTab === 'chat' ? 'app-shell--chat' : '',
        selectedTab === 'settings' ? 'app-shell--settings' : ''
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
          <button type="button" className="icon-button icon-button--bell" aria-label="通知" onClick={handleNotificationClick} ref={notificationButtonRef}>
            <img src="/images/bell.png" alt="" className="icon-button__image" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="notification-badge">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          {showNotificationList && (
            <NotificationList
              notifications={notifications}
              users={allUsers}
              onClose={handleNotificationClose}
              onMarkAsRead={handleMarkNotificationAsRead}
            />
          )}
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
            onNope={handleNope}
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
        {selectedTab === 'chat' && !selectedMatchId && (
          <TalkList
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
            <div className="match-modal__hearts">💖🥰💖</div>
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
      <Footer activeTab={selectedTab} onTabChange={handleTabChange} />
    </div>
  );
}

export default App;
