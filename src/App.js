import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import AgeVerification from './components/AgeVerification';
import EntrancePage from './components/EntrancePage';
import LoginPage from './components/LoginPage';
import ProfileEditor from './components/ProfileEditor';
import ProfileView from './components/ProfileView';
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

const isUnauthorizedError = (error) => (
  error instanceof Error
  && (
    error.message.includes('401')
    || error.message.includes('Not authenticated')
  )
);


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

const upsertUser = (users, nextUser) => {
  if (!nextUser?.id) {
    return users;
  }
  const exists = users.some((user) => user.id === nextUser.id);
  if (!exists) {
    return [...users, nextUser];
  }
  return users.map((user) => (user.id === nextUser.id ? { ...user, ...nextUser } : user));
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);
const addUnique = (list, value) => (list.includes(value) ? list : [...list, value]);

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEntranceVisible, setIsEntranceVisible] = useState(true);
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
    genders: ['女性', '男性']
  });
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [isViewStateHydrated, setIsViewStateHydrated] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [messagesByMatchIdCache, setMessagesByMatchIdCache] = useState({});
  const [matchModal, setMatchModal] = useState(null);
  const [superLikeLimitModal, setSuperLikeLimitModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const notificationButtonRef = useRef(null);
  const prefetchedSessionUserRef = useRef(null);
  const swipeQueueRef = useRef([]);
  const swipeQueueProcessingRef = useRef(false);
  const swipeQueueRetryTimerRef = useRef(null);

  const scheduleSwipeQueueRetry = (delayMs) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (swipeQueueRetryTimerRef.current) {
      window.clearTimeout(swipeQueueRetryTimerRef.current);
    }
    swipeQueueRetryTimerRef.current = window.setTimeout(() => {
      swipeQueueRetryTimerRef.current = null;
      processSwipeQueue();
    }, delayMs);
  };

  const processSwipeQueue = async () => {
    if (swipeQueueProcessingRef.current) {
      return;
    }
    swipeQueueProcessingRef.current = true;

    try {
      while (swipeQueueRef.current.length > 0) {
        const task = swipeQueueRef.current[0];
        const now = Date.now();
        if (task.nextRetryAt && task.nextRetryAt > now) {
          scheduleSwipeQueueRetry(task.nextRetryAt - now);
          break;
        }

        try {
          const saved = task.type === 'reaction'
            ? await storageService.saveUserReaction(task.userId, task.targetId, task.isSuperLike)
            : await storageService.saveUserNope(task.userId, task.targetId);

          swipeQueueRef.current.shift();
          if (saved) {
            setCurrentUser((prev) => (prev?.id === saved.id ? { ...prev, ...saved } : prev));
            setAllUsers((prev) => upsertUser(prev, saved));
          }
        } catch (error) {
          const attempts = (task.attempts || 0) + 1;
          const retryDelay = Math.min(30000, 1000 * (2 ** Math.min(attempts, 5)));
          swipeQueueRef.current[0] = {
            ...task,
            attempts,
            nextRetryAt: Date.now() + retryDelay
          };
          console.error('Queued swipe request failed. Retrying later:', error);
          scheduleSwipeQueueRetry(retryDelay);
          break;
        }
      }
    } finally {
      swipeQueueProcessingRef.current = false;
    }
  };

  const enqueueSwipeTask = (task) => {
    swipeQueueRef.current.push({
      ...task,
      attempts: 0,
      nextRetryAt: 0
    });
    processSwipeQueue();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleOnline = () => {
      processSwipeQueue();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        if (swipeQueueRetryTimerRef.current) {
          window.clearTimeout(swipeQueueRetryTimerRef.current);
        }
      }
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        storageService.seedSampleData();
        await chatService.seedSampleMessages();
      } catch (error) {
        console.error('Failed to initialize local caches:', error);
      }
    };

    const loadSession = async () => {
      try {
        const authSession = await authService.getCurrentSession();
        const localSession = process.env.NODE_ENV === 'test' ? storageService.getCurrentSession() : null;
        const session = authSession || localSession;
        if (!session) {
          setCurrentUser(null);
          setAuthError(false);
          return;
        }

        // 認証セッションよりローカル永続データの方が新しい場合があるため補完する
        const latestProfile = await storageService.getUserById(session.id);
        setCurrentUser(latestProfile ? { ...session, ...latestProfile } : session);
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
        if (!isUnauthorizedError(error)) {
          console.error('Failed to load users:', error);
        }
        setAllUsers([]);
      }
    };

    if (process.env.NODE_ENV === 'test') {
      setAllUsers(storageService.getUsers());
      return;
    }

    if (!currentUser?.id) {
      setAllUsers([]);
      return;
    }

    loadUsers();
  }, [refreshToggle, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    let isCancelled = false;
    const loadNotifications = async () => {
      try {
        const userNotifications = await storageService.getNotifications(currentUser.id);
        if (!isCancelled) {
          setNotifications(Array.isArray(userNotifications) ? userNotifications : []);
        }
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          console.error('Failed to load notifications:', error);
        }
        if (!isCancelled) {
          setNotifications([]);
        }
      }
    };

    loadNotifications();
    return () => {
      isCancelled = true;
    };
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

  const refreshTalkMessages = useCallback(async () => {
    if (!currentUser?.id || matchedIds.length === 0) {
      setMessagesByMatchIdCache({});
      return;
    }

    const userId = currentUser.id;
    const entries = await Promise.all(
      matchedIds.map(async (matchId) => {
        const messages = await chatService.getMessages(userId, matchId);
        return [matchId, Array.isArray(messages) ? messages : []];
      })
    );

    const next = {};
    entries.forEach(([matchId, messages]) => {
      next[matchId] = messages;
    });
    setMessagesByMatchIdCache(next);
  }, [currentUser?.id, matchedIds]);

  useEffect(() => {
    if (!currentUser?.id) {
      setMessagesByMatchIdCache({});
      return;
    }

    if (matchedIds.length === 0) {
      setMessagesByMatchIdCache({});
      return;
    }

    refreshTalkMessages().catch((error) => {
      console.error('Failed to preload talk messages:', error);
    });
  }, [currentUser?.id, matchedIds, refreshTalkMessages]);

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
      if (event.type && event.type.startsWith('editor:')) {
        return;
      }

      const targetMatchId = matchedIds.find(
        (matchId) => chatService.getMatchKey(userId, matchId) === event.matchKey
      );
      if (!targetMatchId) {
        return;
      }

      if (event.type === 'message') {
        setMessagesByMatchIdCache((prev) => {
          const existing = Array.isArray(prev[targetMatchId]) ? prev[targetMatchId] : [];
          if (existing.some((item) => isSameMessage(item, event))) {
            return prev;
          }
          return {
            ...prev,
            [targetMatchId]: [...existing, event]
          };
        });
      } else if (event.type === 'read' && event.readBy) {
        setMessagesByMatchIdCache((prev) => {
          const existing = Array.isArray(prev[targetMatchId]) ? prev[targetMatchId] : [];
          const next = existing.map((message) => (
            message.receiverId === event.readBy ? { ...message, isRead: true } : message
          ));
          return {
            ...prev,
            [targetMatchId]: next
          };
        });
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
    if (selectedTab !== 'chat' || selectedMatchId || !currentUser?.id || matchedIds.length === 0) {
      return undefined;
    }

    let isCancelled = false;
    const runRefresh = () => {
      refreshTalkMessages().catch((error) => {
        if (!isCancelled) {
          console.error('Failed to refresh talk list:', error);
        }
      });
    };

    runRefresh();
    const intervalId = window.setInterval(runRefresh, 4000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedTab, selectedMatchId, currentUser?.id, matchedIds, refreshTalkMessages]);

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

  const handleLogout = async () => {
    const didLogout = await authService.logout();

    storageService.clearCurrentSession();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(VIEW_STATE_KEY);
      } catch {
        // ignore write errors
      }
    }
    setCurrentUser(null);
    setSelectedTab('users');
    setSelectedMatchId(null);
    setMessagesByMatchIdCache({});
    setMatchModal(null);
    setNotifications([]);
    setShowNotificationList(false);
    setIsViewStateHydrated(false);
    setAuthError(false);
    prefetchedSessionUserRef.current = null;

    if (!didLogout) {
      window.alert('サーバー側のログアウトに失敗しました。再ログイン状態が残る場合は再読み込みしてください。');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) {
      return;
    }

    const shouldDelete = window.confirm('アカウントを削除します。プロフィール情報と関連データはすべて削除されます。よろしいですか？');
    if (!shouldDelete) {
      return;
    }

    try {
      const result = await storageService.deleteAccount(currentUser.id);
      if (!result) {
        window.alert('アカウント削除に失敗しました。');
        return;
      }

      // 削除APIがフォールバック経路を通る場合に備えて、サーバーセッションを明示的に破棄する。
      await authService.logout();
      storageService.clearCurrentSession();
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('currentUser');
          window.localStorage.removeItem(VIEW_STATE_KEY);
        } catch {
          // ignore write errors
        }
      }
      setCurrentUser(null);
      setSelectedTab('users');
      setSelectedMatchId(null);
      setMessagesByMatchIdCache({});
      setMatchModal(null);
      setNotifications([]);
      setShowNotificationList(false);
      setIsViewStateHydrated(false);
      setAuthError(false);
      prefetchedSessionUserRef.current = null;
      setRefreshToggle((value) => !value);
      if (typeof window !== 'undefined') {
        window.location.replace(window.location.origin);
        return;
      }

      window.alert('アカウントを削除しました。');
    } catch (error) {
      console.error('Failed to delete account:', error);
      window.alert('アカウント削除に失敗しました。');
    }
  };

  const handleAgeConfirm = async (age) => {
    if (!currentUser) {
      console.error('No current user for age verification');
      return;
    }
    try {
      const updated = authService.verifyAge(currentUser, age);
      const saved = await storageService.saveUserProfile(updated);
      setAllUsers((prev) => upsertUser(prev, saved));
      setCurrentUser(saved);
      // 年齢確認後にプロフィールが不完全ならプロフィール編集を強制
      if (!isProfileComplete(saved)) {
        setSelectedTab('profile');
      }
    } catch (error) {
      console.error('Failed to confirm age:', error);
      const message = error instanceof Error ? error.message : '不明なエラー';
      window.alert(`サーバーとの通信に失敗しました。しばらくしてからもう一度お試しください。\n${message}`);
    }
  };

  const handleProfileSave = async (profile) => {
    try {
      const wasInitialRegistration = Boolean(currentUser?.ageVerified && currentUser && !isProfileComplete(currentUser));
      const updated = await storageService.saveUserProfile({ ...currentUser, ...profile });
      setAllUsers((prev) => upsertUser(prev, updated));
      setCurrentUser(updated);
      if (wasInitialRegistration) {
        // 初期登録フロー完了後はスワイプ画面（users）に遷移する
        setSelectedTab('users');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      const message = error instanceof Error ? error.message : '不明なエラー';
      window.alert(`プロフィールの保存に失敗しました。\n${message}`);
    }
  };

  const isProfileComplete = (user) => {
    const hasName = user && user.displayName && user.displayName.trim().length > 0;
    const hasPhotos = Array.isArray(user.photoUrls) ? user.photoUrls.length > 0 : false;
    const hasYears = user && Number(user.experienceYears) > 0;
    return hasName && hasPhotos && hasYears;
  };

  const isInitialRegistration = Boolean(currentUser?.ageVerified && currentUser && !isProfileComplete(currentUser));

  const handleLike = (targetId, isSuperLike = false) => {
    let userId = null;
    let targetLikedCurrent = false;
    let targetUser = null;

    setCurrentUser((prev) => {
      if (!prev?.id || !targetId) {
        return prev;
      }
      userId = prev.id;

      // スーパーライクの制限チェック（1日3回）
      if (isSuperLike) {
        const today = new Date().toDateString();
        const superLikeDates = normalizeArray(prev.superLikeDates || []);
        const todaySuperLikes = superLikeDates.filter(date => date === today).length;
        if (todaySuperLikes >= 3) {
          setSuperLikeLimitModal(true);
          return prev;
        }
      }

      targetUser = allUsers.find((user) => user.id === targetId) || null;
      targetLikedCurrent = targetUser
        && (
          normalizeArray(targetUser.likedUserIds).includes(userId)
          || normalizeArray(targetUser.superLikedUserIds).includes(userId)
        );

      const likedUserIds = isSuperLike
        ? normalizeArray(prev.likedUserIds)
        : addUnique(normalizeArray(prev.likedUserIds), targetId);
      const superLikedUserIds = isSuperLike
        ? addUnique(normalizeArray(prev.superLikedUserIds), targetId)
        : normalizeArray(prev.superLikedUserIds);
      const nopedUserIds = normalizeArray(prev.nopedUserIds).filter((id) => id !== targetId);
      const matches = targetLikedCurrent
        ? addUnique(normalizeArray(prev.matches), targetId)
        : normalizeArray(prev.matches);
      const superLikeDates = isSuperLike
        ? [...normalizeArray(prev.superLikeDates || []), new Date().toDateString()]
        : normalizeArray(prev.superLikeDates || []);

      const updatedUser = {
        ...prev,
        likedUserIds,
        superLikedUserIds,
        nopedUserIds,
        matches,
        superLikeDates
      };

      return updatedUser;
    });

    setAllUsers((prev) => {
      if (!userId) return prev;

      const targetUser = prev.find((user) => user.id === targetId) || null;
      const targetLikedCurrent = targetUser
        && (
          normalizeArray(targetUser.likedUserIds).includes(userId)
          || normalizeArray(targetUser.superLikedUserIds).includes(userId)
        );

      return prev.map((user) => {
        if (user.id === userId) {
          const likedUserIds = isSuperLike
            ? normalizeArray(user.likedUserIds)
            : addUnique(normalizeArray(user.likedUserIds), targetId);
          const superLikedUserIds = isSuperLike
            ? addUnique(normalizeArray(user.superLikedUserIds), targetId)
            : normalizeArray(user.superLikedUserIds);
          const nopedUserIds = normalizeArray(user.nopedUserIds).filter((id) => id !== targetId);
          const matches = targetLikedCurrent
            ? addUnique(normalizeArray(user.matches), targetId)
            : normalizeArray(user.matches);
          const superLikeDates = isSuperLike
            ? [...normalizeArray(user.superLikeDates || []), new Date().toDateString()]
            : normalizeArray(user.superLikeDates || []);
          return {
            ...user,
            likedUserIds,
            superLikedUserIds,
            nopedUserIds,
            matches,
            superLikeDates
          };
        }
        if (targetLikedCurrent && user.id === targetId) {
          return {
            ...user,
            matches: addUnique(normalizeArray(user.matches), userId)
          };
        }
        return user;
      });
    });

    if (isSuperLike) {
      storageService.addNotification('superLike', userId, targetId).catch((error) => {
        console.error('Failed to create superLike notification:', error);
      });
    }

    if (targetLikedCurrent) {
      storageService.addNotification('match', userId, targetId).catch((error) => {
        console.error('Failed to create match notification:', error);
      });
      storageService.addNotification('match', targetId, userId).catch((error) => {
        console.error('Failed to create reverse match notification:', error);
      });
      if (targetUser) {
        setMatchModal(targetUser);
      }
    }

    enqueueSwipeTask({
      type: 'reaction',
      userId,
      targetId,
      isSuperLike
    });
  };

  const handleNope = (targetId) => {
    if (!currentUser?.id || !targetId) {
      return;
    }
    const userId = currentUser.id;

    setCurrentUser((prev) => {
      if (!prev || prev.id !== userId) {
        return prev;
      }
      return {
        ...prev,
        nopedUserIds: addUnique(normalizeArray(prev.nopedUserIds), targetId)
      };
    });

    setAllUsers((prev) => prev.map((user) => {
      if (user.id !== userId) {
        return user;
      }
      return {
        ...user,
        nopedUserIds: addUnique(normalizeArray(user.nopedUserIds), targetId)
      };
    }));

    enqueueSwipeTask({
      type: 'nope',
      userId,
      targetId
    });
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
    setNotifications((prev) => prev.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )));
    storageService.markNotificationAsRead(notificationId).catch((error) => {
      console.error('Failed to mark notification as read:', error);
    });
    setRefreshToggle((value) => !value);
  };

  const handleSelectNotification = (notification) => {
    if (!notification) {
      return;
    }

    const type = notification.type;
    const fromUserId = notification.fromUserId;
    if (type === 'match' && fromUserId) {
      setShowNotificationList(false);
      setSelectedTab('chat');
      setSelectedMatchId(fromUserId);
      return;
    }

    // like / superLike のプロフィール詳細遷移先は未実装のため、現時点では既読化のみ。
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
            setIsEntranceVisible(false);
          }}
        />
      );
    }

    return <LoginPage onLogin={handleLogin} authError={authError} />;
  }

  if (!currentUser.ageVerified) {
    return <AgeVerification onConfirm={handleAgeConfirm} onBack={() => setCurrentUser(null)} />;
  }

  if (isInitialRegistration) {
    return (
      <div className="registration-shell">
        <div className="registration-header">
          <h1>初期登録</h1>
          <p>まずはプロフィールを登録して、スワイプ画面に進みましょう。</p>
        </div>
        <ProfileEditor user={currentUser} onSave={handleProfileSave} isInitialRegistration />
      </div>
    );
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
              onSelectNotification={handleSelectNotification}
            />
          )}
        </div>
      </header>
      <main className={`app-main ${isChatDetail ? 'app-main--chat-detail' : ''}`}>
        {selectedTab === 'profile' && (
          <ProfileView user={currentUser} onSave={handleProfileSave} />
        )}
        {selectedTab === 'settings' && (
          <SettingsPanel
            filter={filter}
            onFilterChange={setFilter}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
        {selectedTab === 'users' && (
          <TinderDeck
            currentUser={currentUser}
            users={filteredUsers}
            onLike={handleLike}
            onNope={handleNope}
            onSuperLikeLimit={() => setSuperLikeLimitModal(true)}
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
      {superLikeLimitModal && (
        <div className="modal-overlay" onClick={() => setSuperLikeLimitModal(false)}>
          <div className="super-like-limit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="super-like-limit-modal__icon">⭐</div>
            <h2 className="super-like-limit-modal__title">スーパーライク制限</h2>
            <p className="super-like-limit-modal__message">スーパーライクは1日3回までです。明日またお試しください。</p>
            <button type="button" className="primary-button" onClick={() => setSuperLikeLimitModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}
      {!isChatDetail && <Footer activeTab={selectedTab} onTabChange={handleTabChange} />}
    </div>
  );
}

export default App;
