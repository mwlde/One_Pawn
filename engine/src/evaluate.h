#pragma once

#include "board.h"

// Static evaluation: a number saying who stands better, with no search.
//
// "Static" is the important word. This function looks at one position and
// returns a verdict immediately. It never plays a move, never looks a ply
// ahead, and never asks whether the side to move is about to lose a queen. That
// is the search's job, and the division of labour is what makes both halves
// tractable: search explores, evaluation judges the leaves it stops at.
//
// The unit is the centipawn: one hundredth of a pawn, so a pawn is 100. Integer
// arithmetic throughout, with no floating point anywhere in the engine. A
// hundredth of a pawn is finer than any evaluation term needs, and integers
// compare exactly, which matters when a search rejects a line because one score
// is one point worse than another.
//
// This is the A3.1 version and it counts material only. It exists so that A3.2
// has something to call at leaf nodes. Piece-square tables, mobility, king
// safety and pawn structure are Stage A4, and the signature does not change
// when they arrive.

// Scores the position from the perspective of the side to move.
//
// Positive means the side to move is better off, whichever colour that is. So
// the same piece layout returns +320 with White to move and -320 with Black to
// move.
//
// This is the negamax convention, and it is not an arbitrary choice. Negamax
// searches both sides with one function by flipping the sign at every ply:
// what is good for me is exactly as bad for you. That identity only holds if
// the evaluation is relative to whoever is on move, so the convention has to
// start here, at the leaves.
//
// Terminal positions are not this function's concern. Checkmate and stalemate
// are properties of the move list, not of the material on the board, and a
// mated position evaluates as an ordinary one here. The search detects "no
// legal moves" and substitutes a mate or draw score before it would ever call
// this.
int evaluate(const Board& board);
