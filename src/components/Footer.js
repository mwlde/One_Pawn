import React from 'react';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          Chess Learning App &copy; {currentYear}
        </p>
        <p className="footer-tagline">
          Improve your chess, one move at a time
        </p>
      </div>
    </footer>
  );
}

export default Footer;
