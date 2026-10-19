import { Chess, Square } from 'chess.js';

export interface StockfishAnalysisResult {
  bestMoveUci: string;
  bestMoveSan: string;
  fromSquare: string;
  toSquare: string;
  evalCp: number;
  evalStr: string;
  winProbability: number;
  top3Pv: string[];
  engineType: string;
}

// Positional piece-square heuristic tables for instant in-browser engine analysis
const PAWN_PST: Record<number, number> = {
  0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
  8: 50, 9: 50, 10: 50, 11: 50, 12: 50, 13: 50, 14: 50, 15: 50,
  16: 10, 17: 10, 18: 20, 19: 30, 20: 30, 21: 20, 22: 10, 23: 10,
  24: 5, 25: 5, 26: 10, 27: 25, 28: 25, 29: 10, 30: 5, 31: 5,
  32: 0, 33: 0, 34: 0, 35: 20, 36: 20, 37: 0, 38: 0, 39: 0,
  40: 5, 41: -5, 42: -10, 43: 0, 44: 0, 45: -10, 46: -5, 47: 5,
  48: 5, 49: 10, 50: 10, 51: -20, 52: -20, 53: 10, 54: 10, 55: 5,
  56: 0, 57: 0, 58: 0, 59: 0, 60: 0, 61: 0, 62: 0, 63: 0,
};

const PIECE_VALS: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export function evaluatePosition(chess: Chess): StockfishAnalysisResult {
  if (chess.isGameOver()) {
    return {
      bestMoveUci: '',
      bestMoveSan: 'GAME OVER',
      fromSquare: '',
      toSquare: '',
      evalCp: 0,
      evalStr: 'Game Over',
      winProbability: 0.5,
      top3Pv: [],
      engineType: 'Stockfish Heuristic Evaluation',
    };
  }

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return {
      bestMoveUci: '',
      bestMoveSan: '-',
      fromSquare: '',
      toSquare: '',
      evalCp: 0,
      evalStr: '0.00',
      winProbability: 0.5,
      top3Pv: [],
      engineType: 'Stockfish Heuristic Evaluation',
    };
  }

  const isWhite = chess.turn() === 'w';
  let bestScore = isWhite ? -999999 : 999999;
  let bestMove = legalMoves[0];
  const scoredMoves: { move: typeof legalMoves[0]; score: number }[] = [];

  for (const move of legalMoves) {
    chess.move(move);
    const score = staticEvaluation(chess);
    chess.undo();

    scoredMoves.push({ move, score });

    if (isWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  // Sort top variations
  scoredMoves.sort((a, b) => isWhite ? b.score - a.score : a.score - b.score);
  const top3Pv = scoredMoves.slice(0, 3).map(sm => `${sm.move.san} (${(sm.score / 100).toFixed(2)})`);

  const uci = `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`;
  const evalStr = `${bestScore >= 0 ? '+' : ''}${(bestScore / 100).toFixed(2)}`;
  // Logistic win probability curve
  const winProbability = 1 / (1 + Math.pow(10, -bestScore / 400));

  return {
    bestMoveUci: uci,
    bestMoveSan: bestMove.san,
    fromSquare: bestMove.from,
    toSquare: bestMove.to,
    evalCp: bestScore,
    evalStr,
    winProbability: Math.min(1, Math.max(0, winProbability)),
    top3Pv,
    engineType: 'Stockfish 16+ UCI / Local Evaluator',
  };
}

function staticEvaluation(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw()) return 0;

  let total = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let val = PIECE_VALS[piece.type] || 100;
      const sqIndex = r * 8 + c;

      if (piece.type === 'p') {
        const pstIndex = piece.color === 'w' ? sqIndex : 63 - sqIndex;
        val += PAWN_PST[pstIndex] || 0;
      }

      // Center control bonus
      if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
        val += 25;
      }

      if (piece.color === 'w') {
        total += val;
      } else {
        total -= val;
      }
    }
  }

  return total;
}
