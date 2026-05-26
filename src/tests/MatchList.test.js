import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchList from '../components/MatchList';

describe('MatchList', () => {
  const currentUser = {
    id: 'me',
    likedUserIds: ['u2', 'u3'],
    superLikedUserIds: [],
    matches: ['u2']
  };

  const users = [
    currentUser,
    {
      id: 'u2',
      displayName: 'Alice',
      likedUserIds: ['me'],
      superLikedUserIds: [],
      photoUrls: ['https://example.com/alice.png']
    },
    {
      id: 'u3',
      displayName: 'Bob',
      likedUserIds: ['me'],
      superLikedUserIds: [],
      photoUrls: ['https://example.com/bob.png']
    }
  ];

  test('renders lists and allows opening profile for liked users', async () => {
    const user = userEvent.setup();
    const onSelectProfile = jest.fn();
    const onNope = jest.fn();
    const onLike = jest.fn();

    render(
      <MatchList
        currentUser={currentUser}
        users={users}
        onSelectProfile={onSelectProfile}
        onNope={onNope}
        onLike={onLike}
      />
    );

    const aliceButtons = screen.getAllByTitle('Alice');
    expect(aliceButtons.length).toBeGreaterThanOrEqual(1);

    const bobButtons = screen.getAllByTitle('Bob');
    expect(bobButtons.length).toBeGreaterThanOrEqual(1);
    expect(bobButtons[0]).toBeEnabled();

    await user.click(aliceButtons[0]);
    await user.click(bobButtons[0]);
    await user.click(screen.getByRole('button', { name: 'BobをNope' }));
    await user.click(screen.getByRole('button', { name: 'BobをLike' }));
    await user.click(screen.getByRole('button', { name: 'BobをSuper Like' }));

    expect(onSelectProfile).toHaveBeenCalledWith('u2');
    expect(onSelectProfile).toHaveBeenCalledWith('u3');
    expect(onNope).toHaveBeenCalledWith('u3');
    expect(onLike).toHaveBeenCalledWith('u3', false);
    expect(onLike).toHaveBeenCalledWith('u3', true);
  });

  test('shows empty state when no liked users exist', () => {
    render(
      <MatchList
        currentUser={{ ...currentUser, likedUserIds: [], superLikedUserIds: [] }}
        users={[currentUser]}
        onSelectProfile={jest.fn()}
      />
    );

    expect(screen.getAllByText('まだいません')).toHaveLength(2);
  });
});
