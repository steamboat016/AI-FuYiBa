import type { GameState } from '../domain/game';
import type { DifficultyKey, FeedbackLevel, GuessFeedback } from '../domain/types';

const ACTIVE_GAME_KEY = 'ai-fuyiba:active-game:v1';
const RECENT_TARGETS_KEY = 'ai-fuyiba:recent-targets:v1';
const RECENT_TARGET_LIMIT = 20;
const DIFFICULTY_KEYS = new Set<DifficultyKey>(['classic', 'vision', 'language', 'full']);
const GAME_STATUSES = new Set<GameState['status']>(['playing', 'won', 'lost']);
const FEEDBACK_LEVELS = new Set<FeedbackLevel>(['correct', 'close', 'wrong']);

export function saveGame(game: GameState): void {
  safeSetItem(ACTIVE_GAME_KEY, JSON.stringify(game));
}

export function loadGame(): GameState | null {
  const raw = safeGetItem(ACTIVE_GAME_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isGameState(parsed)) return parsed;
  } catch {
    // Fall through to remove the invalid payload.
  }

  safeRemoveItem(ACTIVE_GAME_KEY);
  return null;
}

export function clearGame(): void {
  safeRemoveItem(ACTIVE_GAME_KEY);
}

export function loadRecentTargets(): string[] {
  const raw = safeGetItem(RECENT_TARGETS_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeRecentTargets(parsed) : [];
  } catch {
    safeRemoveItem(RECENT_TARGETS_KEY);
    return [];
  }
}

export function recordRecentTarget(paperId: string): void {
  const recentTargets = normalizeRecentTargets([...loadRecentTargets(), paperId]);
  safeSetItem(RECENT_TARGETS_KEY, JSON.stringify(recentTargets));
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Persistence is best-effort; gameplay should continue without storage.
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Persistence is best-effort; a failed cleanup should not break gameplay.
  }
}

function normalizeRecentTargets(values: readonly unknown[]): string[] {
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string' || !value) continue;
    const existingIndex = normalized.indexOf(value);
    if (existingIndex >= 0) normalized.splice(existingIndex, 1);
    normalized.push(value);
  }

  return normalized.slice(-RECENT_TARGET_LIMIT);
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    DIFFICULTY_KEYS.has(value.difficulty as DifficultyKey) &&
    typeof value.targetPaperId === 'string' &&
    Array.isArray(value.guesses) &&
    value.guesses.every(isGuessFeedback) &&
    Array.isArray(value.guessedPaperIds) &&
    value.guessedPaperIds.every((paperId) => typeof paperId === 'string') &&
    GAME_STATUSES.has(value.status as GameState['status']) &&
    typeof value.startedAt === 'number' &&
    Number.isFinite(value.startedAt) &&
    (value.finishedAt === null ||
      (typeof value.finishedAt === 'number' && Number.isFinite(value.finishedAt)))
  );
}

function isGuessFeedback(value: unknown): value is GuessFeedback {
  if (!isRecord(value) || !isRecord(value.attributes)) return false;
  return (
    typeof value.paperId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.correct === 'boolean' &&
    isStringAttribute(value.attributes.firstAuthorCountry) &&
    isNumberAttribute(value.attributes.year) &&
    isNumberAttribute(value.attributes.citationCount) &&
    isStringAttribute(value.attributes.venue) &&
    isStringAttribute(value.attributes.primaryField) &&
    isBooleanAttribute(value.attributes.bestPaper) &&
    isBooleanAttribute(value.attributes.testOfTimeAward)
  );
}

function isStringAttribute(value: unknown): boolean {
  return isAttributeFeedback(value) && typeof value.value === 'string';
}

function isNumberAttribute(value: unknown): boolean {
  return isAttributeFeedback(value) && typeof value.value === 'number' && Number.isFinite(value.value);
}

function isBooleanAttribute(value: unknown): boolean {
  return isAttributeFeedback(value) && typeof value.value === 'boolean';
}

function isAttributeFeedback(value: unknown): value is { value: unknown; level: FeedbackLevel; hint?: unknown } {
  if (!isRecord(value)) return false;
  return (
    FEEDBACK_LEVELS.has(value.level as FeedbackLevel) &&
    (value.hint === undefined || value.hint === 'higher' || value.hint === 'lower')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
