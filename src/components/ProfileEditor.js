import React, { useRef, useState } from 'react';
import { EXPERIENCE_MAX_YEARS, normalizeExperienceYears } from '../utils/experience';

const popularTags = ['Python', 'Java', 'Go', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'];
const popularHobbies = ['散歩', '映画', '読書', 'ゲーム', '旅行', 'カフェ巡り', '音楽', '筋トレ'];
const yearOptions = Array.from({ length: EXPERIENCE_MAX_YEARS }, (_, index) => index + 1);
const PROFILE_MAX_LENGTHS = {
  displayName: 30,
  bio: 200,
  stackTags: 100,
  hobbies: 200
};

const parseCommaList = (value) => (
  (value || '')
    .split(/[,\n、]/)
    .map((item) => item.trim())
    .filter(Boolean)
);

/**
 * @param {{ user: Object, onSave: (profile: Object) => void }} props
 */
function ProfileEditor({ user, onSave, isInitialRegistration = false }) {
  const [profile, setProfile] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    stackTags: Array.isArray(user.stackTags) ? user.stackTags.join(', ') : (user.stackTags || ''),
    experienceYears: user.experienceYears || 0,
    hobbies: user.hobbies || '',
    photoUrls: user.photoUrls || []
  });
  const [errors, setErrors] = useState({});
  const [stackTagInput, setStackTagInput] = useState('');
  const [hobbyInput, setHobbyInput] = useState('');
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

  const stackTagTokens = parseCommaList(profile.stackTags);

  const hobbyTokens = parseCommaList(profile.hobbies);

  const setStackTagsFromTokens = (tokens) => {
    const uniqueTokens = [...new Set(tokens.map((item) => item.trim()).filter(Boolean))];
    const nextStackTags = uniqueTokens.join(', ');
    if (nextStackTags.length > PROFILE_MAX_LENGTHS.stackTags) {
      setErrors((prev) => ({ ...prev, stackTags: `技術スタックは最大${PROFILE_MAX_LENGTHS.stackTags}文字までです。` }));
      return false;
    }
    setProfile((prev) => ({ ...prev, stackTags: nextStackTags }));
    setErrors((prev) => {
      if (!prev.stackTags) {
        return prev;
      }
      const { stackTags, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const setHobbiesFromTokens = (tokens) => {
    const uniqueTokens = [...new Set(tokens.map((item) => item.trim()).filter(Boolean))];
    const nextHobbies = uniqueTokens.join(', ');
    if (nextHobbies.length > PROFILE_MAX_LENGTHS.hobbies) {
      setErrors((prev) => ({ ...prev, hobbies: `趣味は最大${PROFILE_MAX_LENGTHS.hobbies}文字までです。` }));
      return false;
    }
    setProfile((prev) => ({ ...prev, hobbies: nextHobbies }));
    setErrors((prev) => {
      if (!prev.hobbies) {
        return prev;
      }
      const { hobbies, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const addHobbyToken = (rawValue) => {
    const inputTokens = parseCommaList((rawValue || '').replace(/,+$/, ''));
    if (inputTokens.length === 0) {
      return;
    }
    const nextTokens = [...hobbyTokens];
    inputTokens.forEach((token) => {
      if (!nextTokens.includes(token)) {
        nextTokens.push(token);
      }
    });
    if (setHobbiesFromTokens(nextTokens)) {
      setHobbyInput('');
    }
  };

  const addStackTagToken = (rawValue) => {
    const inputTokens = parseCommaList((rawValue || '').replace(/,+$/, ''));
    if (inputTokens.length === 0) {
      return;
    }
    const nextTokens = [...stackTagTokens];
    inputTokens.forEach((token) => {
      if (!nextTokens.includes(token)) {
        nextTokens.push(token);
      }
    });
    if (setStackTagsFromTokens(nextTokens)) {
      setStackTagInput('');
    }
  };

  const toggleStackTag = (tag) => {
    const nextTokens = stackTagTokens.includes(tag)
      ? stackTagTokens.filter((item) => item !== tag)
      : [...stackTagTokens, tag];
    setStackTagsFromTokens(nextTokens);
  };

  const handleStackTagInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    if (event.key === ',') {
      event.preventDefault();
      addStackTagToken(stackTagInput);
      return;
    }
    if (event.key === 'Backspace' && !stackTagInput && stackTagTokens.length > 0) {
      event.preventDefault();
      setStackTagsFromTokens(stackTagTokens.slice(0, -1));
    }
  };

  const toggleHobby = (hobby) => {
    const nextTokens = hobbyTokens.includes(hobby)
      ? hobbyTokens.filter((item) => item !== hobby)
      : [...hobbyTokens, hobby];
    setHobbiesFromTokens(nextTokens);
  };

  const handleHobbyInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    if (event.key === ',') {
      event.preventDefault();
      addHobbyToken(hobbyInput);
      return;
    }
    if (event.key === 'Backspace' && !hobbyInput && hobbyTokens.length > 0) {
      event.preventDefault();
      setHobbiesFromTokens(hobbyTokens.slice(0, -1));
    }
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
      stackTags: parseCommaList(profile.stackTags),
      experienceYears: normalizeExperienceYears(profile.experienceYears),
      hobbies: profile.hobbies.trim(),
      photoUrls: profile.photoUrls
    });
  };

  return (
    <div className="profile-card">
      <h2 className="profile-card__title">{isInitialRegistration ? '初期登録' : 'プロフィール'}</h2>
      {/* 初期の説明文や事前警告は表示せず、登録時のみバリデーションエラーを表示します */}
      <form onSubmit={handleSubmit} className="profile-card__form">
        <div className="profile-card__section-label required-label">プロフィール写真</div>
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
          <label htmlFor="displayName" className="required-label">名前</label>
          <input
            id="displayName"
            name="displayName"
            value={profile.displayName}
            onChange={handleChange}
            placeholder="名前"
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
          <label htmlFor="experienceYears" className="required-label">経験年数</label>
          <select id="experienceYears" name="experienceYears" value={profile.experienceYears} onChange={handleChange}>
            <option value="0">選択してください</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year === EXPERIENCE_MAX_YEARS ? `${year}年以上` : `${year}年`}</option>
            ))}
          </select>
          {errors.experienceYears && <div className="profile-card__error">{errors.experienceYears}</div>}
        </div>

        <div className="profile-card__field">
          <label htmlFor="stackTagInput">技術スタック</label>
          <p className="profile-card__hint">候補を選ぶか、入力して「追加」してください。</p>
          <div className="profile-card__tag-list">
            {popularTags.map((tag) => {
              const isActive = stackTagTokens.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${isActive ? 'tag-chip--active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => toggleStackTag(tag)}
                >
                  <span className="tag-chip__check" aria-hidden="true">✓</span>
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="profile-card__tag-list profile-card__tag-list--selected" aria-label="選択済みの技術スタック">
            {stackTagTokens.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag-chip tag-chip--active"
                onClick={() => toggleStackTag(tag)}
                aria-label={`${tag} を削除`}
              >
                <span className="tag-chip__check" aria-hidden="true">×</span>
                {tag}
              </button>
            ))}
          </div>
          <div className="profile-card__token-input-row">
            <input
              id="stackTagInput"
              name="stackTagInput"
              value={stackTagInput}
              onChange={(event) => setStackTagInput(event.target.value.slice(0, 30))}
              onKeyDown={handleStackTagInputKeyDown}
              placeholder="例: React"
              maxLength={30}
            />
            <button
              type="button"
              className="profile-card__token-add-button"
              onClick={() => addStackTagToken(stackTagInput)}
              aria-label="技術スタックを追加"
            >
              追加
            </button>
          </div>
          {errors.stackTags && <div className="profile-card__error">{errors.stackTags}</div>}
        </div>

        <div className="profile-card__field">
          <label htmlFor="hobbyInput">趣味</label>
          <p className="profile-card__hint">候補を選ぶか、入力して「追加」してください。</p>
          <div className="profile-card__tag-list">
            {popularHobbies.map((hobby) => {
              const isActive = hobbyTokens.includes(hobby);
              return (
                <button
                  key={hobby}
                  type="button"
                  className={`tag-chip ${isActive ? 'tag-chip--active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => toggleHobby(hobby)}
                >
                  <span className="tag-chip__check" aria-hidden="true">✓</span>
                  {hobby}
                </button>
              );
            })}
          </div>
          <div className="profile-card__tag-list profile-card__tag-list--selected" aria-label="選択済みの趣味">
            {hobbyTokens.map((hobby) => (
              <button
                key={hobby}
                type="button"
                className="tag-chip tag-chip--active"
                onClick={() => toggleHobby(hobby)}
                aria-label={`${hobby} を削除`}
              >
                <span className="tag-chip__check" aria-hidden="true">×</span>
                {hobby}
              </button>
            ))}
          </div>
          <div className="profile-card__token-input-row">
            <input
              id="hobbyInput"
              name="hobbyInput"
              value={hobbyInput}
              onChange={(event) => setHobbyInput(event.target.value.slice(0, 40))}
              onKeyDown={handleHobbyInputKeyDown}
              placeholder="例: ランニング"
              maxLength={40}
            />
            <button
              type="button"
              className="profile-card__token-add-button"
              onClick={() => addHobbyToken(hobbyInput)}
              aria-label="趣味を追加"
            >
              追加
            </button>
          </div>
          {errors.hobbies && <div className="profile-card__error">{errors.hobbies}</div>}
        </div>

        <button type="submit" className="primary-button profile-card__save-button">
          登録する
        </button>
      </form>
    </div>
  );
}

export default ProfileEditor;
