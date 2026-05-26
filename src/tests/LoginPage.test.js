import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../components/LoginPage';
import authService from '../services/authService';

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    loginWithGitHub: jest.fn()
  }
}));

describe('LoginPage', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  test('renders GitHub login button and does not render demo login button', async () => {
    const user = userEvent.setup();
    const handleLogin = jest.fn();

    render(<LoginPage onLogin={handleLogin} />);

    expect(screen.getByRole('heading', { name: 'GitHubでログイン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHubでログイン' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '仮ログイン（デモ用）' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'GitHubでログイン' }));
    expect(handleLogin).toHaveBeenCalledTimes(1);
    expect(authService.loginWithGitHub).not.toHaveBeenCalled();
  });

  test('shows auth error message when authError is true', () => {
    render(<LoginPage onLogin={jest.fn()} authError />);

    expect(screen.getByText('認証サービスに接続できませんでした。')).toBeInTheDocument();
    expect(screen.getByText('時間をおいて再度お試しください。')).toBeInTheDocument();
  });

  test('calls authService.loginWithGitHub outside test mode', async () => {
    const user = userEvent.setup();
    process.env.NODE_ENV = 'production';
    authService.loginWithGitHub.mockResolvedValue(undefined);

    render(<LoginPage onLogin={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'GitHubでログイン' }));
    expect(authService.loginWithGitHub).toHaveBeenCalledTimes(1);
  });

  test('handles GitHub login redirect errors gracefully', async () => {
    const user = userEvent.setup();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
    authService.loginWithGitHub.mockRejectedValue(new Error('redirect failed'));

    render(<LoginPage onLogin={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'GitHubでログイン' }));
    expect(errorSpy).toHaveBeenCalledWith('Auth redirect failed:', expect.any(Error));
  });
});
