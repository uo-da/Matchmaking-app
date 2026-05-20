import React from 'react';

/**
 * Simple GitHub contributions image embed.
 * Uses a public image endpoint to avoid backend changes.
 * Props: { username: string }
 */
function GitHubCalendar({ username }) {
  if (!username) return null;

  const src = `https://ghchart.rshah.org/${encodeURIComponent(username)}`;

  return (
    <div style={{ overflowX: 'auto', paddingTop: 8 }} className="github-calendar__wrap">
      <div style={{ width: '100%', minWidth: 600 }}>
        <img src={src} alt="GitHub contributions" style={{ display: 'block', height: 120 }} />
      </div>
    </div>
  );
}

export default GitHubCalendar;
