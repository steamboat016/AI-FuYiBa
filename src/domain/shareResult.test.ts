import { describe, expect, it } from 'vitest';
import type { GameState } from './game';
import { formatShareResult } from './shareResult';
import type { FeedbackLevel, GuessFeedback } from './types';

const LEVELS: readonly FeedbackLevel[] = [
  'correct',
  'close',
  'wrong',
  'correct',
  'wrong',
  'correct',
  'wrong',
];

function feedback(
  paperId: string,
  title: string,
  levels: readonly FeedbackLevel[] = LEVELS
): GuessFeedback {
  const [country, year, citations, venue, field, bestPaper, testOfTime] = levels;

  return {
    paperId,
    title,
    correct: levels.every((level) => level === 'correct'),
    attributes: {
      firstAuthorCountry: { value: 'United States', level: country },
      year: { value: 2020, level: year },
      citationCount: { value: 10000, level: citations },
      venue: { value: 'NeurIPS', level: venue },
      primaryField: { value: 'Language', level: field },
      bestPaper: { value: false, level: bestPaper },
      testOfTimeAward: { value: false, level: testOfTime },
    },
  };
}

function game(overrides: Partial<GameState>): GameState {
  return {
    id: 'game-1',
    difficulty: 'classic',
    targetPaperId: 'Secret Answer Title',
    guesses: [],
    guessedPaperIds: [],
    status: 'playing',
    startedAt: 1,
    finishedAt: null,
    ...overrides,
  };
}

describe('formatShareResult', () => {
  it('formats a spoiler-free win with the complete share layout', () => {
    const finishedGame = game({
      guesses: [
        feedback('guess-1', 'Secret Guess Title'),
        feedback('answer', 'Secret Answer Title', Array(7).fill('correct')),
      ],
      guessedPaperIds: ['guess-1', 'answer'],
      status: 'won',
      finishedAt: 2,
    });

    const text = formatShareResult(finishedGame, {
      difficultyLabel: '经典综合',
      paperCount: 68,
      pageUrl: '  https://example.com/  ',
    });

    expect(text).toBe(`AI 论文版弗一把 · 经典综合
2/8 猜中

🟩🟨⬜🟩⬜🟩⬜
🟩🟩🟩🟩🟩🟩🟩

68 篇 AI 经典论文，你能几次猜中？
https://example.com/`);
    expect(text).not.toContain('Secret Guess Title');
    expect(text).not.toContain('Secret Answer Title');

    const squareRows = text
      .split('\n')
      .filter((line) => /^[🟩🟨⬜]+$/u.test(line));
    expect(squareRows).toHaveLength(2);
    expect(squareRows.every((row) => [...row].length === 7)).toBe(true);
  });

  it('formats a loss after all eight guesses', () => {
    const guesses = Array.from({ length: 8 }, (_, index) =>
      feedback(`guess-${index}`, `Hidden Guess ${index}`)
    );
    const finishedGame = game({
      guesses,
      guessedPaperIds: guesses.map((guess) => guess.paperId),
      status: 'lost',
      finishedAt: 2,
    });

    const text = formatShareResult(finishedGame, {
      difficultyLabel: '全量挑战',
      paperCount: 68,
    });

    expect(text).toBe(`AI 论文版弗一把 · 全量挑战
8/8 未猜中

🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜
🟩🟨⬜🟩⬜🟩⬜

68 篇 AI 经典论文，你能几次猜中？`);
    expect(text).not.toContain('Hidden Guess');
    expect(text).not.toContain('Secret Answer Title');
  });

  it('formats an immediate reveal with zero attempts', () => {
    const text = formatShareResult(
      game({ status: 'lost', finishedAt: 2 }),
      { difficultyLabel: '经典综合', paperCount: 68 }
    );

    expect(text).toBe(`AI 论文版弗一把 · 经典综合
已揭晓 · 尝试 0 次

68 篇 AI 经典论文，你能几次猜中？`);
  });

  it('formats an early reveal after partial guesses', () => {
    const guess = feedback('guess-1', 'Secret Guess Title');
    const text = formatShareResult(
      game({
        guesses: [guess],
        guessedPaperIds: [guess.paperId],
        status: 'lost',
        finishedAt: 2,
      }),
      { difficultyLabel: '经典综合', paperCount: 68 }
    );

    expect(text).toBe(`AI 论文版弗一把 · 经典综合
已揭晓 · 尝试 1 次

🟩🟨⬜🟩⬜🟩⬜

68 篇 AI 经典论文，你能几次猜中？`);
    expect(text).not.toContain('Secret Guess Title');
    expect(text).not.toContain('Secret Answer Title');
  });

  it('appends a valid HTTP URL', () => {
    const text = formatShareResult(
      game({ status: 'lost', finishedAt: 2 }),
      {
        difficultyLabel: '经典综合',
        paperCount: 68,
        pageUrl: 'http://example.com/play',
      }
    );

    expect(text).toMatch(/\nhttp:\/\/example\.com\/play$/);
  });

  it.each(['not a url', 'ftp://example.com/', 'javascript:alert(1)', '   '])(
    'omits an invalid or unsupported URL: %s',
    (pageUrl) => {
      const text = formatShareResult(
        game({ status: 'lost', finishedAt: 2 }),
        { difficultyLabel: '经典综合', paperCount: 68, pageUrl }
      );

      expect(text).toBe(`AI 论文版弗一把 · 经典综合
已揭晓 · 尝试 0 次

68 篇 AI 经典论文，你能几次猜中？`);
    }
  );

  it('omits the URL when none is provided', () => {
    const text = formatShareResult(
      game({ status: 'lost', finishedAt: 2 }),
      { difficultyLabel: '经典综合', paperCount: 68 }
    );

    expect(text).not.toMatch(/https?:\/\//);
  });

  it('rejects an unfinished game', () => {
    expect(() =>
      formatShareResult(game({}), {
        difficultyLabel: '经典综合',
        paperCount: 68,
      })
    ).toThrow(/GAME_NOT_FINISHED/);
  });
});
