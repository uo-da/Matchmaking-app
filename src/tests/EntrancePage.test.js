import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntrancePage from '../components/EntrancePage';

describe('EntrancePage', () => {
  test('renders welcome text and invokes callback when button is clicked', async () => {
    const user = userEvent.setup();
    const handleEnter = jest.fn();

    render(<EntrancePage onEnter={handleEnter} />);

    expect(screen.getByAltText('Vendor logo')).toBeInTheDocument();
    expect(screen.getByText('技術でつながるあらたなマッチング')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン・新規登録' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ログイン・新規登録' }));
    expect(handleEnter).toHaveBeenCalledTimes(1);
  });
});
