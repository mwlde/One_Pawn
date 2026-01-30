import React, { useState } from 'react';
import { ChessBoard, Button } from '../components';
import './PuzzlesScreen.css';

const samplePuzzles = [
  {
    id: 1,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['Qxf7'],
    theme: 'Scholar\'s Mate',
    difficulty: 'Beginner'
  },
  {
    id: 2,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['Ng5', 'd5', 'exd5'],
    theme: 'Fried Liver Attack Setup',
    difficulty: 'Intermediate'
  },
  {
    id: 3,
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['Re8'],
    theme: 'Back Rank Mate',
    difficulty: 'Beginner'
  }
];

function PuzzlesScreen() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentPuzzle = samplePuzzles[currentPuzzleIndex];

  const nextPuzzle = () => {
    setCurrentPuzzleIndex((prev) => (prev + 1) % samplePuzzles.length);
    setSolved(false);
    setShowHint(false);
  };

  const prevPuzzle = () => {
    setCurrentPuzzleIndex((prev) => (prev - 1 + samplePuzzles.length) % samplePuzzles.length);
    setSolved(false);
    setShowHint(false);
  };

  const handlePieceDrop = (source, target) => {
    const solution = currentPuzzle.solution[0];

    // Simple check - in a real app you'd validate the full move using source + target
    if (solution.toLowerCase().includes(target.toLowerCase()) || `${source}${target}` === solution.toLowerCase()) {
      setSolved(true);
      return true;
    }
    return false;
  };

  return (
    <div className="page puzzles-screen">
      <div className="puzzles-header">
        <h1>Chess Puzzles</h1>
        <p className="puzzles-subtitle">Solve tactical puzzles to improve your game</p>
      </div>

      <div className="puzzle-container">
        <div className="board-section">
          <ChessBoard
            position={currentPuzzle.fen}
            onPieceDrop={handlePieceDrop}
            boardWidth={Math.min(window.innerWidth - 48, 450)}
            arePiecesDraggable={!solved}
          />
        </div>

        <div className="puzzle-info">
          <div className="puzzle-meta">
            <span className="puzzle-number">Puzzle #{currentPuzzle.id}</span>
            <span className={`puzzle-difficulty difficulty-${currentPuzzle.difficulty.toLowerCase()}`}>
              {currentPuzzle.difficulty}
            </span>
          </div>

          <div className="puzzle-theme">
            <h3>Theme</h3>
            <p>{currentPuzzle.theme}</p>
          </div>

          {solved && (
            <div className="puzzle-solved">
              Correct! Well done!
            </div>
          )}

          {showHint && !solved && (
            <div className="puzzle-hint">
              <h4>Hint</h4>
              <p>Look for: {currentPuzzle.solution[0]}</p>
            </div>
          )}

          <div className="puzzle-controls">
            <Button variant="secondary" onClick={prevPuzzle}>
              Previous
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowHint(true)}
              disabled={showHint || solved}
            >
              Hint
            </Button>
            <Button variant="primary" onClick={nextPuzzle}>
              Next
            </Button>
          </div>

          <div className="puzzle-progress">
            <span>{currentPuzzleIndex + 1} / {samplePuzzles.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PuzzlesScreen;
