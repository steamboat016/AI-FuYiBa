import { MAX_GUESSES } from './feedback';
import type { GameState } from './game';
import type { FeedbackLevel, GuessFeedback } from './types';

const SQUARE_BY_LEVEL: Record<FeedbackLevel, string> = {
  correct: '🟩',
  close: '🟨',
  wrong: '⬜',
};

const ATTRIBUTE_ORDER: readonly (keyof GuessFeedback['attributes'])[] = [
  'firstAuthorCountry',
  'year',
  'citationCount',
  'venue',
  'primaryField',
  'bestPaper',
  'testOfTimeAward',
];

export interface ShareResultOptions {
  difficultyLabel: string;
  paperCount: number;
  pageUrl?: string;
}

function formatStatus(game: GameState): string {
  if (game.status === 'won') return `${game.guesses.length}/${MAX_GUESSES} 猜中`;
  if (game.guesses.length === MAX_GUESSES) return `${MAX_GUESSES}/${MAX_GUESSES} 未猜中`;
  return `已揭晓 · 尝试 ${game.guesses.length} 次`;
}

function validPageUrl(pageUrl: string | undefined): string | null {
  const trimmedUrl = pageUrl?.trim();
  if (!trimmedUrl) return null;

  try {
    const protocol = new URL(trimmedUrl).protocol;
    return protocol === 'http:' || protocol === 'https:' ? trimmedUrl : null;
  } catch {
    return null;
  }
}

export function formatShareResult(game: GameState, options: ShareResultOptions): string {
  if (game.status === 'playing') throw new Error('GAME_NOT_FINISHED');

  const rows = game.guesses.map((guess) =>
    ATTRIBUTE_ORDER.map((key) => SQUARE_BY_LEVEL[guess.attributes[key].level]).join('')
  );
  const lines = [
    `AI 论文版弗一把 · ${options.difficultyLabel}`,
    formatStatus(game),
    '',
  ];

  if (rows.length) lines.push(...rows, '');

  lines.push(`${options.paperCount} 篇 AI 经典论文，你能几次猜中？`);

  const pageUrl = validPageUrl(options.pageUrl);

  if (pageUrl) lines.push(pageUrl);

  return lines.join('\n');
}
