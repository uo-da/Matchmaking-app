import React, { useEffect, useMemo, useState } from 'react';
import chatService from '../services/chatService';
import storageService from '../services/storageService';

/**
 * @param {{ matchId: string, currentUser: Object, onSend: (matchId: string, text:string) => void }} props
 */
function MatchChat({ matchId, currentUser, onSend }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const matchUser = useMemo(() => storageService.getUserById(matchId), [matchId]);

  useEffect(() => {
    const fetchMessages = async () => {
      const loaded = await chatService.getMessages(currentUser.id, matchId);
      setMessages(loaded);
    };
    fetchMessages();

    const channel = chatService.subscribe((message) => {
      if (message.matchKey !== chatService.getMatchKey(currentUser.id, matchId)) {
        return;
      }
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
    });
    return () => channel.unsubscribe();
  }, [currentUser.id, matchId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    const message = await onSend(matchId, text.trim());
    setText('');
    if (message && !messages.some((item) => item.id === message.id)) {
      setMessages((prev) => [...prev, message]);
    }
  };

  return (
    <div className="card">
      <h2>{matchUser ? `${matchUser.displayName} とのチャット` : 'チャット'}</h2>
      <div className="card" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div className="empty-state">メッセージがありません。最初のメッセージを送信しましょう。</div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              style={{
                textAlign: message.senderId === currentUser.id ? 'right' : 'left',
                marginBottom: 10
              }}
            >
              <div style={{ display: 'inline-block', background: message.senderId === currentUser.id ? '#2563eb' : '#f3f4f6', color: message.senderId === currentUser.id ? '#fff' : '#111827', padding: '10px 14px', borderRadius: 18, maxWidth: '80%' }}>
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="field">
        <textarea
          rows="3"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="メッセージを入力"
        />
        <button type="submit" className="primary-button">
          送信
        </button>
      </form>
    </div>
  );
}

export default MatchChat;
