import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateLegalMoveEvidence,
  ReverseAgentEngine,
  normalizePieceState,
  ObservedSquare
} from './reverseAgent.ts';

test('normalizePieceState formats correctly', () => {
  assert.equal(normalizePieceState(null), 'empty');
  assert.equal(normalizePieceState({ type: 'p', color: 'w' }), 'white_pawn');
  assert.equal(normalizePieceState({ type: 'n', color: 'b' }), 'black_knight');
});

test('evaluateLegalMoveEvidence matches e2e4 with 3+ squares of evidence', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  // Observed after 1. e4:
  // e2 is empty, e4 has white pawn, d2 has white pawn, f2 has white pawn
  const observed: ObservedSquare[] = [
    { square: 'e2', state: 'empty', confidence: 0.95 },
    { square: 'e4', state: 'white_pawn', confidence: 0.98 },
    { square: 'd2', state: 'white_pawn', confidence: 0.92 },
    { square: 'f2', state: 'white_pawn', confidence: 0.89 },
  ];

  const evalResult = evaluateLegalMoveEvidence(startFen, 'e2e4', observed, 0.80);
  assert.ok(evalResult);
  assert.equal(evalResult.originMatched, true);
  assert.equal(evalResult.destMatched, true);
  assert.equal(evalResult.evidenceCount, 4);
  assert.equal(evalResult.sanMove, 'e4');
  assert.ok(evalResult.matchedSquares.includes('e2'));
  assert.ok(evalResult.matchedSquares.includes('e4'));
});

test('ReverseAgentEngine enforces 2+ consecutive frames and 3+ squares of evidence', () => {
  const engine = new ReverseAgentEngine(2, 3);
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Frame 1: candidate e2e4 detected with 4 evidence squares -> should KEEP_WATCHING
  const frame1Obs: ObservedSquare[] = [
    { square: 'e2', state: 'empty', confidence: 0.95 },
    { square: 'e4', state: 'white_pawn', confidence: 0.98 },
    { square: 'd2', state: 'white_pawn', confidence: 0.92 },
  ];
  const res1 = engine.processFrame(startFen, frame1Obs);
  assert.equal(res1.status, 'KEEP_WATCHING');
  assert.equal(res1.consecutiveMatches, 1);
  assert.equal(res1.bestFitMove?.sanMove, 'e4');

  // Frame 2: same candidate e2e4 detected again with 3+ evidence squares -> MOVE_CONFIRMED!
  const frame2Obs: ObservedSquare[] = [
    { square: 'e2', state: 'empty', confidence: 0.92 },
    { square: 'e4', state: 'white_pawn', confidence: 0.96 },
    { square: 'd2', state: 'white_pawn', confidence: 0.90 },
    { square: 'f2', state: 'white_pawn', confidence: 0.88 },
  ];
  const res2 = engine.processFrame(startFen, frame2Obs);
  assert.equal(res2.status, 'MOVE_CONFIRMED');
  assert.equal(res2.consecutiveMatches, 2);
  assert.equal(res2.bestFitMove?.sanMove, 'e4');
});

test('ReverseAgentEngine rejects if evidence is fewer than 3 squares', () => {
  const engine = new ReverseAgentEngine(2, 3);
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Only 2 squares observed
  const weakObs: ObservedSquare[] = [
    { square: 'e2', state: 'empty', confidence: 0.95 },
    { square: 'e4', state: 'white_pawn', confidence: 0.98 },
  ];
  const res1 = engine.processFrame(startFen, weakObs);
  assert.equal(res1.status, 'KEEP_WATCHING');
  assert.ok(res1.reason.includes('needs 3+'));
});
