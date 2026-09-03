import { normalizeSearchText } from './normalize';
import type { Paper } from './types';

export interface PaperSuggestion {
  id: string;
  title: string;
  matchedName: string;
}

function namesForPaper(paper: Paper): string[] {
  return [paper.title, ...paper.aliases];
}

function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

function scoreName(name: string, query: string, compactQuery: string): number {
  const normalized = normalizeSearchText(name);
  const compactName = compact(normalized);
  if (normalized === query) return 0;
  if (compactName === compactQuery) return 1;
  if (normalized.startsWith(query)) return 2;
  if (compactName.startsWith(compactQuery)) return 3;
  if (normalized.includes(query)) return 4;
  if (compactName.includes(compactQuery)) return 5;
  const queryTokens = query.split(' ');
  if (queryTokens.every((token) => normalized.includes(token))) return 6;
  return Number.POSITIVE_INFINITY;
}

export function searchPapers(papers: readonly Paper[], query: string, limit = 10): PaperSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedLimit = Math.max(0, Math.floor(limit));
  if (!normalizedQuery || normalizedLimit === 0) return [];
  const compactQuery = compact(normalizedQuery);

  return papers
    .filter((paper) => paper.isEnabled)
    .map((paper) => {
      const scored = namesForPaper(paper)
        .map((name) => ({ name, score: scoreName(name, normalizedQuery, compactQuery) }))
        .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
      return {
        paper,
        matchedName: scored[0]?.name ?? paper.title,
        score: scored[0]?.score ?? Number.POSITIVE_INFINITY,
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score || a.paper.title.localeCompare(b.paper.title))
    .slice(0, normalizedLimit)
    .map((entry) => ({
      id: entry.paper.id,
      title: entry.paper.title,
      matchedName: entry.matchedName,
    }));
}
