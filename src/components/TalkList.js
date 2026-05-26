import React, { useMemo } from 'react';
import { getUserImageCandidates, loadNextImageCandidate } from '../utils/userImage';

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
 * @param {{ currentUser: Object, users: Object[], matchedUserIds: Set<string>, messagesByMatchId: Record<string, Object[]>, onSelectMatch: (matchId: string) => void }} props
 */
function TalkList({ currentUser, users, matchedUserIds, messagesByMatchId = {}, onSelectMatch }) {
  const matchedUsers = useMemo(() => {
    const ids = Array.isArray(currentUser.matches) ? currentUser.matches : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    return ids
      .map((id) => userMap.get(id))
      .filter((user) => user && user.id !== currentUser.id && matchedUserIds.has(user.id));
  }, [currentUser.id, currentUser.matches, matchedUserIds, users]);

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
    const ids = Array.isArray(currentUser.matches) ? currentUser.matches : [];
    const userMap = new Map(matchedUsers.map((user) => [user.id, user]));
    return [...ids]
      .reverse()
      .map((id) => userMap.get(id))
      .filter(Boolean)
      .slice(0, 4);
  }, [currentUser.matches, matchedUsers]);

  return (
    <div className="talk-screen">
      <section className="talk-section">
        <h2 className="talk-section__title">新しいマッチ</h2>
        {newMatches.length === 0 ? (
          <p className="talk-empty">まだマッチしていません</p>
        ) : (
          <div className="new-match-strip" role="list">
            {newMatches.map((user) => {
              const imageCandidates = getUserImageCandidates(user, 260);
              return (
                <button
                  key={`new-match-${user.id}`}
                  type="button"
                  className="new-match-thumb"
                  onClick={() => onSelectMatch(user.id)}
                  aria-label={`${user.displayName}とのトークを開く`}
                >
                  <img
                    className="new-match-thumb__image"
                    src={imageCandidates[0]}
                    alt={user.displayName}
                    data-candidate-index="0"
                    onError={(event) => {
                      loadNextImageCandidate(event, imageCandidates);
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="talk-section">
        <h2 className="talk-section__title">トーク</h2>
        {talkItems.length === 0 ? (
          <p className="talk-empty">ここにトークが表示されます</p>
        ) : (
          <div className="talk-list" role="list">
            {talkItems.map(({ user, preview, timeLabel, unreadCount }) => {
              const imageCandidates = getUserImageCandidates(user, 220);
              return (
                <button
                  key={`talk-${user.id}`}
                  type="button"
                  className="talk-item"
                  onClick={() => onSelectMatch(user.id)}
                >
                  <img
                    className="talk-item__avatar"
                    src={imageCandidates[0]}
                    alt={user.displayName}
                    data-candidate-index="0"
                    onError={(event) => {
                      loadNextImageCandidate(event, imageCandidates);
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default TalkList;
