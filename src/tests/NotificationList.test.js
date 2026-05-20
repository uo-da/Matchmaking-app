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
    expect(screen.getByText('Other Userさんにスーパーライクされました。')).toBeInTheDocument();
    expect(screen.getByText('Other Userさんとマッチしました。')).toBeInTheDocument();
  });

  test('shows unread indicator for unread notifications', () => {
    const { container } = render(<NotificationList {...mockProps} />);
    const unreadIndicators = container.querySelectorAll('.unread-indicator');

    expect(unreadIndicators).toHaveLength(1);
  });

  test('calls onMarkAsRead only for unread notification', () => {
    render(<NotificationList {...mockProps} />);

    fireEvent.click(screen.getByText('Other Userさんにスーパーライクされました。'));
    fireEvent.click(screen.getByText('Other Userさんとマッチしました。'));

    expect(mockProps.onMarkAsRead).toHaveBeenCalledTimes(1);
    expect(mockProps.onMarkAsRead).toHaveBeenCalledWith('notification-1');
  });

  test('shows no notifications message when empty', () => {
    const emptyProps = {
      ...mockProps,
      notifications: []
    };

    render(<NotificationList {...emptyProps} />);

    expect(screen.getByText('新しい通知はありません')).toBeInTheDocument();
  });

  test('handles unknown sender and fallback avatar', () => {
    const { container } = render(
      <NotificationList
        {...mockProps}
        notifications={[
          {
            id: 'unknown-notification',
            type: 'superLike',
            fromUserId: 'unknown-user',
            toUserId: 'user-1',
            createdAt: '2024-01-01T12:00:00.000Z',
            read: false
          }
        ]}
      />
    );

    const avatar = container.querySelector('img.notification-avatar');
    expect(avatar).toHaveAttribute('src', '/images/person.png');
    expect(avatar).toHaveAttribute('alt', '通知ユーザー');
    expect(screen.queryByText(/スーパーライク/)).not.toBeInTheDocument();
  });
});
