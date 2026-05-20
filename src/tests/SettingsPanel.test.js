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
  genders: ['女性', '男性'],
  excludeScoutNg: true
};

const getNextFilter = (onFilterChange, previous = baseFilter) => {
  const updater = onFilterChange.mock.calls.at(-1)[0];
  return updater(previous);
};

describe('SettingsPanel', () => {
  test('updates scout NG toggle and age sliders', () => {
    const onFilterChange = jest.fn();
    render(<SettingsPanel filter={baseFilter} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByRole('button', { name: '' }));
    let next = getNextFilter(onFilterChange);
    expect(next.excludeScoutNg).toBe(false);

    fireEvent.change(screen.getByLabelText('最低年齢'), { target: { value: '30' } });
    next = getNextFilter(onFilterChange);
    expect(next.minAge).toBe(24);

    fireEvent.change(screen.getByLabelText('最高年齢'), { target: { value: '18' } });
    next = getNextFilter(onFilterChange);
    expect(next.maxAge).toBe(25);
  });

  test('updates genders, stacks, custom tags and logout callback', async () => {
    const user = userEvent.setup();
    const onFilterChange = jest.fn();
    const onLogout = jest.fn();

    render(<SettingsPanel filter={baseFilter} onFilterChange={onFilterChange} onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: '女性' }));
    let next = getNextFilter(onFilterChange);
    expect(next.genders).toEqual(['男性']);

    await user.click(screen.getByRole('button', { name: 'Node.js' }));
    next = getNextFilter(onFilterChange);
    expect(next.stackTags).toEqual(['React', 'Node.js']);
    expect(next.stackTag).toBe('React');

    const input = screen.getByLabelText('技術スタックタグ入力');
    await user.type(input, 'Go, Rust, Go');
    fireEvent.blur(input);

    next = getNextFilter(onFilterChange);
    expect(next.stackTags).toEqual(expect.arrayContaining(['React', 'Go', 'Rust']));

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  test('shows placeholder alert for delete account button', async () => {
    const user = userEvent.setup();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SettingsPanel filter={baseFilter} onFilterChange={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'アカウント削除' }));
    expect(alertSpy).toHaveBeenCalledWith('アカウント削除機能は準備中です。');

    alertSpy.mockRestore();
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
