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

const TAG_INPUT_MAX_LENGTH = 30;

const parseTagTokens = (value) => (
  (value || '')
    .split(/[,\n、]/)
    .map((item) => item.trim())
    .filter(Boolean)
);

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
  const [stackTagInput, setStackTagInput] = useState('');

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
    setStackTagInput('');
    updateFilterStack(nextStacks);
  };

  const addStackTagToken = (rawValue) => {
    const inputTokens = parseTagTokens((rawValue || '').replace(/,+$/, ''));
    if (inputTokens.length === 0) {
      return;
    }
    const nextStacks = [...selectedStacks];
    inputTokens.forEach((token) => {
      if (!nextStacks.includes(token)) {
        nextStacks.push(token);
      }
    });
    setSelectedStacks(nextStacks);
    updateFilterStack(nextStacks);
    setStackTagInput('');
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
    if (event.key === 'Backspace' && !stackTagInput && selectedStacks.length > 0) {
      event.preventDefault();
      const nextStacks = selectedStacks.slice(0, -1);
      setSelectedStacks(nextStacks);
      updateFilterStack(nextStacks);
    }
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
            <p className="profile-card__hint">候補を選ぶか、入力して「追加」してください。</p>
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
            <div className="profile-card__tag-list profile-card__tag-list--selected" aria-label="選択済みの技術スタック">
              {selectedStacks.map((stack) => (
                <button
                  key={stack}
                  type="button"
                  className="tag-chip tag-chip--active"
                  onClick={() => toggleStack(stack)}
                  aria-label={`${stack} を削除`}
                >
                  <span className="tag-chip__check" aria-hidden="true">×</span>
                  {stack}
                </button>
              ))}
            </div>
            <div className="profile-card__token-input-row">
              <input
                type="text"
                value={stackTagInput}
                onChange={(event) => setStackTagInput(event.target.value.slice(0, TAG_INPUT_MAX_LENGTH))}
                onKeyDown={handleStackTagInputKeyDown}
                onBlur={() => addStackTagToken(stackTagInput)}
                placeholder="例: React"
                aria-label="技術スタックタグ入力"
                maxLength={TAG_INPUT_MAX_LENGTH}
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
