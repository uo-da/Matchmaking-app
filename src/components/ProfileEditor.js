import React, { useRef, useState } from 'react';

const popularTags = ['Python', 'Java', 'Go', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'];
const yearOptions = Array.from({ length: 20 }, (_, index) => index + 1);

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
    photoUrls: user.photoUrls || []
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const photos = Array.from({ length: 3 }, (_, index) => profile.photoUrls[index] || null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const normalizedValue = name === 'experienceYears' ? Math.max(0, Number(value) || 0) : value;
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
    if (profile.photoUrls.length >= 3) {
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
        photoUrls: [...(prev.photoUrls || []), reader.result].slice(0, 3)
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
    const tags = profile.stackTags.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (isInitialRegistration && (!profile.photoUrls || profile.photoUrls.length === 0)) {
      newErrors.photos = 'プロフィール画像を最低1枚以上登録してください。';
    }
    if (tags.length === 0) {
      newErrors.stackTags = '技術スタックを少なくとも1つ入力してください。';
    }
    if (!profile.experienceYears || profile.experienceYears <= 0) {
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
      experienceYears: Number(profile.experienceYears) || 0,
      hobbies: profile.hobbies.trim(),
      photoUrls: profile.photoUrls
    });
  };

  return (
    <div className="profile-card">
      <h2 className="profile-card__title">{isInitialRegistration ? '初期登録' : 'プロフィール'}</h2>
      {isInitialRegistration && (
        <p className="profile-card__subtitle">まずは最低1枚以上のプロフィール画像を登録し、経験年数と技術タグを入力してください。</p>
      )}
      <form onSubmit={handleSubmit} className="profile-card__form">
        <div className="profile-card__photos">
          {photos.map((photo, index) => (
            <div key={index} className="profile-card__photo-slot">
              {photo ? (
                <>
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
                </>
              ) : (
                <button type="button" className="profile-card__add-photo" onClick={handleAddPhoto}>
                  ＋
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="profile-card__photo-note">
          {isInitialRegistration ? 'まずは最低1枚の画像を登録してください。' : '最低2枚の画像を登録してください。'}
        </p>
        {errors.photos && <div className="profile-card__error">{errors.photos}</div>}

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

        <div className="profile-card__field">
          <label htmlFor="displayName">Name</label>
          <input id="displayName" name="displayName" value={profile.displayName} onChange={handleChange} placeholder="Name" />
        </div>

        <div className="profile-card__field">
          <label htmlFor="bio">自己紹介</label>
          <textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} rows="4" placeholder="バックエンドエンジニアです。" />
        </div>

        <div className="profile-card__field">
          <label htmlFor="experienceYears">経験年数</label>
          <select id="experienceYears" name="experienceYears" value={profile.experienceYears} onChange={handleChange}>
            <option value="0">選択してください</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
          {isInitialRegistration && !profile.experienceYears && (
            <div className="profile-card__warning">経験年数を入力してください。</div>
          )}
          {errors.experienceYears && <div className="profile-card__error">{errors.experienceYears}</div>}
        </div>

        <div className="profile-card__field">
          <label>技術タグ</label>
          <div className="profile-card__tag-list">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`small-button ${((profile.stackTags || '').split(',').map((item) => item.trim()).includes(tag) ? 'active-tag' : '')}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            id="stackTags"
            name="stackTags"
            value={profile.stackTags}
            onChange={handleChange}
            placeholder="カンマ区切りでタグを登録(例) Java, AWS,"
          />
          {isInitialRegistration && !profile.stackTags.trim() && (
            <div className="profile-card__warning">技術タグを少なくとも1つ入力してください。</div>
          )}
          {errors.stackTags && <div className="profile-card__error">{errors.stackTags}</div>}
        </div>

        <div className="profile-card__field">
          <label htmlFor="hobbies">趣味</label>
          <input id="hobbies" name="hobbies" value={profile.hobbies} onChange={handleChange} placeholder="カンマ区切りでタグを登録(例) 散歩, PC," />
        </div>

        <button type="submit" className="primary-button profile-card__save-button">
          登録する
        </button>
      </form>
    </div>
  );
}

export default ProfileEditor;
