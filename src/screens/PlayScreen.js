import React, { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, Button } from '../components';
import './PlayScreen.css';

function PlayScreen() {
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [moveHistory, setMoveHistory] = useState([]);

  const makeAMove = useCallback((move) => {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setMoveHistory(gameCopy.history({ verbose: true }));
        return result;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, [game]);

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? 'q',
    });
    return move !== null;
  }, [makeAMove]);

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setMoveHistory([]);
  }, []);

  const undoMove = useCallback(() => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    setMoveHistory(gameCopy.history({ verbose: true }));
  }, [game]);

  const flipBoard = useCallback(() => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  const gameStatus = useMemo(() => {
    if (game.isCheckmate()) {
      return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    }
    if (game.isDraw()) {
      if (game.isStalemate()) return 'Stalemate - Draw';
      if (game.isThreefoldRepetition()) return 'Threefold Repetition - Draw';
      if (game.isInsufficientMaterial()) return 'Insufficient Material - Draw';
      return 'Draw by 50-move rule';
    }
    if (game.isCheck()) {
      return `${game.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    }
    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  }, [game]);

  const formatMoves = useMemo(() => {
    const moves = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i]?.san || '';
      const blackMove = moveHistory[i + 1]?.san || '';
      moves.push({ moveNum, whiteMove, blackMove });
    }
    return moves;
  }, [moveHistory]);

  return (
    <div className="page play-screen">
      <div className="play-container">
        <div className="board-section">
          <ChessBoard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            boardWidth={Math.min(window.innerWidth - 48, 500)}
          />
        </div>

        <div className="game-panel">
          <div className="game-status">
            <h3>{gameStatus}</h3>
          </div>

          <div className="game-controls">
            <Button variant="secondary" onClick={undoMove} disabled={moveHistory.length === 0}>
              Undo
            </Button>
            <Button variant="secondary" onClick={flipBoard}>
              Flip Board
            </Button>
            <Button variant="danger" onClick={resetGame}>
              New Game
            </Button>
          </div>

          <div className="move-history-panel">
            <h4>Move History</h4>
            <div className="move-list">
              {formatMoves.length === 0 ? (
                <p className="no-moves">No moves yet</p>
              ) : (
                formatMoves.map(({ moveNum, whiteMove, blackMove }) => (
                  <div key={moveNum} className="move-row">
                    <span className="move-number">{moveNum}.</span>
                    <span className="move white-move">{whiteMove}</span>
                    <span className="move black-move">{blackMove}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayScreen;
