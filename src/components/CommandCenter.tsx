import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import {
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Maximize2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Radio,
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StockfishAnalysisResult } from '../utils/chessEngine';
import { ObservedSquare } from '../utils/reverseAgent';
import { ChessPieceSvg } from './ChessPieceSvg';

export interface CommitRecord {
  id: string;
  time: string;
  ply: number;
  san: string;
  uci: string;
  evidenceSquares: string[];
  eval: string;
  winProb: number;
  stockfishReply: string;
}

interface CommandCenterProps {
  chess: Chess;
  stockfishAnalysis: StockfishAnalysisResult;
  observedSquares: ObservedSquare[];
  consecutiveMatches: number;
  commitLogs: CommitRecord[];
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  onReset: () => void;
  onOpenPopout: () => void;
  lastConfirmedMove: string | null;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  chess,
  stockfishAnalysis,
  observedSquares,
  consecutiveMatches,
  commitLogs,
  speechEnabled,
  onToggleSpeech,
  onReset,
  onOpenPopout,
  lastConfirmedMove,
}) => {
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [cameraMode, setCameraMode] = useState<'meta_glasses' | 'park_blitz' | 'club_match' | 'webcam'>('meta_glasses');
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Manage Web Speech API for Node 1 "Audio Speech Return"
  useEffect(() => {
    if (speechEnabled && lastConfirmedMove && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `Move confirmed: ${lastConfirmedMove}. Best reply: ${stockfishAnalysis.bestMoveSan}`
      );
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [lastConfirmedMove, speechEnabled, stockfishAnalysis.bestMoveSan]);

  // Webcam stream handler
  useEffect(() => {
    if (cameraMode === 'webcam') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setWebcamActive(true);
          }
        })
        .catch(err => {
          console.warn("Could not access webcam:", err);
          setCameraMode('meta_glasses');
          setWebcamActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    }
  }, [cameraMode]);

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(chess.pgn());
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleDownloadPgn = () => {
    const blob = new Blob([chess.pgn()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metachess-game-${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2D Board Rendering for Visual Return HUD
  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // Check which squares have high confidence evidence
  const evidenceSquareMap = new Map<string, ObservedSquare>();
  for (const obs of observedSquares) {
    if (obs.confidence >= 0.8) {
      evidenceSquareMap.set(obs.square.toLowerCase(), obs);
    }
  }

  // Stockfish arrow coordinates
  const fromSq = stockfishAnalysis.fromSquare;
  const toSq = stockfishAnalysis.toSquare;

  return (
    <div className="space-y-6">
      {/* GIANT HIGH-CONTRAST MOVE BANNER (Node 1 & Node 4 Visual Return) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/80 p-5 shadow-2xl shadow-emerald-950/40">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 rounded">
                Node 4 Stockfish Visual Return (No Speakers Needed)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Turn: {chess.turn() === 'w' ? 'White' : 'Black'}
              </span>
            </div>

            <div className="flex items-baseline gap-4 pt-1">
              <span className="text-sm font-black text-slate-400 uppercase tracking-wider font-mono">
                BEST MOVE:
              </span>
              <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                {stockfishAnalysis.bestMoveSan}
              </span>
              <span className="text-xl md:text-2xl font-bold font-mono text-cyan-300">
                ({stockfishAnalysis.fromSquare} <ArrowRight className="inline w-5 h-5 mx-0.5" /> {stockfishAnalysis.toSquare})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Centipawn score pill */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Engine Evaluation</span>
              <span className={`text-2xl md:text-3xl font-black font-mono px-3 py-1 rounded-lg border ${
                stockfishAnalysis.evalCp >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
              }`}>
                {stockfishAnalysis.evalStr}
              </span>
            </div>

            {/* Audio TTS toggle */}
            <button
              onClick={onToggleSpeech}
              title={speechEnabled ? "Mute Spoken Moves" : "Enable Spoken Moves"}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                speechEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Pop-out HUD button */}
            <button
              onClick={onOpenPopout}
              title="Pop out 1280x720 HUD for OBS or WhatsApp Screen Share"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all cursor-pointer"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* DUAL STREAM VIEWPORTS: Left = WhatsApp Feed, Right = 1280x720 Visual Return Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: WhatsApp Desktop Capture Window (Eyes) */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Node 1: WhatsApp Video In (Ray-Ban Meta POV)
              </span>
            </div>
            {/* Feed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
              <button
                onClick={() => setCameraMode('meta_glasses')}
                className={`px-2 py-0.5 rounded cursor-pointer ${cameraMode === 'meta_glasses' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Glasses POV
              </button>
              <button
                onClick={() => setCameraMode('park_blitz')}
                className={`px-2 py-0.5 rounded cursor-pointer ${cameraMode === 'park_blitz' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Park Blitz
              </button>
              <button
                onClick={() => setCameraMode('webcam')}
                className={`px-2 py-0.5 rounded cursor-pointer ${cameraMode === 'webcam' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Webcam
              </button>
            </div>
          </div>

          {/* Video Frame Canvas */}
          <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            {cameraMode === 'webcam' ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              /* High-fidelity perspective Ray-Ban Meta video feed simulation */
              <div className="relative w-full h-full bg-[#1e2530] flex items-center justify-center p-4">
                {/* Simulated wooden board with perspective shadow */}
                <div className="w-[88%] aspect-square bg-[#7c4f2b] p-3 rounded-lg shadow-2xl border-4 border-[#4a2e18] grid grid-cols-8 grid-rows-8 relative">
                  {Array.from({ length: 64 }).map((_, idx) => {
                    const r = Math.floor(idx / 8);
                    const c = idx % 8;
                    const sqName = `${files[c]}${8 - r}`;
                    const isLight = (r + c) % 2 === 0;
                    const evidence = evidenceSquareMap.get(sqName);

                    return (
                      <div
                        key={sqName}
                        className={`relative flex items-center justify-center text-[10px] font-mono select-none ${
                          isLight ? 'bg-[#dfc49e]' : 'bg-[#9b6a43]'
                        }`}
                      >
                        {/* 3+ Square Evidence Bounding Outline */}
                        {evidence && (
                          <div className="absolute inset-0.5 border-2 border-emerald-400 bg-emerald-500/25 rounded z-10 animate-pulse flex items-start justify-start p-0.5">
                            <span className="text-[8px] font-bold bg-emerald-950/90 text-emerald-300 px-0.5 rounded leading-none">
                              {Math.round(evidence.confidence * 100)}%
                            </span>
                          </div>
                        )}
                        {/* Coordinate marks on border */}
                        {c === 0 && <span className="absolute left-0.5 top-0.5 text-[8px] text-slate-700/60 font-bold">{8 - r}</span>}
                        {r === 7 && <span className="absolute right-0.5 bottom-0.5 text-[8px] text-slate-700/60 font-bold">{files[c]}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Ray-Ban Meta Call Status Overlay */}
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-emerald-500/30 px-2.5 py-1 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  RAY-BAN META [WHATSAPP CALL ACTIVE]
                </div>
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-slate-700 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300">
                  Target: WhatsApp Desktop (Zero API required)
                </div>
              </div>
            )}
          </div>

          {/* 3+ Square Evidence Chips List */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Node 3 Reverse Agent Evidence (Needs 3+ squares):
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {observedSquares.length} squares verified
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {observedSquares.map((sq, i) => (
                <span
                  key={i}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    sq.confidence >= 0.8
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-white">{sq.square}:</span>
                  <span>{sq.state}</span>
                  <span className="text-[10px] opacity-75">({Math.round(sq.confidence * 100)}%)</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: 1280x720 Visual Return Broadcast (Virtual Cam & Screen Share) */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Node 6: Visual Return (OBS / WhatsApp Virtual Cam)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
              1280x720 HUD @ 20 FPS
            </span>
          </div>

          {/* Visual Return Broadcast Viewport */}
          <div className="relative aspect-[4/3] bg-slate-950 flex p-3 gap-3 overflow-hidden">
            {/* Board View with Giant Arrow */}
            <div className="flex-1 aspect-square bg-[#1e293b] rounded-lg border-2 border-slate-700 overflow-hidden grid grid-cols-8 grid-rows-8 relative shadow-xl">
              {board.map((row, r) =>
                row.map((piece, c) => {
                  const sq = `${files[c]}${8 - r}`;
                  const isLight = (r + c) % 2 === 0;
                  const isFrom = sq === fromSq;
                  const isTo = sq === toSq;

                  return (
                    <div
                      key={sq}
                      className={`relative flex items-center justify-center text-lg md:text-2xl font-bold select-none ${
                        isFrom
                          ? 'bg-cyan-500/40'
                          : isTo
                          ? 'bg-emerald-500/50'
                          : isLight
                          ? 'bg-slate-300 text-slate-900'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {piece && (
                        <div className="w-3/4 h-3/4 flex items-center justify-center drop-shadow-md">
                          <ChessPieceSvg type={piece.type} color={piece.color} className="w-full h-full" />
                        </div>
                      )}
                      {/* Square label */}
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-40 font-mono">
                        {sq}
                      </span>
                    </div>
                  );
                })
              )}

              {/* High-visibility Neon Arrow overlay */}
              {fromSq && toSq && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  <svg className="w-full h-full">
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#00ffcc" />
                      </marker>
                    </defs>
                    <line
                      x1={`${(files.indexOf(fromSq[0]) + 0.5) * 12.5}%`}
                      y1={`${((8 - parseInt(fromSq[1])) + 0.5) * 12.5}%`}
                      x2={`${(files.indexOf(toSq[0]) + 0.5) * 12.5}%`}
                      y2={`${((8 - parseInt(toSq[1])) + 0.5) * 12.5}%`}
                      stroke="#00ffcc"
                      strokeWidth="6"
                      strokeLinecap="round"
                      markerEnd="url(#arrow)"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Right Eval Bar & PV Lines */}
            <div className="w-20 md:w-28 flex flex-col gap-2">
              <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 p-2 flex flex-col items-center justify-between">
                <span className="text-[9px] font-mono text-slate-400 uppercase text-center">Eval Bar</span>
                {/* Physical Eval Bar */}
                <div className="w-6 flex-1 bg-slate-800 rounded-full my-2 relative overflow-hidden border border-slate-700">
                  <div
                    className="absolute bottom-0 w-full bg-white transition-all duration-300"
                    style={{ height: `${stockfishAnalysis.winProbability * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-white">
                  {stockfishAnalysis.evalStr}
                </span>
              </div>

              {/* Top Variation */}
              <div className="bg-slate-900 rounded-lg border border-slate-800 p-2 text-[10px] font-mono text-slate-300 space-y-1">
                <span className="text-slate-500 block uppercase text-[8px] font-bold">Top PV Line</span>
                <div className="font-bold text-cyan-300 truncate">
                  {stockfishAnalysis.top3Pv[0] || 'Analyzing...'}
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Controls Bar */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400">
              WhatsApp screen-share ready (100% readable without audio)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPgn}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer font-mono text-[11px]"
              >
                {copiedPgn ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedPgn ? 'Copied PGN' : 'Copy PGN'}
              </button>
              <button
                onClick={handleDownloadPgn}
                className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer font-mono text-[11px]"
              >
                <Download className="w-3 h-3" />
                PGN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COMMIT LOGS TABLE (Node 5) */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Node 5: Command Center Commit Logs
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {commitLogs.length} Committed Moves
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Reverse Agent Consensus Audit Trail (2+ consecutive frames & 3+ squares evidence verified)
            </p>
          </div>
          <button
            onClick={onReset}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1 cursor-pointer font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Board
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Commit ID</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Ply #</th>
                <th className="py-2.5 px-4">Move (SAN)</th>
                <th className="py-2.5 px-4">UCI Vector</th>
                <th className="py-2.5 px-4">Evidence Squares</th>
                <th className="py-2.5 px-4">Stockfish Eval</th>
                <th className="py-2.5 px-4">Best Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {commitLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Watching WhatsApp feed. Confirmed moves will be committed here automatically.
                  </td>
                </tr>
              ) : (
                commitLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 text-cyan-400 font-bold">{log.id}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.time}</td>
                    <td className="py-2.5 px-4 text-slate-300">#{log.ply}</td>
                    <td className="py-2.5 px-4 text-white font-bold text-sm">{log.san}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.uci}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {log.evidenceSquares.map((sq, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                            {sq}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">{log.eval}</td>
                    <td className="py-2.5 px-4 text-cyan-300 font-semibold">{log.stockfishReply}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getPieceSymbol(type: string, color: string): string {
  const isWhite = color === 'w';
  switch (type) {
    case 'p': return isWhite ? '♙' : '♟';
    case 'n': return isWhite ? '♘' : '♞';
    case 'b': return isWhite ? '♗' : '♝';
    case 'r': return isWhite ? '♖' : '♜';
    case 'q': return isWhite ? '♕' : '♛';
    case 'k': return isWhite ? '♔' : '♚';
    default: return '';
  }
}
