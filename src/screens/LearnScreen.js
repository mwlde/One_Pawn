import React, { useState } from 'react';
import { ChessBoard, Button } from '../components';
import './LearnScreen.css';

const lessons = [
  {
    id: 1,
    category: 'Openings',
    title: 'Italian Game',
    description: 'A classical opening starting with 1.e4 e5 2.Nf3 Nc6 3.Bc4',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    tips: [
      'Control the center with pawns',
      'Develop knights before bishops',
      'Castle early for king safety'
    ]
  },
  {
    id: 2,
    category: 'Openings',
    title: 'Sicilian Defense',
    description: 'The most popular response to 1.e4, fighting for the center asymmetrically',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    moves: ['e4', 'c5'],
    tips: [
      'Black fights for the d4 square',
      'Leads to sharp, tactical play',
      'Many variations to study'
    ]
  },
  {
    id: 3,
    category: 'Endgames',
    title: 'King and Pawn Endgame',
    description: 'Essential knowledge for converting advantages',
    fen: '8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',
    moves: [],
    tips: [
      'Opposition is key',
      'The rule of the square',
      'King activity is crucial'
    ]
  },
  {
    id: 4,
    category: 'Tactics',
    title: 'Pins and Skewers',
    description: 'Learn to use pieces to attack multiple targets on a line',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: [],
    tips: [
      'A pin restricts movement',
      'A skewer forces movement',
      'Look for alignments of pieces'
    ]
  }
];

const categories = ['All', 'Openings', 'Endgames', 'Tactics'];

function LearnScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLesson, setSelectedLesson] = useState(null);

  const filteredLessons = selectedCategory === 'All'
    ? lessons
    : lessons.filter(lesson => lesson.category === selectedCategory);

  return (
    <div className="page learn-screen">
      <div className="learn-header">
        <h1>Learn Chess</h1>
        <p className="learn-subtitle">Master openings, endgames, and tactical patterns</p>
      </div>

      {selectedLesson ? (
        <div className="lesson-view">
          <Button
            variant="ghost"
            onClick={() => setSelectedLesson(null)}
            className="back-button"
          >
            &larr; Back to Lessons
          </Button>

          <div className="lesson-content">
            <div className="lesson-board">
              <ChessBoard
                position={selectedLesson.fen}
                arePiecesDraggable={false}
                boardWidth={Math.min(window.innerWidth - 48, 400)}
              />
            </div>

            <div className="lesson-info">
              <span className="lesson-category-badge">{selectedLesson.category}</span>
              <h2>{selectedLesson.title}</h2>
              <p className="lesson-description">{selectedLesson.description}</p>

              {selectedLesson.moves.length > 0 && (
                <div className="lesson-moves">
                  <h4>Moves</h4>
                  <div className="moves-display">
                    {selectedLesson.moves.map((move, index) => (
                      <span key={index} className="move-badge">{move}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="lesson-tips">
                <h4>Key Points</h4>
                <ul>
                  {selectedLesson.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="lessons-grid">
            {filteredLessons.map(lesson => (
              <div
                key={lesson.id}
                className="lesson-card"
                onClick={() => setSelectedLesson(lesson)}
              >
                <span className="lesson-category">{lesson.category}</span>
                <h3 className="lesson-title">{lesson.title}</h3>
                <p className="lesson-excerpt">{lesson.description}</p>
                <span className="lesson-arrow">&rarr;</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LearnScreen;
