import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
          <span className="navbar-logo">&#9822;</span>
          <span className="navbar-title">Chess Learn</span>
        </NavLink>

        <button
          className={`navbar-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
          <NavLink to="/play" className="navbar-link" onClick={closeMenu}>
            Play
          </NavLink>
          <NavLink to="/puzzles" className="navbar-link" onClick={closeMenu}>
            Puzzles
          </NavLink>
          <NavLink to="/analysis" className="navbar-link" onClick={closeMenu}>
            Analysis
          </NavLink>
          <NavLink to="/learn" className="navbar-link" onClick={closeMenu}>
            Learn
          </NavLink>
          <NavLink to="/settings" className="navbar-link" onClick={closeMenu}>
            Settings
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
