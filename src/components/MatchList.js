import React, { useEffect, useMemo, useState } from 'react';
import chatService from '../services/chatService';

/**
 * @param {{ currentUser: Object, matches: Object[], onSelectMatch: (matchId: string) => void }} props
 */
function MatchList({ currentUser, matches, onSelectMatch }) {
  const [search, setSearch] = useState('');
  const [previews, setPreviews] = useState({});

  const filteredMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return matches;
    }
    return matches.filter((match) => {
      return (
        match.displayName.toLowerCase().includes(term) ||
        (match.bio || '').toLowerCase().includes(term)
      );
    });
  }, [matches, search]);

  useEffect(() => {
    let active = true;
    const loadPreviews = async () => {
      const nextPreviews = {};
      await Promise.all(
        matches.map(async (match) => {
          const messages = await chatService.getMessages(currentUser.id, match.id);
          const lastMessage = messages.length ? messages[messages.length - 1] : null;
          const unreadCount = messages.filter((message) => message.receiverId === currentUser.id && !message.isRead).length;
          nextPreviews[match.id] = {
            text: lastMessage ? lastMessage.text : 'まだメッセージがありません。',
            timestamp: lastMessage
              ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            unreadCount
          };
        })
      );
      if (active) {
        setPreviews(nextPreviews);
      }
    };
    loadPreviews();
    return () => {
      active = false;
    };
  }, [currentUser.id, matches]);

  return (
    <div className="match-list">
      <div className="match-list-header">
        <div>
          <h2>トーク</h2>
          <p className="match-list-subtitle">マッチした相手との会話一覧</p>
        </div>
      </div>
      <div className="match-list-search">
        <input
          type="search"
          placeholder="検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="match-list-items">
        {filteredMatches.length === 0 ? (
          <div className="empty-state">マッチ中のユーザがいません。いいねを送ってみましょう。</div>
        ) : (
          filteredMatches.map((match) => (
            <button
              key={match.id}
              type="button"
              className="match-list-item"
              onClick={() => onSelectMatch(match.id)}
            >
              <img
                className="match-list-item__avatar"
                src={`https://github.com/${match.githubUsername}.png?size=160`}
                alt={match.displayName}
                onError={(event) => {
                  event.currentTarget.src = 'https://via.placeholder.com/72?text=No+Image';
                }}
              />
              <div className="match-list-item__body">
                <div className="match-list-item__title">
                  <span>{match.displayName}</span>
                  <div>
                    {previews[match.id]?.timestamp && (
                      <span className="match-list-item__time">{previews[match.id].timestamp}</span>
                    )}
                    {previews[match.id]?.unreadCount > 0 && (
                      <span className="match-list-item__badge">{previews[match.id].unreadCount}</span>
                    )}
                  </div>
                </div>
                <p className="match-list-item__preview">{previews[match.id]?.text}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default MatchList;
