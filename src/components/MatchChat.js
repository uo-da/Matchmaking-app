import React, { useEffect, useState } from 'react';
import chatService from '../services/chatService';
import storageService from '../services/storageService';

/**
 * @param {{ matchId: string, currentUser: Object, onSend: (matchId: string, text:string) => void }} props
 */
function MatchChat({ matchId, currentUser, onSend }) {
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
      setMessages(loaded);
      await chatService.markMessagesAsRead(currentUser.id, matchId);
    };
    fetchMessages();

    const channel = chatService.subscribe((event) => {
      if (event.matchKey !== chatService.getMatchKey(currentUser.id, matchId)) {
        return;
      }
      if (event.type === 'message') {
        setMessages((prev) => (prev.some((item) => item.id === event.id) ? prev : [...prev, event]));
        return;
      }
      if (event.type === 'read') {
        chatService.getMessages(currentUser.id, matchId).then((loaded) => setMessages(loaded));
      }
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
              {message.senderId === currentUser.id && message.isRead && (
                <div className="message-status">既読</div>
              )}
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
