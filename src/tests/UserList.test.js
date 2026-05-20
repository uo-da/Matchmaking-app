import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserList from '../components/UserList';

describe('UserList', () => {
  const currentUser = {
    id: 'me',
    likedUserIds: ['u1'],
    matches: ['u2']
  };

  const users = [
    {
      id: 'u1',
      displayName: 'Alice',
      stackTags: ['React'],
      bio: 'Frontend engineer',
      experienceYears: 3,
      hobbies: '読書',
      likedUserIds: ['me'],
      superLikedUserIds: []
    },
    {
      id: 'u2',
      displayName: 'Bob',
      stackTags: ['Python'],
      bio: 'Backend engineer',
      experienceYears: 5,
      hobbies: '映画',
      likedUserIds: [],
      superLikedUserIds: []
    }
  ];

  test('updates filters and triggers actions', async () => {
    const user = userEvent.setup();
    const onFilterChange = jest.fn();
    const onLike = jest.fn();
    const onSuperLike = jest.fn();

    render(
      <UserList
        currentUser={currentUser}
        users={users}
        filter={{ stackTag: '', minYears: 0 }}
        onFilterChange={onFilterChange}
        onLike={onLike}
        onSuperLike={onSuperLike}
      />
    );

    fireEvent.change(screen.getByLabelText('技術タグ'), { target: { value: 'React' } });
    expect(onFilterChange).toHaveBeenLastCalledWith({ stackTag: 'React', minYears: 0 });

    fireEvent.change(screen.getByLabelText('最小経験年数'), { target: { value: '2' } });
    expect(onFilterChange).toHaveBeenLastCalledWith({ stackTag: '', minYears: 2 });

    await user.click(screen.getAllByRole('button', { name: 'いいね' })[0]);
    expect(onLike).toHaveBeenCalledWith('u1');

    await user.click(screen.getAllByRole('button', { name: 'スーパーライク' })[1]);
    expect(onSuperLike).toHaveBeenCalledWith('u2');
  });

  test('shows badges and profile modal', async () => {
    const user = userEvent.setup();

    render(
      <UserList
        currentUser={currentUser}
        users={users}
        filter={{ stackTag: '', minYears: 0 }}
        onFilterChange={jest.fn()}
        onLike={jest.fn()}
        onSuperLike={jest.fn()}
      />
    );

    expect(screen.getByText('いいね済み')).toBeInTheDocument();
    expect(screen.getByText('あなたにいいね')).toBeInTheDocument();
    expect(screen.getByText('マッチ済み')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'プロフィール' })[0]);
    expect(screen.getByText('Alice の詳細')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByText('Alice の詳細')).not.toBeInTheDocument();
  });

  test('shows empty state', () => {
    render(
      <UserList
        currentUser={currentUser}
        users={[]}
        filter={{ stackTag: '', minYears: 0 }}
        onFilterChange={jest.fn()}
        onLike={jest.fn()}
        onSuperLike={jest.fn()}
      />
    );

    expect(screen.getByText('条件に合うユーザーが見つかりません。')).toBeInTheDocument();
  });
});
