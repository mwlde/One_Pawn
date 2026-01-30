import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsScreen.css';

function SettingsScreen() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    boardTheme: 'classic',
    pieceSet: 'standard',
    showCoordinates: true,
    soundEnabled: true,
    autoQueen: true,
    highlightMoves: true,
    engineDepth: 20,
    animationSpeed: 'normal'
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    localStorage.setItem('chessSettings', JSON.stringify(settings));
    // Show a brief success message
    const btn = document.querySelector('.save-button');
    btn.textContent = 'Saved!';
    setTimeout(() => {
      btn.textContent = 'Save Settings';
    }, 2000);
  };

  const handleReset = () => {
    const defaultSettings = {
      boardTheme: 'classic',
      pieceSet: 'standard',
      showCoordinates: true,
      soundEnabled: true,
      autoQueen: true,
      highlightMoves: true,
      engineDepth: 20,
      animationSpeed: 'normal'
    };
    setSettings(defaultSettings);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="settings-screen">
      <div className="settings-content">
        {/* Header */}
        <header className="settings-header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>Settings</h1>
          <p>Customize your chess experience</p>
        </header>

        <div className="settings-container">
          {/* Board Appearance */}
          <section className="settings-section">
            <h2 className="section-title">
              <span className="section-icon">♜</span>
              Board Appearance
            </h2>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="boardTheme">Board Theme</label>
                <span className="setting-description">Choose your preferred board colors</span>
              </div>
              <select
                id="boardTheme"
                value={settings.boardTheme}
                onChange={(e) => handleChange('boardTheme', e.target.value)}
                className="setting-select"
              >
                <option value="classic">Classic</option>
                <option value="wood">Wood</option>
                <option value="marble">Marble</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="pieceSet">Piece Set</label>
                <span className="setting-description">Select piece style</span>
              </div>
              <select
                id="pieceSet"
                value={settings.pieceSet}
                onChange={(e) => handleChange('pieceSet', e.target.value)}
                className="setting-select"
              >
                <option value="standard">Standard</option>
                <option value="neo">Neo</option>
                <option value="classic">Classic</option>
                <option value="alpha">Alpha</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="showCoordinates">Show Coordinates</label>
                <span className="setting-description">Display rank and file labels</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="showCoordinates"
                  checked={settings.showCoordinates}
                  onChange={(e) => handleChange('showCoordinates', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </section>

          {/* Gameplay */}
          <section className="settings-section">
            <h2 className="section-title">
              <span className="section-icon">♞</span>
              Gameplay
            </h2>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="soundEnabled">Sound Effects</label>
                <span className="setting-description">Play sounds for moves and captures</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="soundEnabled"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="autoQueen">Auto-Queen</label>
                <span className="setting-description">Automatically promote pawns to queens</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="autoQueen"
                  checked={settings.autoQueen}
                  onChange={(e) => handleChange('autoQueen', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="highlightMoves">Highlight Legal Moves</label>
                <span className="setting-description">Show dots on valid squares</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="highlightMoves"
                  checked={settings.highlightMoves}
                  onChange={(e) => handleChange('highlightMoves', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="animationSpeed">Animation Speed</label>
                <span className="setting-description">Speed of piece movements</span>
              </div>
              <select
                id="animationSpeed"
                value={settings.animationSpeed}
                onChange={(e) => handleChange('animationSpeed', e.target.value)}
                className="setting-select"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
                <option value="instant">Instant</option>
              </select>
            </div>
          </section>

          {/* Analysis Engine */}
          <section className="settings-section">
            <h2 className="section-title">
              <span className="section-icon">♛</span>
              Analysis Engine
            </h2>

            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="engineDepth">Engine Depth</label>
                <span className="setting-description">Higher depth = stronger but slower analysis</span>
              </div>
              <div className="range-input">
                <input
                  type="range"
                  id="engineDepth"
                  min="10"
                  max="30"
                  value={settings.engineDepth}
                  onChange={(e) => handleChange('engineDepth', parseInt(e.target.value))}
                />
                <span className="range-value">{settings.engineDepth}</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="settings-actions">
            <button className="reset-button" onClick={handleReset}>
              Reset to Defaults
            </button>
            <button className="save-button" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
