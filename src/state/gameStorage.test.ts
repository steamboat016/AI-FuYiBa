import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearGame,
  loadGame,
  loadRecentTargets,
  recordRecentTarget,
  saveGame,
} from './gameStorage';
import type { GameState } from '../domain/game';

const ACTIVE_GAME_KEY = 'ai-fuyiba:active-game:v1';
const RECENT_TARGETS_KEY = 'ai-fuyiba:recent-targets:v1';

const game: GameState = {
  id: 'game-1',
  difficulty: 'classic',
  targetPaperId: 'attention-is-all-you-need',
  guesses: [],
  guessedPaperIds: [],
  status: 'playing',
  startedAt: 1,
  finishedAt: null,
};

describe('gameStorage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('saves, loads, and clears the active game', () => {
    saveGame(game);
    expect(loadGame()).toEqual(game);

    clearGame();
    expect(loadGame()).toBeNull();
  });

  it('drops a corrupt active game payload', () => {
    localStorage.setItem(ACTIVE_GAME_KEY, '{bad json');
    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(ACTIVE_GAME_KEY)).toBeNull();
  });

  it('drops a valid JSON payload that is not a game state', () => {
    const invalidPayloads = [
      42,
      {},
      { ...game, status: 'paused' },
      { ...game, guessedPaperIds: null },
    ];

    for (const payload of invalidPayloads) {
      localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(payload));
      expect(loadGame()).toBeNull();
      expect(localStorage.getItem(ACTIVE_GAME_KEY)).toBeNull();
    }
  });

  it('stores a bounded recent target list', () => {
    for (let index = 0; index < 30; index += 1) {
      recordRecentTarget(`paper-${index}`);
    }

    const recent = loadRecentTargets();
    expect(recent).toHaveLength(20);
    expect(recent[0]).toBe('paper-10');
    expect(recent[19]).toBe('paper-29');
  });

  it('deduplicates recent targets and keeps the latest occurrence', () => {
    recordRecentTarget('paper-a');
    recordRecentTarget('paper-b');
    recordRecentTarget('paper-a');
    expect(loadRecentTargets()).toEqual(['paper-b', 'paper-a']);
  });

  it('filters invalid recent target entries and removes corrupt payloads', () => {
    localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(['paper-a', 1, null, 'paper-b']));
    expect(loadRecentTargets()).toEqual(['paper-a', 'paper-b']);

    localStorage.setItem(RECENT_TARGETS_KEY, '{bad json');
    expect(loadRecentTargets()).toEqual([]);
    expect(localStorage.getItem(RECENT_TARGETS_KEY)).toBeNull();
  });

  it('normalizes stored recent targets when reading migrated data', () => {
    const overLimit = Array.from({ length: 25 }, (_, index) => `paper-${index}`);
    localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(['paper-5', ...overLimit, 'paper-5']));
    expect(loadRecentTargets()).toEqual([...overLimit.slice(6), 'paper-5']);
  });

  it('ignores localStorage API failures', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(loadGame()).toBeNull();
    expect(loadRecentTargets()).toEqual([]);

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => saveGame(game)).not.toThrow();
    expect(() => recordRecentTarget('paper-a')).not.toThrow();

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => clearGame()).not.toThrow();
    localStorage.setItem(ACTIVE_GAME_KEY, '{bad json');
    expect(() => loadGame()).not.toThrow();
  });
});
