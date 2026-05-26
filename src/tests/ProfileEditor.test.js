import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileEditor from '../components/ProfileEditor';

describe('ProfileEditor', () => {
  const baseUser = {
    id: 'user-demo',
    displayName: 'Demo User',
    bio: '',
    stackTags: [],
    experienceYears: 0,
    hobbies: '',
    photoUrls: []
  };

  test('renders as initial registration when isInitialRegistration is true', () => {
    render(<ProfileEditor user={baseUser} onSave={jest.fn()} isInitialRegistration />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('初期登録');
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument();
  });

  test('shows validation errors when required fields are missing', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();

    render(<ProfileEditor user={baseUser} onSave={onSave} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '登録する' }));
    });

    expect(await screen.findByText('まずは最低1枚の画像を登録してください。')).toBeInTheDocument();
    expect(screen.getByText('経験年数を入力してください。')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  test('requires at least one photo when initial registration is enabled', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();

    render(<ProfileEditor user={baseUser} onSave={onSave} isInitialRegistration />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '登録する' }));
    });

    expect(await screen.findByText('まずは最低1枚の画像を登録してください。')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
