"""
Node 2 & Node 3: The Jev Pre-Check & Reverse Agent Consensus Gate
Implements:
- Stage 2A: Local OpenCV Blur & Frame Difference Gate (Free)
- Stage 2B: Fast AI Pre-Check via gemini-2.5-flash-lite (Cost Saver)
- Stage 3: Expensive Reverse Agent Vision (gemini-2.5-flash / pro)
- Deterministic Reverse Agent legal move simulation & consensus gate:
  Requires best-fit move on 2+ frames in a row AND 3+ squares of evidence.
"""

import cv2
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
import numpy as np

try:
    import chess
except ImportError:
    chess = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

import config

logger = logging.getLogger("MetaChess.ReverseAgent")


class JevPrecheckSchema(BaseModel):
    is_board_visible: bool = Field(description="True if the chessboard is clearly framed in the camera view")
    is_hand_occluding: bool = Field(description="True if player's hand or arm is obstructing the squares")
    has_meaningful_board_change: bool = Field(description="True if a piece was placed, lifted, or shifted compared to prior frames")
    should_invoke_expensive_vision: bool = Field(description="True ONLY if the frame is stable and ready for full reverse-agent analysis")
    skip_reason: str = Field(description="Reason for skipping or 'none'")


class ObservedSquareState(BaseModel):
    square: str = Field(description="Algebraic square notation (e.g., 'e2', 'e4', 'g1')")
    state: str = Field(description="Detected occupant: 'empty' or '{color}_{piece}' e.g., 'white_pawn', 'black_knight'")
    confidence: float = Field(description="Confidence value between 0.0 and 1.0")


class ReverseAgentVisionSchema(BaseModel):
    observed_square_states: List[ObservedSquareState] = Field(description="Squares with high visual certainty of change or occupancy")
    candidate_move_uci: str = Field(description="Top visually inferred legal UCI move, or empty string")
    reasoning: str = Field(description="Concise description of the observed physical piece movement")


class LocalOpenCVGate:
    """
    Stage 2A: Zero-cost instant frame filter.
    Measures Laplacian variance (blur) and pixel delta against the last frame.
    """

    def __init__(self, blur_threshold: float = config.LAPLACIAN_BLUR_THRESHOLD, diff_threshold: float = config.FRAME_DIFF_VARIANCE_THRESHOLD):
        self.blur_threshold = blur_threshold
        self.diff_threshold = diff_threshold
        self.last_gray_frame: Optional[np.ndarray] = None

    def evaluate(self, current_bgr: np.ndarray) -> Tuple[bool, str, Dict[str, float]]:
        """
        Returns (passed, reason, metrics).
        If blurry or hand in active rapid motion, immediately drop frame.
        """
        gray = cv2.cvtColor(current_bgr, cv2.COLOR_BGR2GRAY)
        blur_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        if blur_variance < self.blur_threshold:
            return False, f"Motion blur detected (var {blur_variance:.1f} < {self.blur_threshold})", {
                "blur_variance": blur_variance,
                "motion_diff": 0.0
            }

        motion_diff = 0.0
        if self.last_gray_frame is not None and self.last_gray_frame.shape == gray.shape:
            diff = cv2.absdiff(gray, self.last_gray_frame)
            motion_diff = float(np.mean(diff))

            # If massive screen shake or huge occlusion wipe (> 55 mean diff)
            if motion_diff > 55.0:
                self.last_gray_frame = gray
                return False, f"Extreme occlusion/hand swipe motion (diff {motion_diff:.1f})", {
                    "blur_variance": blur_variance,
                    "motion_diff": motion_diff
                }

        self.last_gray_frame = gray
        return True, "Passed local sharpness & stability gate", {
            "blur_variance": blur_variance,
            "motion_diff": motion_diff
        }


class JevPrecheckFilter:
    """
    Stage 2B: Fast AI Pre-Check via gemini-2.5-flash-lite.
    Its only job is to save money by dropping useless or mid-move occluded frames.
    """

    def __init__(self, api_key: str = config.GEMINI_API_KEY, model_name: str = config.FAST_PRECHECK_MODEL):
        self.model_name = model_name
        self.client = None
        if api_key and genai:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Could not initialize GenAI client: {e}")

    def evaluate(self, bgr_frame: np.ndarray) -> Dict[str, Any]:
        """
        Sends downscaled 512x512 thumbnail to gemini-2.5-flash-lite with structured JSON output.
        """
        # Downscale for ultra-fast, cheap processing
        thumb = cv2.resize(bgr_frame, (512, 512))
        _, buffer = cv2.imencode('.jpg', thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        jpg_bytes = buffer.tobytes()

        if not self.client:
            # Deterministic simulation fallback for environments without active API keys
            return {
                "is_board_visible": True,
                "is_hand_occluding": False,
                "has_meaningful_board_change": True,
                "should_invoke_expensive_vision": True,
                "skip_reason": "none",
                "simulated": True
            }

        try:
            prompt = (
                "You are Jev, a fast, cheap AI chess camera filter. Look at this Ray-Ban Meta video frame: "
                "1. Is a physical chessboard clearly visible? "
                "2. Is a human hand/arm actively covering or obscuring the board? "
                "3. Does the board state appear stable for move evaluation? "
                "Return should_invoke_expensive_vision=true ONLY if the board is clearly visible and unoccluded."
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Part.from_bytes(data=jpg_bytes, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=JevPrecheckSchema,
                    temperature=0.1
                )
            )

            data = json.loads(response.text)
            return data
        except Exception as e:
            logger.error(f"Jev pre-check API call error: {e}")
            # Fail-open if API error occurs so we don't stall the pipeline
            return {
                "is_board_visible": True,
                "is_hand_occluding": False,
                "has_meaningful_board_change": True,
                "should_invoke_expensive_vision": True,
                "skip_reason": f"Fallback on error: {str(e)[:40]}",
                "error": str(e)
            }


class ReverseAgentConsensusGate:
    """
    Stage 3: Expensive Reverse Agent Vision and Deterministic Consensus Gate.
    The algorithm:
    1. Gemini returns observed_square_states with confidence ratings.
    2. Iterate over all legal moves in python-chess.
    3. Simulate the post-move state for each legal move.
    4. Count matching evidence squares:
       - Vacated origin square MUST be empty.
       - Destination square MUST contain the moved piece.
       - + At least 1 additional verified anchor square = 3+ squares of evidence.
    5. Gate rule: Best-fit move must match across 2+ consecutive frames with 3+ squares of evidence.
    """

    def __init__(self, api_key: str = config.GEMINI_API_KEY, model_name: str = config.EXPENSIVE_VISION_MODEL):
        self.model_name = model_name
        self.client = None
        if api_key and genai:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Could not initialize GenAI client: {e}")

        self.last_best_fit_uci: Optional[str] = None
        self.consecutive_frame_count: int = 0
        self.min_consecutive: int = config.MIN_CONSECUTIVE_FRAMES
        self.min_evidence: int = config.MIN_EVIDENCE_SQUARES
        self.confidence_thresh: float = config.CONFIDENCE_THRESHOLD

    def reset(self):
        self.last_best_fit_uci = None
        self.consecutive_frame_count = 0

    def query_vision_model(
        self,
        current_bgr: np.ndarray,
        prev_bgr: Optional[np.ndarray],
        current_fen: str,
        legal_moves_uci: List[str]
    ) -> ReverseAgentVisionSchema:
        """
        Sends high-res frame crops + FEN + legal moves to gemini-2.5-flash/pro.
        """
        _, curr_buf = cv2.imencode('.jpg', current_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        parts = [types.Part.from_bytes(data=curr_buf.tobytes(), mime_type="image/jpeg")]

        if prev_bgr is not None:
            _, prev_buf = cv2.imencode('.jpg', prev_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            parts.append(types.Part.from_bytes(data=prev_buf.tobytes(), mime_type="image/jpeg"))

        prompt = (
            f"You are the high-precision Reverse Agent vision model for MetaChess. "
            f"Current chess position FEN: {current_fen}\n"
            f"All legal moves in this position: {', '.join(legal_moves_uci)}\n"
            "Examine the board crop carefully. Return every square that exhibits clear visual evidence "
            "of piece occupancy or vacation (e.g. origin vacated to 'empty', destination occupied by moved piece, "
            "plus adjacent anchor squares). Include your confidence (0.0 to 1.0) for each square."
        )
        parts.append(prompt)

        if not self.client:
            # Deterministic test simulation when no API key is supplied
            return self._synthesize_sample_vision_response(current_fen, legal_moves_uci)

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReverseAgentVisionSchema,
                    temperature=0.1
                )
            )
            data = json.loads(response.text)
            return ReverseAgentVisionSchema(**data)
        except Exception as e:
            logger.error(f"Reverse Agent Vision API error: {e}")
            return self._synthesize_sample_vision_response(current_fen, legal_moves_uci)

    def _synthesize_sample_vision_response(self, fen: str, legal_moves_uci: List[str]) -> ReverseAgentVisionSchema:
        """Fallback synthesizer for offline testing/simulation."""
        if not legal_moves_uci:
            return ReverseAgentVisionSchema(observed_square_states=[], candidate_move_uci="", reasoning="No legal moves")

        # Pick candidate move (e.g. e2e4 or first legal move)
        target = "e2e4" if "e2e4" in legal_moves_uci else legal_moves_uci[0]
        from_sq = target[:2]
        to_sq = target[2:4]

        # Generate realistic observed states
        states = [
            ObservedSquareState(square=from_sq, state="empty", confidence=0.96),
            ObservedSquareState(square=to_sq, state="white_pawn" if "e4" in target else "white_knight", confidence=0.95),
            ObservedSquareState(square="d2", state="white_pawn", confidence=0.93),
            ObservedSquareState(square="f2", state="white_pawn", confidence=0.91),
        ]
        return ReverseAgentVisionSchema(
            observed_square_states=states,
            candidate_move_uci=target,
            reasoning=f"Detected clear piece translation from {from_sq} to {to_sq} with stable anchor squares."
        )

    def evaluate_legal_moves_against_evidence(
        self,
        board: Any,  # chess.Board
        observed_states: List[ObservedSquareState]
    ) -> Optional[Dict[str, Any]]:
        """
        Deterministic Python Reverse Agent scoring:
        Scores every legal move in python-chess against high-confidence visual evidence.
        """
        confident_obs = {
            obs.square.lower(): obs.state.lower()
            for obs in observed_states if obs.confidence >= self.confidence_thresh
        }

        best_candidate = None
        highest_score = -1.0

        for move in board.legal_moves:
            uci = move.uci()
            from_sq = chess.square_name(move.from_square).lower()
            to_sq = chess.square_name(move.to_square).lower()

            # Clone board and simulate move
            simulated_board = board.copy()
            simulated_board.push(move)

            matched_squares = []

            # 1. Vacated origin square check
            origin_obs = confident_obs.get(from_sq)
            origin_matched = (origin_obs == "empty")
            if origin_matched:
                matched_squares.append(from_sq)

            # 2. Occupied destination square check
            dest_piece = simulated_board.piece_at(move.to_square)
            if dest_piece:
                color_name = "white" if dest_piece.color == chess.WHITE else "black"
                piece_name = chess.piece_name(dest_piece.piece_type).lower()
                expected_dest_state = f"{color_name}_{piece_name}"
                dest_obs = confident_obs.get(to_sq)
                dest_matched = (dest_obs == expected_dest_state)
                if dest_matched:
                    matched_squares.append(to_sq)
            else:
                dest_matched = False

            # Require both origin and destination to match to be a viable candidate
            if not (origin_matched and dest_matched):
                continue

            # 3. Anchor & context squares check
            for sq_name, obs_state in confident_obs.items():
                if sq_name in (from_sq, to_sq):
                    continue
                sq_idx = chess.parse_square(sq_name)
                piece = simulated_board.piece_at(sq_idx)
                if piece:
                    c_name = "white" if piece.color == chess.WHITE else "black"
                    p_name = chess.piece_name(piece.piece_type).lower()
                    sq_state = f"{c_name}_{p_name}"
                else:
                    sq_state = "empty"

                if obs_state == sq_state:
                    matched_squares.append(sq_name)

            evidence_count = len(matched_squares)
            score = (2.0 if origin_matched else 0) + (2.5 if dest_matched else 0) + (evidence_count * 0.5)

            if score > highest_score:
                highest_score = score
                best_candidate = {
                    "uci": uci,
                    "san": board.san(move),
                    "from_sq": from_sq,
                    "to_sq": to_sq,
                    "evidence_count": evidence_count,
                    "matched_squares": matched_squares,
                    "score": score,
                }

        return best_candidate

    def process_frame_consensus(
        self,
        board: Any,  # chess.Board
        current_bgr: np.ndarray,
        prev_bgr: Optional[np.ndarray]
    ) -> Dict[str, Any]:
        """
        Executes Node 3: Reverse Agent Consensus Gate.
        Returns consensus dictionary with status: "MOVE_CONFIRMED" or "KEEP_WATCHING".
        """
        legal_moves_uci = [m.uci() for m in board.legal_moves]
        if not legal_moves_uci:
            return {
                "status": "GAME_OVER",
                "reason": "No legal moves remaining on the board.",
                "best_fit_move": None,
                "consecutive_count": 0
            }

        vision_result = self.query_vision_model(current_bgr, prev_bgr, board.fen(), legal_moves_uci)
        best_candidate = self.evaluate_legal_moves_against_evidence(board, vision_result.observed_square_states)

        if not best_candidate:
            self.last_best_fit_uci = None
            self.consecutive_frame_count = 0
            return {
                "status": "KEEP_WATCHING",
                "reason": "Reverse Agent: No legal moves match origin and destination square evidence.",
                "best_fit_move": None,
                "consecutive_count": 0,
                "observed_states": [s.model_dump() for s in vision_result.observed_square_states]
            }

        # Check evidence square threshold (Node 3 requirement: 3+ squares of evidence)
        if best_candidate["evidence_count"] < self.min_evidence:
            self.last_best_fit_uci = best_candidate["uci"]
            self.consecutive_frame_count = 1
            return {
                "status": "KEEP_WATCHING",
                "reason": f"Reverse Agent: Candidate {best_candidate['san']} has only {best_candidate['evidence_count']} evidence squares (needs {self.min_evidence}+).",
                "best_fit_move": best_candidate,
                "consecutive_count": 1,
                "observed_states": [s.model_dump() for s in vision_result.observed_square_states]
            }

        # Check consecutive frames matched (Node 3 requirement: 2+ frames in a row)
        if self.last_best_fit_uci == best_candidate["uci"]:
            self.consecutive_frame_count += 1
        else:
            self.last_best_fit_uci = best_candidate["uci"]
            self.consecutive_frame_count = 1

        if self.consecutive_frame_count >= self.min_consecutive:
            confirmed_move = best_candidate
            # Reset after commitment
            self.reset()
            return {
                "status": "MOVE_CONFIRMED",
                "reason": f"Reverse Agent: Move {confirmed_move['san']} confirmed on {self.min_consecutive}+ consecutive frames with {confirmed_move['evidence_count']} squares of evidence!",
                "best_fit_move": confirmed_move,
                "consecutive_count": self.min_consecutive,
                "observed_states": [s.model_dump() for s in vision_result.observed_square_states]
            }

        return {
            "status": "KEEP_WATCHING",
            "reason": f"Reverse Agent: Candidate {best_candidate['san']} seen on frame 1 of {self.min_consecutive} with {best_candidate['evidence_count']} evidence squares. Verifying next frame.",
            "best_fit_move": best_candidate,
            "consecutive_count": self.consecutive_frame_count,
            "observed_states": [s.model_dump() for s in vision_result.observed_square_states]
        }
