"""
Node 1: Call Video and Speech ("The App's Eyes and Mouth")
Captures incoming frames from the active Windows WhatsApp Desktop video call window
and renders/transmits the high-contrast 1280x720 visual return HUD to a Virtual Camera
(or pop-out web view) to be seen directly on the glasses/phone screen.
"""

import time
import math
import logging
from typing import Optional, Tuple, Dict, Any
import numpy as np
import cv2

try:
    import mss
except ImportError:
    mss = None

try:
    import pygetwindow as gw
except ImportError:
    gw = None

try:
    import pyvirtualcam
except ImportError:
    pyvirtualcam = None

import config

logger = logging.getLogger("MetaChess.CaptureAndVirtualCam")


class WhatsAppFrameGrabber:
    """
    Captures video frames from the active Windows WhatsApp Desktop call window.
    Zero WhatsApp API or credentials required - leverages whatever WhatsApp session
    is already running locally on the Windows desktop.
    """

    def __init__(self, window_title: str = config.CAPTURE_WINDOW_TITLE):
        self.window_title = window_title
        self.sct = mss.mss() if mss else None
        self.manual_roi: Optional[Dict[str, int]] = None  # {'top', 'left', 'width', 'height'}
        self.last_capture_time = 0.0
        self.frame_counter = 0

    def set_manual_roi(self, top: int, left: int, width: int, height: int):
        """Set a fallback ROI crop box when WhatsApp is not full-screen or on specific monitor."""
        self.manual_roi = {
            "top": max(0, top),
            "left": max(0, left),
            "width": max(100, width),
            "height": max(100, height),
        }

    def find_whatsapp_window_bbox(self) -> Optional[Dict[str, int]]:
        """Look up the active WhatsApp Desktop window on Windows."""
        if self.manual_roi:
            return self.manual_roi

        if not gw:
            return None

        try:
            windows = gw.getWindowsWithTitle(self.window_title)
            if not windows:
                return None

            win = windows[0]
            if win.width < 100 or win.height < 100:
                return None

            return {
                "top": int(win.top),
                "left": int(win.left),
                "width": int(win.width),
                "height": int(win.height),
            }
        except Exception as e:
            logger.debug(f"Window search failed: {e}")
            return None

    def capture_frame(self) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Grabs the current frame from WhatsApp.
        Returns (bgr_frame, metadata).
        Falls back to high-fidelity simulated Ray-Ban Meta glasses feed if WhatsApp
        window is minimized, obscured, or running in testing environment.
        """
        now = time.time()
        self.last_capture_time = now
        self.frame_counter += 1

        bbox = self.find_whatsapp_window_bbox()
        if bbox and self.sct:
            try:
                screenshot = self.sct.grab(bbox)
                frame_bgra = np.array(screenshot)
                frame_bgr = cv2.cvtColor(frame_bgra, cv2.COLOR_BGRA2BGR)
                return frame_bgr, {
                    "source": "windows_whatsapp_window",
                    "timestamp": now,
                    "frame_id": self.frame_counter,
                    "bbox": bbox,
                    "width": frame_bgr.shape[1],
                    "height": frame_bgr.shape[0],
                }
            except Exception as e:
                logger.warning(f"Screen grab failed, using fallback generator: {e}")

        # Synthetic Ray-Ban Meta Smart Glasses POV frame generator
        frame_bgr = self._generate_simulated_glasses_frame(self.frame_counter)
        return frame_bgr, {
            "source": "simulated_rayban_meta_feed",
            "timestamp": now,
            "frame_id": self.frame_counter,
            "bbox": {"top": 0, "left": 0, "width": 800, "height": 800},
            "width": frame_bgr.shape[1],
            "height": frame_bgr.shape[0],
        }

    def _generate_simulated_glasses_frame(self, frame_num: int) -> np.ndarray:
        """
        Renders a realistic perspective view of a wooden chessboard with subtle hand/lighting
        variations to emulate real-world Ray-Ban Meta video call POV.
        """
        img = np.zeros((720, 960, 3), dtype=np.uint8)
        # Background table
        img[:] = (35, 45, 55)

        # Draw a warm wooden board
        bx, by, bw, bh = 180, 80, 600, 600
        cv2.rectangle(img, (bx - 12, by - 12), (bx + bw + 12, by + bh + 12), (25, 40, 65), -1)
        cv2.rectangle(img, (bx, by), (bx + bw, by + bh), (40, 60, 90), 2)

        sq_w = bw // 8
        sq_h = bh // 8

        light_color = (195, 218, 235)  # Light wood
        dark_color = (95, 135, 165)    # Dark wood

        for row in range(8):
            for col in range(8):
                x1 = bx + col * sq_w
                y1 = by + row * sq_h
                is_light = (row + col) % 2 == 0
                color = light_color if is_light else dark_color
                cv2.rectangle(img, (x1, y1), (x1 + sq_w, y1 + sq_h), color, -1)

        # Coordinate labels
        files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        for i, f in enumerate(files):
            cv2.putText(img, f, (bx + i * sq_w + 30, by + bh + 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 200, 215), 1, cv2.LINE_AA)
            cv2.putText(img, str(8 - i), (bx - 25, by + i * sq_h + 45),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 200, 215), 1, cv2.LINE_AA)

        # Emulate glasses HUD stamp in corner
        cv2.putText(img, "RAY-BAN META [WHATSAPP CALL ACTIVE]", (30, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 200), 2, cv2.LINE_AA)
        cv2.putText(img, f"FRAME #{frame_num:05d} | 1.0 FPS STREAM", (30, 68),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 180, 200), 1, cv2.LINE_AA)

        return img


class VisualHUDBuilder:
    """
    Builds the high-contrast 1280x720 Visual Return frame designed to be sent
    via Windows Virtual Camera into the WhatsApp video call or displayed on a 2nd screen.
    High visibility ensures the player can see the exact move without needing audio speakers.
    """

    def __init__(self, width: int = config.VIRTUAL_CAM_WIDTH, height: int = config.VIRTUAL_CAM_HEIGHT):
        self.width = width
        self.height = height

    def render_hud_frame(
        self,
        board_fen: str,
        best_move_san: str,
        best_move_uci: str,
        eval_score: str,
        win_prob: float,
        evidence_squares: list,
        turn_color: str = "White",
        is_move_confirmed: bool = True
    ) -> np.ndarray:
        """Renders the 1280x720 HUD frame."""
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)

        # Modern high-contrast dark gradient background
        for y in range(self.height):
            ratio = y / self.height
            frame[y, :] = (int(16 + ratio * 8), int(20 + ratio * 10), int(28 + ratio * 14))

        # Top Banner: Giant move recommendation
        banner_color = (30, 180, 90) if is_move_confirmed else (20, 130, 240)  # Green or Amber
        cv2.rectangle(frame, (30, 20), (self.width - 30, 110), (22, 28, 38), -1)
        cv2.rectangle(frame, (30, 20), (self.width - 30, 110), banner_color, 3)

        label_prefix = "BEST MOVE:" if is_move_confirmed else "ANALYZING..."
        move_text = f"{label_prefix}  {best_move_san}  ({best_move_uci})  [{eval_score}]"
        cv2.putText(frame, move_text, (55, 78),
                    cv2.FONT_HERSHEY_DUPLEX, 1.35, (255, 255, 255), 2, cv2.LINE_AA)

        # Subtext banner
        turn_info = f"Engine Turn: {turn_color} | Win Probability: {int(win_prob * 100)}%"
        cv2.putText(frame, turn_info, (self.width - 450, 78),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 220, 255), 1, cv2.LINE_AA)

        # Left side: 2D Chess Board (520x520)
        bx, by, bsize = 60, 140, 520
        sq_size = bsize // 8
        cv2.rectangle(frame, (bx - 8, by - 8), (bx + bsize + 8, by + bsize + 8), (50, 60, 80), -1)

        for r in range(8):
            for c in range(8):
                x = bx + c * sq_size
                y = by + r * sq_size
                color = (210, 225, 240) if (r + c) % 2 == 0 else (100, 140, 175)
                cv2.rectangle(frame, (x, y), (x + sq_size, y + sq_size), color, -1)

        # Highlight best move arrow if UCI given
        if len(best_move_uci) >= 4:
            f_col = ord(best_move_uci[0]) - ord('a')
            f_row = 8 - int(best_move_uci[1])
            t_col = ord(best_move_uci[2]) - ord('a')
            t_row = 8 - int(best_move_uci[3])

            p1 = (bx + int((f_col + 0.5) * sq_size), by + int((f_row + 0.5) * sq_size))
            p2 = (bx + int((t_col + 0.5) * sq_size), by + int((t_row + 0.5) * sq_size))

            # Thick neon cyan/magenta arrow
            cv2.arrowedLine(frame, p1, p2, (0, 255, 255), 8, tipLength=0.25)
            cv2.circle(frame, p1, 14, (0, 200, 255), -1)
            cv2.circle(frame, p2, 14, (0, 255, 120), -1)

        # Highlight 3+ evidence squares
        for sq in evidence_squares:
            if len(sq) == 2 and 'a' <= sq[0] <= 'h' and '1' <= sq[1] <= '8':
                col = ord(sq[0]) - ord('a')
                row = 8 - int(sq[1])
                ex = bx + col * sq_size
                ey = by + row * sq_size
                cv2.rectangle(frame, (ex + 3, ey + 3), (ex + sq_size - 3, ey + sq_size - 3), (0, 255, 0), 3)

        # Right side: Evaluation bar and Telemetry cards
        # Eval Bar
        eval_x = 620
        eval_y = 140
        eval_w = 40
        eval_h = 520
        cv2.rectangle(frame, (eval_x, eval_y), (eval_x + eval_w, eval_y + eval_h), (30, 30, 40), -1)
        cv2.rectangle(frame, (eval_x, eval_y), (eval_x + eval_w, eval_y + eval_h), (80, 90, 110), 2)

        # Fill eval ratio
        white_h = int(eval_h * win_prob)
        cv2.rectangle(frame, (eval_x + 2, eval_y + eval_h - white_h), (eval_x + eval_w - 2, eval_y + eval_h - 2), (240, 240, 250), -1)

        # Telemetry panel
        tx = 700
        ty = 140
        cv2.rectangle(frame, (tx, ty), (self.width - 40, ty + 520), (22, 28, 40), -1)
        cv2.rectangle(frame, (tx, ty), (self.width - 40, ty + 520), (50, 65, 90), 2)

        cv2.putText(frame, "REVERSE AGENT CONSENSUS", (tx + 25, ty + 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 240, 255), 2, cv2.LINE_AA)

        evidence_str = f"Evidence Squares ({len(evidence_squares)}): {', '.join(evidence_squares) if evidence_squares else 'Watching...'}"
        cv2.putText(frame, evidence_str, (tx + 25, ty + 95),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (200, 220, 240), 1, cv2.LINE_AA)

        rule_text = "Gate: 2+ Frames in a row & 3+ Squares"
        cv2.putText(frame, rule_text, (tx + 25, ty + 135),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (100, 255, 180), 1, cv2.LINE_AA)

        cv2.putText(frame, "WHATSAPP RETURN BROADCAST", (tx + 25, ty + 200),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 200, 0), 2, cv2.LINE_AA)

        status_text = "VIRTUAL WEBCAM: ACTIVE (1280x720 @ 20 FPS)"
        cv2.putText(frame, status_text, (tx + 25, ty + 245),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (160, 240, 160), 1, cv2.LINE_AA)

        cam_info = "OBS Virtual Cam / WhatsApp call feed output"
        cv2.putText(frame, cam_info, (tx + 25, ty + 285),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 180, 200), 1, cv2.LINE_AA)

        # Watermark
        cv2.putText(frame, "MetaChess Windows Suite | Ray-Ban Meta Glasses HUD", (tx + 25, ty + 480),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (120, 140, 170), 1, cv2.LINE_AA)

        return frame


class VirtualCamBroadcaster:
    """
    Transmits the visual return HUD frame to a Windows Virtual Webcam (via pyvirtualcam).
    Allows WhatsApp Desktop to select 'OBS Virtual Camera' as its video device, streaming
    the moves visually back into the phone/glasses video call screen.
    """

    def __init__(self, width: int = config.VIRTUAL_CAM_WIDTH, height: int = config.VIRTUAL_CAM_HEIGHT, fps: int = config.VIRTUAL_CAM_FPS):
        self.width = width
        self.height = height
        self.fps = fps
        self.cam = None
        self.is_active = False
        self._init_cam()

    def _init_cam(self):
        if not pyvirtualcam:
            logger.info("pyvirtualcam not installed; running in HTTP/WebRTC broadcast mode.")
            return

        try:
            self.cam = pyvirtualcam.Camera(width=self.width, height=self.height, fps=self.fps, fmt=pyvirtualcam.PixelFormat.BGR)
            self.is_active = True
            logger.info(f"Virtual camera active: {self.cam.device}")
        except Exception as e:
            logger.warning(f"Could not initialize Windows Virtual Camera: {e}. Falling back to Web HUD.")
            self.cam = None
            self.is_active = False

    def send_frame(self, bgr_frame: np.ndarray):
        """Send a BGR frame to the virtual camera if active."""
        if self.is_active and self.cam:
            try:
                # Resize if needed
                if bgr_frame.shape[0] != self.height or bgr_frame.shape[1] != self.width:
                    bgr_frame = cv2.resize(bgr_frame, (self.width, self.height))
                self.cam.send(bgr_frame)
                self.cam.sleep_until_next_frame()
            except Exception as e:
                logger.error(f"Error sending frame to virtual camera: {e}")

    def close(self):
        if self.cam:
            try:
                self.cam.close()
            except Exception:
                pass
            self.cam = None
            self.is_active = False
