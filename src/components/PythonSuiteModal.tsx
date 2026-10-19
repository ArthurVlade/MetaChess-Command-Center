import React, { useState, useEffect } from 'react';
import { FileCode, Download, Copy, Check, Terminal, ExternalLink, X } from 'lucide-react';

interface PythonSuiteModalProps {
  onClose: () => void;
}

export const PythonSuiteModal: React.FC<PythonSuiteModalProps> = ({ onClose }) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFilename, setSelectedFilename] = useState<string>('app.py');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/python-suite')
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setFiles(data.files);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load python files:', err);
        setLoading(false);
      });
  }, []);

  const fileList = [
    'app.py',
    'reverse_agent_pipeline.py',
    'capture_and_virtualcam.py',
    'stockfish_service.py',
    'config.py',
    'requirements.txt',
    'templates/index.html',
  ];

  const currentContent = files[selectedFilename] || 'Loading file content...';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFilename.split('/').pop() || 'download';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <FileCode className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Windows Python Suite Deliverables
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  7 COMPLETE FILES
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Runnable locally on Windows with WhatsApp Desktop + Ray-Ban Meta Glasses
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

        {/* Windows Run Terminal Cheat Sheet */}
        <div className="bg-black/60 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Windows Run:</span>
            <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-bold">
              pip install -r requirements.txt && python app.py
            </code>
          </div>
          <div className="text-slate-400 text-[11px]">
            Zero WhatsApp API or credentials required • Uses local active call window
          </div>
        </div>

        {/* Body: Left File List, Right Code Viewer */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-64 bg-slate-950/70 border-r border-slate-800 p-3 space-y-1 overflow-y-auto">
            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block px-2 py-1">
              Deliverables Files
            </span>
            {fileList.map((fname) => (
              <button
                key={fname}
                onClick={() => setSelectedFilename(fname)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                  selectedFilename === fname
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="truncate">{fname}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">{selectedFilename}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleDownloadSingle}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>

            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed bg-[#0a0f1d] selection:bg-cyan-500/30">
              <code>{currentContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
