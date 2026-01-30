import React, { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, Button } from '../components';
import './AnalysisScreen.css';

function AnalysisScreen() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [evaluation, setEvaluation] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState('white');

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1]?.toLowerCase() ?? 'q',
      });
      if (move) {
        setGame(gameCopy);
        setFen(gameCopy.fen());
        setEvaluation(null);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game]);

  const loadFen = useCallback(() => {
    try {
      const newGame = new Chess(fen);
      setGame(newGame);
      setEvaluation(null);
    } catch (e) {
      alert('Invalid FEN position');
    }
  }, [fen]);

  const resetPosition = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setEvaluation(null);
  }, []);

  const analyzePosition = useCallback(() => {
    setIsAnalyzing(true);
    // Simulate analysis - in a real app, this would use Stockfish
    setTimeout(() => {
      const mockEval = (Math.random() * 4 - 2).toFixed(2);
      setEvaluation({
        score: mockEval,
        bestMove: 'e2e4',
        depth: 20,
        line: 'e4 e5 Nf3 Nc6 Bb5'
      });
      setIsAnalyzing(false);
    }, 1500);
  }, []);

  const flipBoard = useCallback(() => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  const undoMove = useCallback(() => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    setFen(gameCopy.fen());
    setEvaluation(null);
  }, [game]);

  return (
    <div className="page analysis-screen">
      <div className="analysis-header">
        <h1>Position Analysis</h1>
        <p className="analysis-subtitle">Analyze positions with Stockfish engine</p>
      </div>

      <div className="analysis-container">
        <div className="board-section">
          <ChessBoard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            boardWidth={Math.min(window.innerWidth - 48, 450)}
          />
        </div>

        <div className="analysis-panel">
          <div className="fen-input-section">
            <label htmlFor="fen-input">FEN Position</label>
            <input
              id="fen-input"
              type="text"
              value={fen}
              onChange={(e) => setFen(e.target.value)}
              placeholder="Enter FEN..."
              className="fen-input"
            />
            <div className="fen-buttons">
              <Button variant="secondary" size="small" onClick={loadFen}>
                Load FEN
              </Button>
              <Button variant="ghost" size="small" onClick={() => navigator.clipboard.writeText(fen)}>
                Copy
              </Button>
            </div>
          </div>

          <div className="analysis-controls">
            <Button variant="secondary" onClick={undoMove} disabled={game.history().length === 0}>
              Undo
            </Button>
            <Button variant="secondary" onClick={flipBoard}>
              Flip
            </Button>
            <Button variant="danger" onClick={resetPosition}>
              Reset
            </Button>
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={analyzePosition}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Position'}
          </Button>

          {evaluation && (
            <div className="evaluation-panel">
              <div className="eval-score">
                <span className="eval-label">Evaluation</span>
                <span className={`eval-value ${parseFloat(evaluation.score) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(evaluation.score) >= 0 ? '+' : ''}{evaluation.score}
                </span>
              </div>
              <div className="eval-details">
                <div className="eval-item">
                  <span className="eval-item-label">Best Move</span>
                  <span className="eval-item-value">{evaluation.bestMove}</span>
                </div>
                <div className="eval-item">
                  <span className="eval-item-label">Depth</span>
                  <span className="eval-item-value">{evaluation.depth}</span>
                </div>
                <div className="eval-item">
                  <span className="eval-item-label">Line</span>
                  <span className="eval-item-value mono">{evaluation.line}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalysisScreen;
