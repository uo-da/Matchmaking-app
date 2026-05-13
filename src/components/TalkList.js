import React, { useEffect, useMemo, useState } from 'react';
import chatService from '../services/chatService';

const FALLBACK_AVATAR = 'https://via.placeholder.com/160?text=No+Image';

function formatChatTime(timestamp) {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}：${mm}`;
}

/**
 * @param {{ currentUser: Object, users: Object[], matchedUserIds: Set<string>, onSelectMatch: (matchId: string) => void }} props
 */
function TalkList({ currentUser, users, matchedUserIds, onSelectMatch }) {
  const [messagesByMatchId, setMessagesByMatchId] = useState({});

  const matchedUsers = useMemo(() => {
    const ids = Array.isArray(currentUser.matches) ? currentUser.matches : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    return ids
      .map((id) => userMap.get(id))
      .filter((user) => user && user.id !== currentUser.id && matchedUserIds.has(user.id));
  }, [currentUser.id, currentUser.matches, matchedUserIds, users]);

  useEffect(() => {
    let isCancelled = false;

    const loadMessages = async () => {
      const entries = await Promise.all(
        matchedUsers.map(async (user) => {
          const messages = await chatService.getMessages(currentUser.id, user.id);
          return [user.id, messages];
        })
      );

      if (isCancelled) {
        return;
      }

      setMessagesByMatchId(Object.fromEntries(entries));
    };

    loadMessages();

    const channel = chatService.subscribe((event) => {
      if (!event.matchKey) {
        return;
      }

      const target = matchedUsers.find(
        (user) => chatService.getMatchKey(currentUser.id, user.id) === event.matchKey
      );

      if (!target) {
        return;
      }

      chatService.getMessages(currentUser.id, target.id).then((messages) => {
        if (!isCancelled) {
          setMessagesByMatchId((prev) => ({ ...prev, [target.id]: messages }));
        }
      });
    });

    return () => {
      isCancelled = true;
      channel.unsubscribe();
    };
  }, [currentUser.id, matchedUsers]);

  const talkItems = useMemo(() => {
    return matchedUsers
      .map((user) => {
        const messages = Array.isArray(messagesByMatchId[user.id]) ? messagesByMatchId[user.id] : [];
        const lastMessage = messages[messages.length - 1] || null;
        const unreadCount = messages.filter(
          (message) => message.receiverId === currentUser.id && !message.isRead
        ).length;

        return {
          user,
          preview: lastMessage?.text || 'メッセージはまだありません',
          timeLabel: formatChatTime(lastMessage?.timestamp),
          lastTimestamp: lastMessage?.timestamp || 0,
          unreadCount
        };
      })
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [currentUser.id, matchedUsers, messagesByMatchId]);

  const newMatches = useMemo(() => {
    const unseen = talkItems.filter((item) => item.lastTimestamp === 0);
    if (unseen.length > 0) {
      return unseen.slice(0, 6);
    }
    return talkItems.slice(0, 6);
  }, [talkItems]);

  return (
    <div className="talk-screen">
      <section className="talk-section">
        <h2 className="talk-section__title">新しいマッチ</h2>
        {newMatches.length === 0 ? (
          <p className="talk-empty">まだマッチしていません</p>
        ) : (
          <div className="new-match-strip" role="list">
            {newMatches.map(({ user }) => (
              <button
                key={`new-match-${user.id}`}
                type="button"
                className="new-match-thumb"
                onClick={() => onSelectMatch(user.id)}
                aria-label={`${user.displayName}とのトークを開く`}
              >
                <img
                  className="new-match-thumb__image"
                  src={`https://github.com/${user.githubUsername}.png?size=260`}
                  alt={user.displayName}
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="talk-section">
        <h2 className="talk-section__title">トーク</h2>
        {talkItems.length === 0 ? (
          <p className="talk-empty">ここにトークが表示されます</p>
        ) : (
          <div className="talk-list" role="list">
            {talkItems.map(({ user, preview, timeLabel, unreadCount }) => (
              <button
                key={`talk-${user.id}`}
                type="button"
                className="talk-item"
                onClick={() => onSelectMatch(user.id)}
              >
                <img
                  className="talk-item__avatar"
                  src={`https://github.com/${user.githubUsername}.png?size=220`}
                  alt={user.displayName}
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />
                <div className="talk-item__body">
                  <p className="talk-item__name">{user.displayName}</p>
                  <p className="talk-item__preview">{preview}</p>
                </div>
                <div className="talk-item__meta">
                  <span className="talk-item__time">{timeLabel}</span>
                  {unreadCount > 0 && <span className="talk-item__badge">{unreadCount}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TalkList;
