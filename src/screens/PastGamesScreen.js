import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PastGamesScreen.css';

// Sample past games data (in real app, this would come from localStorage or API)
const sampleGames = [
  {
    id: 1,
    date: '2024-01-15',
    opponent: 'Stockfish (Level 10)',
    result: 'win',
    playerColor: 'white',
    moves: 42,
    duration: '15:23',
    opening: 'Italian Game'
  },
  {
    id: 2,
    date: '2024-01-14',
    opponent: 'Stockfish (Level 12)',
    result: 'loss',
    playerColor: 'black',
    moves: 38,
    duration: '12:45',
    opening: 'Sicilian Defense'
  },
  {
    id: 3,
    date: '2024-01-13',
    opponent: 'Stockfish (Level 8)',
    result: 'draw',
    playerColor: 'white',
    moves: 56,
    duration: '22:10',
    opening: "Queen's Gambit"
  },
  {
    id: 4,
    date: '2024-01-12',
    opponent: 'Stockfish (Level 10)',
    result: 'win',
    playerColor: 'white',
    moves: 35,
    duration: '11:30',
    opening: 'Ruy Lopez'
  },
  {
    id: 5,
    date: '2024-01-11',
    opponent: 'Stockfish (Level 15)',
    result: 'loss',
    playerColor: 'black',
    moves: 28,
    duration: '09:15',
    opening: 'French Defense'
  }
];

function PastGamesScreen() {
  const navigate = useNavigate();
  const [games] = useState(sampleGames);
  const [filter, setFilter] = useState('all');

  const handleBack = () => {
    navigate('/');
  };

  const filteredGames = games.filter(game => {
    if (filter === 'all') return true;
    return game.result === filter;
  });

  const stats = {
    total: games.length,
    wins: games.filter(g => g.result === 'win').length,
    losses: games.filter(g => g.result === 'loss').length,
    draws: games.filter(g => g.result === 'draw').length
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'win': return '✓';
      case 'loss': return '✗';
      case 'draw': return '=';
      default: return '?';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="past-games-screen">
      <div className="past-games-content">
        {/* Header */}
        <header className="past-games-header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>Past Games</h1>
          <p>Review and analyze your game history</p>
        </header>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Games</span>
          </div>
          <div className="stat-card win">
            <span className="stat-value">{stats.wins}</span>
            <span className="stat-label">Wins</span>
          </div>
          <div className="stat-card loss">
            <span className="stat-value">{stats.losses}</span>
            <span className="stat-label">Losses</span>
          </div>
          <div className="stat-card draw">
            <span className="stat-value">{stats.draws}</span>
            <span className="stat-label">Draws</span>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-button ${filter === 'win' ? 'active' : ''}`}
            onClick={() => setFilter('win')}
          >
            Wins
          </button>
          <button
            className={`filter-button ${filter === 'loss' ? 'active' : ''}`}
            onClick={() => setFilter('loss')}
          >
            Losses
          </button>
          <button
            className={`filter-button ${filter === 'draw' ? 'active' : ''}`}
            onClick={() => setFilter('draw')}
          >
            Draws
          </button>
        </div>

        {/* Games List */}
        <div className="games-list">
          {filteredGames.length === 0 ? (
            <div className="no-games">
              <span className="no-games-icon">♟</span>
              <p>No games found</p>
            </div>
          ) : (
            filteredGames.map((game) => (
              <div key={game.id} className="game-card">
                <div className={`game-result result-${game.result}`}>
                  {getResultIcon(game.result)}
                </div>
                <div className="game-details">
                  <div className="game-main-info">
                    <span className="game-opponent">{game.opponent}</span>
                    <span className="game-opening">{game.opening}</span>
                  </div>
                  <div className="game-meta">
                    <span className="game-date">{formatDate(game.date)}</span>
                    <span className="game-color">
                      {game.playerColor === 'white' ? '♔' : '♚'} {game.playerColor}
                    </span>
                    <span className="game-moves">{game.moves} moves</span>
                    <span className="game-duration">{game.duration}</span>
                  </div>
                </div>
                <button className="analyze-button">
                  Analyze
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PastGamesScreen;
