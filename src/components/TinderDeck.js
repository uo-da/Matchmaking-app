import React, { useEffect, useMemo, useRef, useState } from 'react';

const getGithubAvatarUrl = (githubUsername) => `https://github.com/${githubUsername}.png?size=320`;

const getUserImageUrls = (user) => {
  if (!user) {
    return [];
  }

  const rawSources = [
    user.photoUrls,
    user.photos,
    user.images,
    user.imageUrls,
    user.profileImages
  ];
  const imageUrls = rawSources
    .flatMap((source) => (Array.isArray(source) ? source : []))
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item.url === 'string') {
        return item.url.trim();
      }
      return '';
    })
    .filter(Boolean);

  if (imageUrls.length > 0) {
    return [...new Set(imageUrls)];
  }

  return [getGithubAvatarUrl(user.githubUsername)];
};

/**
 * @param {{ currentUser: Object, users: Object[], onLike: Function, onNope?: Function }} props
 */
function TinderDeck({ currentUser, users, onLike, onNope }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [exitTransform, setExitTransform] = useState(null);
  const [dismissedUserIds, setDismissedUserIds] = useState(() => new Set());
  const [drag, setDrag] = useState({
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    source: null
  });

  const filteredUsers = useMemo(
    () => users.filter((user) => !dismissedUserIds.has(user.id)),
    [users, dismissedUserIds]
  );
  const currentUserCard = filteredUsers[currentIndex] || null;
  const nextUserCard = filteredUsers[currentIndex + 1] || null;
  const currentUserPhotos = useMemo(() => getUserImageUrls(currentUserCard), [currentUserCard]);
  const nextUserPhotos = useMemo(() => getUserImageUrls(nextUserCard), [nextUserCard]);
  const heroRef = useRef(null);
  const exitTimerRef = useRef(null);
  const didDragRef = useRef(false);
  const startedInHeroRef = useRef(false);
  const prefetchedUrlsRef = useRef(new Set());
  const currentCardLikedYou = currentUserCard
    ? currentUserCard.likedUserIds.includes(currentUser.id) || currentUserCard.superLikedUserIds.includes(currentUser.id)
    : false;

  useEffect(() => {
    if (currentIndex >= filteredUsers.length) {
      setCurrentIndex(Math.max(filteredUsers.length - 1, 0));
    }
  }, [filteredUsers.length, currentIndex]);

  useEffect(() => {
    const userIdSet = new Set(users.map((user) => user.id));
    setDismissedUserIds((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (userIdSet.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [users]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentUserCard?.id]);

  useEffect(() => {
    if (!filteredUsers.length) {
      return;
    }

    const preloadCount = 4;
    const urlsToPrefetch = filteredUsers
      .slice(currentIndex, currentIndex + preloadCount)
      .flatMap((user) => getUserImageUrls(user))
      .filter(Boolean);

    urlsToPrefetch.forEach((url) => {
      if (prefetchedUrlsRef.current.has(url)) {
        return;
      }
      prefetchedUrlsRef.current.add(url);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
    });
  }, [filteredUsers, currentIndex]);

  const resetSwipeState = () => {
    setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
    setIsExiting(false);
    setExitTransform(null);
  };

  const executeSwipe = (action) => {
    if (!currentUserCard || isExiting) {
      return;
    }
    const swipedUserId = currentUserCard.id;

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
      setDismissedUserIds((prev) => {
        const next = new Set(prev);
        next.add(swipedUserId);
        return next;
      });
      resetSwipeState();

      let actionPromise = Promise.resolve();
      if (action === 'like') {
        actionPromise = Promise.resolve(onLike(swipedUserId));
      } else if (action === 'superlike') {
        actionPromise = Promise.resolve(onLike(swipedUserId, true));
      } else if (action === 'nope' && typeof onNope === 'function') {
        actionPromise = Promise.resolve(onNope(swipedUserId));
      }
      actionPromise.catch(() => {});
      exitTimerRef.current = null;
    }, 240);
  };

  const startDrag = (clientX, clientY, source) => {
    if (isExiting) {
      return;
    }
    didDragRef.current = false;
    setDrag({ active: true, startX: clientX, startY: clientY, offsetX: 0, offsetY: 0, source });
  };

  const updateDrag = (clientX, clientY, source) => {
    if (isExiting) {
      return;
    }
    if (!drag.active || drag.source !== source) {
      return;
    }
    setDrag((prev) => {
      const nextOffsetX = clientX - prev.startX;
      const nextOffsetY = clientY - prev.startY;
      if (Math.abs(nextOffsetX) > 8 || Math.abs(nextOffsetY) > 8) {
        didDragRef.current = true;
      }
      return {
        ...prev,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY
      };
    });
  };

  const finishDrag = (source, event) => {
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
      startedInHeroRef.current = false;
      executeSwipe('superlike');
    } else if (drag.offsetX > horizontalThreshold) {
      startedInHeroRef.current = false;
      executeSwipe('like');
    } else if (drag.offsetX < -horizontalThreshold) {
      startedInHeroRef.current = false;
      executeSwipe('nope');
    } else {
      if (!didDragRef.current && startedInHeroRef.current && event) {
        const heroRect = heroRef.current?.getBoundingClientRect();
        if (heroRect && heroRect.width > 0) {
          const tappedX = event.clientX - heroRect.left;
          handlePhotoChange(tappedX < heroRect.width / 2 ? -1 : 1);
        }
      }
      startedInHeroRef.current = false;
      setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
    }
  };

  const onPointerDown = (event) => {
    if (isExiting) {
      return;
    }
    const targetElement = event.target instanceof Element ? event.target : null;
    startedInHeroRef.current = Boolean(targetElement?.closest('.deck-card__hero'));
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

  const onPointerUp = (event) => {
    finishDrag('pointer', event);
  };

  const onPointerCancel = () => {
    startedInHeroRef.current = false;
    setDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, source: null });
  };

  const handlePhotoChange = (direction) => {
    if (isExiting || currentUserPhotos.length <= 1) {
      return;
    }
    setCurrentPhotoIndex((prev) => {
      const nextIndex = prev + direction;
      if (nextIndex < 0 || nextIndex >= currentUserPhotos.length) {
        return prev;
      }
      return nextIndex;
    });
  };

  const activePhotoIndex = currentUserPhotos[currentPhotoIndex] ? currentPhotoIndex : 0;

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
                    src={nextUserPhotos[0]}
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
              onPointerCancel={onPointerCancel}
              style={cardStyle}
              aria-disabled={isExiting}
            >
              <div className="deck-card__hero" ref={heroRef}>
                <div className="deck-card__topbar" aria-hidden="true">
                  {currentUserPhotos.map((photo, index) => (
                    <div
                      key={`${currentUserCard.id}-photo-progress-${photo}-${index}`}
                      className={`deck-card__topbar-segment ${index === activePhotoIndex ? 'deck-card__topbar-segment--active' : ''}`.trim()}
                    />
                  ))}
                </div>
                {swipeLabel && <div className={swipeClass}>{swipeLabel}</div>}
                <img
                  className="deck-card__photo"
                  src={currentUserPhotos[activePhotoIndex]}
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
