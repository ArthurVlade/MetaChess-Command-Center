import React, { useState } from 'react';
import {
  BookOpen,
  X,
  CheckCircle2,
  Terminal,
  Laptop,
  Eye,
  Radio,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Zap,
  ArrowRight
} from 'lucide-react';

interface DocsGuideModalProps {
  onClose: () => void;
}

export const DocsGuideModal: React.FC<DocsGuideModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'quickstart' | 'prereqs' | 'nodes' | 'troubleshoot'>('quickstart');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                MetaChess Complete Setup & Documentation
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  GITHUB README
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Ray-Ban Meta Glasses • Windows WhatsApp Desktop • Gemini Vision • Stockfish
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-4 py-2 flex items-center gap-2 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveSection('quickstart')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'quickstart' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Quickstart (How to Run)
          </button>
          <button
            onClick={() => setActiveSection('prereqs')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'prereqs' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Prerequisites & Hardware
          </button>
          <button
            onClick={() => setActiveSection('nodes')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'nodes' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            The 6 Workflow Nodes
          </button>
          <button
            onClick={() => setActiveSection('troubleshoot')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'troubleshoot' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Troubleshooting & FAQ
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          
          {activeSection === 'quickstart' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Zero WhatsApp API Credentials Required
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  MetaChess never logs into WhatsApp. Whatever WhatsApp account is signed into WhatsApp Desktop on your Windows machine is the one the glasses call and you answer. Screen capture is handled seamlessly via <code className="text-cyan-300">mss</code> and <code className="text-cyan-300">pygetwindow</code>.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  1. Windows Command Line Installation
                </h4>
                
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                    <span>PowerShell / Command Prompt</span>
                    <button
                      onClick={() => copyToClipboard('python -m venv venv\n.\\venv\\Scripts\\activate\npip install -r requirements.txt\npython app.py', 'install')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCmd === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCmd === 'install' ? 'Copied' : 'Copy Commands'}
                    </button>
                  </div>
                  <pre className="text-emerald-400 leading-loose">
                    python -m venv venv<br />
                    .\venv\Scripts\activate<br />
                    pip install -r requirements.txt<br />
                    python app.py
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  2. Operational Workflow (Game Day Steps)
                </h4>
                <ol className="space-y-3 list-decimal list-inside text-xs text-slate-300">
                  <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong className="text-white">Start OBS Virtual Camera:</strong> Open OBS Studio and click "Start Virtual Camera" in the bottom right dock.
                  </li>
                  <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong className="text-white">Select Camera in WhatsApp Desktop:</strong> Go to WhatsApp Desktop &gt; Settings &gt; Audio & Video &gt; Camera dropdown &gt; choose <em>"OBS Virtual Camera"</em>.
                  </li>
                  <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong className="text-white">Call from Ray-Ban Meta Glasses:</strong> Double-tap stem or say <em>"Hey Meta, call [Windows Contact] on WhatsApp video"</em>.
                  </li>
                  <li className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong className="text-white">Answer Call &amp; Play:</strong> Answer on Windows. Look at the chessboard. The Reverse Agent consensus gate (2+ frames &amp; 3+ squares) will verify moves and flash the giant move recommendation back to your WhatsApp screen!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeSection === 'prereqs' && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Hardware &amp; Software Checklist
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-400 block font-mono">HARDWARE REQUIRED</span>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Ray-Ban Meta Smart Glasses:</strong> Paired with Meta View app.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Windows 10/11 64-bit PC:</strong> Running WhatsApp Desktop.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Smartphone:</strong> Connected to glasses over Bluetooth/Wi-Fi.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Physical Chess Board:</strong> Standard 8x8 squares.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 block font-mono">SOFTWARE REQUIRED</span>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Python 3.10+:</strong> Ensure "Add to PATH" was checked.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>WhatsApp Desktop for Windows:</strong> Native Windows app.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>OBS Studio:</strong> For Windows Virtual Camera driver.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Stockfish 16+ Binary:</strong> (Optional; auto fallback included).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Google Gemini API Key:</strong> Free tier from Google AI Studio.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'nodes' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Detailed 6 Workflow Nodes
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400 font-mono">Node 1: Call Video and Speech ("The App's Eyes and Mouth")</div>
                  <p className="text-slate-300">Captures incoming video from the active Windows WhatsApp Desktop window via mss and pygetwindow at 1.0 FPS. Broadcasts the 1280x720 HUD to pyvirtualcam.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 font-mono">Node 2: The Jev Pre-Check (Fast & Cheap Frame Filter)</div>
                  <p className="text-slate-300">Stage 2A uses OpenCV Laplacian variance (blur) and pixel diff. Stage 2B sends 512x512 thumbnail to gemini-2.5-flash-lite structured output to drop occluded/unstable frames, saving ~68% in API costs.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400 font-mono">Node 3: Move Confirmed ("Reverse Agent" Consensus Gate)</div>
                  <p className="text-slate-300">Simulates all legal moves in python-chess against Gemini Vision square evidence. Requires vacated origin, occupied destination, and anchor piece (3+ squares evidence) matching across 2+ consecutive frames.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-blue-400 font-mono">Node 4: Engine Turn Prompt (Stockfish Recommendation)</div>
                  <p className="text-slate-300">Queries Stockfish UCI engine over pipe (or built-in minimax fallback) to calculate best move SAN, centipawn score, win probability, and neon visual arrow coordinates.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-purple-400 font-mono">Node 5: Commit is Logged for Command Center</div>
                  <p className="text-slate-300">Appends immutable audit record to memory and recordings ledger with ply, SAN, UCI, square evidence list, eval, and frame thumbnail.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-rose-400 font-mono">Node 6: Record and Broadcast a Game</div>
                  <p className="text-slate-300">Maintains live game.pgn and streams the 1280x720 visual return HUD to the virtual webcam and the /visual-return route for WhatsApp screen share.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'troubleshoot' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Troubleshooting &amp; FAQs
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white">Q: What if the WhatsApp window is not recognized?</span>
                  <p className="text-slate-400">Ensure the window title contains "WhatsApp" and is not minimized. You can also specify manual pixel crop coordinates in <code>config.py</code>.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white">Q: Can I use MetaChess without speakers or headphones?</span>
                  <p className="text-slate-400">Yes! The primary moves-out return is 100% visual. The giant text (<code>BEST MOVE: Nf3 &rarr; e5 (+1.4)</code>) and neon arrows are broadcast directly into the WhatsApp video screen.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white">Q: What if Stockfish is not installed?</span>
                  <p className="text-slate-400">MetaChess comes with a built-in positional minimax evaluation engine that kicks in automatically so the application never crashes.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
