import React, { useMemo, useState } from 'react';

/**
 * @param {{ currentUser: Object, users: Object[], filter: Object, onFilterChange: Function, onLike: Function, onSuperLike: Function }} props
 */
function UserList({ currentUser, users, filter, onFilterChange, onLike, onSuperLike }) {
  const [selectedUser, setSelectedUser] = useState(null);

  const displayedUsers = useMemo(() => users, [users]);

  const handleFilterChange = (name, value) => {
    onFilterChange({ ...filter, [name]: value });
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>検索フィルタ</h2>
        <div className="field">
          <label htmlFor="stackTag">技術タグ</label>
          <input
            id="stackTag"
            value={filter.stackTag}
            onChange={(event) => handleFilterChange('stackTag', event.target.value)}
            placeholder="React, Node.js, Python"
          />
        </div>
        <div className="field">
          <label htmlFor="minYears">最小経験年数</label>
          <input
            id="minYears"
            type="number"
            value={filter.minYears}
            onChange={(event) => handleFilterChange('minYears', Number(event.target.value))}
          />
        </div>
      </div>
      {displayedUsers.length === 0 ? (
        <div className="empty-state">条件に合うユーザーが見つかりません。</div>
      ) : (
        displayedUsers.map((user) => {
          const isLiked = currentUser.likedUserIds.includes(user.id);
          const isMatched = currentUser.matches.includes(user.id);
          const incomingLike = user.likedUserIds.includes(currentUser.id) || user.superLikedUserIds.includes(currentUser.id);
          return (
            <div key={user.id} className="card user-card">
              <div>
                <h3>{user.displayName}</h3>
                <div className="tags">
                  {user.stackTags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              <div>
                <p>{user.bio}</p>
                <p>
                  経験: {user.experienceYears}年 / 趣味: {user.hobbies}
                </p>
              </div>
              <div className="field">
                {isMatched && <span className="badge">マッチ済み</span>}
                {isLiked && !isMatched && <span className="badge">いいね済み</span>}
                {incomingLike && !isMatched && <span className="badge badge--incoming">あなたにいいね</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="primary-button" onClick={() => onLike(user.id)}>
                  いいね
                </button>
                <button type="button" className="small-button superlike" onClick={() => onSuperLike(user.id)}>
                  スーパーライク
                </button>
                <button type="button" className="secondary-button" onClick={() => setSelectedUser(user)}>
                  プロフィール
                </button>
              </div>
            </div>
          );
        })
      )}
      {selectedUser && (
        <div className="card">
          <h2>{selectedUser.displayName} の詳細</h2>
          <p>{selectedUser.bio}</p>
          <div className="field">
            <strong>技術スタック:</strong> {selectedUser.stackTags.join(', ')}
          </div>
          <div className="field">
            <strong>経験年数:</strong> {selectedUser.experienceYears}年
          </div>
          <div className="field">
            <strong>趣味:</strong> {selectedUser.hobbies}
          </div>
          <button type="button" className="secondary-button" onClick={() => setSelectedUser(null)}>
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}

export default UserList;
