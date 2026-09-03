import { describe, expect, it } from 'vitest';
import { MAX_GUESSES } from './feedback';
import { chooseTarget, createGame, submitGuess } from './game';
import type { Paper } from './types';

function paper(id: string, difficulty: Paper['difficulty'] = ['full']): Paper {
  return {
    id,
    title: id,
    aliases: [],
    firstAuthor: 'Author',
    firstAuthorAffiliation: 'Lab',
    firstAuthorCountry: 'United States',
    firstAuthorRegion: 'North America',
    year: 2020,
    citationCount: 100,
    citationSource: 'google_scholar_manual',
    citationCheckedAt: '2026-08-01',
    venue: 'NeurIPS',
    venueFamily: 'ML Conference',
    primaryField: 'Machine Learning',
    topLevelField: 'Machine Learning',
    fieldTags: ['Learning'],
    bestPaper: false,
    bestPaperName: null,
    testOfTimeAward: false,
    testOfTimeAwardName: null,
    difficulty,
    isEnabled: true,
    links: { paper: 'https://example.com/paper', code: null },
  };
}

describe('game domain', () => {
  it('chooses enabled papers from the requested difficulty', () => {
    const disabled = { ...paper('disabled', ['classic', 'full']), isEnabled: false };
    const selected = chooseTarget(
      [disabled, paper('classic-paper', ['classic', 'full']), paper('vision-paper', ['vision'])],
      'classic',
      [],
      () => 0
    );
    expect(selected?.id).toBe('classic-paper');
  });

  it('avoids recent targets when candidates remain', () => {
    const selected = chooseTarget(
      [paper('a'), paper('b'), paper('c')],
      'full',
      ['a', 'b'],
      () => 0
    );
    expect(selected?.id).toBe('c');
  });

  it('falls back to the full pool when every candidate is recent', () => {
    const selected = chooseTarget([paper('a'), paper('b')], 'full', ['a', 'b'], () => 0.99);
    expect(selected?.id).toBe('b');
  });

  it('normalizes invalid rng output to the first candidate', () => {
    const selected = chooseTarget([paper('a'), paper('b')], 'full', [], () => Number.NaN);
    expect(selected?.id).toBe('a');
  });

  it('returns null when no enabled paper matches the difficulty', () => {
    expect(chooseTarget([paper('vision-paper', ['vision'])], 'language', [], () => 0)).toBeNull();
  });

  it('creates a deterministic game shell for a target', () => {
    const target = paper('target');
    const game = createGame(target, 'full', 123);
    expect(game).toMatchObject({
      id: '123-target',
      difficulty: 'full',
      targetPaperId: 'target',
      guesses: [],
      guessedPaperIds: [],
      status: 'playing',
      startedAt: 123,
      finishedAt: null,
    });
  });

  it('records a win when guessing the target', () => {
    const target = paper('target');
    const game = createGame(target, 'full', 10);
    const next = submitGuess(game, target, target, 20);
    expect(next.status).toBe('won');
    expect(next.finishedAt).toBe(20);
    expect(next.guesses).toHaveLength(1);
    expect(game.guesses).toEqual([]);
    expect(game.guessedPaperIds).toEqual([]);
  });

  it('records a loss after the final allowed wrong guess', () => {
    const target = paper('target');
    let game = createGame(target, 'full', 10);

    for (let index = 0; index < MAX_GUESSES; index += 1) {
      game = submitGuess(game, paper(`wrong-${index}`), target, 20 + index);
    }

    expect(game.status).toBe('lost');
    expect(game.finishedAt).toBe(20 + MAX_GUESSES - 1);
    expect(game.guesses).toHaveLength(MAX_GUESSES);
  });

  it('rejects duplicate guesses', () => {
    const target = paper('target');
    const wrong = paper('wrong');
    const game = submitGuess(createGame(target, 'full'), wrong, target);
    expect(() => submitGuess(game, wrong, target)).toThrow(/ALREADY_GUESSED/);
  });

  it('rejects target mismatches', () => {
    const target = paper('target');
    const wrongTarget = paper('wrong-target');
    const game = createGame(target, 'full');
    expect(() => submitGuess(game, paper('guess'), wrongTarget)).toThrow(/TARGET_MISMATCH/);
  });

  it('rejects guesses after the game is finished', () => {
    const target = paper('target');
    const won = submitGuess(createGame(target, 'full'), target, target);
    expect(() => submitGuess(won, paper('late'), target)).toThrow(/GAME_FINISHED/);
  });
});
