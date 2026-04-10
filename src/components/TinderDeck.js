import React, { useMemo, useState } from 'react';

/**
 * @param {{ currentUser: Object, users: Object[], filter: Object, onFilterChange: Function, onLike: Function, onSuperLike: Function }} props
 */
function TinderDeck({ currentUser, users, filter, onFilterChange, onLike, onSuperLike }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredUsers = useMemo(() => users, [users]);
  const currentUserCard = filteredUsers[currentIndex] || null;
  const currentCardLikedYou = currentUserCard
    ? currentUserCard.likedUserIds.includes(currentUser.id) || currentUserCard.superLikedUserIds.includes(currentUser.id)
    : false;

  const handleNext = () => {
    setCurrentIndex((value) => Math.min(value + 1, filteredUsers.length));
  };

  const handleAction = (targetId, isSuperLike = false) => {
    if (!targetId) {
      return;
    }
    onLike(targetId, isSuperLike);
    handleNext();
  };

  const handleFilterChange = (name, value) => {
    onFilterChange({ ...filter, [name]: value });
    setCurrentIndex(0);
  };

  return (
    <div className="deck-shell">
      <div className="card">
        <h2>候補カード</h2>
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
      {currentUserCard ? (
        <div className="deck-card">
          <div className="deck-card__hero">
            <img
              className="deck-card__photo"
              src={`https://github.com/${currentUserCard.githubUsername}.png?size=320`}
              alt={`${currentUserCard.displayName} の写真`}
              onError={(event) => {
                event.currentTarget.src = 'https://via.placeholder.com/320?text=No+Image';
              }}
            />
            <div className="deck-card__info">
              <h3 className="deck-card__name">{currentUserCard.displayName}, {currentUserCard.age}</h3>
              {currentCardLikedYou && <div className="deck-card__badge">あなたにいいね</div>}
              <p className="deck-card__detail">{currentUserCard.experienceYears}年の経験 / {currentUserCard.hobbies}</p>
            </div>
          </div>
          <div className="deck-card__tags">
            {currentUserCard.stackTags.map((tag) => (
              <span key={tag} className="deck-card__tag">{tag}</span>
            ))}
          </div>
          <p className="deck-card__bio">{currentUserCard.bio}</p>
          <div className="deck-actions">
            <button type="button" className="secondary-button" onClick={handleNext}>
              パス
            </button>
            <button type="button" className="small-button superlike" onClick={() => handleAction(currentUserCard.id, true)}>
              スーパーライク
            </button>
            <button type="button" className="primary-button" onClick={() => handleAction(currentUserCard.id)}>
              いいね
            </button>
          </div>
          <div className="deck-card__status">残り {filteredUsers.length - currentIndex - 1} 人</div>
        </div>
      ) : (
        <div className="empty-state">
          条件に合うカードはもうありません。フィルタを調整してみましょう。
        </div>
      )}
    </div>
  );
}

export default TinderDeck;
