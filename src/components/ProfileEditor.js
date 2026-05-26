import React, { useRef, useState } from 'react';
import { EXPERIENCE_MAX_YEARS, normalizeExperienceYears } from '../utils/experience';

const popularTags = ['Python', 'Java', 'Go', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'];
const yearOptions = Array.from({ length: EXPERIENCE_MAX_YEARS }, (_, index) => index + 1);
const PROFILE_MAX_LENGTHS = {
  displayName: 30,
  bio: 200,
  stackTags: 100,
  hobbies: 200
};

/**
 * @param {{ user: Object, onSave: (profile: Object) => void }} props
 */
function ProfileEditor({ user, onSave, isInitialRegistration = false }) {
  const [profile, setProfile] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    stackTags: (user.stackTags || []).join(', '),
    experienceYears: user.experienceYears || 0,
    hobbies: user.hobbies || '',
    photoUrls: user.photoUrls || [],
    gender: user.gender || ''
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const MAX_PHOTOS = 6;

  const handleChange = (event) => {
    const { name, value } = event.target;
    const normalizedValue = name === 'experienceYears'
      ? normalizeExperienceYears(value)
      : PROFILE_MAX_LENGTHS[name]
        ? value.slice(0, PROFILE_MAX_LENGTHS[name])
        : value;
    setProfile((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handleTagClick = (tag) => {
    const tags = (profile.stackTags || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const nextTags = tags.includes(tag)
      ? tags.filter((item) => item !== tag)
      : [...tags, tag];
    setProfile((prev) => ({ ...prev, stackTags: nextTags.join(', ') }));
  };

  const handleAddPhoto = () => {
    if ((profile.photoUrls || []).length >= MAX_PHOTOS) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({
        ...prev,
        photoUrls: [...(prev.photoUrls || []), reader.result].slice(0, MAX_PHOTOS)
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = null;
  };

  const handleRemovePhoto = (index) => {
    setProfile((prev) => {
      const nextPhotos = [...(prev.photoUrls || [])];
      nextPhotos.splice(index, 1);
      return { ...prev, photoUrls: nextPhotos };
    });
  };

  const validateProfile = () => {
    const newErrors = {};
    if (!profile.photoUrls || profile.photoUrls.length === 0) {
      newErrors.photos = 'まずは最低1枚の画像を登録してください。';
    }
    if (!profile.displayName || !profile.displayName.trim()) {
      newErrors.displayName = '名前を入力してください。';
    }
    if (!profile.experienceYears || Number(profile.experienceYears) <= 0) {
      newErrors.experienceYears = '経験年数を入力してください。';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateProfile()) {
      return;
    }
    onSave({
      displayName: profile.displayName.trim() || user.displayName,
      bio: profile.bio.trim(),
      stackTags: (profile.stackTags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      experienceYears: normalizeExperienceYears(profile.experienceYears),
      hobbies: profile.hobbies.trim(),
      photoUrls: profile.photoUrls,
      gender: profile.gender
    });
  };

  return (
    <div className="profile-card">
      <h2 className="profile-card__title">{isInitialRegistration ? '初期登録' : 'プロフィール'}</h2>
      {/* 初期の説明文や事前警告は表示せず、登録時のみバリデーションエラーを表示します */}
      <form onSubmit={handleSubmit} className="profile-card__form">
        <div className="profile-card__photos">
          {(profile.photoUrls || []).map((photo, index) => (
            <div key={index} className="profile-card__photo-slot">
              <img
                className="profile-card__photo"
                src={photo}
                alt={`プロフィール写真 ${index + 1}`}
                onError={(event) => {
                  event.currentTarget.src = 'https://via.placeholder.com/120';
                }}
              />
              <button
                type="button"
                className="profile-card__remove-photo"
                onClick={() => handleRemovePhoto(index)}
                aria-label="写真を削除"
              >
                ×
              </button>
            </div>
          ))}

          {(profile.photoUrls || []).length < MAX_PHOTOS && (
            <div className="profile-card__photo-slot">
              <button type="button" className="profile-card__add-photo" onClick={handleAddPhoto}>
                ＋
              </button>
            </div>
          )}
        </div>

        {errors.photos && <div className="profile-card__error">{errors.photos}</div>}

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

        <div className="profile-card__field">
          <label htmlFor="displayName">Name</label>
          <input
            id="displayName"
            name="displayName"
            value={profile.displayName}
            onChange={handleChange}
            placeholder="Name"
            maxLength={PROFILE_MAX_LENGTHS.displayName}
          />
          {errors.displayName && <div className="profile-card__error">{errors.displayName}</div>}
        </div>

        <div className="profile-card__field">
          <label htmlFor="bio">自己紹介</label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            rows="4"
            placeholder="バックエンドエンジニアです。"
            maxLength={PROFILE_MAX_LENGTHS.bio}
          />
        </div>

        <div className="profile-card__field">
          <label htmlFor="experienceYears">経験年数</label>
          <select id="experienceYears" name="experienceYears" value={profile.experienceYears} onChange={handleChange}>
            <option value="0">選択してください</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year === EXPERIENCE_MAX_YEARS ? `${year}年以上` : `${year}年`}</option>
            ))}
          </select>
          {errors.experienceYears && <div className="profile-card__error">{errors.experienceYears}</div>}
        </div>

        <div className="profile-card__field">
          <label htmlFor="gender">性別</label>
          <select id="gender" name="gender" value={profile.gender} onChange={handleChange}>
            <option value="">選択してください</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div className="profile-card__field">
          <label>技術スタック</label>
          <div className="profile-card__tag-list">
            {popularTags.map((tag) => {
              const selectedTags = (profile.stackTags || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${isActive ? 'tag-chip--active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => handleTagClick(tag)}
                >
                  <span className="tag-chip__check" aria-hidden="true">✓</span>
                  {tag}
                </button>
              );
            })}
          </div>
          <textarea
            id="stackTags"
            name="stackTags"
            value={profile.stackTags}
            onChange={handleChange}
            placeholder="カンマ区切りでタグを登録（例）Java, AWS"
            maxLength={PROFILE_MAX_LENGTHS.stackTags}
            rows={2}
          />
          {errors.stackTags && <div className="profile-card__error">{errors.stackTags}</div>}
        </div>

        <div className="profile-card__field">
          <label htmlFor="hobbies">趣味</label>
          <textarea
            id="hobbies"
            name="hobbies"
            value={profile.hobbies}
            onChange={handleChange}
            placeholder="カンマ区切りでタグを登録(例) 散歩, PC,"
            maxLength={PROFILE_MAX_LENGTHS.hobbies}
            rows={2}
          />
        </div>

        <button type="submit" className="primary-button profile-card__save-button">
          登録する
        </button>
      </form>
    </div>
  );
}

export default ProfileEditor;
