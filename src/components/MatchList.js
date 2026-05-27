import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getUserImageCandidates, loadNextImageCandidate } from '../utils/userImage';

/**
 * @param {{
 *   currentUser: Object,
 *   users: Object[],
 *   onSelectProfile: (userId: string) => void,
 *   onNope?: (userId: string) => void,
 *   onLike?: (userId: string, isSuperLike?: boolean) => void
 * }} props
 */
function MatchList({ currentUser, users, onSelectProfile, onNope, onLike }) {
  const [actionFeedback, setActionFeedback] = useState(null);
  const feedbackTimerRef = useRef(null);

  const showActionFeedback = (message, type) => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setActionFeedback({ message, type });
    feedbackTimerRef.current = window.setTimeout(() => {
      setActionFeedback(null);
      feedbackTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const currentReactedUserIds = useMemo(() => {
    return new Set([
      ...(currentUser.likedUserIds || []),
      ...(currentUser.superLikedUserIds || []),
      ...(currentUser.nopedUserIds || [])
    ]);
  }, [currentUser.likedUserIds, currentUser.superLikedUserIds, currentUser.nopedUserIds]);

  const likedByUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.id === currentUser.id) {
        return false;
      }
      if (currentReactedUserIds.has(user.id)) {
        return false;
      }
      return user.likedUserIds.includes(currentUser.id) || user.superLikedUserIds.includes(currentUser.id);
    });
  }, [users, currentUser.id, currentReactedUserIds]);

  const isSuperLikedByUser = (user) => {
    return user.superLikedUserIds.includes(currentUser.id);
  };

  const isSuperLikeFromUser = (user) => {
    return currentUser.superLikedUserIds.includes(user.id);
  };

  const likedByCurrentUser = useMemo(() => {
    const likedIds = new Set([...(currentUser.likedUserIds || []), ...(currentUser.superLikedUserIds || [])]);
    return users.filter((user) => {
      if (user.id === currentUser.id) {
        return false;
      }
      return likedIds.has(user.id);
    });
  }, [users, currentUser.id, currentUser.likedUserIds, currentUser.superLikedUserIds]);

  return (
    <div className="likes-screen">
      <section className="likes-section">
        <h2 className="likes-section__title">あなたをいいねした人</h2>
        <div className="likes-grid likes-grid--incoming">
          {likedByUsers.length === 0 ? (
            <div className="likes-empty" role="status" aria-live="polite">
              <p className="likes-empty__title">まだいません</p>
              <p className="likes-empty__note">あなたをいいねした人はここに表示されます。</p>
            </div>
          ) : (
            likedByUsers.map((user) => {
              return (
                <div key={`liked-by-${user.id}`} className="likes-item likes-item--incoming">
                  <button
                    type="button"
                    className={`likes-thumb ${isSuperLikedByUser(user) ? 'likes-thumb--superlike' : ''}`}
                    title={user.displayName}
                    onClick={() => onSelectProfile(user.id)}
                  >
                    <img
                      className="likes-thumb__image"
                      src={getUserImageCandidates(user, 260)[0]}
                      alt={user.displayName}
                      data-candidate-index="0"
                      onError={(event) => {
                        loadNextImageCandidate(event, getUserImageCandidates(user, 260));
                      }}
                    />
                    {isSuperLikedByUser(user) && (
                      <div className="likes-thumb__superlike-badge"><span>★</span></div>
                    )}
                  </button>
                  <div className="likes-item__actions" role="group" aria-label={`${user.displayName}への操作`}>
                    <button
                      type="button"
                      className="deck-action-btn deck-action-btn--nope"
                      title="Nope"
                      aria-label={`${user.displayName}をNope`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        showActionFeedback(`${user.displayName}をNopeしました`, 'nope');
                        onNope?.(user.id);
                      }}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className="deck-action-btn deck-action-btn--superlike"
                      title="Super Like"
                      aria-label={`${user.displayName}をSuper Like`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        showActionFeedback(`${user.displayName}へSuper Likeしました`, 'superlike');
                        onLike?.(user.id, true);
                      }}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      className="deck-action-btn deck-action-btn--like"
                      title="Like"
                      aria-label={`${user.displayName}をLike`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        showActionFeedback(`${user.displayName}へLikeしました`, 'like');
                        onLike?.(user.id, false);
                      }}
                    >
                      ♥
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="likes-section">
        <h2 className="likes-section__title">あなたがいいねした人</h2>
        <div className="likes-grid likes-grid--outgoing">
          {likedByCurrentUser.length === 0 ? (
            <div className="likes-empty" role="status" aria-live="polite">
              <p className="likes-empty__title">まだいません</p>
              <p className="likes-empty__note">あなたがいいねした人はここに表示されます。</p>
            </div>
          ) : (
            likedByCurrentUser.map((user) => (
              <div key={`liked-by-me-${user.id}`} className="likes-item likes-item--outgoing">
                <button
                  type="button"
                  className="likes-thumb"
                  title={user.displayName}
                  onClick={() => onSelectProfile(user.id)}
                >
                  <img
                    className="likes-thumb__image"
                    src={getUserImageCandidates(user, 260)[0]}
                    alt={user.displayName}
                    data-candidate-index="0"
                    onError={(event) => {
                      loadNextImageCandidate(event, getUserImageCandidates(user, 260));
                    }}
                  />
                  {isSuperLikeFromUser(user) && (
                    <div className="likes-thumb__superlike-badge"><span>★</span></div>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
      {actionFeedback && (
        <div
          className={`likes-action-toast likes-action-toast--${actionFeedback.type}`}
          role="status"
          aria-live="polite"
        >
          {actionFeedback.message}
        </div>
      )}
    </div>
  );
}

export default MatchList;
