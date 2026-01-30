import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './GameScreen.css';

function GameScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  // Game settings from navigation state
  const {
    difficulty = 10,
    coachEnabled = true,
    playerColor = 'white'
  } = location.state || {};

  // Game state
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'coach',
      text: `Welcome! I'm your chess coach. You're playing as ${playerColor}. ${playerColor === 'white' ? 'You make the first move!' : 'Wait for White to move first.'}`
    },
    {
      id: 2,
      type: 'coach',
      text: coachEnabled
        ? "I'll provide hints and analysis as we play. Feel free to ask me anything!"
        : "Coach guidance is disabled. Good luck!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check game status
  const checkGameStatus = useCallback((currentGame) => {
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === 'w' ? 'Black' : 'White';
      setGameStatus('checkmate');
      addCoachMessage(`Checkmate! ${winner} wins!`);
    } else if (currentGame.isDraw()) {
      setGameStatus('draw');
      addCoachMessage("It's a draw!");
    } else if (currentGame.isStalemate()) {
      setGameStatus('stalemate');
      addCoachMessage("Stalemate! The game is a draw.");
    } else if (currentGame.isCheck()) {
      addCoachMessage("Check!");
    }
  }, []);

  // Add coach message
  const addCoachMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'coach',
      text
    }]);
  };

  // Add user message
  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      text
    }]);
  };

  // Handle piece drop
  const onDrop = (sourceSquare, targetSquare) => {
    if (gameStatus !== 'playing') return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move === null) return false;

      // Update game state
      const newGame = new Chess(game.fen());
      setGame(newGame);

      // Update move history
      const moveNotation = move.san;
      setMoveHistory(prev => [...prev, moveNotation]);

      // Coach commentary on the move
      if (coachEnabled) {
        provideMoveAnalysis(move);
      }

      // Check game status
      checkGameStatus(newGame);

      return true;
    } catch (error) {
      return false;
    }
  };

  // Provide move analysis (simplified - in real app would use Stockfish)
  const provideMoveAnalysis = (move) => {
    const comments = [];

    if (move.captured) {
      comments.push(`Good capture! You took their ${getPieceName(move.captured)}.`);
    }

    if (move.san.includes('+')) {
      comments.push("Nice check!");
    }

    if (move.san === 'O-O' || move.san === 'O-O-O') {
      comments.push("Good idea to castle and protect your king!");
    }

    // Add a random helpful comment occasionally
    if (comments.length === 0 && Math.random() < 0.3) {
      const tips = [
        "Remember to control the center!",
        "Consider developing your pieces.",
        "Keep your king safe!",
        "Look for tactical opportunities.",
        "Think about your opponent's threats."
      ];
      comments.push(tips[Math.floor(Math.random() * tips.length)]);
    }

    comments.forEach(comment => {
      setTimeout(() => addCoachMessage(comment), 500);
    });
  };

  // Get piece name
  const getPieceName = (piece) => {
    const names = {
      p: 'pawn',
      n: 'knight',
      b: 'bishop',
      r: 'rook',
      q: 'queen',
      k: 'king'
    };
    return names[piece] || piece;
  };

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    addUserMessage(inputMessage);

    // Simulate coach response
    if (coachEnabled) {
      setTimeout(() => {
        const responses = [
          "That's a great question! Let me think about the position...",
          "Based on the current position, I'd recommend focusing on piece development.",
          "Consider controlling the center squares with your pawns.",
          "Look for any tactical opportunities like forks or pins!",
          "Your position looks solid. Keep playing strategically!",
          "Try to think about what your opponent wants to do next."
        ];
        addCoachMessage(responses[Math.floor(Math.random() * responses.length)]);
      }, 1000);
    }

    setInputMessage('');
  };

  // Format move history into pairs
  const getMoveHistoryPairs = () => {
    const pairs = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moveHistory[i],
        black: moveHistory[i + 1] || ''
      });
    }
    return pairs;
  };

  // Reset game
  const handleNewGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
    setGameStatus('playing');
    setMessages([{
      id: Date.now(),
      type: 'coach',
      text: "New game started! Good luck!"
    }]);
  };

  // Go back to home
  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="game-screen">
      {/* Left Side - Chess Board */}
      <div className="board-section">
        <div className="board-header">
          <button className="exit-button" onClick={handleExit}>
            ← Exit
          </button>
          <div className="game-info-header">
            <span className="difficulty-tag">Level {difficulty}</span>
            {coachEnabled && <span className="coach-tag">Coach ON</span>}
          </div>
        </div>

        <div className="board-container">
          <div className="board-wrapper">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={playerColor}
              boardWidth={Math.min(window.innerWidth * 0.55, 560)}
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
        </div>

        {/* Game Status */}
        {gameStatus !== 'playing' && (
          <div className="game-over-banner">
            <span className="game-over-text">
              {gameStatus === 'checkmate' && 'Checkmate!'}
              {gameStatus === 'draw' && 'Draw!'}
              {gameStatus === 'stalemate' && 'Stalemate!'}
            </span>
            <button className="new-game-button" onClick={handleNewGame}>
              New Game
            </button>
          </div>
        )}
      </div>

      {/* Right Side - Chat Interface */}
      <div className="chat-section">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="coach-avatar">♔</div>
          <div className="coach-info">
            <h3>Chess Coach</h3>
            <span className="coach-status">
              {coachEnabled ? 'Active' : 'Observing'}
            </span>
          </div>
        </div>

        {/* Move History */}
        <div className="move-history">
          <div className="move-history-header">Move History</div>
          <div className="move-list">
            {getMoveHistoryPairs().map((pair) => (
              <div key={pair.number} className="move-pair">
                <span className="move-number">{pair.number}.</span>
                <span className="move white-move">{pair.white}</span>
                <span className="move black-move">{pair.black}</span>
              </div>
            ))}
            {moveHistory.length === 0 && (
              <span className="no-moves">No moves yet</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.type === 'coach' ? 'coach-message' : 'user-message'}`}
            >
              {message.type === 'coach' && (
                <div className="message-avatar">♔</div>
              )}
              <div className="message-bubble">
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chat-input-container" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder={coachEnabled ? "Ask your coach..." : "Coach is disabled"}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!coachEnabled}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!coachEnabled || !inputMessage.trim()}
            className="send-button"
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}

export default GameScreen;
