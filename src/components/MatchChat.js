import React, { useEffect, useMemo, useState } from 'react';
import chatService from '../services/chatService';
import storageService from '../services/storageService';
import { getUserImageCandidates, loadNextImageCandidate } from '../utils/userImage';

function formatMessageTime(timestamp) {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isSameMessage(left, right) {
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
}

function dedupeMessages(messages) {
  return messages.reduce((acc, message) => {
    if (acc.some((item) => isSameMessage(item, message))) {
      return acc;
    }
    return [...acc, message];
  }, []);
}

/**
 * @param {{ matchId: string, currentUser: Object, onSend: (matchId: string, text:string) => void, onBack?: () => void }} props
 */
function MatchChat({ matchId, currentUser, onSend, onBack }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [matchUser, setMatchUser] = useState(null);

  useEffect(() => {
    const fetchMatchUser = async () => {
      const user = await storageService.getUserById(matchId);
      setMatchUser(user);
    };
    if (matchId) {
      fetchMatchUser();
    }
  }, [matchId]);

  useEffect(() => {
    const fetchMessages = async () => {
      const loaded = await chatService.getMessages(currentUser.id, matchId);
      setMessages(dedupeMessages(loaded));
      await chatService.markMessagesAsRead(currentUser.id, matchId);
    };
    fetchMessages();

    const channel = chatService.subscribe((event) => {
      if (event.matchKey !== chatService.getMatchKey(currentUser.id, matchId)) {
        return;
      }
      if (event.type === 'message') {
        setMessages((prev) => (prev.some((item) => isSameMessage(item, event)) ? prev : [...prev, event]));
        return;
      }
      if (event.type === 'read') {
        chatService.getMessages(currentUser.id, matchId).then((loaded) => setMessages(dedupeMessages(loaded)));
      }
    });
    return () => channel.unsubscribe();
  }, [currentUser.id, matchId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const message = await onSend(matchId, trimmed);
    setText('');
    if (message) {
      setMessages((prev) => (prev.some((item) => isSameMessage(item, message)) ? prev : [...prev, message]));
    }
  };

  const avatarCandidates = useMemo(() => getUserImageCandidates(matchUser, 220), [matchUser]);

  return (
    <section className="chat-room" aria-label="チャット画面">
      <header className="chat-room__header">
        <button
          type="button"
          className="chat-room__back"
          onClick={onBack}
          aria-label="チャット一覧に戻る"
        >
          {'<'}
        </button>
        <h2 className="chat-room__name">{matchUser?.displayName || 'チャット'}</h2>
        <button type="button" className="chat-room__edit" aria-label="編集">
          <img src="/images/edit-text-file.png" alt="" className="chat-room__edit-icon" />
        </button>
      </header>

      <div className="chat-room__messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-room__empty">メッセージがありません</p>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentUser.id;
            const timeLabel = formatMessageTime(message.timestamp);
            return (
              <div
                key={message.id || `${message.timestamp}-${index}`}
                className={`chat-room__row ${isOwn ? 'chat-room__row--own' : 'chat-room__row--other'}`}
              >
                {!isOwn && (
                  <img
                    className="chat-room__avatar"
                    src={avatarCandidates[0]}
                    alt={matchUser?.displayName || '相手ユーザー'}
                    data-candidate-index="0"
                    onError={(event) => {
                      loadNextImageCandidate(event, avatarCandidates);
                    }}
                  />
                )}
                <div>
                  <p className={`chat-room__bubble ${isOwn ? 'chat-room__bubble--own' : 'chat-room__bubble--other'}`}>
                    {message.text}
                  </p>
                  {(timeLabel || (isOwn && message.isRead)) && (
                    <div className={`chat-room__meta ${isOwn ? 'chat-room__meta--own' : 'chat-room__meta--other'}`}>
                      {timeLabel && <span className="chat-room__time">{timeLabel}</span>}
                      {isOwn && message.isRead && <span className="chat-room__status">既読</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-room__composer">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="メッセージ"
          className="chat-room__input"
        />
        <button type="submit" className="chat-room__send" aria-label="送信">
          <svg
            className="chat-room__send-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
          </svg>
        </button>
      </form>
    </section>
  );
}

export default MatchChat;
