import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../components/LoginPage';

describe('LoginPage', () => {
  test('renders GitHub login button and invokes callback when clicked', async () => {
    const user = userEvent.setup();
    const handleLogin = jest.fn();

    render(<LoginPage onLogin={handleLogin} />);

    expect(screen.getByRole('heading', { name: 'GitHubでログイン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHubでログイン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '仮ログイン（デモ用）' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'GitHubでログイン' }));
    expect(handleLogin).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '仮ログイン（デモ用）' }));
    expect(handleLogin).toHaveBeenCalledTimes(2);
  });
});