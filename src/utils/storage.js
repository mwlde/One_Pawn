/**
 * Local Storage Utilities
 * Handles persistent storage for the chess app
 */

const STORAGE_KEYS = {
  SETTINGS: 'chess_settings',
  GAME_HISTORY: 'chess_game_history',
  PUZZLES_PROGRESS: 'chess_puzzles_progress',
  USER_STATS: 'chess_user_stats'
};

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving to storage:', e);
    return false;
  }
}

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any}
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error loading from storage:', e);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('Error removing from storage:', e);
    return false;
  }
}

/**
 * Clear all chess app data from localStorage
 */
export function clearAllStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Settings Management
export const settings = {
  get: () => loadFromStorage(STORAGE_KEYS.SETTINGS, {
    boardTheme: 'classic',
    pieceSet: 'standard',
    showCoordinates: true,
    soundEnabled: true,
    autoQueen: true,
    highlightMoves: true,
    engineDepth: 20,
    animationSpeed: 'normal'
  }),

  save: (newSettings) => saveToStorage(STORAGE_KEYS.SETTINGS, newSettings),

  update: (updates) => {
    const current = settings.get();
    return settings.save({ ...current, ...updates });
  }
};

// Game History Management
export const gameHistory = {
  get: () => loadFromStorage(STORAGE_KEYS.GAME_HISTORY, []),

  add: (game) => {
    const history = gameHistory.get();
    history.unshift({
      ...game,
      id: Date.now(),
      date: new Date().toISOString()
    });
    // Keep only last 50 games
    return saveToStorage(STORAGE_KEYS.GAME_HISTORY, history.slice(0, 50));
  },

  remove: (gameId) => {
    const history = gameHistory.get();
    const filtered = history.filter(g => g.id !== gameId);
    return saveToStorage(STORAGE_KEYS.GAME_HISTORY, filtered);
  },

  clear: () => saveToStorage(STORAGE_KEYS.GAME_HISTORY, [])
};

// Puzzles Progress Management
export const puzzlesProgress = {
  get: () => loadFromStorage(STORAGE_KEYS.PUZZLES_PROGRESS, {
    solved: [],
    failed: [],
    currentStreak: 0,
    bestStreak: 0,
    totalAttempts: 0
  }),

  markSolved: (puzzleId) => {
    const progress = puzzlesProgress.get();
    if (!progress.solved.includes(puzzleId)) {
      progress.solved.push(puzzleId);
      progress.currentStreak++;
      progress.bestStreak = Math.max(progress.bestStreak, progress.currentStreak);
    }
    progress.totalAttempts++;
    return saveToStorage(STORAGE_KEYS.PUZZLES_PROGRESS, progress);
  },

  markFailed: (puzzleId) => {
    const progress = puzzlesProgress.get();
    if (!progress.failed.includes(puzzleId)) {
      progress.failed.push(puzzleId);
    }
    progress.currentStreak = 0;
    progress.totalAttempts++;
    return saveToStorage(STORAGE_KEYS.PUZZLES_PROGRESS, progress);
  },

  reset: () => saveToStorage(STORAGE_KEYS.PUZZLES_PROGRESS, {
    solved: [],
    failed: [],
    currentStreak: 0,
    bestStreak: 0,
    totalAttempts: 0
  })
};

// User Stats Management
export const userStats = {
  get: () => loadFromStorage(STORAGE_KEYS.USER_STATS, {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDraw: 0,
    puzzlesSolved: 0,
    totalPlayTime: 0
  }),

  update: (updates) => {
    const current = userStats.get();
    return saveToStorage(STORAGE_KEYS.USER_STATS, { ...current, ...updates });
  },

  incrementGamesPlayed: (result) => {
    const stats = userStats.get();
    stats.gamesPlayed++;
    if (result === 'win') stats.gamesWon++;
    else if (result === 'loss') stats.gamesLost++;
    else if (result === 'draw') stats.gamesDraw++;
    return saveToStorage(STORAGE_KEYS.USER_STATS, stats);
  }
};

export { STORAGE_KEYS };
