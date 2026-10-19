# MetaChess Command Center 👓♟️

> Real-time **Ray-Ban Meta Smart Glasses + Windows WhatsApp Desktop + Gemini Vision + Stockfish** Chess Pipeline & Command Center HUD.

![MetaChess Architecture](https://img.shields.io/badge/Architecture-6--Node%20Reverse%20Agent-06b6d4?style=for-the-badge)
![Windows WhatsApp](https://img.shields.io/badge/WhatsApp-Zero%20API%20Required-25D366?style=for-the-badge&logo=whatsapp)
![Stockfish Engine](https://img.shields.io/badge/Stockfish-16%2B%20UCI-blue?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Gemini%20Vision-2.5%20Flash%20%2B%20Lite-purple?style=for-the-badge)

---

## 📖 Overview

**MetaChess Command Center** is a real-time, non-invasive chess assistance and broadcast system. It allows a player wearing **Ray-Ban Meta Smart Glasses** to sit at an over-the-board (OTB) chess game, start a standard video call via WhatsApp to their Windows computer, and receive instant, grandmaster-level Stockfish move recommendations broadcasted **visually back into their video call screen** without ever needing speakers or audio earpieces.

### Key Innovations:
- **Zero WhatsApp API or Credentials Required**: The app never logs into WhatsApp. Whatever WhatsApp account is already running on the Windows machine is the one the glasses call and you answer.
- **The "Reverse Agent" Consensus Gate**: Prevents hallucinated or flickering moves by strictly enforcing that a legal move is confirmed only when **2+ consecutive frames** agree on the exact same candidate move with **3+ squares of physical evidence** (vacated origin, occupied destination, and verified context/anchor pieces).
- **The "Jev" Pre-Check**: Fast, multi-stage cost filter using local OpenCV blur/motion variance followed by `gemini-2.5-flash-lite` structured evaluation to drop blurry, mid-motion, or hand-occluded frames, slashing Gemini API costs by ~68%.
- **Silent High-Contrast Visual Return**: Generates a 1280×720 HUD streamed straight to Windows OBS Virtual Camera so the glasses wearer sees giant high-contrast arrows and text (`BEST MOVE: Nf3 -> e5 (+1.4)`) on their video feed.
- **Dual-Tab Web Command Center**:
  - **Tab 1: Workflow Canvas**: An interactive node-based architecture graph displaying the 6 workflow nodes with live pulsing execution states, frame counters, and cost-saved metrics.
  - **Tab 2: Command Center & Broadcast**: Live HUD showing the WhatsApp camera feed, 3+ square evidence bounding boxes, giant Stockfish recommendation, evaluation bar, commit log ledger, and PGN export.

---

## 🏗️ System Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │   Ray-Ban Meta Smart Glasses (First-Person View)       │
 └──────────────────────────┬─────────────────────────────┘
                            │ WhatsApp Video Call
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   NODE 1: CALL VIDEO AND SPEECH ("Eyes and Mouth")      │
 │   - Windows WhatsApp Desktop Window Grab (mss)         │
 │   - Zero API credentials needed                        │
 └──────────────────────────┬─────────────────────────────┘
                            │ 1.0 FPS BGR Frames
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   NODE 2: THE JEV PRE-CHECK (Fast & Cheap Filter)      │
 │   - Stage 2A: OpenCV Laplacian Blur Variance (Free)    │
 │   - Stage 2B: gemini-2.5-flash-lite JSON Pre-Check     │
 │   - Drops blurry / occluded frames -> saves ~68% $     │
 └──────────────────────────┬─────────────────────────────┘
                            │ Sharp, Unoccluded Board Crops
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   NODE 3: MOVE CONFIRMED ("Reverse Agent" Consensus)   │
 │   - Expensive Vision: gemini-2.5-flash / pro           │
 │   - python-chess legal moves deterministic simulation  │
 │   - Consensus Gate: 2+ Frames in a row & 3+ Squares     │
 └──────────────────────────┬─────────────────────────────┘
                            │ Verified Move Push to Board
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   NODE 4: ENGINE TURN PROMPT (Stockfish Engine)        │
 │   - Stockfish 16+ UCI / Local Positional Minimax       │
 │   - Best move UCI/SAN, Centipawns (+1.4), PV lines     │
 └──────────────────────────┬─────────────────────────────┘
                            │ Best Move Vector & Evaluation
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   NODE 5: COMMIT IS LOGGED FOR COMMAND CENTER          │
 │   - Immutable ledger: Ply, SAN, UCI, Evidence Squares  │
 │   - WebSocket broadcast to all connected web clients   │
 └──────────────────────────┬─────────────────────────────┘
                            │ Real-time Telemetry & State
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   NODE 6: RECORD AND BROADCAST A GAME                  │
 │   - Live game.pgn & JSON replay logs                   │
 │   - 1280x720 HUD to Windows Virtual Cam (pyvirtualcam) │
 │   - Displayed in WhatsApp call or /visual-return route │
 └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Prerequisites & Required Hardware / Programs

### 1. Hardware Requirements
| Item | Description |
| :--- | :--- |
| **Ray-Ban Meta Smart Glasses** | Any Ray-Ban Meta generation with video-calling capability enabled in the Meta View app. |
| **Windows PC** | Windows 10 or Windows 11 (64-bit) running the WhatsApp call and local server. |
| **Smartphone** | iOS or Android with the Meta View app and WhatsApp installed. |
| **Physical Chess Board** | Standard 8×8 wooden, vinyl, or digital chessboard. |

### 2. Software Requirements (Install on Windows)
1. **Python 3.10, 3.11, or 3.12**
   - Download from [python.org](https://www.python.org/downloads/).
   - ⚠️ **Important**: Check the box **"Add python.exe to PATH"** during installation.
2. **WhatsApp Desktop for Windows**
   - Download from the [Microsoft Store](https://apps.microsoft.com/detail/9nksqgp742ff) or [whatsapp.com/download](https://www.whatsapp.com/download).
   - Log into a secondary WhatsApp account or your personal account.
3. **OBS Studio (Optional but Recommended for Virtual Camera)**
   - Download from [obsproject.com](https://obsproject.com/).
   - Includes **OBS Virtual Camera** which Windows WhatsApp Desktop can select as its video input device.
4. **Stockfish Chess Engine Binary**
   - Download the Windows binary (AVX2 or modern 64-bit) from [stockfishchess.org/download](https://stockfishchess.org/download/).
   - Extract `stockfish.exe` into the project root directory or place it in `C:\stockfish\stockfish.exe`.
   - *Note*: If Stockfish is omitted, the application automatically falls back to its built-in Python minimax positional engine.
5. **Google Gemini API Key**
   - Obtain a key from [Google AI Studio](https://aistudio.google.com/).

---

## 🚀 Quickstart Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/metachess-command-center.git
cd metachess-command-center
```

### Step 2: Create and Activate a Python Virtual Environment
Open PowerShell or Command Prompt in the project folder:
```powershell
python -m venv venv
.\venv\Scripts\activate
```

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
Edit `.env` in Notepad or VS Code:
```env
# Gemini API Key (Required for Stage 2B Pre-check & Stage 3 Reverse Agent)
GEMINI_API_KEY="your-gemini-api-key-here"

# Path to local Stockfish binary (optional, defaults to stockfish.exe or fallback engine)
STOCKFISH_PATH="stockfish.exe"

# WhatsApp window capture configuration
CAPTURE_WINDOW_TITLE="WhatsApp"
CAPTURE_FPS=1.0

# Consensus Gate Thresholds
MIN_CONSECUTIVE_FRAMES=2
MIN_EVIDENCE_SQUARES=3
CONFIDENCE_THRESHOLD=0.80

# Port
PORT=8000
```

---

## 🎮 How to Use (Step-by-Step Operational Workflow)

### Step 1: Configure Virtual Camera in WhatsApp Desktop
1. Open **WhatsApp Desktop** on your Windows PC.
2. Go to **Settings** (`Ctrl + ,`) -> **Audio & Video**.
3. Under the **Camera** dropdown, select **OBS Virtual Camera** (or the virtual webcam created by `pyvirtualcam`).
4. *Result*: WhatsApp Desktop will transmit whatever frame MetaChess generates back to the video call screen!

### Step 2: Initiate the Video Call from Ray-Ban Meta Glasses
1. Wear your Ray-Ban Meta Smart Glasses.
2. Start a WhatsApp video call to the account logged into your Windows PC:
   - Voice command: *"Hey Meta, call [Computer Contact Name] on WhatsApp video."*
   - Or tap the call button in the WhatsApp mobile app and select the glasses as camera source.
3. Answer the incoming call on Windows WhatsApp Desktop.
4. Position the active WhatsApp call window on any of your monitors so the chessboard is visible in the video preview.

### Step 3: Launch MetaChess Command Center
In your activated terminal:
```powershell
python app.py
```
Or for full-stack Node.js + React live dev preview:
```powershell
npm run dev
```

### Step 4: Open the Command Center Web UI
Open your browser to:
- **Dual-Tab Command Center**: [http://localhost:8000](http://localhost:8000) (or `http://localhost:3000`)
- **Fullscreen Pop-out Visual Return HUD**: [http://localhost:8000/visual-return](http://localhost:8000/visual-return)

### Step 5: Play Over-the-Board Chess
1. **First-Person POV**: Look at the chessboard through your glasses.
2. **Jev Pre-Check**: Frames where your hand is moving or the camera is tilting will automatically be filtered out.
3. **Move Consensus**: Once your hand leaves the board, the Reverse Agent evaluates legal chess moves against the 3+ squares of evidence.
4. **Move Confirmation**: When the same legal move matches across **2+ consecutive frames**, the status switches to `MOVE_CONFIRMED`.
5. **Read the Move**: Look at your phone's WhatsApp screen (or second monitor). The high-contrast neon arrow and giant text will clearly show:
   ```text
   BEST MOVE: Nf3 -> e5 (+1.4)
   ```
   **Zero sound or speech needed.** If you prefer spoken audio, toggle the audio speaker button on the Command Center ribbon!

---

## 🔍 The 6 Workflow Nodes in Depth

### Node 1: Call Video and Speech ("The App's Eyes and Mouth")
> *"This is the app's eyes and mouth — how pictures get in and how moves get out. Both lean on Windows and WhatsApp. The app never logs into WhatsApp; whatever account is signed in on the device is the one the glasses call and you answer."*
- **Screen Grabber**: Uses `mss` and `pygetwindow` to continuously grab the bounding box of the window titled `"WhatsApp"`.
- **ROI Selector Fallback**: If the window is partially covered, a manual region-of-interest can be defined via `config.py`.
- **Moves Out**: Formats a 1280×720 visual return HUD transmitted to Windows Virtual Camera (`pyvirtualcam`) and served at `/visual-return`.

### Node 2: The Jev Pre-Check (Fast & Cheap Frame Filter)
> *"Jev is an optional cheap and fast AI check that looks at each frame before the expensive vision model does. Its only job is to save money by skipping frames that can't teach the app anything."*
- **Stage 2A (Local OpenCV Gate - Free)**: Computes the Laplacian variance `cv2.Laplacian(gray, cv2.CV_64F).var()` to drop motion-blurred frames (< 75.0) and checks frame deltas to catch fast hand occlusion.
- **Stage 2B (Fast AI Pre-check via `gemini-2.5-flash-lite`)**: Downscales frame to 512×512 and queries Gemini using structured JSON output:
  ```json
  {
    "is_board_visible": true,
    "is_hand_occluding": false,
    "has_meaningful_board_change": true,
    "should_invoke_expensive_vision": true,
    "skip_reason": "none"
  }
  ```
- If `should_invoke_expensive_vision` is `false`, the frame is dropped, increasing `frames_skipped` and updating the `cost_saved_usd` ticker.

### Node 3: Move Confirmed ("Reverse Agent" Consensus Gate)
> *"Move confirmed: Needs the same best-fit move on 2+ frames in a row and 3+ squares of evidence, otherwise keep watching (reverse agent)."*
- **Expensive Vision Model (`gemini-2.5-flash` / `pro`)**: Receives high-res board crops, previous crop, current FEN, and legal moves. Returns structured `observed_square_states` (e.g. `[{"square": "e2", "state": "empty", "confidence": 0.96}, ...]`).
- **Deterministic Python Reconciler**:
  - Clones `chess.Board()` and simulates every legal move.
  - Verifies that the vacated origin square is empty, the destination square is occupied by the moved piece, and at least 1 adjacent anchor square is verified (**3+ squares of evidence** with confidence >= 0.80).
  - Selects `best_fit_move`.
- **Consensus Rule**:
  - Requires `evidence_squares >= 3` AND `best_fit_move == previous_frame_best_fit_move` (**2+ consecutive frames**).
  - Transitions to `MOVE_CONFIRMED` and pushes move to `python-chess`.

### Node 4: Engine Turn Prompt (Stockfish Recommendation)
> *"Committed and it's your turn, ask the engine for the best move. Send the current board position to Stockfish and return its recommended move and evaluation."*
- Sends the confirmed position FEN to local Stockfish UCI engine.
- Retrieves:
  - Best move in UCI and SAN (e.g. `g1f3` / `Nf3`).
  - Centipawn evaluation (`+1.42`) or mate countdown (`M3`).
  - Win probability percentage using logistic FIDE curve.
  - Top 3 Principal Variation (PV) lines.
  - Vector arrow coordinates for visual return HUD.

### Node 5: Commit is Logged for Command Center
> *"Commit is logged for Command Center"*
- Appends an immutable audit record containing `commit_id`, timestamp, ply, SAN, UCI, square evidence list, Stockfish evaluation, and frame snapshot.
- Broadcasts real-time JSON event over WebSockets to all connected Command Center tabs.

### Node 6: Record and Broadcast a Game
> *"Record and broadcast a game — saves live PGN/video telemetry and streams the visual recommendation overlay to the Command Center and virtual video call feed."*
- Writes continuously to `./recordings/game.pgn`.
- Renders the 1280×720 high-contrast HUD to the virtual camera and WebSocket feed.

---

## 📁 Repository Deliverables File Map

| File | Purpose |
| :--- | :--- |
| **`app.py`** | FastAPI backend server, 6-node state machine worker, WebSocket broadcaster, and PGN recorder. |
| **`capture_and_virtualcam.py`** | Windows WhatsApp Desktop capture via `mss` & `pygetwindow`, and 1280×720 HUD virtual camera broadcaster via `pyvirtualcam`. |
| **`reverse_agent_pipeline.py`** | Stage 2A local OpenCV blur gate, Stage 2B `gemini-2.5-flash-lite` pre-check, and Stage 3 Reverse Agent consensus gate. |
| **`stockfish_service.py`** | UCI Stockfish engine wrapper with centipawn evaluation, PV lines, and built-in minimax fallback. |
| **`config.py`** | Central configuration for thresholds, Gemini models, framerates, and file paths. |
| **`requirements.txt`** | Full Python dependencies for Windows/Linux. |
| **`templates/index.html`** | Standalone dark-mode dual-tab web application connecting via WebSockets. |
| **`src/`** | Production React SPA with interactive Workflow Canvas, live HUD viewports, and Pop-out HUD. |
| **`server.ts`** | Full-stack Node.js + Express proxy integrating Gemini API server-side with Vite middleware. |

---

## ❓ Troubleshooting & Frequently Asked Questions

### 1. "WhatsApp window not found" error
- **Cause**: The window title might differ depending on language or WhatsApp version.
- **Fix**: Open WhatsApp Desktop and make sure it is not minimized to the system tray. You can adjust `CAPTURE_WINDOW_TITLE` in `.env` or `config.py` (e.g., `CAPTURE_WINDOW_TITLE="WhatsApp"`). If needed, provide manual pixel crop coordinates via `grabber.set_manual_roi(top=100, left=200, width=800, height=800)`.

### 2. "Virtual Camera does not show in WhatsApp"
- **Cause**: Virtual webcam driver is not active.
- **Fix**:
  1. Open **OBS Studio**.
  2. Click **Start Virtual Camera** in the lower right controls dock.
  3. Restart WhatsApp Desktop, and select **OBS Virtual Camera** under Settings > Audio & Video.
  4. Alternatively, use the Pop-out HUD at `http://localhost:8000/visual-return` and screen-share that browser window in WhatsApp!

### 3. "Stockfish executable not found"
- **Cause**: `stockfish.exe` is not in your system PATH or configured directory.
- **Fix**: MetaChess includes an automatic fallback to a built-in positional minimax evaluation engine, so it never crashes. To use real Stockfish 16+, download `stockfish.exe`, place it in the project root folder, and set `STOCKFISH_PATH="stockfish.exe"` in `.env`.

### 4. "How do I download the recorded PGN?"
- In the Command Center (Tab 2), click the **Download PGN** button in the top action bar or bottom of the HUD panel. You can also directly fetch it from `http://localhost:8000/api/pgn`.

---

## 📜 License & Acknowledgments
Built with ❤️ for Ray-Ban Meta Smart Glasses, WhatsApp, Google Gemini Vision, and Stockfish.
Licensed under the Apache 2.0 License.
