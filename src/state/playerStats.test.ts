import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, GameStatus } from '../domain/game';
import {
  applyGameResult,
  emptyPlayerStats,
  loadPlayerStats,
  savePlayerStats,
  type PlayerStats,
} from './playerStats';

const PLAYER_STATS_KEY = 'ai-fuyiba:player-stats:v1';

function game(id: string, status: GameStatus): GameState {
  return {
    id,
    difficulty: 'classic',
    targetPaperId: 'attention-is-all-you-need',
    guesses: [],
    guessedPaperIds: [],
    status,
    startedAt: 1,
    finishedAt: status === 'playing' ? null : 2,
  };
}

describe('playerStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('creates empty player statistics', () => {
    expect(emptyPlayerStats()).toEqual({
      played: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      completedGameIds: [],
    });
  });

  it('records a first win', () => {
    const afterWin = applyGameResult(emptyPlayerStats(), game('g-1', 'won'));

    expect(afterWin).toEqual({
      played: 1,
      wins: 1,
      currentStreak: 1,
      bestStreak: 1,
      completedGameIds: ['g-1'],
    });
  });

  it('increases the current and best streak for consecutive wins', () => {
    const afterFirstWin = applyGameResult(emptyPlayerStats(), game('g-1', 'won'));
    const afterSecondWin = applyGameResult(afterFirstWin, game('g-2', 'won'));

    expect(afterSecondWin).toMatchObject({
      played: 2,
      wins: 2,
      currentStreak: 2,
      bestStreak: 2,
    });
  });

  it('resets only the current streak after a loss', () => {
    const afterFirstWin = applyGameResult(emptyPlayerStats(), game('g-1', 'won'));
    const afterSecondWin = applyGameResult(afterFirstWin, game('g-2', 'won'));
    const afterLoss = applyGameResult(afterSecondWin, game('g-3', 'lost'));

    expect(afterLoss).toEqual({
      played: 3,
      wins: 2,
      currentStreak: 0,
      bestStreak: 2,
      completedGameIds: ['g-1', 'g-2', 'g-3'],
    });
  });

  it('returns the original object for active and duplicate games', () => {
    const empty = emptyPlayerStats();
    expect(applyGameResult(empty, game('active', 'playing'))).toBe(empty);

    const afterWin = applyGameResult(empty, game('g-1', 'won'));
    expect(applyGameResult(afterWin, game('g-1', 'won'))).toBe(afterWin);
  });

  it('retains only the 100 most recent completed game IDs', () => {
    const result = Array.from({ length: 105 }, (_, index) => game(`g-${index}`, 'won')).reduce(
      applyGameResult,
      emptyPlayerStats()
    );

    expect(result.played).toBe(105);
    expect(result.completedGameIds).toHaveLength(100);
    expect(result.completedGameIds[0]).toBe('g-5');
    expect(result.completedGameIds[99]).toBe('g-104');
  });

  it('saves and loads valid player statistics', () => {
    const stats = applyGameResult(emptyPlayerStats(), game('g-1', 'won'));

    savePlayerStats(stats);

    expect(loadPlayerStats()).toEqual(stats);
  });

  it('drops malformed JSON', () => {
    localStorage.setItem(PLAYER_STATS_KEY, '{bad json');

    expect(loadPlayerStats()).toEqual(emptyPlayerStats());
    expect(localStorage.getItem(PLAYER_STATS_KEY)).toBeNull();
  });

  it('drops stored statistics with invalid numeric values', () => {
    const valid: PlayerStats = {
      played: 2,
      wins: 1,
      currentStreak: 0,
      bestStreak: 1,
      completedGameIds: ['g-1', 'g-2'],
    };
    const invalidPayloads = [
      { ...valid, played: -1 },
      { ...valid, wins: 3 },
      { ...valid, currentStreak: 0.5 },
      { ...valid, bestStreak: Number.NaN },
      { ...valid, played: Number.MAX_SAFE_INTEGER + 1 },
    ];

    for (const payload of invalidPayloads) {
      localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(payload));
      expect(loadPlayerStats()).toEqual(emptyPlayerStats());
      expect(localStorage.getItem(PLAYER_STATS_KEY)).toBeNull();
    }
  });

  it('drops stored statistics with inconsistent streak and win counts', () => {
    const valid: PlayerStats = {
      played: 3,
      wins: 2,
      currentStreak: 1,
      bestStreak: 2,
      completedGameIds: ['g-1', 'g-2', 'g-3'],
    };
    const invalidPayloads = [
      { ...valid, currentStreak: 3 },
      { ...valid, bestStreak: 3 },
      { ...valid, wins: 4 },
    ];

    for (const payload of invalidPayloads) {
      localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(payload));
      expect(loadPlayerStats()).toEqual(emptyPlayerStats());
      expect(localStorage.getItem(PLAYER_STATS_KEY)).toBeNull();
    }
  });

  it('normalizes completed game IDs and writes the normalized statistics back', () => {
    const gameIds = Array.from({ length: 105 }, (_, index) => `g-${index}`);
    const stored = {
      played: 120,
      wins: 100,
      currentStreak: 2,
      bestStreak: 10,
      completedGameIds: ['', '   ', 'g-5', ...gameIds, '', 'g-5'],
    };
    const expected = {
      ...stored,
      completedGameIds: [...gameIds.slice(6), 'g-5'],
    };
    localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(stored));

    expect(loadPlayerStats()).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(PLAYER_STATS_KEY) ?? 'null')).toEqual(expected);
  });

  it('removes whitespace-only completed game IDs', () => {
    const stored = {
      played: 1,
      wins: 1,
      currentStreak: 1,
      bestStreak: 1,
      completedGameIds: ['g-1', '   '],
    };
    localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(stored));

    expect(loadPlayerStats().completedGameIds).toEqual(['g-1']);
  });

  it('cleans up an empty stored payload', () => {
    localStorage.setItem(PLAYER_STATS_KEY, '');

    expect(loadPlayerStats()).toEqual(emptyPlayerStats());
    expect(localStorage.getItem(PLAYER_STATS_KEY)).toBeNull();
  });

  it('drops stored statistics with invalid completed game IDs', () => {
    localStorage.setItem(
      PLAYER_STATS_KEY,
      JSON.stringify({
        played: 1,
        wins: 1,
        currentStreak: 1,
        bestStreak: 1,
        completedGameIds: ['g-1', 2],
      })
    );

    expect(loadPlayerStats()).toEqual(emptyPlayerStats());
    expect(localStorage.getItem(PLAYER_STATS_KEY)).toBeNull();
  });

  it('ignores localStorage API failures', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(loadPlayerStats()).toEqual(emptyPlayerStats());

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => savePlayerStats(emptyPlayerStats())).not.toThrow();

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    localStorage.setItem(PLAYER_STATS_KEY, '{bad json');
    expect(() => loadPlayerStats()).not.toThrow();
    expect(loadPlayerStats()).toEqual(emptyPlayerStats());
  });
});
