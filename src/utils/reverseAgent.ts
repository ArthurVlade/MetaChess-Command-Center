import { Chess } from 'chess.js';

export interface ObservedSquare {
  square: string; // e.g. "e2", "e4", "e7"
  state: string;  // e.g. "empty", "white_pawn", "black_pawn", "white_knight", etc.
  confidence: number; // 0.0 - 1.0
}

export interface MoveEvidenceEvaluation {
  uciMove: string;
  sanMove: string;
  originSquare: string;
  destSquare: string;
  originMatched: boolean;
  destMatched: boolean;
  evidenceCount: number;
  matchedSquares: string[];
  score: number;
}

export interface ReverseAgentResult {
  status: 'MOVE_CONFIRMED' | 'KEEP_WATCHING';
  bestFitMove: MoveEvidenceEvaluation | null;
  consecutiveMatches: number;
  requiredConsecutive: number;
  minEvidenceSquares: number;
  reason: string;
}

export function normalizePieceState(piece?: { type: string; color: string } | null): string {
  if (!piece) return 'empty';
  const colorPrefix = piece.color === 'w' ? 'white' : 'black';
  const nameMap: Record<string, string> = {
    p: 'pawn',
    n: 'knight',
    b: 'bishop',
    r: 'rook',
    q: 'queen',
    k: 'king',
  };
  return `${colorPrefix}_${nameMap[piece.type] || piece.type}`;
}

export function evaluateLegalMoveEvidence(
  currentFen: string,
  uciMove: string,
  observedSquares: ObservedSquare[],
  confidenceThreshold: number = 0.80
): MoveEvidenceEvaluation | null {
  const chess = new Chess(currentFen);
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

  let moveResult;
  try {
    moveResult = chess.move({
      from,
      to,
      promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
    });
  } catch {
    return null;
  }

  if (!moveResult) return null;

  // Filter high confidence observations
  const confidentObs = observedSquares.filter(obs => obs.confidence >= confidenceThreshold);
  const obsMap = new Map<string, string>();
  for (const obs of confidentObs) {
    obsMap.set(obs.square.toLowerCase(), obs.state.toLowerCase());
  }

  const matchedSquares: string[] = [];

  // 1. Origin square must be empty after move
  const originObs = obsMap.get(from.toLowerCase());
  const originMatched = originObs === 'empty';
  if (originMatched) {
    matchedSquares.push(from);
  }

  // 2. Destination square must match moved piece
  const destPiece = chess.get(to as any);
  const expectedDestState = normalizePieceState(destPiece);
  const destObs = obsMap.get(to.toLowerCase());
  const destMatched = destObs === expectedDestState;
  if (destMatched) {
    matchedSquares.push(to);
  }

  // 3. Anchor squares & other context squares
  for (const [sq, obsState] of obsMap.entries()) {
    if (sq === from || sq === to) continue;
    const piece = chess.get(sq as any);
    const postMoveState = normalizePieceState(piece);
    if (obsState === postMoveState) {
      matchedSquares.push(sq);
    }
  }

  const evidenceCount = matchedSquares.length;
  // Score weights origin + dest heavily, then total evidence count
  const score = (originMatched ? 2.0 : 0) + (destMatched ? 2.5 : 0) + (evidenceCount * 0.5);

  return {
    uciMove,
    sanMove: moveResult.san,
    originSquare: from,
    destSquare: to,
    originMatched,
    destMatched,
    evidenceCount,
    matchedSquares,
    score,
  };
}

export class ReverseAgentEngine {
  private lastBestFitMove: string | null = null;
  private consecutiveCount: number = 0;
  private minConsecutive: number = 2;
  private minEvidence: number = 3;

  constructor(minConsecutive: number = 2, minEvidence: number = 3) {
    this.minConsecutive = minConsecutive;
    this.minEvidence = minEvidence;
  }

  public reset(): void {
    this.lastBestFitMove = null;
    this.consecutiveCount = 0;
  }

  public processFrame(
    currentFen: string,
    observedSquares: ObservedSquare[],
    confidenceThreshold: number = 0.80
  ): ReverseAgentResult {
    const chess = new Chess(currentFen);
    const legalMoves = chess.moves({ verbose: true });

    let bestFit: MoveEvidenceEvaluation | null = null;
    let highestScore = -1;

    for (const move of legalMoves) {
      const uci = `${move.from}${move.to}${move.promotion || ''}`;
      const evalResult = evaluateLegalMoveEvidence(currentFen, uci, observedSquares, confidenceThreshold);
      if (!evalResult) continue;

      // Must have origin and destination matched to be considered a viable candidate
      if (evalResult.originMatched && evalResult.destMatched) {
        if (evalResult.score > highestScore) {
          highestScore = evalResult.score;
          bestFit = evalResult;
        } else if (evalResult.score === highestScore && bestFit && evalResult.evidenceCount > bestFit.evidenceCount) {
          bestFit = evalResult;
        }
      }
    }

    if (!bestFit) {
      this.lastBestFitMove = null;
      this.consecutiveCount = 0;
      return {
        status: 'KEEP_WATCHING',
        bestFitMove: null,
        consecutiveMatches: 0,
        requiredConsecutive: this.minConsecutive,
        minEvidenceSquares: this.minEvidence,
        reason: 'No legal move satisfies origin and destination state changes.',
      };
    }

    // Check evidence threshold
    if (bestFit.evidenceCount < this.minEvidence) {
      this.lastBestFitMove = bestFit.uciMove;
      this.consecutiveCount = 1;
      return {
        status: 'KEEP_WATCHING',
        bestFitMove: bestFit,
        consecutiveMatches: 1,
        requiredConsecutive: this.minConsecutive,
        minEvidenceSquares: this.minEvidence,
        reason: `Best candidate ${bestFit.sanMove} has only ${bestFit.evidenceCount} squares of evidence (needs ${this.minEvidence}+).`,
      };
    }

    // Check consecutive match rule
    if (this.lastBestFitMove === bestFit.uciMove) {
      this.consecutiveCount += 1;
    } else {
      this.lastBestFitMove = bestFit.uciMove;
      this.consecutiveCount = 1;
    }

    if (this.consecutiveCount >= this.minConsecutive) {
      const confirmedMove = bestFit;
      // Reset after confirmation
      this.lastBestFitMove = null;
      this.consecutiveCount = 0;
      return {
        status: 'MOVE_CONFIRMED',
        bestFitMove: confirmedMove,
        consecutiveMatches: this.minConsecutive,
        requiredConsecutive: this.minConsecutive,
        minEvidenceSquares: this.minEvidence,
        reason: `Move ${confirmedMove.sanMove} confirmed on ${this.minConsecutive} consecutive frames with ${confirmedMove.evidenceCount} squares of evidence!`,
      };
    }

    return {
      status: 'KEEP_WATCHING',
      bestFitMove: bestFit,
      consecutiveMatches: this.consecutiveCount,
      requiredConsecutive: this.minConsecutive,
      minEvidenceSquares: this.minEvidence,
      reason: `Best candidate ${bestFit.sanMove} detected on frame 1 of ${this.minConsecutive} with ${bestFit.evidenceCount} evidence squares. Waiting for frame 2.`,
    };
  }
}
