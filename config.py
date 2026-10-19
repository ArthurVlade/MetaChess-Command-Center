"""
MetaChess Command Center - Configuration
Handles parameters for Ray-Ban Meta glasses capture, WhatsApp window grabber,
Gemini Vision models, Reverse Agent consensus gates, and Stockfish engine.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).resolve().parent
RECORDINGS_DIR = BASE_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
PGN_FILE_PATH = RECORDINGS_DIR / "game.pgn"
TELEMETRY_LOG_PATH = RECORDINGS_DIR / "telemetry.json"

# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Model Selection:
# Stage 2B Fast AI Pre-check: ultra-fast, cheap vision filter
FAST_PRECHECK_MODEL = os.getenv("FAST_PRECHECK_MODEL", "gemini-2.5-flash-lite")

# Stage 3 Expensive Reverse Agent Vision: high-precision square/piece recognizer
EXPENSIVE_VISION_MODEL = os.getenv("EXPENSIVE_VISION_MODEL", "gemini-2.5-flash")

# Stockfish Configuration
# Windows default path, can be overridden via environment or local path
DEFAULT_STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish.exe")
STOCKFISH_DEPTH = int(os.getenv("STOCKFISH_DEPTH", "15"))
STOCKFISH_TIME_LIMIT_SEC = float(os.getenv("STOCKFISH_TIME_LIMIT_SEC", "0.3"))

# Reverse Agent Consensus Gate Thresholds
# Node 3 Rule: Needs the same best-fit move on 2+ frames in a row AND 3+ squares of evidence
MIN_CONSECUTIVE_FRAMES = int(os.getenv("MIN_CONSECUTIVE_FRAMES", "2"))
MIN_EVIDENCE_SQUARES = int(os.getenv("MIN_EVIDENCE_SQUARES", "3"))
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.80"))

# Node 1: Video Capture & Virtual Camera
CAPTURE_FPS = float(os.getenv("CAPTURE_FPS", "1.0"))
CAPTURE_WINDOW_TITLE = os.getenv("CAPTURE_WINDOW_TITLE", "WhatsApp")
VIRTUAL_CAM_WIDTH = int(os.getenv("VIRTUAL_CAM_WIDTH", "1280"))
VIRTUAL_CAM_HEIGHT = int(os.getenv("VIRTUAL_CAM_HEIGHT", "720"))
VIRTUAL_CAM_FPS = int(os.getenv("VIRTUAL_CAM_FPS", "20"))
USER_COLOR = os.getenv("USER_COLOR", "white")  # "white", "black", or "both"

# Node 2: Stage 2A Local OpenCV Gate Thresholds
LAPLACIAN_BLUR_THRESHOLD = float(os.getenv("LAPLACIAN_BLUR_THRESHOLD", "75.0"))
FRAME_DIFF_VARIANCE_THRESHOLD = float(os.getenv("FRAME_DIFF_VARIANCE_THRESHOLD", "12.0"))

# Cost tracking for Jev pre-check savings calculation (estimated USD per skipped expensive call)
ESTIMATED_EXPENSIVE_CALL_COST_USD = float(os.getenv("ESTIMATED_EXPENSIVE_CALL_COST_USD", "0.0025"))
