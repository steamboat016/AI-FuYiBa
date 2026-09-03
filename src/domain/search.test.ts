import { describe, expect, it } from 'vitest';
import { searchPapers } from './search';
import type { Paper } from './types';

function paper(overrides: Partial<Paper>): Paper {
  return {
    id: 'base',
    title: 'Base Paper',
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
    difficulty: ['full'],
    isEnabled: true,
    links: { paper: 'https://example.com/paper', code: null },
    ...overrides,
  };
}

describe('searchPapers', () => {
  const papers = [
    paper({
      id: 'attention-is-all-you-need',
      title: 'Attention Is All You Need',
      aliases: ['Transformer'],
    }),
    paper({
      id: 'fast-r-cnn',
      title: 'Fast R-CNN',
      aliases: ['Fast RCNN'],
    }),
    paper({
      id: 'resnet',
      title: 'Deep Residual Learning for Image Recognition',
      aliases: ['ResNet'],
    }),
    paper({
      id: 'gpt-3',
      title: 'Language Models are Few-Shot Learners',
      aliases: ['GPT-3'],
    }),
  ];

  it('matches aliases before title substring matches', () => {
    expect(searchPapers(papers, 'Transformer').map((item) => item.id)).toEqual([
      'attention-is-all-you-need',
    ]);
  });

  it('matches punctuation variants', () => {
    expect(searchPapers(papers, 'fast rcnn')[0]?.id).toBe('fast-r-cnn');
  });

  it('returns title matches for natural queries', () => {
    expect(searchPapers(papers, 'residual learning')[0]?.id).toBe('resnet');
  });

  it('excludes disabled papers', () => {
    expect(searchPapers([{ ...papers[0], isEnabled: false }], 'Transformer')).toEqual([]);
  });

  it('matches compact acronym and punctuation variants', () => {
    expect(searchPapers(papers, 'fastrcnn')[0]?.id).toBe('fast-r-cnn');
    expect(searchPapers(papers, 'gpt3')[0]?.id).toBe('gpt-3');
  });

  it('clamps non-positive limits to an empty result', () => {
    expect(searchPapers(papers, 'paper', -1)).toEqual([]);
    expect(searchPapers(papers, 'paper', 0)).toEqual([]);
  });
});
