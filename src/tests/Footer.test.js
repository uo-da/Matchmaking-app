import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Footer from '../components/Footer';

describe('Footer', () => {
  test('renders all navigation items and marks active tab', async () => {
    const user = userEvent.setup();
    const onTabChange = jest.fn();

    const { container } = render(<Footer activeTab="matches" onTabChange={onTabChange} />);

    expect(screen.getByRole('button', { name: 'ユーザー' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'マッチ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'チャット' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'プロフィール' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument();

    expect(container.querySelector('.footer-nav-btn.active')).toHaveAttribute('aria-label', 'マッチ');

    await user.click(screen.getByRole('button', { name: '設定' }));
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });
});
