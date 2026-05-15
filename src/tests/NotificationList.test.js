import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationList from '../components/NotificationList';

describe('NotificationList Component', () => {
  const mockUsers = [
    {
      id: 'user-1',
      githubUsername: 'testuser',
      displayName: 'Test User'
    },
    {
      id: 'user-2',
      githubUsername: 'otheruser',
      displayName: 'Other User'
    }
  ];

  const mockNotifications = [
    {
      id: 'notification-1',
      type: 'superLike',
      fromUserId: 'user-2',
      toUserId: 'user-1',
      createdAt: '2024-01-01T10:00:00.000Z',
      read: false
    },
    {
      id: 'notification-2',
      type: 'match',
      fromUserId: 'user-2',
      toUserId: 'user-1',
      createdAt: '2024-01-01T09:00:00.000Z',
      read: true
    }
  ];

  const mockProps = {
    notifications: mockNotifications,
    users: mockUsers,
    onClose: jest.fn(),
    onMarkAsRead: jest.fn()
  };

  test('renders notification list with correct messages', () => {
    render(<NotificationList {...mockProps} />);

    expect(screen.getByText('通知')).toBeInTheDocument();
    expect(screen.getByText('Other Userさんからスーパーライクされました！')).toBeInTheDocument();
    expect(screen.getByText('Other Userさんとマッチングしました！')).toBeInTheDocument();
  });

  test('shows unread indicator for unread notifications', () => {
    render(<NotificationList {...mockProps} />);

    const unreadIndicators = screen.getAllByText('', { selector: '.unread-indicator' });
    expect(unreadIndicators).toHaveLength(1); // 1件の未読通知
  });

  test('calls onMarkAsRead when notification is clicked', () => {
    render(<NotificationList {...mockProps} />);

    const notificationItem = screen.getByText('Other Userさんからスーパーライクされました！');
    fireEvent.click(notificationItem);

    expect(mockProps.onMarkAsRead).toHaveBeenCalledWith('notification-1');
  });

  test('does not have close button in dropdown mode', () => {
    render(<NotificationList {...mockProps} />);

    // ドロップダウン形式では閉じるボタンは存在しない
    expect(screen.queryByText('×')).not.toBeInTheDocument();
  });

  test('shows no notifications message when empty', () => {
    const emptyProps = {
      ...mockProps,
      notifications: []
    };

    render(<NotificationList {...emptyProps} />);

    expect(screen.getByText('新しい通知はありません')).toBeInTheDocument();
  });
});