import { Chess } from 'chess.js';

/**
 * Validates if a FEN string is valid
 * @param {string} fen - The FEN string to validate
 * @returns {boolean}
 */
export function isValidFen(fen) {
  try {
    new Chess(fen);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Converts a move to SAN notation
 * @param {Chess} game - The chess.js game instance
 * @param {Object} move - Move object with from and to squares
 * @returns {string|null} - SAN notation or null if invalid
 */
export function moveToSan(game, move) {
  try {
    const gameCopy = new Chess(game.fen());
    const result = gameCopy.move(move);
    return result ? result.san : null;
  } catch (e) {
    return null;
  }
}

/**
 * Gets all legal moves for a position
 * @param {string} fen - The FEN position
 * @returns {Array} - Array of legal moves in verbose format
 */
export function getLegalMoves(fen) {
  try {
    const game = new Chess(fen);
    return game.moves({ verbose: true });
  } catch (e) {
    return [];
  }
}

/**
 * Checks if a square is light or dark
 * @param {string} square - Square notation (e.g., 'e4')
 * @returns {string} - 'light' or 'dark'
 */
export function getSquareColor(square) {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = parseInt(square[1]) - 1;
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Formats move history for display
 * @param {Array} history - Move history from chess.js
 * @returns {Array} - Formatted move pairs
 */
export function formatMoveHistory(history) {
  const moves = [];
  for (let i = 0; i < history.length; i += 2) {
    moves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i] || '',
      black: history[i + 1] || ''
    });
  }
  return moves;
}

/**
 * Gets the material count for both sides
 * @param {string} fen - The FEN position
 * @returns {Object} - Material counts for white and black
 */
export function getMaterialCount(fen) {
  const game = new Chess(fen);
  const board = game.board();

  const pieceValues = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
  };

  let white = 0;
  let black = 0;

  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        const value = pieceValues[square.type];
        if (square.color === 'w') {
          white += value;
        } else {
          black += value;
        }
      }
    });
  });

  return { white, black, advantage: white - black };
}

/**
 * Determines game phase based on material
 * @param {string} fen - The FEN position
 * @returns {string} - 'opening', 'middlegame', or 'endgame'
 */
export function getGamePhase(fen) {
  const material = getMaterialCount(fen);
  const totalMaterial = material.white + material.black;

  if (totalMaterial >= 60) return 'opening';
  if (totalMaterial >= 30) return 'middlegame';
  return 'endgame';
}

/**
 * Parses PGN and returns game info
 * @param {string} pgn - PGN string
 * @returns {Object|null} - Parsed game info or null
 */
export function parsePgn(pgn) {
  try {
    const game = new Chess();
    game.loadPgn(pgn);

    return {
      moves: game.history(),
      fen: game.fen(),
      headers: game.header(),
      result: game.header().Result || '*'
    };
  } catch (e) {
    return null;
  }
}
