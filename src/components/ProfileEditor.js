import React, { useState } from 'react';

/**
 * @param {{ user: Object, onSave: (profile: Object) => void }} props
 */
function ProfileEditor({ user, onSave }) {
  const [profile, setProfile] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    stackTags: user.stackTags.join(', ') || '',
    experienceYears: user.experienceYears || 0,
    hobbies: user.hobbies || '',
    githubUsername: user.githubUsername || ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      displayName: profile.displayName.trim() || user.displayName,
      bio: profile.bio.trim(),
      stackTags: profile.stackTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      experienceYears: Number(profile.experienceYears) || 0,
      hobbies: profile.hobbies.trim(),
      githubUsername: profile.githubUsername.trim() || user.githubUsername
    });
  };

  return (
    <div className="card">
      <h2>プロフィール編集</h2>
      <form onSubmit={handleSubmit} className="grid">
        <div className="field">
          <label htmlFor="displayName">表示名</label>
          <input id="displayName" name="displayName" value={profile.displayName} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="githubUsername">GitHubユーザ名</label>
          <input id="githubUsername" name="githubUsername" value={profile.githubUsername} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="bio">自己紹介</label>
          <textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} rows="4" />
        </div>
        <div className="field">
          <label htmlFor="stackTags">技術スタック (カンマ区切り)</label>
          <input id="stackTags" name="stackTags" value={profile.stackTags} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="experienceYears">経験年数</label>
          <input id="experienceYears" name="experienceYears" type="number" value={profile.experienceYears} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="hobbies">趣味</label>
          <input id="hobbies" name="hobbies" value={profile.hobbies} onChange={handleChange} />
        </div>
        <button type="submit" className="primary-button">
          保存する
        </button>
      </form>
      {user.githubUsername && (
        <div className="field">
          <label>GitHub 草</label>
          <img
            alt="GitHub contributions"
            src={`https://ghchart.rshah.org/${user.githubUsername}`}
            style={{ width: '100%', maxWidth: 520, borderRadius: 12, marginTop: 10 }}
          />
        </div>
      )}
    </div>
  );
}

export default ProfileEditor;
