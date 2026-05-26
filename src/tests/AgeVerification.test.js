import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgeVerification from '../components/AgeVerification';

describe('AgeVerification', () => {
  test('shows validation errors and calls onConfirm for valid age', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(<AgeVerification onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: '確認して次へ' }));
    expect(screen.getByText('有効な年齢を入力してください。')).toBeInTheDocument();

    await user.type(screen.getByLabelText('年齢'), '17');
    await user.click(screen.getByRole('button', { name: '確認して次へ' }));
    expect(screen.getByText('18歳以上のユーザーのみ利用できます。')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('年齢'));
    await user.type(screen.getByLabelText('年齢'), '21');
    await user.click(screen.getByRole('button', { name: '確認して次へ' }));
    await user.click(screen.getByRole('button', { name: 'はい' }));

    expect(onConfirm).toHaveBeenCalledWith(21);
    expect(screen.queryByText('18歳以上のユーザーのみ利用できます。')).not.toBeInTheDocument();
  });
});
