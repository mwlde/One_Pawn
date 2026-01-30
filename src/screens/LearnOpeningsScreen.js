import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import './LearnOpeningsScreen.css';

const openings = [
  {
    id: 'italian',
    name: 'Italian Game',
    eco: 'C50',
    description: 'A classic opening focusing on rapid development and control of the center.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    difficulty: 'Beginner'
  },
  {
    id: 'sicilian',
    name: 'Sicilian Defense',
    eco: 'B20',
    description: 'The most popular response to 1.e4, leading to complex and fighting positions.',
    moves: ['e4', 'c5'],
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    difficulty: 'Intermediate'
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    eco: 'D00',
    description: 'A strong opening offering a pawn to gain central control.',
    moves: ['d4', 'd5', 'c4'],
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    difficulty: 'Intermediate'
  },
  {
    id: 'french',
    name: 'French Defense',
    eco: 'C00',
    description: 'A solid defense that can lead to strategic and tactical battles.',
    moves: ['e4', 'e6'],
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    difficulty: 'Intermediate'
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C60',
    description: 'One of the oldest and most classic chess openings.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    difficulty: 'Advanced'
  },
  {
    id: 'kings-indian',
    name: "King's Indian Defense",
    eco: 'E60',
    description: 'An aggressive hypermodern defense leading to sharp play.',
    moves: ['d4', 'Nf6', 'c4', 'g6'],
    fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    difficulty: 'Advanced'
  }
];

function LearnOpeningsScreen() {
  const navigate = useNavigate();
  const [selectedOpening, setSelectedOpening] = useState(openings[0]);

  const handleBack = () => {
    navigate('/');
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'var(--accent-green)';
      case 'Intermediate': return 'var(--accent-gold)';
      case 'Advanced': return 'var(--accent-red)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="openings-screen">
      <div className="openings-content">
        {/* Header */}
        <header className="openings-header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>Learn Openings</h1>
          <p>Master the most popular chess openings</p>
        </header>

        <div className="openings-layout">
          {/* Opening List */}
          <div className="openings-list">
            {openings.map((opening) => (
              <button
                key={opening.id}
                className={`opening-card ${selectedOpening.id === opening.id ? 'selected' : ''}`}
                onClick={() => setSelectedOpening(opening)}
              >
                <div className="opening-card-header">
                  <span className="opening-name">{opening.name}</span>
                  <span className="opening-eco">{opening.eco}</span>
                </div>
                <span
                  className="opening-difficulty"
                  style={{ color: getDifficultyColor(opening.difficulty) }}
                >
                  {opening.difficulty}
                </span>
              </button>
            ))}
          </div>

          {/* Opening Details */}
          <div className="opening-details">
            <div className="opening-board">
              <Chessboard
                position={selectedOpening.fen}
                arePiecesDraggable={false}
                boardWidth={Math.min(window.innerWidth * 0.4, 400)}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
                customDarkSquareStyle={{
                  backgroundColor: '#b58863',
                }}
                customLightSquareStyle={{
                  backgroundColor: '#f0d9b5',
                }}
              />
            </div>

            <div className="opening-info">
              <h2>{selectedOpening.name}</h2>
              <p className="opening-description">{selectedOpening.description}</p>

              <div className="moves-section">
                <h3>Opening Moves</h3>
                <div className="moves-display">
                  {selectedOpening.moves.map((move, index) => (
                    <span key={index} className="move-badge">
                      {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'} {move}
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="practice-button"
                onClick={() => navigate('/game', {
                  state: { coachEnabled: true, difficulty: 10, playerColor: 'white' }
                })}
              >
                Practice This Opening
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearnOpeningsScreen;
