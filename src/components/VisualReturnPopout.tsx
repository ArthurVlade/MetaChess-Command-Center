import React from 'react';
import { Chess } from 'chess.js';
import { StockfishAnalysisResult } from '../utils/chessEngine';
import { ArrowRight, X, Radio } from 'lucide-react';
import { ChessPieceSvg } from './ChessPieceSvg';

interface VisualReturnPopoutProps {
  chess: Chess;
  stockfishAnalysis: StockfishAnalysisResult;
  onClose: () => void;
}

export const VisualReturnPopout: React.FC<VisualReturnPopoutProps> = ({
  chess,
  stockfishAnalysis,
  onClose,
}) => {
  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const fromSq = stockfishAnalysis.fromSquare;
  const toSq = stockfishAnalysis.toSquare;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* Popout Header */}
      <div className="w-full max-w-6xl flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <Radio className="w-4 h-4 animate-pulse" />
          WHATSAPP RETURN BROADCAST (1280x720 HIGH-CONTRAST HUD)
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 1280x720 Canvas Container */}
      <div className="w-full max-w-6xl aspect-[16/9] bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#040711] border-2 border-emerald-500/70 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.3)] mt-4 p-6 flex flex-col justify-between overflow-hidden">
        
        {/* Giant Top Move Banner */}
        <div className="bg-slate-900/90 border-2 border-emerald-400 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-black font-mono text-emerald-400 tracking-wider uppercase">
              RECOMMENDED MOVE:
            </span>
            <span className="text-4xl md:text-5xl font-black font-mono text-white tracking-tight">
              {stockfishAnalysis.bestMoveSan}
            </span>
            <span className="text-2xl font-bold font-mono text-cyan-300">
              ({fromSq} <ArrowRight className="inline w-6 h-6 mx-1" /> {toSq})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-400">
              Engine Advantage:
            </span>
            <span className="text-3xl font-black font-mono px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
              {stockfishAnalysis.evalStr}
            </span>
          </div>
        </div>

        {/* Center: Board + Eval Bar + Principal Variation */}
        <div className="flex-1 flex gap-6 items-center justify-center my-4 overflow-hidden">
          {/* 2D Board with Arrow */}
          <div className="aspect-square h-full max-h-[460px] bg-slate-800 rounded-xl border-4 border-slate-700 grid grid-cols-8 grid-rows-8 relative shadow-2xl overflow-hidden">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const sq = `${files[c]}${8 - r}`;
                const isLight = (r + c) % 2 === 0;
                const isFrom = sq === fromSq;
                const isTo = sq === toSq;

                return (
                  <div
                    key={sq}
                    className={`relative flex items-center justify-center text-3xl md:text-4xl font-bold select-none ${
                      isFrom
                        ? 'bg-cyan-500/50'
                        : isTo
                        ? 'bg-emerald-500/60'
                        : isLight
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {piece && (
                      <div className="w-3/4 h-3/4 flex items-center justify-center drop-shadow-md">
                        <ChessPieceSvg type={piece.type} color={piece.color} className="w-full h-full" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono opacity-50">
                      {sq}
                    </span>
                  </div>
                );
              })
            )}

            {/* Neon Arrow Vector */}
            {fromSq && toSq && (
              <div className="absolute inset-0 pointer-events-none z-20">
                <svg className="w-full h-full">
                  <defs>
                    <marker id="popout-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#00ffcc" />
                    </marker>
                  </defs>
                  <line
                    x1={`${(files.indexOf(fromSq[0]) + 0.5) * 12.5}%`}
                    y1={`${((8 - parseInt(fromSq[1])) + 0.5) * 12.5}%`}
                    x2={`${(files.indexOf(toSq[0]) + 0.5) * 12.5}%`}
                    y2={`${((8 - parseInt(toSq[1])) + 0.5) * 12.5}%`}
                    stroke="#00ffcc"
                    strokeWidth="8"
                    strokeLinecap="round"
                    markerEnd="url(#popout-arrow)"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Vertical Evaluation Bar */}
          <div className="w-16 h-full max-h-[460px] bg-slate-900 rounded-xl border border-slate-700 p-2 flex flex-col items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">EVAL</span>
            <div className="w-8 flex-1 bg-slate-950 rounded-full my-2 relative overflow-hidden border border-slate-800">
              <div
                className="absolute bottom-0 w-full bg-white transition-all duration-300"
                style={{ height: `${stockfishAnalysis.winProbability * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {Math.round(stockfishAnalysis.winProbability * 100)}%
            </span>
          </div>
        </div>

        {/* Bottom Banner Info */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span>Stream Target: OBS Virtual Cam / WhatsApp Video Call Screen</span>
          <span>Engine: Stockfish 16+ UCI • Depth 15</span>
        </div>
      </div>
    </div>
  );
};

function getSymbol(type: string, color: string): string {
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
