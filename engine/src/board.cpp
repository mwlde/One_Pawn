#include "board.h"

#include <cctype>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>

// Piece encoding helpers.
//
// The arithmetic below leans on the layout fixed in board.h: White is 1-6 and
// Black is 7-12, both in PieceType order. Change that layout and these break,
// which is why the ordering is documented at the enum rather than here.

namespace {

constexpr int WHITE_PIECE_BASE = 1;
constexpr int BLACK_PIECE_BASE = 7;

// Everything in this anonymous namespace is private to this file. It is the
// C++ equivalent of a module-level function you simply do not export.

Piece charToPiece(char symbol) {
  switch (symbol) {
    case 'P': return Piece::WhitePawn;
    case 'N': return Piece::WhiteKnight;
    case 'B': return Piece::WhiteBishop;
    case 'R': return Piece::WhiteRook;
    case 'Q': return Piece::WhiteQueen;
    case 'K': return Piece::WhiteKing;
    case 'p': return Piece::BlackPawn;
    case 'n': return Piece::BlackKnight;
    case 'b': return Piece::BlackBishop;
    case 'r': return Piece::BlackRook;
    case 'q': return Piece::BlackQueen;
    case 'k': return Piece::BlackKing;
    default:
      throw std::invalid_argument(std::string("invalid FEN: unknown piece character '") +
                                  symbol + "' in the placement field");
  }
}

void parsePlacement(const std::string& field, Board& board) {
  int rank = 7;  // FEN lists rank 8 first
  int file = 0;

  for (char symbol : field) {
    if (symbol == '/') {
      if (file != 8) {
        throw std::invalid_argument("invalid FEN: rank " + std::to_string(rank + 1) +
                                    " describes " + std::to_string(file) +
                                    " squares, expected 8");
      }
      if (rank == 0) {
        throw std::invalid_argument("invalid FEN: placement field has more than 8 ranks");
      }
      --rank;
      file = 0;
    } else if (symbol >= '1' && symbol <= '8') {
      file += symbol - '0';
      if (file > 8) {
        throw std::invalid_argument("invalid FEN: rank " + std::to_string(rank + 1) +
                                    " overflows past the h-file");
      }
    } else {
      if (file >= 8) {
        throw std::invalid_argument("invalid FEN: rank " + std::to_string(rank + 1) +
                                    " overflows past the h-file");
      }
      board.squares[makeSquare(file, rank)] = charToPiece(symbol);
      ++file;
    }
  }

  if (file != 8) {
    throw std::invalid_argument("invalid FEN: rank 1 describes " + std::to_string(file) +
                                " squares, expected 8");
  }
  if (rank != 0) {
    throw std::invalid_argument("invalid FEN: placement field has " +
                                std::to_string(8 - rank) + " ranks, expected 8");
  }
}

Color parseSideToMove(const std::string& field) {
  if (field == "w") return Color::White;
  if (field == "b") return Color::Black;
  throw std::invalid_argument("invalid FEN: side to move must be 'w' or 'b', got '" + field + "'");
}

CastlingRights parseCastling(const std::string& field) {
  CastlingRights rights;
  if (field == "-") return rights;

  if (field.size() > 4) {
    throw std::invalid_argument("invalid FEN: castling field '" + field + "' is too long");
  }

  for (char symbol : field) {
    // Duplicates are rejected because "KK" means the FEN was generated wrong,
    // not that White may castle kingside twice.
    bool* flag = nullptr;
    switch (symbol) {
      case 'K': flag = &rights.whiteKingside; break;
      case 'Q': flag = &rights.whiteQueenside; break;
      case 'k': flag = &rights.blackKingside; break;
      case 'q': flag = &rights.blackQueenside; break;
      default:
        throw std::invalid_argument(std::string("invalid FEN: unknown castling character '") +
                                    symbol + "', expected some combination of KQkq or '-'");
    }
    if (*flag) {
      throw std::invalid_argument(std::string("invalid FEN: castling character '") + symbol +
                                  "' appears twice");
    }
    *flag = true;
  }
  return rights;
}

Square parseEnPassant(const std::string& field, Color sideToMove) {
  if (field == "-") return NO_SQUARE;

  if (field.size() != 2 || field[0] < 'a' || field[0] > 'h' || field[1] < '1' || field[1] > '8') {
    throw std::invalid_argument("invalid FEN: en passant target '" + field +
                                "' is not a square name or '-'");
  }

  const int file = field[0] - 'a';
  const int rank = field[1] - '1';

  // The target sits behind the pawn that has just double-moved, so its rank is
  // determined by whose turn it now is. A mismatch means the FEN is internally
  // inconsistent, which is worth catching early.
  const int expectedRank = (sideToMove == Color::White) ? 5 : 2;
  if (rank != expectedRank) {
    throw std::invalid_argument("invalid FEN: en passant target '" + field + "' must be on rank " +
                                std::to_string(expectedRank + 1) + " when " +
                                (sideToMove == Color::White ? "White" : "Black") + " is to move");
  }

  return makeSquare(file, rank);
}

int parseCounter(const std::string& field, const std::string& label, int minimum) {
  if (field.empty()) {
    throw std::invalid_argument("invalid FEN: " + label + " is empty");
  }
  for (char symbol : field) {
    if (symbol < '0' || symbol > '9') {
      throw std::invalid_argument("invalid FEN: " + label + " '" + field +
                                  "' is not a non-negative integer");
    }
  }

  int value = 0;
  try {
    value = std::stoi(field);
  } catch (const std::out_of_range&) {
    throw std::invalid_argument("invalid FEN: " + label + " '" + field + "' is out of range");
  }

  if (value < minimum) {
    throw std::invalid_argument("invalid FEN: " + label + " must be at least " +
                                std::to_string(minimum) + ", got " + field);
  }
  return value;
}

// ASCII rather than the Unicode chess glyphs. Those depend on the terminal
// font, occupy an ambiguous display width that breaks column alignment, and
// invert visually on dark backgrounds, so the white king often renders as a
// filled black shape. Letters also match FEN, which makes eyeballing a parse
// against the input string straightforward.
char pieceToChar(Piece piece) {
  if (isEmpty(piece)) return '.';
  // Indexed by PieceType, so this literal must stay in PieceType order.
  const char symbols[] = "PNBRQK";
  const char symbol = symbols[static_cast<int>(pieceType(piece))];
  return pieceColor(piece) == Color::White
             ? symbol
             : static_cast<char>(std::tolower(static_cast<unsigned char>(symbol)));
}

std::string castlingString(const CastlingRights& rights) {
  std::string text;
  if (rights.whiteKingside) text += 'K';
  if (rights.whiteQueenside) text += 'Q';
  if (rights.blackKingside) text += 'k';
  if (rights.blackQueenside) text += 'q';
  return text.empty() ? "-" : text;
}

}  // namespace

bool isEmpty(Piece piece) { return piece == Piece::Empty; }

Color pieceColor(Piece piece) {
  return static_cast<int>(piece) < BLACK_PIECE_BASE ? Color::White : Color::Black;
}

PieceType pieceType(Piece piece) {
  const int base = (pieceColor(piece) == Color::White) ? WHITE_PIECE_BASE : BLACK_PIECE_BASE;
  return static_cast<PieceType>(static_cast<int>(piece) - base);
}

Piece makePiece(Color color, PieceType type) {
  const int base = (color == Color::White) ? WHITE_PIECE_BASE : BLACK_PIECE_BASE;
  return static_cast<Piece>(base + static_cast<int>(type));
}

Square makeSquare(int file, int rank) { return rank * 8 + file; }

int fileOf(Square square) { return square % 8; }

int rankOf(Square square) { return square / 8; }

std::string squareName(Square square) {
  if (square == NO_SQUARE) return "-";
  return std::string(1, static_cast<char>('a' + fileOf(square))) +
         std::string(1, static_cast<char>('1' + rankOf(square)));
}

Board parseFen(const std::string& fen) {
  std::istringstream stream(fen);
  std::string placement, sideToMove, castling, enPassant, halfmove, fullmove;

  // operator>> on a stream splits on any whitespace and skips runs of it, so
  // this tolerates extra spaces between fields. It returns the stream, which
  // converts to false once a read fails, hence the chained test.
  if (!(stream >> placement >> sideToMove >> castling >> enPassant >> halfmove >> fullmove)) {
    throw std::invalid_argument(
        "invalid FEN: expected six space-separated fields "
        "(placement, side to move, castling, en passant, halfmove clock, fullmove number)");
  }

  std::string trailing;
  if (stream >> trailing) {
    throw std::invalid_argument("invalid FEN: unexpected extra field '" + trailing +
                                "' after the six FEN fields");
  }

  Board board;
  parsePlacement(placement, board);
  board.sideToMove = parseSideToMove(sideToMove);
  board.castling = parseCastling(castling);
  board.enPassantTarget = parseEnPassant(enPassant, board.sideToMove);
  board.halfmoveClock = parseCounter(halfmove, "halfmove clock", 0);
  board.fullmoveNumber = parseCounter(fullmove, "fullmove number", 1);

  return board;
}

void printBoard(const Board& board) {
  const std::string edge = "  +------------------------+";

  std::cout << edge << '\n';

  // Rank 8 at the top, counting down, which is how a board is drawn for the
  // side playing White. The array itself runs the other way.
  for (int rank = 7; rank >= 0; --rank) {
    std::cout << (rank + 1) << " |";
    for (int file = 0; file < 8; ++file) {
      std::cout << ' ' << pieceToChar(board.squares[makeSquare(file, rank)]) << ' ';
    }
    std::cout << "|\n";
  }

  std::cout << edge << '\n';
  std::cout << "    a  b  c  d  e  f  g  h\n\n";

  // std::left and std::setw pad the labels to a fixed width so the values line
  // up in a column. setw applies to the next item written only; std::left is
  // sticky and stays set on the stream.
  const int labelWidth = 18;
  std::cout << std::left;
  std::cout << std::setw(labelWidth) << "Side to move:"
            << (board.sideToMove == Color::White ? "White" : "Black") << '\n';
  std::cout << std::setw(labelWidth) << "Castling:" << castlingString(board.castling) << '\n';
  std::cout << std::setw(labelWidth) << "En passant:" << squareName(board.enPassantTarget) << '\n';
  std::cout << std::setw(labelWidth) << "Halfmove clock:" << board.halfmoveClock << '\n';
  std::cout << std::setw(labelWidth) << "Fullmove number:" << board.fullmoveNumber << '\n';
}
