import React, { useState } from 'react';

/**
 * @param {{ onConfirm: (age:number) => void }} props
 */
function AgeVerification({ onConfirm }) {
  const [age, setAge] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsedAge = Number(age);
    if (Number.isNaN(parsedAge) || parsedAge <= 0) {
      setError('有効な年齢を入力してください。');
      return;
    }
    if (parsedAge < 18) {
      setError('18歳以上のユーザーのみ利用できます。');
      return;
    }
    setError('');
    onConfirm(parsedAge);
  };

  return (
    <div className="app-shell">
      <div className="card">
        <h1>年齢確認</h1>
        <p>18歳以上のみ登録できます。</p>
        <form onSubmit={handleSubmit} className="field">
          <label htmlFor="age">年齢</label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            placeholder="年齢を入力"
          />
          {error && <div className="badge">{error}</div>}
          <button type="submit" className="primary-button">
            確認して次へ
          </button>
        </form>
      </div>
    </div>
  );
}

export default AgeVerification;
