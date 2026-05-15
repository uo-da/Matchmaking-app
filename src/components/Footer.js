import React from 'react';
import '../styles/Footer.css';

/**
 * Footer navigation component
 * Displays navigation icons at the bottom of the application
 * 
 * @param {string} activeTab - Currently active tab ('users', 'matches', 'chat', 'profile', 'settings')
 * @param {function} onTabChange - Callback function when tab is clicked
 * @returns {JSX.Element} Footer component
 */
function Footer({ activeTab, onTabChange }) {
  const navigationItems = [
    { id: 'users', icon: 'card.png', label: 'ユーザー' },
    { id: 'matches', icon: 'like.png', label: 'マッチ' },
    { id: 'chat', icon: 'talk.png', label: 'チャット' },
    { id: 'profile', icon: 'person.png', label: 'プロフィール' },
    { id: 'settings', icon: 'setting.png', label: '設定' },
  ];

  return (
    <footer className="footer">
      <nav className="footer-nav">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`footer-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={item.label}
            aria-label={item.label}
          >
            <img
              src={`/images/${item.icon}`}
              alt={item.label}
              className="footer-icon"
            />
          </button>
        ))}
      </nav>
    </footer>
  );
}

export default Footer;
