import React, { useEffect, useMemo, useState } from 'react';

/**
 * @param {{ currentUser: Object, users: Object[], onLike: Function, onSuperLike: Function }} props
 */
function TinderDeck({ currentUser, users, onLike, onSuperLike }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drag, setDrag] = useState({ active: false, startX: 0, offsetX: 0 });

  const filteredUsers = useMemo(() => users, [users]);
  const currentUserCard = filteredUsers[currentIndex] || null;
  const currentCardLikedYou = currentUserCard
    ? currentUserCard.likedUserIds.includes(currentUser.id) || currentUserCard.superLikedUserIds.includes(currentUser.id)
    : false;

  useEffect(() => {
    if (currentIndex >= filteredUsers.length) {
      setCurrentIndex(Math.max(filteredUsers.length - 1, 0));
    }
  }, [filteredUsers.length, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((value) => Math.min(value + 1, filteredUsers.length));
    setDrag({ active: false, startX: 0, offsetX: 0 });
  };

  const handleSwipeAction = (targetId, isSuperLike = false) => {
    if (!targetId) {
      return;
    }
    onLike(targetId, isSuperLike);
    handleNext();
  };

  const onPointerDown = (event) => {
    setDrag({ active: true, startX: event.clientX, offsetX: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!drag.active) {
      return;
    }
    setDrag((prev) => ({ ...prev, offsetX: event.clientX - prev.startX }));
  };

  const onPointerUp = () => {
    if (!drag.active || !currentUserCard) {
      setDrag({ active: false, startX: 0, offsetX: 0 });
      return;
    }

    const threshold = 80;
    if (drag.offsetX > threshold) {
      handleSwipeAction(currentUserCard.id);
    } else if (drag.offsetX < -threshold) {
      handleNext();
    } else {
      setDrag({ active: false, startX: 0, offsetX: 0 });
    }
  };

  const cardStyle = {
    transform: `translateX(${drag.offsetX}px) rotate(${drag.offsetX / 20}deg)`,
    transition: drag.active ? 'none' : 'transform 180ms ease',
  };

  const swipeLabel = drag.offsetX > 30 ? 'LIKE' : drag.offsetX < -30 ? 'NOPE' : null;
  const swipeClass = drag.offsetX > 0 ? 'deck-card__label deck-card__label--like' : 'deck-card__label deck-card__label--nope';

  return (
    <div className="deck-shell">
      {currentUserCard ? (
        <>
          <div
            className="deck-card"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={cardStyle}
          >
            <div className="deck-card__hero">
              {swipeLabel && <div className={swipeClass}>{swipeLabel}</div>}
              <img
                className="deck-card__photo"
                src={`https://github.com/${currentUserCard.githubUsername}.png?size=320`}
                alt={`${currentUserCard.displayName} の写真`}
                onError={(event) => {
                  event.currentTarget.src = 'https://via.placeholder.com/320?text=No+Image';
                }}
              />
              <div className="deck-card__hero-overlay" />
            </div>
            <div className="deck-card__info">
              <h3 className="deck-card__name">{currentUserCard.displayName}, {currentUserCard.age}</h3>
              {currentCardLikedYou && <div className="deck-card__badge">あなたにいいね</div>}
              <p className="deck-card__detail">{currentUserCard.experienceYears}年の経験 / {currentUserCard.hobbies}</p>
              <div className="deck-card__tags">
                {currentUserCard.stackTags.map((tag) => (
                  <span key={tag} className="deck-card__tag">{tag}</span>
                ))}
              </div>
              <p className="deck-card__bio">{currentUserCard.bio}</p>
              <div className="deck-card__status">残り {filteredUsers.length - currentIndex - 1} 人</div>
              <div className="deck-card__hint">左にスワイプでNOPE、右にスワイプでLIKE</div>
            </div>
          </div>
          <div className="deck-actions">
            <button type="button" className="deck-action-btn deck-action-btn--nope" title="NOPE" onClick={handleNext}>
              ✕
            </button>
            <button type="button" className="deck-action-btn deck-action-btn--superlike" title="スーパーライク" onClick={() => handleSwipeAction(currentUserCard.id, true)}>
              ★
            </button>
            <button type="button" className="deck-action-btn deck-action-btn--like" title="LIKE" onClick={() => handleSwipeAction(currentUserCard.id)}>
              ♥
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          条件に合うカードはもうありません。設定を調整してみましょう。
        </div>
      )}
    </div>
  );
}

export default TinderDeck;
