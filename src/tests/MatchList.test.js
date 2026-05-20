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

  test('renders lists and allows selecting only matched users', async () => {
    const user = userEvent.setup();
    const onSelectMatch = jest.fn();

    render(
      <MatchList
        currentUser={currentUser}
        users={users}
        matchedUserIds={new Set(['u2'])}
        onSelectMatch={onSelectMatch}
      />
    );

    const aliceButtons = screen.getAllByTitle('Alice');
    expect(aliceButtons.length).toBeGreaterThanOrEqual(1);

    const bobButtons = screen.getAllByTitle('Bob（未マッチ）');
    expect(bobButtons[0]).toBeDisabled();

    await user.click(aliceButtons[0]);
    expect(onSelectMatch).toHaveBeenCalledWith('u2');
  });

  test('shows empty state when no liked users exist', () => {
    render(
      <MatchList
        currentUser={{ ...currentUser, likedUserIds: [], superLikedUserIds: [] }}
        users={[currentUser]}
        matchedUserIds={new Set()}
        onSelectMatch={jest.fn()}
      />
    );

    expect(screen.getAllByText('まだいません')).toHaveLength(2);
  });
});
