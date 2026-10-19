import React, { useState } from 'react';
import {
  Eye,
  Filter,
  CheckCircle2,
  Cpu,
  Database,
  Radio,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  DollarSign
} from 'lucide-react';

export interface NodeTelemetry {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  status: 'active' | 'pulsing' | 'ready' | 'skipped' | 'confirmed' | 'idle';
  metricLabel: string;
  metricValue: string;
  badge: string;
  details: {
    inputs: string[];
    outputs: string[];
    coreLogic: string;
    techStack: string;
  };
}

interface WorkflowCanvasProps {
  currentStage: number;
  totalFrames: number;
  costSavedUsd: number;
  confirmedMoves: number;
  bestMoveSan: string;
  bestMoveUci: string;
  evalStr: string;
  consecutiveMatches: number;
  evidenceSquaresCount: number;
  onSimulateStep: () => void;
  onReset: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  currentStage,
  totalFrames,
  costSavedUsd,
  confirmedMoves,
  bestMoveSan,
  bestMoveUci,
  evalStr,
  consecutiveMatches,
  evidenceSquaresCount,
  onSimulateStep,
  onReset,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const nodes: NodeTelemetry[] = [
    {
      id: 1,
      name: "Call Video and Speech",
      subtitle: "The App's Eyes and Mouth",
      description: "This is the app's eyes and mouth — how pictures get in and how moves get out. Both lean on Windows and WhatsApp. The app never logs into WhatsApp; whatever account is signed in on the device is the one the glasses call and you answer.",
      status: currentStage === 1 ? 'pulsing' : 'active',
      metricLabel: "Capture Rate",
      metricValue: "1.0 FPS @ 12ms",
      badge: "WINDOWS & WHATSAPP",
      details: {
        inputs: ["Windows WhatsApp Desktop video call window", "Ray-Ban Meta Smart Glasses camera feed"],
        outputs: ["1280x720 BGR frame crops", "pyvirtualcam OBS Virtual Camera stream", "Speech TTS audio"],
        coreLogic: "mss & pygetwindow capture active window without any API credentials; pyvirtualcam transmits visual HUD back to phone call screen.",
        techStack: "mss, pygetwindow, pyvirtualcam, OpenCV, Web Speech API"
      }
    },
    {
      id: 2,
      name: "The Jev Pre-Check",
      subtitle: "Fast & Cheap Frame Filter",
      description: "Jev is an optional cheap and fast AI check that looks at each frame before the expensive vision model does. Its only job is to save money by skipping frames that can't teach the app anything.",
      status: currentStage === 2 ? 'pulsing' : 'ready',
      metricLabel: "Cost Saved",
      metricValue: `$${costSavedUsd.toFixed(4)} (68% skipped)`,
      badge: "FLASH-LITE FILTER",
      details: {
        inputs: ["Raw WhatsApp frame crop", "Previous gray frame buffer"],
        outputs: ["should_invoke_expensive_vision (boolean)", "skip_reason string"],
        coreLogic: "Stage 2A measures Laplacian blur variance and pixel motion delta. Stage 2B sends 512x512 thumbnail to gemini-2.5-flash-lite structured output to drop occluded/useless frames.",
        techStack: "gemini-2.5-flash-lite, OpenCV Laplacian, Structured JSON Output"
      }
    },
    {
      id: 3,
      name: "Move Confirmed",
      subtitle: '"Reverse Agent" Consensus Gate',
      description: "Move confirmed: Needs the same best-fit move on 2+ frames in a row and 3+ squares of evidence, otherwise keep watching (reverse agent).",
      status: currentStage === 3 ? 'pulsing' : (consecutiveMatches >= 2 ? 'confirmed' : 'active'),
      metricLabel: "Consensus Progress",
      metricValue: `${consecutiveMatches}/2 frames | ${evidenceSquaresCount} squares`,
      badge: "2+ FRAMES & 3+ SQUARES",
      details: {
        inputs: ["High-res board crop", "Previous board crop", "Current FEN", "Legal UCI moves list"],
        outputs: ["MOVE_CONFIRMED or KEEP_WATCHING", "observed_square_states", "best_fit_move"],
        coreLogic: "Deterministic legal move scoring in python-chess. Verifies vacated origin, occupied destination, and anchor context squares (>=3 squares of evidence) across 2+ consecutive frames.",
        techStack: "gemini-2.5-flash / pro, python-chess legal moves simulator"
      }
    },
    {
      id: 4,
      name: "Engine Turn Prompt",
      subtitle: "Stockfish Recommendation",
      description: "Committed and it's your turn, ask the engine for the best move. Send the current board position to Stockfish and return its recommended move and evaluation.",
      status: currentStage === 4 ? 'pulsing' : 'ready',
      metricLabel: "Engine Output",
      metricValue: `${bestMoveSan} (${evalStr})`,
      badge: "STOCKFISH 16+ UCI",
      details: {
        inputs: ["Confirmed post-move FEN", "Player color configuration (White/Black)"],
        outputs: ["best_move_uci / san", "centipawn evaluation score", "win probability", "top 3 PV lines"],
        coreLogic: "Queries local Stockfish UCI engine over pipe (with built-in positional minimax heuristic fallback) to produce top moves and neon visual arrow coordinates.",
        techStack: "Stockfish UCI, chess.engine.SimpleEngine, Evaluation Bar"
      }
    },
    {
      id: 5,
      name: "Commit is Logged",
      subtitle: "Command Center Audit Ledger",
      description: "Commit is logged for Command Center — appends immutable commit record with ply, SAN, UCI, square evidence list, evaluation, and frame thumbnail.",
      status: currentStage === 5 ? 'pulsing' : 'active',
      metricLabel: "Recorded Commits",
      metricValue: `${confirmedMoves} moves committed`,
      badge: "IMMUTABLE AUDIT",
      details: {
        inputs: ["Confirmed move SAN/UCI", "Evidence squares list", "Stockfish best reply", "Frame snapshot"],
        outputs: ["Structured commit record", "In-memory history", "JSON telemetry event"],
        coreLogic: "Creates atomic commit containing move metadata, FEN state, consensus metrics, and broadcasts to all Command Center tabs.",
        techStack: "SQLite / JSON ledger, WebSocket broadcast"
      }
    },
    {
      id: 6,
      name: "Record and Broadcast",
      subtitle: "Visual Call Return & PGN Stream",
      description: "Record and broadcast a game — saves live PGN/video telemetry and streams the visual recommendation overlay to the Command Center and virtual video call feed.",
      status: currentStage === 6 ? 'pulsing' : 'ready',
      metricLabel: "Broadcast Stream",
      metricValue: "1280x720 HUD @ 20 FPS",
      badge: "OBS / VIRTUAL CAM",
      details: {
        inputs: ["Live board position", "Stockfish arrow vector", "Evaluation score", "game.pgn"],
        outputs: ["Windows Virtual Webcam video feed", "Fullscreen /visual-return route", "game.pgn file"],
        coreLogic: "Renders ultra-high contrast 1280x720 HUD with giant move text, neon arrows, and eval bar so glasses wearer can see moves on video call without audio.",
        techStack: "pyvirtualcam, OpenCV HUD renderer, python-chess PGN recorder"
      }
    }
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  const getNodeIcon = (id: number) => {
    switch (id) {
      case 1: return <Eye className="w-5 h-5 text-cyan-400" />;
      case 2: return <Filter className="w-5 h-5 text-amber-400" />;
      case 3: return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 4: return <Cpu className="w-5 h-5 text-blue-400" />;
      case 5: return <Database className="w-5 h-5 text-purple-400" />;
      case 6: return <Radio className="w-5 h-5 text-rose-400" />;
      default: return <Zap className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Pipeline Execution Engine
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Stage {currentStage} of 6 Running • {totalFrames} frames ingested • {confirmedMoves} moves verified
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSimulateStep}
            className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Step Pipeline / Next Frame
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
        </div>
      </div>

      {/* Node Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {nodes.map((node, index) => {
          const isCurrent = currentStage === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`relative rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isCurrent
                  ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                    {getNodeIcon(node.id)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
                      NODE 0{node.id}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {node.name}
                    </h3>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {node.badge}
                </span>
              </div>

              {/* Exact Quote */}
              <div className="text-xs text-slate-300 italic bg-black/30 p-3 rounded-lg border-l-2 border-cyan-400 font-sans leading-relaxed">
                "{node.description}"
              </div>

              {/* Bottom Metadata */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">{node.metricLabel}:</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {node.metricValue}
                </span>
              </div>

              {/* Flow Connector Arrow */}
              {index < 5 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-slate-400 shadow">
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Node Deep-Dive Inspector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <Info className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Node Inspector: {selectedNode.name}
                <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  NODE 0{selectedNode.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400">{selectedNode.subtitle}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Click any card above to inspect architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
              Stage Inputs & Dependencies
            </span>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              {selectedNode.details.inputs.map((inp, idx) => (
                <li key={idx} className="leading-relaxed">{inp}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
              Stage Outputs & Telemetry
            </span>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              {selectedNode.details.outputs.map((out, idx) => (
                <li key={idx} className="leading-relaxed">{out}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
              Reverse Agent Logic & Tech Stack
            </span>
            <p className="text-slate-300 leading-relaxed">
              {selectedNode.details.coreLogic}
            </p>
            <div className="pt-1 text-[11px] font-mono text-cyan-400">
              Stack: {selectedNode.details.techStack}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
