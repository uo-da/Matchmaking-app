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
        <div className="profile-card">
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

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{user.displayName} {user.age ? ` ${user.age}` : ''}</div>
                <div style={{ color: '#999', fontSize: 12 }}>ID:{user.githubUsername || ''}</div>
              </div>
            </div>
            <p style={{ marginTop: 8 }}>{user.bio}</p>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#333' }}>経験年数</div>
              <div style={{ marginTop: 6 }}>{formatExperienceYears(user.experienceYears)}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#333' }}>技術タグ</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(user.stackTags || []).map((t) => (
                  <span key={t} style={{ padding: '6px 10px', borderRadius: 16, background: '#f5f5f5', fontSize: 12 }}>{t}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#333' }}>趣味</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(user.hobbies || '').split(',').map((h) => h.trim()).filter(Boolean).map((h) => (
                  <span key={h} style={{ padding: '6px 10px', borderRadius: 16, background: '#f5f5f5', fontSize: 12 }}>{h}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Contribution Graph</div>
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
