import type { GameState } from '../domain/game';

const PLAYER_STATS_KEY = 'ai-fuyiba:player-stats:v1';

export interface PlayerStats {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  completedGameIds: readonly string[];
}

export type CompletedGame = Pick<GameState, 'id' | 'status'>;

export function emptyPlayerStats(): PlayerStats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    completedGameIds: [],
  };
}

export function applyGameResult(stats: PlayerStats, game: CompletedGame): PlayerStats {
  if (game.status === 'playing' || stats.completedGameIds.includes(game.id)) return stats;

  const won = game.status === 'won';
  const currentStreak = won ? stats.currentStreak + 1 : 0;

  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    completedGameIds: [...stats.completedGameIds.slice(-99), game.id],
  };
}

export function loadPlayerStats(): PlayerStats {
  const raw = safeGetItem(PLAYER_STATS_KEY);
  if (raw === null) return emptyPlayerStats();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isPlayerStats(parsed)) {
      const completedGameIds = normalizeCompletedGameIds(parsed.completedGameIds);
      if (arraysEqual(completedGameIds, parsed.completedGameIds)) return parsed;

      const normalized = { ...parsed, completedGameIds };
      savePlayerStats(normalized);
      return normalized;
    }
  } catch {
    // Fall through to remove the invalid payload.
  }

  safeRemoveItem(PLAYER_STATS_KEY);
  return emptyPlayerStats();
}

export function savePlayerStats(stats: PlayerStats): void {
  safeSetItem(PLAYER_STATS_KEY, JSON.stringify(stats));
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
    // Statistics persistence is best-effort.
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // A failed cleanup should not prevent the game from loading.
  }
}

function isPlayerStats(value: unknown): value is PlayerStats {
  if (!isRecord(value)) return false;

  return (
    isCount(value.played) &&
    isCount(value.wins) &&
    isCount(value.currentStreak) &&
    isCount(value.bestStreak) &&
    value.wins <= value.played &&
    value.bestStreak <= value.wins &&
    value.currentStreak <= value.bestStreak &&
    Array.isArray(value.completedGameIds) &&
    value.completedGameIds.every((id) => typeof id === 'string')
  );
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function normalizeCompletedGameIds(values: readonly string[]): string[] {
  const normalized: string[] = [];

  for (const value of values) {
    const normalizedValue = value.trim();
    if (!normalizedValue) continue;
    const existingIndex = normalized.indexOf(normalizedValue);
    if (existingIndex >= 0) normalized.splice(existingIndex, 1);
    normalized.push(normalizedValue);
  }

  return normalized.slice(-100);
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
