import rawPapers from '../data/papers.json';
import { papersSchema } from './paperSchema';
import type { DifficultyKey, Paper } from './types';

const parsed = papersSchema.parse(rawPapers) as Paper[];

export const papers: Paper[] = parsed;

export function enabledPapers(): Paper[] {
  return papers.filter((paper) => paper.isEnabled);
}

export function papersForDifficulty(difficulty: DifficultyKey): Paper[] {
  return enabledPapers().filter((paper) => paper.difficulty.includes(difficulty));
}

export function paperById(id: string): Paper | undefined {
  return papers.find((paper) => paper.id === id);
}
