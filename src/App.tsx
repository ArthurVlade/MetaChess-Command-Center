/**
 * MetaChess Command Center - Main Application
 * Dual-Tab UI:
 * - Tab 1: Workflow Canvas (Interactive 6-Node Architecture Graph)
 * - Tab 2: Command Center & Broadcast (Live HUD, 3+ Evidence Squares, Giant Stockfish Visual Arrow)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  Layers,
  Activity,
  FileCode,
  Maximize2,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Eye,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { CommandCenter, CommitRecord } from './components/CommandCenter';
import { VisualReturnPopout } from './components/VisualReturnPopout';
import { PythonSuiteModal } from './components/PythonSuiteModal';
import { DocsGuideModal } from './components/DocsGuideModal';
import { BookOpen } from 'lucide-react';
import { evaluatePosition, StockfishAnalysisResult } from './utils/chessEngine';
import { ReverseAgentEngine, ObservedSquare } from './utils/reverseAgent';

export default function App() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'command'>('canvas');
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);
  const [showPopout, setShowPopout] = useState<boolean>(false);
  const [showPythonSuite, setShowPythonSuite] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);

  // Core chess game state
  const chessRef = useRef<Chess>(new Chess());
  const [chessVersion, setChessVersion] = useState<number>(0);

  // Reverse Agent Engine instance (Node 3 consensus gate)
  const reverseAgentRef = useRef<ReverseAgentEngine>(new ReverseAgentEngine(2, 3));

  // Telemetry state
  const [totalFrames, setTotalFrames] = useState<number>(142);
  const [costSavedUsd, setCostSavedUsd] = useState<number>(0.2450);
  const [confirmedMoves, setConfirmedMoves] = useState<number>(2);
  const [consecutiveMatches, setConsecutiveMatches] = useState<number>(0);
  const [lastConfirmedMove, setLastConfirmedMove] = useState<string | null>('e4');

  // Observed evidence squares (Node 3)
  const [observedSquares, setObservedSquares] = useState<ObservedSquare[]>([
    { square: 'e2', state: 'empty', confidence: 0.96 },
    { square: 'e4', state: 'white_pawn', confidence: 0.98 },
    { square: 'd2', state: 'white_pawn', confidence: 0.92 },
    { square: 'f2', state: 'white_pawn', confidence: 0.89 },
  ]);

  // Stockfish engine analysis (Node 4)
  const [stockfishAnalysis, setStockfishAnalysis] = useState<StockfishAnalysisResult>(() =>
    evaluatePosition(chessRef.current)
  );

  // Commit history (Node 5)
  const [commitLogs, setCommitLogs] = useState<CommitRecord[]>([
    {
      id: 'commit-0002',
      time: '12:04:18',
      ply: 2,
      san: 'e5',
      uci: 'e7e5',
      evidenceSquares: ['e7', 'e5', 'd7', 'f7'],
      eval: '+0.32',
      winProb: 0.54,
      stockfishReply: 'Nf3',
    },
    {
      id: 'commit-0001',
      time: '12:04:02',
      ply: 1,
      san: 'e4',
      uci: 'e2e4',
      evidenceSquares: ['e2', 'e4', 'd2', 'f2'],
      eval: '+0.35',
      winProb: 0.55,
      stockfishReply: 'e5',
    },
  ]);

  // Recalculate Stockfish when chess state changes
  useEffect(() => {
    const analysis = evaluatePosition(chessRef.current);
    setStockfishAnalysis(analysis);
  }, [chessVersion]);

  // Main automated simulation loop (emulating real-time WhatsApp feed at 1.0 FPS)
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setTotalFrames(prev => prev + 1);

      // Node 1: Capture frame
      setCurrentStage(1);

      // Node 2: Fast Pre-Check (simulated 30% skip rate for savings)
      setTimeout(() => {
        setCurrentStage(2);
        const shouldSkip = Math.random() < 0.28;
        if (shouldSkip) {
          setCostSavedUsd(prev => prev + 0.0025);
          return;
        }

        // Node 3: Reverse Agent Consensus Gate
        setTimeout(() => {
          setCurrentStage(3);

          // Get legal moves from chess
          const moves = chessRef.current.moves({ verbose: true });
          if (moves.length === 0) return;

          // Process current frame through reverse agent
          const result = reverseAgentRef.current.processFrame(
            chessRef.current.fen(),
            observedSquares,
            0.80
          );

          setConsecutiveMatches(result.consecutiveMatches);

          if (result.status === 'MOVE_CONFIRMED' && result.bestFitMove) {
            const confirmed = result.bestFitMove;
            try {
              chessRef.current.move({
                from: confirmed.originSquare,
                to: confirmed.destSquare,
              });
              setChessVersion(v => v + 1);
              setConfirmedMoves(m => m + 1);
              setLastConfirmedMove(confirmed.sanMove);

              // Node 4: Stockfish Engine recommendation
              setCurrentStage(4);

              // Node 5: Commit Logged
              setTimeout(() => {
                setCurrentStage(5);
                const newCommit: CommitRecord = {
                  id: `commit-${(commitLogs.length + 1).toString().padStart(4, '0')}`,
                  time: new Date().toTimeString().slice(0, 8),
                  ply: chessRef.current.history().length,
                  san: confirmed.sanMove,
                  uci: confirmed.uciMove,
                  evidenceSquares: confirmed.matchedSquares,
                  eval: stockfishAnalysis.evalStr,
                  winProb: stockfishAnalysis.winProbability,
                  stockfishReply: stockfishAnalysis.bestMoveSan,
                };
                setCommitLogs(prev => [newCommit, ...prev]);

                // Node 6: Broadcast
                setTimeout(() => {
                  setCurrentStage(6);
                }, 300);
              }, 400);

            } catch (err) {
              console.error("Move application error:", err);
            }
          }
        }, 350);
      }, 300);

    }, 3200);

    return () => clearInterval(timer);
  }, [isSimulating, observedSquares, commitLogs.length, stockfishAnalysis.evalStr, stockfishAnalysis.winProbability, stockfishAnalysis.bestMoveSan]);

  // Manual step trigger
  const handleSimulateStep = () => {
    setTotalFrames(f => f + 1);
    const moves = chessRef.current.moves({ verbose: true });
    if (moves.length === 0) return;

    // Pick first viable legal move
    const nextMove = moves[0];
    const from = nextMove.from;
    const to = nextMove.to;

    // Update observed squares with high confidence evidence
    const nextObs: ObservedSquare[] = [
      { square: from, state: 'empty', confidence: 0.95 },
      { square: to, state: `${nextMove.color === 'w' ? 'white' : 'black'}_${nextMove.piece}`, confidence: 0.97 },
      { square: 'd2', state: 'white_pawn', confidence: 0.92 },
      { square: 'f2', state: 'white_pawn', confidence: 0.89 },
    ];
    setObservedSquares(nextObs);

    // Feed to Reverse Agent
    const res = reverseAgentRef.current.processFrame(chessRef.current.fen(), nextObs, 0.8);
    setConsecutiveMatches(res.consecutiveMatches);

    if (res.status === 'MOVE_CONFIRMED' && res.bestFitMove) {
      chessRef.current.move(nextMove);
      setChessVersion(v => v + 1);
      setConfirmedMoves(m => m + 1);
      setLastConfirmedMove(nextMove.san);
      setCurrentStage(4);
    } else {
      setCurrentStage(3);
    }
  };

  const handleResetGame = () => {
    chessRef.current.reset();
    reverseAgentRef.current.reset();
    setChessVersion(v => v + 1);
    setCommitLogs([]);
    setConfirmedMoves(0);
    setConsecutiveMatches(0);
    setLastConfirmedMove(null);
    setCurrentStage(1);
    fetch('/api/reset', { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-black tracking-tight text-white">
                MetaChess Command Center
              </h1>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE PIPELINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Ray-Ban Meta Smart Glasses + Windows WhatsApp + Gemini Vision + Stockfish
            </p>
          </div>
        </div>

        {/* Dual Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'canvas'
                ? 'bg-slate-800 text-cyan-300 shadow-md shadow-black/40 border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Tab 1: Workflow Canvas
          </button>
          <button
            onClick={() => setActiveTab('command')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'command'
                ? 'bg-slate-800 text-emerald-300 shadow-md shadow-black/40 border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Tab 2: Command Center & Broadcast
          </button>
        </div>

        {/* Top Action Bar */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDocs(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-mono"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            Docs & Setup Guide
          </button>

          <button
            onClick={() => setShowPopout(true)}
            title="Open Fullscreen 1280x720 HUD for Screen Sharing"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer font-mono"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Pop-out HUD
          </button>

          <button
            onClick={() => setShowPythonSuite(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-mono"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            Python Suite (7 Files)
          </button>
        </div>
      </header>

      {/* Real-time Telemetry Stats Ribbon */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 md:px-8 py-2.5 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Glasses Video (Eyes)</span>
          <span className="text-white font-bold text-sm">1.0 FPS Active</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Ingested Frames</span>
          <span className="text-slate-200 font-bold text-sm">{totalFrames}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Jev Pre-check Savings</span>
          <span className="text-emerald-400 font-bold text-sm flex items-center gap-0.5">
            ${costSavedUsd.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Consensus Gate Rule</span>
          <span className="text-amber-400 font-bold text-sm">2+ Frames & 3+ Sq</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Confirmed Moves</span>
          <span className="text-cyan-400 font-bold text-sm">{confirmedMoves}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-bold">Windows Return Output</span>
          <span className="text-rose-400 font-bold text-sm">OBS Virtual Cam</span>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeTab === 'canvas' ? (
          <WorkflowCanvas
            currentStage={currentStage}
            totalFrames={totalFrames}
            costSavedUsd={costSavedUsd}
            confirmedMoves={confirmedMoves}
            bestMoveSan={stockfishAnalysis.bestMoveSan}
            bestMoveUci={stockfishAnalysis.bestMoveUci}
            evalStr={stockfishAnalysis.evalStr}
            consecutiveMatches={consecutiveMatches}
            evidenceSquaresCount={observedSquares.length}
            onSimulateStep={handleSimulateStep}
            onReset={handleResetGame}
          />
        ) : (
          <CommandCenter
            chess={chessRef.current}
            stockfishAnalysis={stockfishAnalysis}
            observedSquares={observedSquares}
            consecutiveMatches={consecutiveMatches}
            commitLogs={commitLogs}
            speechEnabled={speechEnabled}
            onToggleSpeech={() => setSpeechEnabled(s => !s)}
            onReset={handleResetGame}
            onOpenPopout={() => setShowPopout(true)}
            lastConfirmedMove={lastConfirmedMove}
          />
        )}
      </main>

      {/* Fullscreen Pop-out HUD Modal */}
      {showPopout && (
        <VisualReturnPopout
          chess={chessRef.current}
          stockfishAnalysis={stockfishAnalysis}
          onClose={() => setShowPopout(false)}
        />
      )}

      {/* Python Suite Deliverables Modal */}
      {showPythonSuite && (
        <PythonSuiteModal
          onClose={() => setShowPythonSuite(false)}
        />
      )}

      {/* Complete Documentation & Setup Guide Modal */}
      {showDocs && (
        <DocsGuideModal
          onClose={() => setShowDocs(false)}
        />
      )}
    </div>
  );
}
