import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PreGameOptionsScreen.css';

function PreGameOptionsScreen() {
  const navigate = useNavigate();

  const [difficulty, setDifficulty] = useState(10);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [playerColor, setPlayerColor] = useState('white');

  const getDifficultyLabel = (level) => {
    if (level <= 5) return 'Beginner';
    if (level <= 10) return 'Intermediate';
    if (level <= 15) return 'Advanced';
    return 'Expert';
  };

  const getDifficultyDescription = (level) => {
    if (level <= 5) return 'Perfect for learning the basics';
    if (level <= 10) return 'A balanced challenge';
    if (level <= 15) return 'Requires strong tactical skills';
    return 'Grandmaster level play';
  };

  const handleStartGame = () => {
    const finalColor = playerColor === 'random'
      ? (Math.random() < 0.5 ? 'white' : 'black')
      : playerColor;

    navigate('/game', {
      state: {
        difficulty,
        coachEnabled,
        playerColor: finalColor
      }
    });
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="pregame-screen">
      <div className="pregame-content">
        {/* Header */}
        <header className="pregame-header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>Game Setup</h1>
          <p>Configure your practice game settings</p>
        </header>

        {/* Settings */}
        <div className="settings-container">
          {/* Difficulty Slider */}
          <div className="setting-card">
            <div className="setting-header">
              <span className="setting-icon">🎯</span>
              <div className="setting-title-group">
                <h2>Stockfish Difficulty</h2>
                <span className="difficulty-badge">{getDifficultyLabel(difficulty)}</span>
              </div>
            </div>
            <p className="setting-description">{getDifficultyDescription(difficulty)}</p>
            <div className="slider-container">
              <input
                type="range"
                min="1"
                max="20"
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="difficulty-slider"
              />
              <div className="slider-labels">
                <span>1</span>
                <span className="slider-value">{difficulty}</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Coach Guidance Toggle */}
          <div className="setting-card">
            <div className="setting-header">
              <span className="setting-icon">🎓</span>
              <div className="setting-title-group">
                <h2>Coach Guidance</h2>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={coachEnabled}
                  onChange={(e) => setCoachEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="setting-description">
              {coachEnabled
                ? 'Get real-time hints, move explanations, and strategic advice during the game'
                : 'Play independently without coaching assistance'}
            </p>
          </div>

          {/* Color Selection */}
          <div className="setting-card">
            <div className="setting-header">
              <span className="setting-icon">♔</span>
              <div className="setting-title-group">
                <h2>Play As</h2>
              </div>
            </div>
            <div className="color-options">
              <button
                className={`color-option ${playerColor === 'white' ? 'selected' : ''}`}
                onClick={() => setPlayerColor('white')}
              >
                <div className="color-piece white-piece">♔</div>
                <span>White</span>
                <span className="color-hint">Move first</span>
              </button>
              <button
                className={`color-option ${playerColor === 'black' ? 'selected' : ''}`}
                onClick={() => setPlayerColor('black')}
              >
                <div className="color-piece black-piece">♚</div>
                <span>Black</span>
                <span className="color-hint">Move second</span>
              </button>
              <button
                className={`color-option ${playerColor === 'random' ? 'selected' : ''}`}
                onClick={() => setPlayerColor('random')}
              >
                <div className="color-piece random-piece">?</div>
                <span>Random</span>
                <span className="color-hint">Surprise me</span>
              </button>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button className="start-game-button" onClick={handleStartGame}>
          <span className="button-icon">♟</span>
          Start Game
        </button>
      </div>
    </div>
  );
}

export default PreGameOptionsScreen;
