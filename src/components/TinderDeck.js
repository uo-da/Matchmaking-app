import React, { useEffect, useMemo, useState } from 'react';

/**
 * @param {{ currentUser: Object, users: Object[], onLike: Function }} props
 */
function TinderDeck({ currentUser, users, onLike }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drag, setDrag] = useState({
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    source: null
  });

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
    setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
  };

  const handleSwipeAction = (targetId, isSuperLike = false) => {
    if (!targetId) {
      return;
    }
    onLike(targetId, isSuperLike);
    handleNext();
  };

  const startDrag = (clientX, clientY, source) => {
    setDrag({ active: true, startX: clientX, startY: clientY, offsetX: 0, offsetY: 0, source });
  };

  const updateDrag = (clientX, clientY, source) => {
    if (!drag.active || drag.source !== source) {
      return;
    }
    setDrag((prev) => ({
      ...prev,
      offsetX: clientX - prev.startX,
      offsetY: clientY - prev.startY
    }));
  };

  const finishDrag = (source) => {
    if (drag.source !== source) {
      return;
    }

    if (!drag.active || !currentUserCard) {
      setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
      return;
    }

    const horizontalThreshold = 80;
    const verticalThreshold = 100;
    const absX = Math.abs(drag.offsetX);
    const absY = Math.abs(drag.offsetY);
    const isVerticalDominant = absY > absX;

    if (isVerticalDominant && drag.offsetY < -verticalThreshold) {
      handleSwipeAction(currentUserCard.id, true);
    } else if (drag.offsetX > horizontalThreshold) {
      handleSwipeAction(currentUserCard.id);
    } else if (drag.offsetX < -horizontalThreshold) {
      handleNext();
    } else {
      setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
    }
  };

  const onPointerDown = (event) => {
    startDrag(event.clientX, event.clientY, 'pointer');
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures on some mobile browsers.
      }
    }
  };

  const onPointerMove = (event) => {
    updateDrag(event.clientX, event.clientY, 'pointer');
  };

  const onPointerUp = () => {
    finishDrag('pointer');
  };

  const onTouchStart = (event) => {
    if (!event.touches || event.touches.length === 0) {
      return;
    }
    startDrag(event.touches[0].clientX, event.touches[0].clientY, 'touch');
  };

  const onTouchMove = (event) => {
    if (!event.touches || event.touches.length === 0) {
      return;
    }
    updateDrag(event.touches[0].clientX, event.touches[0].clientY, 'touch');
    if (drag.active && drag.source === 'touch') {
      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    finishDrag('touch');
  };

  const cardStyle = {
    transform: `translate(${drag.offsetX}px, ${drag.offsetY}px) rotate(${drag.offsetX / 20}deg)`,
    transition: drag.active ? 'none' : 'transform 180ms ease',
  };

  const swipeLabel = drag.offsetY < -30 && Math.abs(drag.offsetY) > Math.abs(drag.offsetX)
    ? 'SUPER LIKE'
    : drag.offsetX > 30
      ? 'LIKE'
      : drag.offsetX < -30
        ? 'NOPE'
        : null;
  const swipeClass = swipeLabel === 'SUPER LIKE'
    ? 'deck-card__label deck-card__label--superlike'
    : drag.offsetX > 0
      ? 'deck-card__label deck-card__label--like'
      : 'deck-card__label deck-card__label--nope';

  return (
    <div className="deck-shell deck-shell--vendor">
      {currentUserCard ? (
        <>
          <div className="deck-stack">
            <div
              className="deck-card deck-card--active deck-card--vendor"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchEnd}
              style={cardStyle}
            >
              <div className="deck-card__hero">
                {swipeLabel && <div className={swipeClass}>{swipeLabel}</div>}
                <img
                  className="deck-card__photo"
                  src={`https://github.com/${currentUserCard.githubUsername}.png?size=320`}
                  alt={`${currentUserCard.displayName} の写真`}
                  draggable="false"
                  onDragStart={(event) => event.preventDefault()}
                  onError={(event) => {
                    event.currentTarget.src = 'https://via.placeholder.com/320?text=No+Image';
                  }}
                />
              </div>
              <div className="deck-card__info">
                <div className="deck-card__meta">
                  <h3 className="deck-card__name">{currentUserCard.displayName}, {currentUserCard.age}</h3>
                </div>
                <p className="deck-card__detail">
                  {currentUserCard.bio || `${currentUserCard.experienceYears}年の経験があります。`}
                </p>
                <div className="deck-card__tags">
                  {currentUserCard.stackTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="deck-card__tag">{tag}</span>
                  ))}
                </div>
                {currentCardLikedYou && <div className="deck-card__badge">あなたにいいね</div>}
              </div>
            </div>
          </div>
          <div className="deck-card__actions">
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
