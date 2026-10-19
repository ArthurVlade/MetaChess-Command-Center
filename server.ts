import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize Gemini AI client:', err);
  }
}

// In-memory telemetry and game state for the web session
const webSessionState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn: '[Event "MetaChess Live Broadcast"]\n[Site "Windows WhatsApp Desktop"]\n[White "User (Ray-Ban Meta)"]\n[Black "Opponent"]\n\n*\n',
  moves: [] as string[],
  costSavedUsd: 0.0,
  totalFrames: 0,
  skippedFrames: 0,
};

// API: Node 2 Fast Pre-Check via gemini-2.5-flash-lite
app.post('/api/gemini/precheck', async (req: Request, res: Response) => {
  webSessionState.totalFrames++;
  const { imageBase64 } = req.body;

  if (!ai || !imageBase64) {
    // Deterministic simulation fallback
    const isBlurry = Math.random() < 0.15;
    const isHandOccluding = Math.random() < 0.20;
    const shouldInvoke = !isBlurry && !isHandOccluding;

    if (!shouldInvoke) {
      webSessionState.skippedFrames++;
      webSessionState.costSavedUsd += 0.0025;
    }

    return res.json({
      is_board_visible: !isBlurry,
      is_hand_occluding: isHandOccluding,
      has_meaningful_board_change: shouldInvoke,
      should_invoke_expensive_vision: shouldInvoke,
      skip_reason: isBlurry ? 'Laplacian blur variance below threshold' : isHandOccluding ? 'Player hand occluding board' : 'none',
      cost_saved_usd: webSessionState.costSavedUsd,
      simulated: true,
    });
  }

  try {
    const cleanB64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanB64,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: 'You are Jev, a fast, cheap AI chess camera filter. Look at this Ray-Ban Meta video frame: ' +
                  '1. Is a physical chessboard clearly visible? ' +
                  '2. Is a human hand/arm actively covering or obscuring the board? ' +
                  '3. Does the board state appear stable for move evaluation? ' +
                  'Return should_invoke_expensive_vision=true ONLY if the board is clearly visible and unoccluded.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_board_visible: { type: Type.BOOLEAN },
            is_hand_occluding: { type: Type.BOOLEAN },
            has_meaningful_board_change: { type: Type.BOOLEAN },
            should_invoke_expensive_vision: { type: Type.BOOLEAN },
            skip_reason: { type: Type.STRING },
          },
          required: [
            'is_board_visible',
            'is_hand_occluding',
            'has_meaningful_board_change',
            'should_invoke_expensive_vision',
            'skip_reason',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.should_invoke_expensive_vision) {
      webSessionState.skippedFrames++;
      webSessionState.costSavedUsd += 0.0025;
    }
    return res.json({ ...parsed, cost_saved_usd: webSessionState.costSavedUsd });
  } catch (error: any) {
    console.error('Jev Pre-check error:', error);
    return res.json({
      is_board_visible: true,
      is_hand_occluding: false,
      has_meaningful_board_change: true,
      should_invoke_expensive_vision: true,
      skip_reason: 'none (fallback)',
      cost_saved_usd: webSessionState.costSavedUsd,
    });
  }
});

// API: Node 3 Reverse Agent Vision
app.post('/api/gemini/reverse-agent', async (req: Request, res: Response) => {
  const { imageBase64, currentFen, legalMoves } = req.body;

  if (!ai || !imageBase64) {
    // Return structured default for testing/simulation
    return res.json({
      observed_square_states: [
        { square: 'e2', state: 'empty', confidence: 0.96 },
        { square: 'e4', state: 'white_pawn', confidence: 0.97 },
        { square: 'd2', state: 'white_pawn', confidence: 0.92 },
        { square: 'f2', state: 'white_pawn', confidence: 0.89 },
      ],
      candidate_move_uci: 'e2e4',
      reasoning: 'Clear translation of pawn from e2 to e4 detected with anchor pawns on d2 and f2.',
      simulated: true,
    });
  }

  try {
    const cleanB64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `You are the high-precision Reverse Agent vision model for MetaChess.
Current chess position FEN: ${currentFen}
Legal moves: ${(legalMoves || []).join(', ')}
Examine this board crop carefully. Return observed squares with piece occupancy or vacation (e.g. empty, white_pawn, black_knight). Provide confidence between 0.0 and 1.0.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanB64,
              mimeType: 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            observed_square_states: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  square: { type: Type.STRING },
                  state: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ['square', 'state', 'confidence'],
              },
            },
            candidate_move_uci: { type: Type.STRING },
            reasoning: { type: Type.STRING },
          },
          required: ['observed_square_states', 'candidate_move_uci', 'reasoning'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Reverse Agent Vision error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// API: Get Python Windows Deliverables Suite
app.get('/api/python-suite', (_req: Request, res: Response) => {
  const rootFiles = [
    'requirements.txt',
    'config.py',
    'capture_and_virtualcam.py',
    'reverse_agent_pipeline.py',
    'stockfish_service.py',
    'app.py',
    'templates/index.html',
  ];

  const bundle: Record<string, string> = {};
  for (const rel of rootFiles) {
    const fullPath = path.resolve(process.cwd(), rel);
    if (fs.existsSync(fullPath)) {
      bundle[rel] = fs.readFileSync(fullPath, 'utf-8');
    }
  }
  return res.json({ files: bundle });
});

// API: Get Live PGN
app.get('/api/pgn', (_req: Request, res: Response) => {
  res.type('text/plain').send(webSessionState.pgn);
});

// API: Reset Game
app.post('/api/reset', (_req: Request, res: Response) => {
  webSessionState.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  webSessionState.moves = [];
  webSessionState.pgn = '[Event "MetaChess Live Broadcast"]\n[Site "Windows WhatsApp Desktop"]\n[White "User (Ray-Ban Meta)"]\n[Black "Opponent"]\n\n*\n';
  res.json({ message: 'Game reset successfully' });
});

async function startServer() {
  // Mount Vite development middlewares in dev
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MetaChess Command Center Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server startup error:', err);
});
