import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from '../components/SettingsPanel';

const baseFilter = {
  query: '',
  stackTag: '',
  stackTags: ['React'],
  minYears: 0,
  minAge: 20,
  maxAge: 25,
  genders: ['女性', '男性']
};

const getNextFilter = (onFilterChange, previous = baseFilter) => {
  const updater = onFilterChange.mock.calls.at(-1)[0];
  return updater(previous);
};

describe('SettingsPanel', () => {
  test('updates age sliders', () => {
    const onFilterChange = jest.fn();
    render(<SettingsPanel filter={baseFilter} onFilterChange={onFilterChange} />);

    fireEvent.change(screen.getByLabelText('最低年齢'), { target: { value: '30' } });
    let next = getNextFilter(onFilterChange);
    expect(next.minAge).toBe(24);

    fireEvent.change(screen.getByLabelText('最高年齢'), { target: { value: '18' } });
    next = getNextFilter(onFilterChange);
    expect(next.maxAge).toBe(25);
  });

  test('updates stacks, custom tags and logout callback', async () => {
    const user = userEvent.setup();
    const onFilterChange = jest.fn();
    const onLogout = jest.fn();

    render(<SettingsPanel filter={baseFilter} onFilterChange={onFilterChange} onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: 'Node.js' }));
    let next = getNextFilter(onFilterChange);
    expect(next.stackTags).toEqual(['React', 'Node.js']);
    expect(next.stackTag).toBe('React');
    expect(screen.getByRole('textbox', { name: '技術スタックタグ入力' })).toHaveValue('React, Node.js');

    const input = screen.getByLabelText('技術スタックタグ入力');
    await user.type(input, 'Go, Rust, Go');
    fireEvent.blur(input);

    next = getNextFilter(onFilterChange);
    expect(next.stackTags).toEqual(expect.arrayContaining(['React', 'Go', 'Rust']));

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  test('calls delete account callback when delete account button is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteAccount = jest.fn();

    render(
      <SettingsPanel
        filter={baseFilter}
        onFilterChange={jest.fn()}
        onDeleteAccount={onDeleteAccount}
      />
    );

    await user.click(screen.getByRole('button', { name: 'アカウント削除' }));
    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  });

  test('uses stackTag as initial selected stack when stackTags is empty', () => {
    render(
      <SettingsPanel
        filter={{ ...baseFilter, stackTags: [], stackTag: 'Go' }}
        onFilterChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-pressed', 'true');
  });
});
