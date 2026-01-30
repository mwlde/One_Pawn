import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Screens
import HomeScreen from './screens/HomeScreen';
import PreGameOptionsScreen from './screens/PreGameOptionsScreen';
import GameScreen from './screens/GameScreen';
import LearnOpeningsScreen from './screens/LearnOpeningsScreen';
import PastGamesScreen from './screens/PastGamesScreen';
import SettingsScreen from './screens/SettingsScreen';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/pregame" element={<PreGameOptionsScreen />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/openings" element={<LearnOpeningsScreen />} />
          <Route path="/history" element={<PastGamesScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
