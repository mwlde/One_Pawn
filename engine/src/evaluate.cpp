#include "evaluate.h"

#include <array>

namespace {

// Centipawn values, one named constant each, gathered into an array indexed by
// PieceType. The array order matches the enum's declaration order (Pawn,
// Knight, Bishop, Rook, Queen, King), so the cast below is a direct index
// rather than a six-branch switch. Reorder the array and that breaks silently,
// which is why the entries are named rather than written as bare numbers.
//
// These are the classic values, near enough universal across engines. The
// knight and bishop are not both 300: the bishop gets a token ten points so
// that a search with nothing else to separate them prefers keeping the bishop,
// which matches how the pieces actually perform in open positions. It is a
// crude stand-in for the bishop pair bonus that belongs in A4.
//
// The king is 0. Not because it is worthless, but because it is never absent:
// both sides always have exactly one, so any value at all cancels out of every
// legal position. Giving it a large number is a common trick in engines that
// detect mate by material, and this one does not: the search detects mate from
// an empty move list. A non-zero king would only be an invitation to overflow.
constexpr int PAWN_VALUE = 100;
constexpr int KNIGHT_VALUE = 320;
constexpr int BISHOP_VALUE = 330;
constexpr int ROOK_VALUE = 500;
constexpr int QUEEN_VALUE = 900;
constexpr int KING_VALUE = 0;

constexpr std::array<int, 6> PIECE_VALUES = {PAWN_VALUE, KNIGHT_VALUE, BISHOP_VALUE,
                                             ROOK_VALUE, QUEEN_VALUE,  KING_VALUE};

// Piece-square tables: a centipawn bonus for each piece type on each square.
//
// Source: Tomasz Michniewski's "Simplified Evaluation Function", as published
// on the Chess Programming Wiki:
// https://www.chessprogramming.org/Simplified_Evaluation_Function
// The values are copied unchanged.
//
// Material says whether a piece exists. These say where it would like to be.
// The two are added together, so a knight on e4 is worth 320 + 20 and a knight
// on a1 is worth 320 - 50. The bonuses are small next to material on purpose:
// the largest is 50, half a pawn, so no table ever talks the search into giving
// away real material for a nicer square. They decide between moves that
// material rates as equal, which in a quiet position is nearly all of them.
//
// **Layout.** Each table is written as a board seen from White's side, rank 8
// on the first line and rank 1 on the last, so it can be checked against the
// source by eye. That is the reverse of the engine's square numbering (a1 = 0),
// so the lookup converts. See pstValue.
//
// **One table per piece type, not per colour.** The tables describe White's
// pieces. A black piece reads the same table with its rank mirrored, so a black
// knight on c6 gets exactly what a white knight on c3 gets. Chess is symmetric
// under that flip, and keeping a single table means the two colours cannot
// drift apart when a value is tuned.
//
// Mirrored vertically, not rotated. The queen table is not left-right
// symmetric, and a rotation would send a black queen on d8 to White's e1 entry.
using PieceSquareTable = std::array<int, BOARD_SIZE>;

// Pushing central pawns is rewarded, most of all on rank 7 where promotion is a
// move away. The -20 on d2 and e2 is the "stop sitting there" nudge that makes
// 1.e4 and 1.d4 attractive. The small bonuses on f2, g2 and h2 keep the pawns
// in front of a castled king at home.
constexpr PieceSquareTable PAWN_TABLE = {
    0,  0,  0,   0,   0,   0,  0,  0,   //
    50, 50, 50,  50,  50,  50, 50, 50,  //
    10, 10, 20,  30,  30,  20, 10, 10,  //
    5,  5,  10,  25,  25,  10, 5,  5,   //
    0,  0,  0,   20,  20,  0,  0,  0,   //
    5,  -5, -10, 0,   0,   -10, -5, 5,  //
    5,  10, 10,  -20, -20, 10, 10, 5,   //
    0,  0,  0,   0,   0,   0,  0,  0,   //
};

// The strongest opinion of the six. A knight's reach shrinks from eight squares
// in the centre to two in a corner, and this table is that fact as numbers.
// This is the one that breaks the a7-a6 habit: Ng8-f6 is worth +40 on its own,
// and a6 is worth nothing.
constexpr PieceSquareTable KNIGHT_TABLE = {
    -50, -40, -30, -30, -30, -30, -40, -50,  //
    -40, -20, 0,   0,   0,   0,   -20, -40,  //
    -30, 0,   10,  15,  15,  10,  0,   -30,  //
    -30, 5,   15,  20,  20,  15,  5,   -30,  //
    -30, 0,   15,  20,  20,  15,  0,   -30,  //
    -30, 5,   10,  15,  15,  10,  5,   -30,  //
    -40, -20, 0,   5,   5,   0,   -20, -40,  //
    -50, -40, -30, -30, -30, -30, -40, -50,  //
};

// Mild. Edges and corners are penalised, the centre and the squares that open
// the long diagonals (b2, g2, and the rank 3 squares in front of them) are
// preferred. A bishop's value comes from open lines, which a table cannot see.
constexpr PieceSquareTable BISHOP_TABLE = {
    -20, -10, -10, -10, -10, -10, -10, -20,  //
    -10, 0,   0,   0,   0,   0,   0,   -10,  //
    -10, 0,   5,   10,  10,  5,   0,   -10,  //
    -10, 5,   5,   10,  10,  5,   5,   -10,  //
    -10, 0,   10,  10,  10,  10,  0,   -10,  //
    -10, 10,  10,  10,  10,  10,  10,  -10,  //
    -10, 5,   0,   0,   0,   0,   5,   -10,  //
    -20, -10, -10, -10, -10, -10, -10, -20,  //
};

// Almost flat. Two ideas only: the seventh rank is good, and d1 or e1 is a
// slightly better home than the corner, which is where castling puts a rook.
// The table cannot reward open files, because an open file is a fact about the
// pawns, not about the rook's square. That would be a separate term.
constexpr PieceSquareTable ROOK_TABLE = {
    0,  0,  0,  0,  0,  0,  0,  0,   //
    5,  10, 10, 10, 10, 10, 10, 5,   //
    -5, 0,  0,  0,  0,  0,  0,  -5,  //
    -5, 0,  0,  0,  0,  0,  0,  -5,  //
    -5, 0,  0,  0,  0,  0,  0,  -5,  //
    -5, 0,  0,  0,  0,  0,  0,  -5,  //
    -5, 0,  0,  0,  0,  0,  0,  -5,  //
    0,  0,  0,  5,  5,  0,  0,  0,   //
};

// Weak on purpose. The queen reaches most of the board from most squares, so
// where she stands matters less than for any other piece. The corners are the
// only real penalty.
constexpr PieceSquareTable QUEEN_TABLE = {
    -20, -10, -10, -5, -5, -10, -10, -20,  //
    -10, 0,   0,   0,  0,  0,   0,   -10,  //
    -10, 0,   5,   5,  5,  5,   0,   -10,  //
    -5,  0,   5,   5,  5,  5,   0,   -5,   //
    0,   0,   5,   5,  5,  5,   0,   -5,   //
    -10, 5,   5,   5,  5,  5,   0,   -10,  //
    -10, 0,   5,   0,  0,  0,   0,   -10,  //
    -20, -10, -10, -5, -5, -10, -10, -20,  //
};

// The king gets two tables, because what a king should do reverses as the
// board empties.
//
// With queens and pieces about, the king is a target. g1 and b1 score highest,
// the squares castling leads to, and every step up the board costs more.
constexpr PieceSquareTable KING_MIDDLEGAME_TABLE = {
    -30, -40, -40, -50, -50, -40, -40, -30,  //
    -30, -40, -40, -50, -50, -40, -40, -30,  //
    -30, -40, -40, -50, -50, -40, -40, -30,  //
    -30, -40, -40, -50, -50, -40, -40, -30,  //
    -20, -30, -30, -40, -40, -30, -30, -20,  //
    -10, -20, -20, -20, -20, -20, -20, -10,  //
    20,  20,  0,   0,   0,   0,   20,  20,   //
    20,  30,  10,  0,   0,   10,  30,  20,   //
};

// With little material left, the king is a strong piece that must come out and
// fight. The centre is worth up to +40, the corners -50.
//
// This table does two jobs in a won ending, and the second matters more. It
// brings the winning king forward to help. It also scores the losing king
// badly whenever it is pushed to the edge, and from the winner's side of the
// negamax sign flip, a worse score for the defender is a better one for the
// attacker. So "drive the king to the edge" becomes something the search can
// measure and head towards, rather than something it has to find as a forced
// mate beyond its horizon.
constexpr PieceSquareTable KING_ENDGAME_TABLE = {
    -50, -40, -30, -20, -20, -30, -40, -50,  //
    -30, -20, -10, 0,   0,   -10, -20, -30,  //
    -30, -10, 20,  30,  30,  20,  -10, -30,  //
    -30, -10, 30,  40,  40,  30,  -10, -30,  //
    -30, -10, 30,  40,  40,  30,  -10, -30,  //
    -30, -10, 20,  30,  30,  20,  -10, -30,  //
    -30, -30, 0,   0,   0,   0,   -30, -30,  //
    -50, -30, -30, -30, -30, -30, -30, -50,  //
};

// Indexed by PieceType, like PIECE_VALUES. The king slot is filled only so the
// index lines up: evaluate scores kings separately, after it knows the phase.
constexpr std::array<const PieceSquareTable*, 6> PIECE_SQUARE_TABLES = {
    &PAWN_TABLE, &KNIGHT_TABLE, &BISHOP_TABLE, &ROOK_TABLE, &QUEEN_TABLE, &KING_MIDDLEGAME_TABLE};

// The bonus for a piece of `color` on `square`.
//
// Two separate flips happen here, and they are easy to confuse:
//
//   1. The black mirror. A black piece on rank r is treated as a white piece on
//      rank 7 - r. This is the chess idea: "my second rank" means rank 2 for
//      White and rank 7 for Black.
//   2. The layout flip. The tables are written rank 8 first, so row 0 of the
//      array is rank 8. This is only about how the source file is typed.
//
// For a white piece the two do not cancel: only the layout flip applies. For a
// black piece both apply and do cancel, so a black piece reads the array at its
// own square index. Spelling both out is clearer than relying on that.
int pstValue(const PieceSquareTable& table, Square square, Color color) {
  const int relativeRank = (color == Color::White) ? rankOf(square) : 7 - rankOf(square);
  const int row = 7 - relativeRank;
  return table[row * 8 + fileOf(square)];
}

// Pieces other than pawns and the king, counted per side for the phase test.
struct PhaseMaterial {
  int queens = 0;
  int rooks = 0;
  int minors = 0;
};

// Whether a side's material is light enough for its opponent's king to come out.
//
// The rule is the one from the same Chess Programming Wiki page as the tables:
// a side has no queen, or has a queen and at most one minor piece besides.
//
// "Neither side has a queen" is the simpler rule, and it gets the most
// important ending wrong. King and queen against king still has a queen, so it
// would use the middlegame table, where a lone king on its back rank scores
// well. The defender would be rewarded for going to the edge and the attacker's
// king would stay at home. That is the exact failure this change exists to fix.
bool isLightMaterial(const PhaseMaterial& material) {
  if (material.queens == 0) return true;
  return material.queens == 1 && material.rooks == 0 && material.minors <= 1;
}

}  // namespace

int evaluate(const Board& board) {
  // Accumulated from White's point of view first, because "White minus Black"
  // is the easier thing to reason about and to hand-check against a board. The
  // flip to side-to-move perspective happens once, at the end.
  int score = 0;

  // The kings are scored after the loop, because which table they use depends
  // on the rest of the material, and that is not known until every square has
  // been seen. One pass over the board plus two lookups is cheaper than a
  // separate pass just to decide the phase, and evaluate runs at every leaf.
  std::array<PhaseMaterial, 2> material{};
  std::array<Square, 2> kingSquares = {NO_SQUARE, NO_SQUARE};

  for (Square square = 0; square < BOARD_SIZE; ++square) {
    const Piece piece = board.squares[square];
    if (isEmpty(piece)) continue;  // pieceType is undefined on Piece::Empty

    const Color color = pieceColor(piece);
    const PieceType type = pieceType(piece);
    const int side = static_cast<int>(color);

    switch (type) {
      case PieceType::King:
        kingSquares[side] = square;
        continue;
      case PieceType::Queen:
        ++material[side].queens;
        break;
      case PieceType::Rook:
        ++material[side].rooks;
        break;
      case PieceType::Knight:
      case PieceType::Bishop:
        ++material[side].minors;
        break;
      case PieceType::Pawn:
        break;
    }

    const int typeIndex = static_cast<int>(type);
    const int value =
        PIECE_VALUES[typeIndex] + pstValue(*PIECE_SQUARE_TABLES[typeIndex], square, color);
    score += (color == Color::White) ? value : -value;
  }

  // A hard switch between the two king tables, not a blend. When the last
  // qualifying piece comes off, both kings' scores jump at once. Engines that
  // care interpolate between the tables by how much material remains ("tapered
  // evaluation"). That is a refinement for later, not part of the tables.
  const bool endgame = isLightMaterial(material[0]) && isLightMaterial(material[1]);
  const PieceSquareTable& kingTable = endgame ? KING_ENDGAME_TABLE : KING_MIDDLEGAME_TABLE;

  // Guarded because the FEN parser does not require a king, and a test position
  // without one should score its other pieces rather than index with NO_SQUARE.
  if (kingSquares[0] != NO_SQUARE) score += pstValue(kingTable, kingSquares[0], Color::White);
  if (kingSquares[1] != NO_SQUARE) score -= pstValue(kingTable, kingSquares[1], Color::Black);

  return (board.sideToMove == Color::White) ? score : -score;
}
