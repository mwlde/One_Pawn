import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Screens
import HomeScreen from './screens/HomeScreen';
import PlayScreen from './screens/PlayScreen';
import PuzzlesScreen from './screens/PuzzlesScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import LearnScreen from './screens/LearnScreen';
import SettingsScreen from './screens/SettingsScreen';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/play" element={<PlayScreen />} />
            <Route path="/puzzles" element={<PuzzlesScreen />} />
            <Route path="/analysis" element={<AnalysisScreen />} />
            <Route path="/learn" element={<LearnScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
