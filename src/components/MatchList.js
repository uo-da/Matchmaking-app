import React, { useMemo } from 'react';
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
  const likedByUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.id === currentUser.id) {
        return false;
      }
      return user.likedUserIds.includes(currentUser.id) || user.superLikedUserIds.includes(currentUser.id);
    });
  }, [users, currentUser.id]);

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

  const currentLikedUserIds = useMemo(() => {
    return new Set([...(currentUser.likedUserIds || []), ...(currentUser.superLikedUserIds || [])]);
  }, [currentUser.likedUserIds, currentUser.superLikedUserIds]);

  const currentNopedUserIds = useMemo(() => {
    return new Set(currentUser.nopedUserIds || []);
  }, [currentUser.nopedUserIds]);

  return (
    <div className="likes-screen">
      <section className="likes-section">
        <h2 className="likes-section__title">あなたをいいねした人</h2>
        <div className="likes-grid">
          {likedByUsers.length === 0 ? (
            <div className="likes-empty" role="status" aria-live="polite">
              <p className="likes-empty__title">まだいません</p>
              <p className="likes-empty__note">あなたをいいねした人はここに表示されます。</p>
            </div>
          ) : (
            likedByUsers.map((user) => {
              const isLikedByMe = currentLikedUserIds.has(user.id);
              const isSuperLikedByMe = (currentUser.superLikedUserIds || []).includes(user.id);
              const isNopedByMe = currentNopedUserIds.has(user.id);

              return (
                <div key={`liked-by-${user.id}`} className="likes-item">
                  <button
                    type="button"
                    className={`likes-thumb ${isSuperLikeFromUser(user) ? 'likes-thumb--superlike' : ''}`}
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
                      className={`likes-action likes-action--nope ${isNopedByMe ? 'likes-action--active' : ''}`}
                      title="Nope"
                      aria-label={`${user.displayName}をNope`}
                      onClick={() => onNope?.(user.id)}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className={`likes-action likes-action--like ${isLikedByMe && !isSuperLikedByMe ? 'likes-action--active' : ''}`}
                      title="Like"
                      aria-label={`${user.displayName}をLike`}
                      onClick={() => onLike?.(user.id, false)}
                    >
                      ♥
                    </button>
                    <button
                      type="button"
                      className={`likes-action likes-action--superlike ${isSuperLikedByMe ? 'likes-action--active' : ''}`}
                      title="Super Like"
                      aria-label={`${user.displayName}をSuper Like`}
                      onClick={() => onLike?.(user.id, true)}
                    >
                      ★
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
        <div className="likes-grid">
          {likedByCurrentUser.length === 0 ? (
            <div className="likes-empty" role="status" aria-live="polite">
              <p className="likes-empty__title">まだいません</p>
              <p className="likes-empty__note">あなたがいいねした人はここに表示されます。</p>
            </div>
          ) : (
            likedByCurrentUser.map((user) => (
              <div key={`liked-by-me-${user.id}`} className="likes-item">
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
    </div>
  );
}

export default MatchList;
