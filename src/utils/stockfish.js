/**
 * Stockfish Engine Wrapper
 * Provides an interface to communicate with Stockfish WebAssembly
 */

class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.onMessage = null;
    this.onReady = null;
    this.currentAnalysis = null;
  }

  /**
   * Initialize the Stockfish engine
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Try to load Stockfish from node_modules
        this.worker = new Worker(
          new URL('stockfish/src/stockfish-nnue-16-single.js', import.meta.url)
        );

        this.worker.onmessage = (event) => {
          const message = event.data;

          if (message === 'uciok') {
            this.isReady = true;
            this.send('isready');
          }

          if (message === 'readyok') {
            if (this.onReady) {
              this.onReady();
            }
            resolve();
          }

          if (this.onMessage) {
            this.onMessage(message);
          }

          // Parse analysis info
          if (message.startsWith('info') && this.currentAnalysis) {
            const analysis = this.parseInfo(message);
            if (analysis) {
              this.currentAnalysis(analysis);
            }
          }

          // Parse best move
          if (message.startsWith('bestmove') && this.currentAnalysis) {
            const parts = message.split(' ');
            this.currentAnalysis({
              type: 'bestmove',
              move: parts[1],
              ponder: parts[3] || null
            });
          }
        };

        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          reject(error);
        };

        // Start UCI protocol
        this.send('uci');
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
        reject(error);
      }
    });
  }

  /**
   * Send a command to the engine
   * @param {string} command - UCI command
   */
  send(command) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  /**
   * Set engine options
   * @param {string} name - Option name
   * @param {string|number} value - Option value
   */
  setOption(name, value) {
    this.send(`setoption name ${name} value ${value}`);
  }

  /**
   * Analyze a position
   * @param {string} fen - FEN string of position
   * @param {Object} options - Analysis options
   * @param {Function} callback - Callback for analysis updates
   */
  analyze(fen, options = {}, callback) {
    const { depth = 20, movetime, nodes } = options;

    this.currentAnalysis = callback;

    this.send('stop');
    this.send(`position fen ${fen}`);

    let goCommand = 'go';
    if (depth) goCommand += ` depth ${depth}`;
    if (movetime) goCommand += ` movetime ${movetime}`;
    if (nodes) goCommand += ` nodes ${nodes}`;

    this.send(goCommand);
  }

  /**
   * Stop current analysis
   */
  stop() {
    this.send('stop');
    this.currentAnalysis = null;
  }

  /**
   * Get the best move for a position
   * @param {string} fen - FEN string
   * @param {number} depth - Search depth
   * @returns {Promise<string>} - Best move in UCI format
   */
  getBestMove(fen, depth = 15) {
    return new Promise((resolve) => {
      this.analyze(fen, { depth }, (analysis) => {
        if (analysis.type === 'bestmove') {
          resolve(analysis.move);
        }
      });
    });
  }

  /**
   * Parse UCI info string
   * @param {string} info - Info string from engine
   * @returns {Object|null} - Parsed analysis data
   */
  parseInfo(info) {
    const result = { type: 'info' };

    // Parse depth
    const depthMatch = info.match(/depth (\d+)/);
    if (depthMatch) result.depth = parseInt(depthMatch[1]);

    // Parse score
    const cpMatch = info.match(/score cp (-?\d+)/);
    if (cpMatch) {
      result.score = parseInt(cpMatch[1]) / 100;
      result.scoreType = 'cp';
    }

    const mateMatch = info.match(/score mate (-?\d+)/);
    if (mateMatch) {
      result.score = parseInt(mateMatch[1]);
      result.scoreType = 'mate';
    }

    // Parse PV (principal variation)
    const pvMatch = info.match(/pv (.+)$/);
    if (pvMatch) {
      result.pv = pvMatch[1].trim().split(' ');
    }

    // Parse nodes
    const nodesMatch = info.match(/nodes (\d+)/);
    if (nodesMatch) result.nodes = parseInt(nodesMatch[1]);

    // Parse NPS
    const npsMatch = info.match(/nps (\d+)/);
    if (npsMatch) result.nps = parseInt(npsMatch[1]);

    return Object.keys(result).length > 1 ? result : null;
  }

  /**
   * Quit the engine
   */
  quit() {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
let engineInstance = null;

/**
 * Get or create the Stockfish engine instance
 * @returns {StockfishEngine}
 */
export function getEngine() {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

export default StockfishEngine;
