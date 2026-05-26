import React from 'react';
import './NotificationList.css';

function NotificationList({ notifications, users, onClose, onMarkAsRead, onSelectNotification }) {
  const visibleNotifications = notifications.filter((notification) => !notification.read);

  const getUserById = (userId) => {
    return users.find(user => user.id === userId);
  };

  const formatNotificationMessage = (notification) => {
    const fromUser = getUserById(notification.fromUserId);
    if (!fromUser) return '';

    switch (notification.type) {
      case 'superLike':
        return `${fromUser.displayName}さんにスーパーライクされました。`;
      case 'match':
        return `${fromUser.displayName}さんとマッチしました。`;
      default:
        return '';
    }
  };

  const getAvatarUrl = (user) => {
    if (!user) {
      return '/images/person.png';
    }
    return user.avatar || '/images/person.png';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (typeof onSelectNotification === 'function') {
      onSelectNotification(notification);
    }
  };

  return (
    <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="notification-header">
        <h2>通知</h2>
      </div>
      <div className="notification-content">
        {visibleNotifications.length === 0 ? (
          <div className="no-notifications">新しい通知はありません</div>
        ) : (
          visibleNotifications
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(notification => {
              const fromUser = getUserById(notification.fromUserId);
              return (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <img
                  src={getAvatarUrl(fromUser)}
                  alt={fromUser ? fromUser.displayName : '通知ユーザー'}
                  className="notification-avatar"
                  onError={(event) => { event.currentTarget.src = '/images/person.png'; }}
                />
                  <div className="notification-text">
                    {formatNotificationMessage(notification)}
                  </div>
                  <div className="notification-time">
                    {new Date(notification.createdAt).toLocaleString('ja-JP')}
                  </div>
                  {!notification.read && <div className="unread-indicator" />}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

export default NotificationList;
