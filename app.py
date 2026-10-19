"""
MetaChess Command Center - FastAPI Backend & Real-Time Orchestrator
Coordinates the 6-Node Ray-Ban Meta + WhatsApp + Gemini Vision + Stockfish pipeline.
Serves:
- Dual-Tab Web UI (Tab 1: Workflow Canvas, Tab 2: Command Center & Broadcast)
- Fullscreen Pop-Out Visual Return HUD (/visual-return)
- Live WebSocket telemetry stream (/ws)
- PGN recorder and live commit history
"""

import os
import sys
import time
import base64
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    import chess
    import chess.pgn
except ImportError:
    chess = None

import config
from capture_and_virtualcam import WhatsAppFrameGrabber, VisualHUDBuilder, VirtualCamBroadcaster
from reverse_agent_pipeline import LocalOpenCVGate, JevPrecheckFilter, ReverseAgentConsensusGate
from stockfish_service import StockfishService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MetaChess.App")


class MetaChessState:
    """Central synchronized application state for MetaChess Command Center."""

    def __init__(self):
        self.board = chess.Board() if chess else None
        self.is_running = True
        self.active_tab = "canvas"
        self.turn_number = 1
        self.user_color = config.USER_COLOR  # "white", "black", or "both"
        self.audio_tts_enabled = False

        # Counters & Telemetry
        self.total_frames_captured = 0
        self.frames_dropped_local_gate = 0
        self.frames_skipped_jev_precheck = 0
        self.expensive_vision_calls = 0
        self.moves_confirmed_count = 0
        self.cost_saved_usd = 0.0

        # Current Live Pipeline State
        self.current_pipeline_stage = 1  # 1 to 6
        self.node_states = {
            1: {"name": "Call Video and Speech", "status": "active", "latency_ms": 12, "fps": 1.0},
            2: {"name": "The Jev Pre-Check", "status": "idle", "latency_ms": 45, "skipped_pct": 68.4},
            3: {"name": "Move Confirmed", "status": "idle", "latency_ms": 320, "consecutive": 0, "evidence": 0},
            4: {"name": "Engine Turn Prompt", "status": "ready", "latency_ms": 180, "best_move": "e2e4", "eval": "+0.35"},
            5: {"name": "Commit Logged", "status": "idle", "commits": 0},
            6: {"name": "Record and Broadcast", "status": "streaming", "virtual_cam": "Active (1280x720@20fps)"},
        }

        # Latest Visual Evidence & Recommendations
        self.latest_frame_bgr: Optional[np.ndarray] = None
        self.latest_hud_frame_bgr: Optional[np.ndarray] = None
        self.latest_frame_base64: str = ""
        self.latest_hud_base64: str = ""
        self.observed_squares_evidence: List[Dict[str, Any]] = []
        self.stockfish_analysis: Dict[str, Any] = {
            "best_move_uci": "e2e4",
            "best_move_san": "e4",
            "eval_cp": 35,
            "eval_str": "+0.35",
            "win_probability": 0.55,
            "top_3_pv": ["e4 e5", "d4 d5", "Nf3 Nc6"],
            "visual_arrow": ["e2", "e4"],
        }
        self.latest_consensus_info: Dict[str, Any] = {
            "status": "KEEP_WATCHING",
            "reason": "Watching live WhatsApp video call for piece movement.",
            "consecutive_matches": 0,
            "required_consecutive": config.MIN_CONSECUTIVE_FRAMES,
            "min_evidence": config.MIN_EVIDENCE_SQUARES,
        }

        # Commits History
        self.commit_logs: List[Dict[str, Any]] = []
        self.pgn_moves: List[str] = []

    def reset_game(self):
        if chess:
            self.board = chess.Board()
        self.commit_logs.clear()
        self.pgn_moves.clear()
        self.moves_confirmed_count = 0
        self.turn_number = 1
        # Save clean PGN
        with open(config.PGN_FILE_PATH, "w", encoding="utf-8") as f:
            f.write('[Event "MetaChess Live Broadcast"]\n[Site "Windows WhatsApp Desktop"]\n[White "User (Glasses)"]\n[Black "Opponent"]\n\n*\n')


state = MetaChessState()

# Pipeline Subsystems
grabber = WhatsAppFrameGrabber()
hud_builder = VisualHUDBuilder()
virtual_cam = VirtualCamBroadcaster()
local_gate = LocalOpenCVGate()
jev_precheck = JevPrecheckFilter()
reverse_agent = ReverseAgentConsensusGate()
stockfish_svc = StockfishService()


class ConnectionManager:
    """Manages active WebSockets for real-time dual-tab telemetry broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)


ws_manager = ConnectionManager()


async def pipeline_worker():
    """
    Continuous background loop that executes the 6-Node pipeline at ~1.0 FPS.
    """
    logger.info("MetaChess 6-Node Pipeline Worker Started.")
    prev_frame_bgr: Optional[np.ndarray] = None

    while state.is_running:
        loop_start = time.time()
        try:
            # -------------------------------------------------------------
            # NODE 1: Call Video and Speech ("The App's Eyes and Mouth")
            # -------------------------------------------------------------
            state.current_pipeline_stage = 1
            state.node_states[1]["status"] = "pulsing"

            n1_t0 = time.time()
            frame_bgr, meta = grabber.capture_frame()
            state.total_frames_captured += 1
            state.latest_frame_bgr = frame_bgr
            state.node_states[1]["latency_ms"] = int((time.time() - n1_t0) * 1000)
            state.node_states[1]["status"] = "active"

            # -------------------------------------------------------------
            # NODE 2: The Jev Pre-Check (Fast & Cheap Frame Filter)
            # -------------------------------------------------------------
            state.current_pipeline_stage = 2
            state.node_states[2]["status"] = "pulsing"
            n2_t0 = time.time()

            # Stage 2A: Local OpenCV Blur & Motion Gate (Free)
            passed_local, local_reason, local_metrics = local_gate.evaluate(frame_bgr)
            if not passed_local:
                state.frames_dropped_local_gate += 1
                state.cost_saved_usd += config.ESTIMATED_EXPENSIVE_CALL_COST_USD
                state.node_states[2]["status"] = "dropped_blur"
                state.node_states[2]["latency_ms"] = int((time.time() - n2_t0) * 1000)
                await broadcast_telemetry(skip_expensive=True, reason=local_reason)
                await asyncio.sleep(1.0 / config.CAPTURE_FPS)
                continue

            # Stage 2B: Fast AI Pre-Check via gemini-2.5-flash-lite
            precheck_res = jev_precheck.evaluate(frame_bgr)
            should_run_vision = precheck_res.get("should_invoke_expensive_vision", True)

            if not should_run_vision:
                state.frames_skipped_jev_precheck += 1
                state.cost_saved_usd += config.ESTIMATED_EXPENSIVE_CALL_COST_USD
                state.node_states[2]["status"] = "skipped_jev"
                state.node_states[2]["latency_ms"] = int((time.time() - n2_t0) * 1000)
                skip_msg = precheck_res.get("skip_reason", "Jev dropped occluded frame")
                await broadcast_telemetry(skip_expensive=True, reason=skip_msg)
                await asyncio.sleep(1.0 / config.CAPTURE_FPS)
                continue

            state.node_states[2]["status"] = "passed"
            state.node_states[2]["latency_ms"] = int((time.time() - n2_t0) * 1000)

            # -------------------------------------------------------------
            # NODE 3: Move Confirmed ("Reverse Agent" Consensus Gate)
            # -------------------------------------------------------------
            state.current_pipeline_stage = 3
            state.node_states[3]["status"] = "pulsing"
            n3_t0 = time.time()
            state.expensive_vision_calls += 1

            consensus = reverse_agent.process_frame_consensus(state.board, frame_bgr, prev_frame_bgr)
            prev_frame_bgr = frame_bgr.copy()

            state.latest_consensus_info = consensus
            state.observed_squares_evidence = consensus.get("observed_states", [])
            state.node_states[3]["latency_ms"] = int((time.time() - n3_t0) * 1000)
            state.node_states[3]["consecutive"] = consensus.get("consecutive_count", 0)

            best_fit = consensus.get("best_fit_move")
            if best_fit:
                state.node_states[3]["evidence"] = best_fit.get("evidence_count", 0)

            is_confirmed = (consensus.get("status") == "MOVE_CONFIRMED")
            state.node_states[3]["status"] = "confirmed" if is_confirmed else "watching"

            # -------------------------------------------------------------
            # If Move Confirmed: Proceed to NODE 4, 5, 6
            # -------------------------------------------------------------
            if is_confirmed and best_fit:
                uci_move = best_fit["uci"]
                san_move = best_fit["san"]

                # Push move to python-chess board
                try:
                    move_obj = chess.Move.from_uci(uci_move)
                    state.board.push(move_obj)
                    state.moves_confirmed_count += 1
                    state.pgn_moves.append(san_move)
                except Exception as e:
                    logger.error(f"Error applying confirmed move {uci_move}: {e}")

                # -------------------------------------------------------------
                # NODE 4: Engine Turn Prompt (Stockfish Recommendation)
                # -------------------------------------------------------------
                state.current_pipeline_stage = 4
                state.node_states[4]["status"] = "pulsing"
                n4_t0 = time.time()

                stockfish_res = stockfish_svc.analyze_position(state.board)
                state.stockfish_analysis = stockfish_res
                state.node_states[4]["latency_ms"] = int((time.time() - n4_t0) * 1000)
                state.node_states[4]["best_move"] = stockfish_res.get("best_move_san", "")
                state.node_states[4]["eval"] = stockfish_res.get("eval_str", "")
                state.node_states[4]["status"] = "ready"

                # -------------------------------------------------------------
                # NODE 5: Commit is Logged for Command Center
                # -------------------------------------------------------------
                state.current_pipeline_stage = 5
                state.node_states[5]["status"] = "pulsing"
                commit_record = {
                    "commit_id": f"commit-{state.moves_confirmed_count:04d}",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "ply": len(state.board.move_stack),
                    "san": san_move,
                    "uci": uci_move,
                    "fen": state.board.fen(),
                    "consecutive_frames": consensus.get("consecutive_count", 2),
                    "evidence_squares": best_fit.get("matched_squares", []),
                    "stockfish_reply": stockfish_res.get("best_move_san", ""),
                    "eval": stockfish_res.get("eval_str", ""),
                    "win_prob": stockfish_res.get("win_probability", 0.5),
                }
                state.commit_logs.insert(0, commit_record)
                state.node_states[5]["commits"] = len(state.commit_logs)
                state.node_states[5]["status"] = "logged"

                # -------------------------------------------------------------
                # NODE 6: Record and Broadcast a Game
                # -------------------------------------------------------------
                state.current_pipeline_stage = 6
                state.node_states[6]["status"] = "broadcasting"
                _record_pgn_and_telemetry(commit_record)

            # Generate high-contrast Visual Return HUD Frame
            evidence_sq_names = [s.get("square") for s in state.observed_squares_evidence if s.get("confidence", 0) >= 0.8]
            turn_str = "White" if state.board.turn == chess.WHITE else "Black"

            hud_frame = hud_builder.render_hud_frame(
                board_fen=state.board.fen(),
                best_move_san=state.stockfish_analysis.get("best_move_san", "e4"),
                best_move_uci=state.stockfish_analysis.get("best_move_uci", "e2e4"),
                eval_score=state.stockfish_analysis.get("eval_str", "+0.35"),
                win_prob=state.stockfish_analysis.get("win_probability", 0.55),
                evidence_squares=evidence_sq_names,
                turn_color=turn_str,
                is_move_confirmed=is_confirmed
            )
            state.latest_hud_frame_bgr = hud_frame

            # Send to Windows Virtual Camera (for WhatsApp video call return)
            virtual_cam.send_frame(hud_frame)

            # Broadcast full telemetry & frames over WebSocket to dual-tab UI
            await broadcast_telemetry(skip_expensive=False)

        except Exception as e:
            logger.error(f"Error in pipeline loop: {e}", exc_info=True)

        elapsed = time.time() - loop_start
        sleep_dur = max(0.05, (1.0 / config.CAPTURE_FPS) - elapsed)
        await asyncio.sleep(sleep_dur)


def _record_pgn_and_telemetry(commit: Dict[str, Any]):
    """Appends live move to PGN file and JSON telemetry."""
    try:
        # Build PGN string
        game = chess.pgn.Game()
        game.headers["Event"] = "Ray-Ban Meta WhatsApp Live Session"
        game.headers["Site"] = "Windows WhatsApp Desktop"
        game.headers["White"] = "Smart Glasses Wearer"
        game.headers["Black"] = "Opponent"

        node = game
        sim = chess.Board()
        for move_obj in state.board.move_stack:
            node = node.add_variation(move_obj)

        with open(config.PGN_FILE_PATH, "w", encoding="utf-8") as f:
            f.write(str(game))

        # Append telemetry JSON log
        with open(config.TELEMETRY_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(commit) + "\n")
    except Exception as e:
        logger.error(f"PGN recording error: {e}")


async def broadcast_telemetry(skip_expensive: bool = False, reason: str = ""):
    """Serializes frames to base64 and broadcasts live state to all connected UI clients."""
    thumb_b64 = ""
    hud_b64 = ""

    if state.latest_frame_bgr is not None:
        try:
            small_cam = cv2.resize(state.latest_frame_bgr, (480, 360))
            _, buf = cv2.imencode('.jpg', small_cam, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            thumb_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"
        except Exception:
            pass

    if state.latest_hud_frame_bgr is not None:
        try:
            small_hud = cv2.resize(state.latest_hud_frame_bgr, (640, 360))
            _, buf2 = cv2.imencode('.jpg', small_hud, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            hud_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf2).decode('utf-8')}"
        except Exception:
            pass

    skip_pct = (
        round(100.0 * (state.frames_dropped_local_gate + state.frames_skipped_jev_precheck) / max(1, state.total_frames_captured), 1)
    )

    payload = {
        "type": "PIPELINE_TELEMETRY",
        "fen": state.board.fen() if state.board else "",
        "turn": "white" if (state.board and state.board.turn == chess.WHITE) else "black",
        "turn_number": state.turn_number,
        "current_stage": state.current_pipeline_stage,
        "node_states": state.node_states,
        "stats": {
            "total_frames": state.total_frames_captured,
            "dropped_local_gate": state.frames_dropped_local_gate,
            "skipped_jev": state.frames_skipped_jev_precheck,
            "expensive_calls": state.expensive_vision_calls,
            "confirmed_moves": state.moves_confirmed_count,
            "cost_saved_usd": round(state.cost_saved_usd, 4),
            "skip_percentage": skip_pct,
        },
        "consensus": state.latest_consensus_info,
        "observed_squares": state.observed_squares_evidence,
        "stockfish": state.stockfish_analysis,
        "commits": state.commit_logs[:15],
        "skip_reason": reason,
        "raw_frame_url": thumb_b64,
        "hud_frame_url": hud_b64,
    }

    await ws_manager.broadcast(payload)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: spawn background pipeline task
    worker_task = asyncio.create_task(pipeline_worker())
    yield
    # Shutdown
    state.is_running = False
    worker_task.cancel()
    virtual_cam.close()
    stockfish_svc.close()


app = FastAPI(title="MetaChess Command Center", lifespan=lifespan)

# Templates directory check
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/", response_class=HTMLResponse)
async def get_index():
    """Serves the primary Dual-Tab Web UI (Workflow Canvas + Command Center)."""
    index_file = TEMPLATES_DIR / "index.html"
    if index_file.exists():
        return index_file.read_text(encoding="utf-8")
    return "<h1>MetaChess Command Center running. templates/index.html is loading...</h1>"


@app.get("/visual-return", response_class=HTMLResponse)
async def get_visual_return():
    """
    Dedicated full-screen Pop-Out Visual Return HUD.
    Engineered for WhatsApp screen sharing or OBS Virtual Camera preview.
    """
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MetaChess Visual Return HUD</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0b0f17; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; overflow: hidden; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    #hud-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; }
    img#hud-img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 0 50px rgba(0, 255, 200, 0.2); }
    .status-badge { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.8); border: 1px solid #00ffaa; color: #00ffaa; padding: 6px 14px; font-weight: bold; font-size: 14px; border-radius: 4px; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div id="hud-container">
    <div class="status-badge">● WHATSAPP RETURN BROADCAST (1280x720)</div>
    <img id="hud-img" alt="Visual Return HUD Stream" src="" />
  </div>
  <script>
    const img = document.getElementById('hud-img');
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProto}//${location.host}/ws`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.hud_frame_url) {
        img.src = data.hud_frame_url;
      }
    };
  </script>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "fen": state.board.fen() if state.board else "",
        "moves_confirmed": state.moves_confirmed_count,
        "cost_saved_usd": round(state.cost_saved_usd, 4),
        "node_states": state.node_states,
    }


@app.get("/api/pgn", response_class=PlainTextResponse)
async def get_pgn():
    if config.PGN_FILE_PATH.exists():
        return config.PGN_FILE_PATH.read_text(encoding="utf-8")
    return "*\n"


@app.post("/api/reset")
async def reset_game():
    state.reset_game()
    return {"message": "Game reset successfully."}


class MovePushRequest(BaseModel):
    move_uci: str


@app.post("/api/simulate-move")
async def simulate_move(req: MovePushRequest):
    """Manually test a legal move push."""
    try:
        m = chess.Move.from_uci(req.move_uci)
        if m in state.board.legal_moves:
            san = state.board.san(m)
            state.board.push(m)
            state.moves_confirmed_count += 1
            state.pgn_moves.append(san)
            return {"success": True, "san": san, "fen": state.board.fen()}
        raise HTTPException(status_code=400, detail="Illegal move")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keepalive receiver
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    print(f"=================================================================")
    print(f"  MetaChess Command Center (Ray-Ban Meta + WhatsApp + Stockfish)  ")
    print(f"  Dual-Tab Web UI:        http://localhost:{port}                 ")
    print(f"  Visual Return Pop-Out:  http://localhost:{port}/visual-return  ")
    print(f"=================================================================")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
