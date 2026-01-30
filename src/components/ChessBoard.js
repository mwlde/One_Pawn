import React from 'react';
import { Chessboard } from 'react-chessboard';
import './ChessBoard.css';

function ChessBoard({
  position = 'start',
  onPieceDrop,
  boardOrientation = 'white',
  arePiecesDraggable = true,
  boardWidth,
  customSquareStyles = {},
  customArrows = [],
  showBoardNotation = true,
  ...props
}) {
  return (
    <div className="chessboard-wrapper">
      <Chessboard
        position={position}
        onPieceDrop={onPieceDrop}
        boardOrientation={boardOrientation}
        arePiecesDraggable={arePiecesDraggable}
        boardWidth={boardWidth}
        customSquareStyles={customSquareStyles}
        customArrows={customArrows}
        showBoardNotation={showBoardNotation}
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
        {...props}
      />
    </div>
  );
}

export default ChessBoard;
