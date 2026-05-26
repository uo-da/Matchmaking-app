import React, { useMemo, useState } from 'react';

const techStacks = [
  'React',
  'Node.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'Go',
  'AWS',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Kotlin',
  'Rust',
  'Vue',
  'Figma'
];

/**
 * @param {{ filter: Object, onFilterChange: Function, onLogout?: Function, onDeleteAccount?: Function }} props
 */
function SettingsPanel({ filter, onFilterChange, onLogout, onDeleteAccount }) {
  const [minAge, setMinAge] = useState(filter.minAge ?? 18);
  const [maxAge, setMaxAge] = useState(filter.maxAge ?? 80);
  const [selectedStacks, setSelectedStacks] = useState(() => {
    if (Array.isArray(filter.stackTags) && filter.stackTags.length > 0) {
      return filter.stackTags;
    }
    return filter.stackTag ? [filter.stackTag] : [];
  });
  const [customTags, setCustomTags] = useState('');
  const TAG_INPUT_MAX_LENGTH = 100;

  const tagInputValue = customTags.trim() || selectedStacks.join(', ').slice(0, TAG_INPUT_MAX_LENGTH);

  const ageTrackStyle = useMemo(() => {
    const min = 18;
    const max = 80;
    const minPercent = ((minAge - min) / (max - min)) * 100;
    const maxPercent = ((maxAge - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, #9ca3af ${minPercent}%, #ef4444 ${minPercent}%, #ef4444 ${maxPercent}%, #9ca3af ${maxPercent}%)`
    };
  }, [minAge, maxAge]);

  const updateFilter = (patch) => {
    onFilterChange((prev) => ({ ...prev, ...patch }));
  };

  const updateFilterStack = (nextStacks) => {
    updateFilter({
      stackTag: nextStacks[0] || '',
      stackTags: nextStacks
    });
  };

  const toggleStack = (stack) => {
    const exists = selectedStacks.includes(stack);
    const nextStacks = exists ? selectedStacks.filter((item) => item !== stack) : [...selectedStacks, stack];
    setSelectedStacks(nextStacks);
    setCustomTags('');
    updateFilterStack(nextStacks);
  };

  const handleCustomTagsBlur = () => {
    const normalized = customTags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (normalized.length === 0) {
      setCustomTags('');
      return;
    }
    const nextStacks = Array.from(new Set([...selectedStacks, ...normalized]));
    setSelectedStacks(nextStacks);
    updateFilterStack(nextStacks);
    setCustomTags('');
  };

  const handleMinAgeChange = (value) => {
    const nextMin = Math.min(Number(value), maxAge - 1);
    setMinAge(nextMin);
    updateFilter({ minAge: nextMin });
  };

  const handleMaxAgeChange = (value) => {
    const nextMax = Math.max(Number(value), minAge + 1);
    setMaxAge(nextMax);
    updateFilter({ maxAge: nextMax });
  };

  const maxAgeText = maxAge >= 80 ? '80以上' : String(maxAge);

  return (
    <section className="settings-screen" aria-label="設定画面">
      <div className="settings-screen__card">
        <h2 className="settings-screen__title">設定</h2>

        <h3 className="settings-screen__section-title">マッチ絞り込み</h3>

        <div className="settings-block">
        <div className="settings-row settings-row--age">
          <span className="settings-row__label">年齢</span>
          <div className="settings-age">
            <span className="settings-age__edge">18</span>
            <div className="settings-age__slider" style={ageTrackStyle}>
              <input
                type="range"
                min="18"
                max="80"
                value={minAge}
                onChange={(event) => handleMinAgeChange(event.target.value)}
                aria-label="最低年齢"
              />
              <input
                type="range"
                min="18"
                max="80"
                value={maxAge}
                onChange={(event) => handleMaxAgeChange(event.target.value)}
                aria-label="最高年齢"
              />
            </div>
            <div className="settings-age__meta">
              <span className="settings-age__edge">80以上</span>
              <span className="settings-age__value">{minAge}〜{maxAgeText}</span>
            </div>
          </div>
        </div>

        <div className="settings-row settings-row--stack">
          <span className="settings-row__label">技術スタック</span>
          <div className="settings-stack">
            <div className="settings-stack__chips">
              {techStacks.map((stack) => (
                <button
                  key={stack}
                  type="button"
                  className={`tag-chip ${selectedStacks.includes(stack) ? 'tag-chip--active' : ''}`}
                  aria-pressed={selectedStacks.includes(stack)}
                  onClick={() => toggleStack(stack)}
                >
                  <span className="tag-chip__check" aria-hidden="true">✓</span>
                  {stack}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tagInputValue}
              onChange={(event) => setCustomTags(event.target.value.slice(0, TAG_INPUT_MAX_LENGTH))}
              onBlur={handleCustomTagsBlur}
              placeholder="カンマ区切りでタグを登録（例）Java, AWS"
              aria-label="技術スタックタグ入力"
              maxLength={TAG_INPUT_MAX_LENGTH}
            />
          </div>
        </div>
        </div>

        <div className="settings-account-actions">
        <button
          type="button"
          className="settings-account-button"
          onClick={() => {
            if (typeof onLogout === 'function') {
              onLogout();
            }
          }}
        >
          ログアウト
        </button>
        <button
          type="button"
          className="settings-account-button settings-account-button--danger"
          onClick={() => {
            if (typeof onDeleteAccount === 'function') {
              onDeleteAccount();
            }
          }}
        >
          アカウント削除
        </button>
        </div>
      </div>
    </section>
  );
}

export default SettingsPanel;
