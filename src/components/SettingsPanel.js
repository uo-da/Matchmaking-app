import React from 'react';

const popularTags = ['React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'Python', 'Go', 'AWS', 'Docker', 'Kubernetes'];

/**
 * @param {{ filter: Object, onFilterChange: Function }} props
 */
function SettingsPanel({ filter, onFilterChange }) {
  const handleChange = (name, value) => {
    const normalizedValue = name === 'minYears' ? Math.max(0, Number(value) || 0) : value;
    onFilterChange({ ...filter, [name]: normalizedValue });
  };

  return (
    <div className="card">
      <h2>カード設定</h2>
      <div className="field">
        <label>よく使われる技術タグ</label>
        <div className="tags-list">
          {popularTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`small-button ${filter.stackTag === tag ? 'active-tag' : ''}`}
              onClick={() => handleChange('stackTag', tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="stackTag">マニアックな技術スタック</label>
        <input
          id="stackTag"
          value={filter.stackTag}
          onChange={(event) => handleChange('stackTag', event.target.value)}
          placeholder="例: GraphQL, Elixir, WebAssembly"
        />
        <small>複数指定する場合はカンマ区切りで入力できます。</small>
      </div>
      <div className="field">
        <label htmlFor="minYears">最小経験年数</label>
        <input
          id="minYears"
          type="number"
          value={filter.minYears}
          onChange={(event) => handleChange('minYears', event.target.value)}
          min="0"
        />
      </div>
      <p>ここで設定した条件がカード表示に反映されます。</p>
    </div>
  );
}

export default SettingsPanel;
