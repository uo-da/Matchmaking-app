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
import { prefetchUserImages } from './utils/userImage';

const ENTRANCE_SEEN_KEY = 'matchmaking_entrance_seen';
const VIEW_STATE_KEY = 'matchmaking_view_state';

const hasSeenEntrance = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(ENTRANCE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const markEntranceAsSeen = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(ENTRANCE_SEEN_KEY, '1');
  } catch {
    // ignore write errors
  }
};

const loadSavedViewState = (userId) => {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId) {
      return null;
    }
    return {
      selectedTab: parsed.selectedTab,
      selectedMatchId: parsed.selectedMatchId || null
    };
  } catch {
    return null;
  }
};

const saveViewState = (userId, selectedTab, selectedMatchId) => {
  if (typeof window === 'undefined' || !userId) {
    return;
  }
  try {
    window.localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
      userId,
      selectedTab,
      selectedMatchId: selectedMatchId || null
    }));
  } catch {
    // ignore write errors
  }
};

const isSameMessage = (left, right) => {
  if (!left || !right) {
    return false;
  }
  if (left.id && right.id) {
    return left.id === right.id;
  }
  return (
    left.senderId === right.senderId
    && left.receiverId === right.receiverId
    && left.text === right.text
    && left.timestamp === right.timestamp
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEntranceVisible, setIsEntranceVisible] = useState(() => !hasSeenEntrance());
  const [isSessionLoading, setIsSessionLoading] = useState(true);
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
  const [isViewStateHydrated, setIsViewStateHydrated] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [messagesByMatchIdCache, setMessagesByMatchIdCache] = useState({});
  const [matchModal, setMatchModal] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const notificationButtonRef = useRef(null);
  const prefetchedSessionUserRef = useRef(null);

  useEffect(() => {
    const initializeData = async () => {
      storageService.seedSampleData();
      await chatService.seedSampleMessages();
      const users = await storageService.getUsers();
      setAllUsers(users);
    };

    const loadSession = async () => {
      try {
        const authSession = await authService.getCurrentSession();
        const localSession = storageService.getCurrentSession();
        const session = authSession || localSession;
        if (!session) {
          setCurrentUser(null);
          setAuthError(false);
          return;
        }

        // 認証セッションよりローカル永続データの方が新しい場合があるため補完する
        const latestProfile = await storageService.getUserById(session.id);
        setCurrentUser(latestProfile ? { ...session, ...latestProfile } : session);
        markEntranceAsSeen();
        setIsEntranceVisible(false);
        setAuthError(false);
      } catch (error) {
        console.error('Failed to load session:', error);
        setAuthError(true);
      } finally {
        setIsSessionLoading(false);
      }
    };
    if (process.env.NODE_ENV === 'test') {
      const saved = authService.getCurrentSession();
      setCurrentUser(saved);
      setIsSessionLoading(false);
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
    if (!currentUser?.id) {
      setIsViewStateHydrated(false);
      return;
    }

    const savedViewState = loadSavedViewState(currentUser.id);
    if (savedViewState) {
      const allowedTabs = new Set(['users', 'matches', 'chat', 'settings', 'profile']);
      const restoredTab = allowedTabs.has(savedViewState.selectedTab) ? savedViewState.selectedTab : 'users';
      const matchedIds = new Set(currentUser.matches || []);
      const restoredMatchId = (
        restoredTab === 'chat' && savedViewState.selectedMatchId && matchedIds.has(savedViewState.selectedMatchId)
      )
        ? savedViewState.selectedMatchId
        : null;
      setSelectedTab(restoredTab);
      setSelectedMatchId(restoredMatchId);
    } else {
      setSelectedTab('users');
      setSelectedMatchId(null);
    }
    setIsViewStateHydrated(true);
  }, [currentUser?.id, currentUser?.matches]);

  useEffect(() => {
    if (!currentUser?.id || !isViewStateHydrated) {
      return;
    }
    saveViewState(currentUser.id, selectedTab, selectedMatchId);
  }, [currentUser?.id, isViewStateHydrated, selectedTab, selectedMatchId]);

  useEffect(() => {
    if (!currentUser?.id || allUsers.length === 0) {
      return;
    }
    const latestProfile = allUsers.find((user) => user.id === currentUser.id);
    if (!latestProfile) {
      return;
    }
    const merged = { ...currentUser, ...latestProfile };
    if (JSON.stringify(merged) !== JSON.stringify(currentUser)) {
      setCurrentUser(merged);
    }
  }, [allUsers, currentUser]);

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
  const matchedIds = useMemo(() => (Array.isArray(currentUser?.matches) ? currentUser.matches : []), [currentUser?.matches]);

  useEffect(() => {
    if (!currentUser?.id) {
      setMessagesByMatchIdCache({});
      return;
    }

    if (matchedIds.length === 0) {
      setMessagesByMatchIdCache({});
      return;
    }

    let isCancelled = false;
    const userId = currentUser.id;

    const preloadTalkMessages = async () => {
      const entries = await Promise.all(
        matchedIds.map(async (matchId) => {
          const messages = await chatService.getMessages(userId, matchId);
          return [matchId, Array.isArray(messages) ? messages : []];
        })
      );

      if (isCancelled) {
        return;
      }

      const next = {};
      entries.forEach(([matchId, messages]) => {
        next[matchId] = messages;
      });
      setMessagesByMatchIdCache(next);
    };

    preloadTalkMessages().catch((error) => {
      console.error('Failed to preload talk messages:', error);
    });

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, matchedIds]);

  useEffect(() => {
    if (!currentUser?.id || matchedIds.length === 0) {
      return undefined;
    }

    let isCancelled = false;
    const userId = currentUser.id;
    const channel = chatService.subscribe((event) => {
      if (!event.matchKey) {
        return;
      }

      const targetMatchId = matchedIds.find(
        (matchId) => chatService.getMatchKey(userId, matchId) === event.matchKey
      );
      if (!targetMatchId) {
        return;
      }

      chatService.getMessages(userId, targetMatchId).then((messages) => {
        if (isCancelled) {
          return;
        }
        setMessagesByMatchIdCache((prev) => ({
          ...prev,
          [targetMatchId]: Array.isArray(messages) ? messages : []
        }));
      }).catch((error) => {
        console.error('Failed to refresh talk messages:', error);
      });
    });

    return () => {
      isCancelled = true;
      channel.unsubscribe();
    };
  }, [currentUser?.id, matchedIds]);

  useEffect(() => {
    if (!currentUser?.id) {
      prefetchedSessionUserRef.current = null;
      return;
    }
    if (allUsers.length === 0 || prefetchedSessionUserRef.current === currentUser.id) {
      return;
    }

    const matchedUsers = allUsers.filter((user) => matchedUserIds.has(user.id));
    const cardUsers = filteredUsers.slice(0, 16);
    const prefetchTargets = [...matchedUsers, ...cardUsers];

    prefetchUserImages(prefetchTargets, {
      size: 320,
      perUserLimit: 3,
      totalLimit: 120
    });
    prefetchedSessionUserRef.current = currentUser.id;
  }, [allUsers, currentUser?.id, filteredUsers, matchedUserIds]);

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
    if (message) {
      setMessagesByMatchIdCache((prev) => {
        const existing = Array.isArray(prev[matchId]) ? prev[matchId] : [];
        if (existing.some((item) => isSameMessage(item, message))) {
          return prev;
        }
        return {
          ...prev,
          [matchId]: [...existing, message]
        };
      });
    }
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

  const isChatDetail = selectedTab === 'chat' && Boolean(selectedMatchId);

  if (!currentUser) {
    if (isSessionLoading) {
      return null;
    }

    if (isEntranceVisible) {
      return (
        <EntrancePage
          onEnter={() => {
            markEntranceAsSeen();
            setIsEntranceVisible(false);
          }}
        />
      );
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
        selectedTab === 'settings' ? 'app-shell--settings' : '',
        isChatDetail ? 'app-shell--chat-detail' : ''
      ].filter(Boolean).join(' ')}
    >
      {!isChatDetail && (
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
      )}
      <main className={`app-main ${isChatDetail ? 'app-main--chat-detail' : ''}`}>
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
            messagesByMatchId={messagesByMatchIdCache}
            onSelectMatch={handleSelectMatch}
          />
        )}
        {selectedTab === 'chat' && selectedMatchId && (
          <MatchChat
            matchId={selectedMatchId}
            currentUser={currentUser}
            onSend={handleSendMessage}
            onBack={() => setSelectedMatchId(null)}
          />
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
      {!isChatDetail && <Footer activeTab={selectedTab} onTabChange={handleTabChange} />}
    </div>
  );
}

export default App;
