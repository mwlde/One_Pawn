import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components';
import './HomeScreen.css';

function HomeScreen() {
  const features = [
    {
      icon: '♟',
      title: 'Play Chess',
      description: 'Play against the computer or set up custom positions',
      link: '/play',
      color: 'gold'
    },
    {
      icon: '♜',
      title: 'Puzzles',
      description: 'Solve tactical puzzles to sharpen your skills',
      link: '/puzzles',
      color: 'green'
    },
    {
      icon: '♛',
      title: 'Analysis',
      description: 'Analyze your games with Stockfish engine',
      link: '/analysis',
      color: 'blue'
    },
    {
      icon: '♚',
      title: 'Learn',
      description: 'Study openings, endgames, and strategies',
      link: '/learn',
      color: 'purple'
    }
  ];

  return (
    <div className="page home-screen">
      <div className="home-hero">
        <h1 className="home-title">
          <span className="home-icon">&#9822;</span>
          Chess Learning App
        </h1>
        <p className="home-subtitle">
          Master chess with interactive lessons, puzzles, and engine analysis
        </p>
        <Link to="/play">
          <Button variant="primary" size="large">
            Start Playing
          </Button>
        </Link>
      </div>

      <div className="features-grid">
        {features.map((feature) => (
          <Link
            key={feature.title}
            to={feature.link}
            className={`feature-card feature-${feature.color}`}
          >
            <span className="feature-icon">{feature.icon}</span>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </Link>
        ))}
      </div>

      <div className="home-stats">
        <div className="stat-item">
          <span className="stat-value">&#9812;</span>
          <span className="stat-label">Track Progress</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">&#9816;</span>
          <span className="stat-label">Learn Openings</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">&#9814;</span>
          <span className="stat-label">Engine Analysis</span>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
