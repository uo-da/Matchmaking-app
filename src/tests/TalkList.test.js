import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TalkList from '../components/TalkList';

describe('TalkList', () => {
  const currentUser = {
    id: 'me',
    matches: ['u2', 'u3']
  };

  const users = [
    currentUser,
    {
      id: 'u2',
      displayName: 'Rin',
      photoUrls: ['https://example.com/rin.png']
    },
    {
      id: 'u3',
      displayName: 'Ken',
      photoUrls: ['https://example.com/ken.png']
    }
  ];

  test('renders talk items with unread count and opens selected match', async () => {
    const user = userEvent.setup();
    const onSelectMatch = jest.fn();

    render(
      <TalkList
        currentUser={currentUser}
        users={users}
        matchedUserIds={new Set(['u2', 'u3'])}
        messagesByMatchId={{
          u2: [
            { senderId: 'u2', receiverId: 'me', text: 'こんにちは', isRead: false, timestamp: 1710000000000 },
            { senderId: 'me', receiverId: 'u2', text: 'よろしく', isRead: true, timestamp: 1710000100000 }
          ],
          u3: []
        }}
        onSelectMatch={onSelectMatch}
      />
    );

    expect(screen.getByText('よろしく')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kenとのトークを開く' }));
    expect(onSelectMatch).toHaveBeenCalledWith('u3');

    await user.click(screen.getByRole('button', { name: /Rin/ }));
    expect(onSelectMatch).toHaveBeenCalledWith('u2');
  });

  test('shows empty placeholders when no match exists', () => {
    render(
      <TalkList
        currentUser={{ id: 'me', matches: [] }}
        users={[{ id: 'me', displayName: 'Me' }]}
        matchedUserIds={new Set()}
        messagesByMatchId={{}}
        onSelectMatch={jest.fn()}
      />
    );

    expect(screen.getByText('まだマッチしていません')).toBeInTheDocument();
    expect(screen.getByText('ここにトークが表示されます')).toBeInTheDocument();
  });
});
