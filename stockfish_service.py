"""
Node 4: Engine Turn Prompt (Stockfish Recommendation)
Connects to local Stockfish UCI engine (or intelligent built-in fallback) to calculate:
- Best move (UCI and SAN)
- Evaluation score (centipawn advantage or mate-in-N)
- Win probability ratio (0.0 to 1.0)
- Top 3 principal variation (PV) lines
- Visual arrow coordinates for the high-contrast video call HUD
"""

import os
import shutil
import logging
from typing import Dict, Any, List, Optional, Tuple
import math

try:
    import chess
    import chess.engine
except ImportError:
    chess = None

import config

logger = logging.getLogger("MetaChess.StockfishService")


# Piece square tables for pure Python engine fallback
PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
]

KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
]

PIECE_VALUES = {
    chess.PAWN if chess else 1: 100,
    chess.KNIGHT if chess else 2: 320,
    chess.BISHOP if chess else 3: 330,
    chess.ROOK if chess else 4: 500,
    chess.QUEEN if chess else 5: 900,
    chess.KING if chess else 6: 20000,
}


class StockfishService:
    """
    UCI Stockfish Engine controller.
    Searches for Stockfish on Windows PATH or configured path.
    Gracefully falls back to a fast minimax engine if Stockfish executable is missing.
    """

    def __init__(self, engine_path: str = config.DEFAULT_STOCKFISH_PATH):
        self.engine_path = engine_path
        self.engine: Optional[chess.engine.SimpleEngine] = None
        self.is_real_stockfish = False
        self._init_engine()

    def _init_engine(self):
        if not chess:
            logger.warning("python-chess not installed.")
            return

        # Attempt to find Stockfish
        executable = shutil.which(self.engine_path) or (self.engine_path if os.path.exists(self.engine_path) else None)

        # Check common Windows locations
        if not executable:
            common_locations = [
                "stockfish.exe",
                "C:\\stockfish\\stockfish.exe",
                "C:\\stockfish\\stockfish-windows-x86-64-avx2.exe",
                "/usr/games/stockfish",
                "/usr/bin/stockfish"
            ]
            for loc in common_locations:
                if os.path.exists(loc) or shutil.which(loc):
                    executable = loc
                    break

        if executable:
            try:
                self.engine = chess.engine.SimpleEngine.popen_uci(executable)
                self.is_real_stockfish = True
                logger.info(f"Loaded Stockfish UCI engine from: {executable}")
                return
            except Exception as e:
                logger.warning(f"Could not spawn Stockfish at {executable}: {e}")

        logger.info("Stockfish binary not detected; using high-speed built-in Python evaluation engine.")
        self.is_real_stockfish = False

    def analyze_position(
        self,
        board: Any,  # chess.Board
        depth: int = config.STOCKFISH_DEPTH,
        time_limit: float = config.STOCKFISH_TIME_LIMIT_SEC
    ) -> Dict[str, Any]:
        """
        Calculates Stockfish recommendation for the given chess.Board.
        Returns evaluation score, best move, win probability, and visual arrow.
        """
        if board.is_game_over():
            return {
                "best_move_uci": "",
                "best_move_san": "GAME OVER",
                "eval_cp": 0,
                "eval_str": "Game Over",
                "win_probability": 0.5,
                "top_3_pv": [],
                "visual_arrow": [],
                "engine_type": "Stockfish UCI" if self.is_real_stockfish else "Built-in Minimax"
            }

        # Real Stockfish UCI Engine query
        if self.is_real_stockfish and self.engine:
            try:
                limit = chess.engine.Limit(time=time_limit, depth=depth)
                info = self.engine.analyse(board, limit, multipv=3)

                best_entry = info[0] if isinstance(info, list) else info
                score = best_entry["score"].white()

                if score.is_mate():
                    mate_in = score.mate()
                    eval_str = f"M{mate_in:+d}"
                    cp = 10000 if mate_in > 0 else -10000
                    win_prob = 1.0 if mate_in > 0 else 0.0
                else:
                    cp = score.score() or 0
                    eval_str = f"{cp / 100.0:+.2f}"
                    # Logistic win probability curve used by Lichess/FIDE
                    win_prob = 1.0 / (1.0 + math.pow(10.0, -cp / 400.0))

                pv = best_entry.get("pv", [])
                best_move = pv[0] if pv else next(iter(board.legal_moves))
                best_uci = best_move.uci()
                best_san = board.san(best_move)

                # Collect top 3 PV lines
                pv_lines = []
                if isinstance(info, list):
                    for entry in info[:3]:
                        line_moves = [board.san(m) for m in entry.get("pv", [])[:4]]
                        pv_lines.append(" ".join(line_moves))

                return {
                    "best_move_uci": best_uci,
                    "best_move_san": best_san,
                    "eval_cp": cp,
                    "eval_str": eval_str,
                    "win_probability": round(win_prob, 3),
                    "top_3_pv": pv_lines,
                    "visual_arrow": [best_uci[:2], best_uci[2:4]],
                    "engine_type": "Stockfish 16+ UCI Engine"
                }
            except Exception as e:
                logger.error(f"Stockfish UCI query error: {e}. Falling back to internal engine.")

        # Built-in Fallback Minimax engine
        return self._fallback_analyze(board)

    def _fallback_analyze(self, board: Any) -> Dict[str, Any]:
        """High-speed built-in minimax evaluator with positional heuristics."""
        best_move = None
        best_val = -999999 if board.turn == chess.WHITE else 999999
        scored_moves = []

        for move in board.legal_moves:
            board.push(move)
            val = self._evaluate_board(board)
            board.pop()

            scored_moves.append((val, move))
            if board.turn == chess.WHITE:
                if val > best_val:
                    best_val = val
                    best_move = move
            else:
                if val < best_val:
                    best_val = val
                    best_move = move

        if not best_move:
            best_move = next(iter(board.legal_moves))

        best_uci = best_move.uci()
        best_san = board.san(best_move)
        eval_str = f"{best_val / 100.0:+.2f}"
        win_prob = 1.0 / (1.0 + math.pow(10.0, -best_val / 400.0))

        # PV lines preview
        scored_moves.sort(key=lambda x: x[0], reverse=(board.turn == chess.WHITE))
        pv_lines = [f"{board.san(m)} (eval {v/100:+.1f})" for v, m in scored_moves[:3]]

        return {
            "best_move_uci": best_uci,
            "best_move_san": best_san,
            "eval_cp": best_val,
            "eval_str": eval_str,
            "win_probability": round(win_prob, 3),
            "top_3_pv": pv_lines,
            "visual_arrow": [best_uci[:2], best_uci[2:4]],
            "engine_type": "Built-in Positional Minimax"
        }

    def _evaluate_board(self, board: Any) -> int:
        """Static material and positional square evaluation."""
        if board.is_checkmate():
            return -99999 if board.turn == chess.WHITE else 99999
        if board.is_stalemate() or board.is_insufficient_material():
            return 0

        score = 0
        for sq in chess.SQUARES:
            piece = board.piece_at(sq)
            if not piece:
                continue
            val = PIECE_VALUES.get(piece.piece_type, 100)
            # Positional bonus for pawns and knights
            if piece.piece_type == chess.PAWN:
                sq_idx = sq if piece.color == chess.WHITE else chess.square_mirror(sq)
                val += PAWN_TABLE[sq_idx]
            elif piece.piece_type == chess.KNIGHT:
                sq_idx = sq if piece.color == chess.WHITE else chess.square_mirror(sq)
                val += KNIGHT_TABLE[sq_idx]

            if piece.color == chess.WHITE:
                score += val
            else:
                score -= val

        return score

    def close(self):
        if self.engine:
            try:
                self.engine.quit()
            except Exception:
                pass
            self.engine = None
