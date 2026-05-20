import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useLocalStorage from '../hooks/useLocalStorage';

function Harness({ storageKey, initialValue }) {
  const [value, setValue] = useLocalStorage(storageKey, initialValue);
  return (
    <div>
      <span data-testid="value">{String(value)}</span>
      <button type="button" onClick={() => setValue('updated')}>更新</button>
    </div>
  );
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('reads existing value from localStorage', () => {
    window.localStorage.setItem('demo-key', JSON.stringify('stored'));

    render(<Harness storageKey="demo-key" initialValue="initial" />);

    expect(screen.getByTestId('value')).toHaveTextContent('stored');
  });

  test('falls back to initial value and persists updates', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('demo-key', '{broken json');

    render(<Harness storageKey="demo-key" initialValue="initial" />);

    expect(screen.getByTestId('value')).toHaveTextContent('initial');

    await user.click(screen.getByRole('button', { name: '更新' }));

    expect(screen.getByTestId('value')).toHaveTextContent('updated');
    expect(window.localStorage.getItem('demo-key')).toBe(JSON.stringify('updated'));
  });

  test('ignores write errors from localStorage', async () => {
    const user = userEvent.setup();
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    render(<Harness storageKey="error-key" initialValue="initial" />);
    await user.click(screen.getByRole('button', { name: '更新' }));

    expect(screen.getByTestId('value')).toHaveTextContent('updated');
    setItemSpy.mockRestore();
  });
});
