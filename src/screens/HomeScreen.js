import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeScreen.css';

function HomeScreen() {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'practice',
      icon: '♟',
      title: 'Practice Game',
      description: 'Play against Stockfish at your skill level',
      path: '/pregame',
      gradient: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)'
    },
    {
      id: 'guided',
      icon: '♞',
      title: 'Guided Match',
      description: 'Learn as you play with coach assistance',
      path: '/game',
      state: { coachEnabled: true, difficulty: 10, playerColor: 'white' },
      gradient: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)'
    },
    {
      id: 'openings',
      icon: '♜',
      title: 'Learn Openings',
      description: 'Master popular chess openings',
      path: '/openings',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)'
    },
    {
      id: 'history',
      icon: '♛',
      title: 'Past Games',
      description: 'Review and analyze your game history',
      path: '/history',
      gradient: 'linear-gradient(135deg, #9c27b0 0%, #6a1b9a 100%)'
    },
    {
      id: 'settings',
      icon: '♚',
      title: 'Settings',
      description: 'Customize your experience',
      path: '/settings',
      gradient: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)'
    }
  ];

  const handleNavigation = (item) => {
    navigate(item.path, { state: item.state });
  };

  return (
    <div className="home-screen">
      {/* Decorative chess pattern background */}
      <div className="chess-pattern-bg" />

      <div className="home-content">
        {/* Header */}
        <header className="home-header">
          <div className="logo-container">
            <span className="logo-icon">♔</span>
            <h1 className="app-title">Chess Coach</h1>
          </div>
          <p className="app-tagline">Your personal chess training companion</p>
        </header>

        {/* Navigation Menu */}
        <nav className="menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="menu-card"
              onClick={() => handleNavigation(item)}
              style={{ '--card-gradient': item.gradient }}
            >
              <div className="menu-card-icon">{item.icon}</div>
              <div className="menu-card-content">
                <h2 className="menu-card-title">{item.title}</h2>
                <p className="menu-card-description">{item.description}</p>
              </div>
              <div className="menu-card-arrow">→</div>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-decoration">
            <span>♙</span>
            <span>♘</span>
            <span>♗</span>
            <span>♖</span>
            <span>♕</span>
            <span>♔</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default HomeScreen;
