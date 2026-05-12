import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * @param {{ currentUser: Object, users: Object[], onLike: Function, onNope?: Function }} props
 */
function TinderDeck({ currentUser, users, onLike, onNope }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [exitTransform, setExitTransform] = useState(null);
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
  const nextUserCard = filteredUsers[currentIndex + 1] || null;
  const exitTimerRef = useRef(null);
  const currentCardLikedYou = currentUserCard
    ? currentUserCard.likedUserIds.includes(currentUser.id) || currentUserCard.superLikedUserIds.includes(currentUser.id)
    : false;

  useEffect(() => {
    if (currentIndex >= filteredUsers.length) {
      setCurrentIndex(Math.max(filteredUsers.length - 1, 0));
    }
  }, [filteredUsers.length, currentIndex]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const resetSwipeState = () => {
    setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
    setIsExiting(false);
    setExitTransform(null);
  };

  const handleNext = () => {
    setCurrentIndex((value) => Math.min(value + 1, filteredUsers.length));
    resetSwipeState();
  };

  const executeSwipe = (action) => {
    if (!currentUserCard || isExiting) {
      return;
    }

    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const targets = {
      like: { x: Math.max(viewportWidth * 1.05, 420), y: drag.offsetY - 40, rotate: 22 },
      nope: { x: -Math.max(viewportWidth * 1.05, 420), y: drag.offsetY - 20, rotate: -22 },
      superlike: { x: drag.offsetX * 0.35, y: -Math.max(viewportHeight * 1.05, 520), rotate: drag.offsetX >= 0 ? 8 : -8 }
    };
    const target = targets[action];

    setIsExiting(true);
    setExitTransform(target);

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => {
      let shouldAdvanceFallback = false;
      if (action === 'like') {
        onLike(currentUserCard.id);
      } else if (action === 'superlike') {
        onLike(currentUserCard.id, true);
      } else if (action === 'nope' && typeof onNope === 'function') {
        onNope(currentUserCard.id);
      } else if (action === 'nope') {
        shouldAdvanceFallback = true;
      }
      if (shouldAdvanceFallback) {
        handleNext();
      } else {
        resetSwipeState();
      }
      exitTimerRef.current = null;
    }, 240);
  };

  const startDrag = (clientX, clientY, source) => {
    if (isExiting) {
      return;
    }
    setDrag({ active: true, startX: clientX, startY: clientY, offsetX: 0, offsetY: 0, source });
  };

  const updateDrag = (clientX, clientY, source) => {
    if (isExiting) {
      return;
    }
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
    if (isExiting) {
      return;
    }
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
      executeSwipe('superlike');
    } else if (drag.offsetX > horizontalThreshold) {
      executeSwipe('like');
    } else if (drag.offsetX < -horizontalThreshold) {
      executeSwipe('nope');
    } else {
      setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
    }
  };

  const onPointerDown = (event) => {
    if (isExiting) {
      return;
    }
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
    transform: isExiting && exitTransform
      ? `translate(${exitTransform.x}px, ${exitTransform.y}px) rotate(${exitTransform.rotate}deg)`
      : `translate(${drag.offsetX}px, ${drag.offsetY}px) rotate(${drag.offsetX / 20}deg)`,
    transition: isExiting ? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' : drag.active ? 'none' : 'transform 180ms ease',
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
            {nextUserCard && (
              <div key={`peek-${nextUserCard.id}`} className="deck-card deck-card--peek deck-card--vendor" aria-hidden="true">
                <div className="deck-card__hero">
                  <img
                    className="deck-card__photo"
                    src={`https://github.com/${nextUserCard.githubUsername}.png?size=320`}
                    alt=""
                    draggable="false"
                    onDragStart={(event) => event.preventDefault()}
                    onError={(event) => {
                      event.currentTarget.src = 'https://via.placeholder.com/320?text=No+Image';
                    }}
                  />
                </div>
                <div className="deck-card__info deck-card__info--peek">
                  <div className="deck-card__meta">
                    <h3 className="deck-card__name">{nextUserCard.displayName}, {nextUserCard.age}</h3>
                  </div>
                  <p className="deck-card__detail">
                    {nextUserCard.bio || `${nextUserCard.experienceYears}年の経験があります。`}
                  </p>
                  <div className="deck-card__tags">
                    {nextUserCard.stackTags.slice(0, 3).map((tag) => (
                      <span key={tag} className="deck-card__tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div
              key={currentUserCard.id}
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
              aria-disabled={isExiting}
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
            <button type="button" className="deck-action-btn deck-action-btn--nope" title="NOPE" onClick={() => executeSwipe('nope')} disabled={isExiting}>
              ✕
            </button>
            <button type="button" className="deck-action-btn deck-action-btn--superlike" title="スーパーライク" onClick={() => executeSwipe('superlike')} disabled={isExiting}>
              ★
            </button>
            <button type="button" className="deck-action-btn deck-action-btn--like" title="LIKE" onClick={() => executeSwipe('like')} disabled={isExiting}>
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
