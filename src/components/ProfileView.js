import React, { useState } from 'react';
import './ProfileView.css';
import ProfileEditor from './ProfileEditor';
import GitHubCalendar from './GitHubCalendar';
import { formatExperienceYears } from '../utils/experience';

/**
 * Read-only profile view with an edit (pen) button that toggles inline editor.
 * Pen icon is placed at same vertical level as the name on the right.
 */
function ProfileView({ user, onSave, readOnly = false, title = 'マイプロフィール' }) {
  const [isEditing, setIsEditing] = useState(false);

  if (!user) return null;

  return (
    <>
      {!isEditing ? (
        <div className="profile-card profile-view__card">
          <h2 className="profile-card__title">{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {(user.photoUrls || []).slice(0, 3).map((p, i) => (
                  <img key={i} src={p || user.avatar} alt="photo" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} onError={(e) => { e.currentTarget.src = user.avatar || 'https://via.placeholder.com/72'; }} />
                ))}
              </div>
              {!readOnly && (
                <button aria-label="編集" className="icon-button" onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', fontSize: 18 }}>
                  ✎
                </button>
              )}
          </div>

          <div className="profile-view__content">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div className="profile-view__name">{user.displayName} {user.age ? ` ${user.age}` : ''}</div>
                <div className="profile-view__id">ID:{user.githubUsername || ''}</div>
              </div>
            </div>
            <p className="profile-card__bio" style={{ marginTop: 8 }}>{user.bio}</p>

            <div className="profile-view__section">
              <div className="profile-view__section-title">経験年数</div>
              <div style={{ marginTop: 6 }}>{formatExperienceYears(user.experienceYears)}</div>
            </div>

            <div className="profile-view__section">
              <div className="profile-view__section-title">技術タグ</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(user.stackTags || []).map((t) => (
                  <span key={t} className="profile-view__tag">{t}</span>
                ))}
              </div>
            </div>

            <div className="profile-view__section">
              <div className="profile-view__section-title">趣味</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(user.hobbies || '').split(',').map((h) => h.trim()).filter(Boolean).map((h) => (
                  <span key={h} className="profile-card__hobby">{h}</span>
                ))}
              </div>
            </div>

            <div className="profile-view__section">
              <div className="profile-view__section-title" style={{ marginBottom: 6 }}>Contribution Graph</div>
              <GitHubCalendar username={user.githubUsername} />
            </div>
          </div>
        </div>
      ) : (
        <div className="profile-view__editor">
          {!readOnly && (
            <>
              <ProfileEditor user={user} isInitialRegistration={false} onSave={(profile) => { onSave(profile); setIsEditing(false); }} />
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>キャンセル</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ProfileView;
