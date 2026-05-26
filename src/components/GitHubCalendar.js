import React, { useState } from 'react';

/**
 * Simple GitHub contributions image embed.
 * Uses a public image endpoint to avoid backend changes.
 * Props: { username: string }
 */
function GitHubCalendar({ username }) {
  const [isLoading, setIsLoading] = useState(true);

  if (!username) return null;

  const src = `https://ghchart.rshah.org/${encodeURIComponent(username)}`;

  return (
    <div style={{ overflowX: 'auto', paddingTop: 8 }} className="github-calendar__wrap">
      <div style={{ width: '100%', minWidth: 600 }} className="github-calendar__content">
        {isLoading && (
          <div className="github-calendar__skeleton" aria-hidden="true">
            <div className="github-calendar__skeleton-shimmer" />
          </div>
        )}
        <img
          src={src}
          alt="GitHub contributions"
          style={{ display: 'block', height: 120 }}
          className={isLoading ? 'github-calendar__img github-calendar__img--hidden' : 'github-calendar__img'}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}

export default GitHubCalendar;
