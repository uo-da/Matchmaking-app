import React, { useMemo } from 'react';
import { getUserImageCandidates, loadNextImageCandidate } from '../utils/userImage';

/**
 * @param {{ currentUser: Object, users: Object[], matchedUserIds: Set<string>, onSelectMatch: (matchId: string) => void }} props
 */
function MatchList({ currentUser, users, matchedUserIds, onSelectMatch }) {
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
            likedByUsers.map((user) => (
              <button
                key={`liked-by-${user.id}`}
                type="button"
                className={`likes-thumb ${matchedUserIds.has(user.id) ? '' : 'likes-thumb--disabled'} ${isSuperLikeFromUser(user) ? 'likes-thumb--superlike' : ''}`}
                title={matchedUserIds.has(user.id) ? user.displayName : `${user.displayName}（未マッチ）`}
                disabled={!matchedUserIds.has(user.id)}
                onClick={() => onSelectMatch(user.id)}
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
                  <div className="likes-thumb__superlike-badge">★</div>
                )}
              </button>
            ))
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
              <button
                key={`liked-by-me-${user.id}`}
                type="button"
                className={`likes-thumb ${matchedUserIds.has(user.id) ? '' : 'likes-thumb--disabled'}`}
                title={matchedUserIds.has(user.id) ? user.displayName : `${user.displayName}（未マッチ）`}
                disabled={!matchedUserIds.has(user.id)}
                onClick={() => onSelectMatch(user.id)}
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
                  <div className="likes-thumb__superlike-badge">★</div>
                )}
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default MatchList;
