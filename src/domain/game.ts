import { comparePaperGuess, MAX_GUESSES } from './feedback';
import type { DifficultyKey, GuessFeedback, Paper } from './types';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  id: string;
  difficulty: DifficultyKey;
  targetPaperId: string;
  guesses: readonly GuessFeedback[];
  guessedPaperIds: readonly string[];
  status: GameStatus;
  startedAt: number;
  finishedAt: number | null;
}

export function chooseTarget(
  papers: readonly Paper[],
  difficulty: DifficultyKey,
  recentTargetIds: readonly string[],
  rng: () => number = Math.random
): Paper | null {
  const pool = papers.filter((paper) => paper.isEnabled && paper.difficulty.includes(difficulty));
  if (!pool.length) return null;

  const recent = new Set(recentTargetIds);
  const freshPool = pool.filter((paper) => !recent.has(paper.id));
  const candidates = freshPool.length ? freshPool : pool;
  const randomValue = rng();
  const normalizedRandomValue = Number.isFinite(randomValue) ? randomValue : 0;
  const index = Math.min(
    candidates.length - 1,
    Math.max(0, Math.floor(normalizedRandomValue * candidates.length))
  );
  return candidates[index];
}

export function createGame(target: Paper, difficulty: DifficultyKey, now = Date.now()): GameState {
  return {
    id: `${now}-${target.id}`,
    difficulty,
    targetPaperId: target.id,
    guesses: [],
    guessedPaperIds: [],
    status: 'playing',
    startedAt: now,
    finishedAt: null,
  };
}

export function submitGuess(
  game: GameState,
  guess: Paper,
  target: Paper,
  now = Date.now()
): GameState {
  if (game.status !== 'playing') throw new Error('GAME_FINISHED');
  if (target.id !== game.targetPaperId) throw new Error('TARGET_MISMATCH');
  if (game.guessedPaperIds.includes(guess.id)) throw new Error('ALREADY_GUESSED');

  const feedback = comparePaperGuess(guess, target);
  const guesses = [...game.guesses, feedback];
  const guessedPaperIds = [...game.guessedPaperIds, guess.id];
  const status: GameStatus = feedback.correct
    ? 'won'
    : guesses.length >= MAX_GUESSES
      ? 'lost'
      : 'playing';

  return {
    ...game,
    guesses,
    guessedPaperIds,
    status,
    finishedAt: status === 'playing' ? null : now,
  };
}
