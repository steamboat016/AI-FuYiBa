import { describe, expect, it } from 'vitest';
import { comparePaperGuess } from './feedback';
import type { Paper } from './types';

function makePaper(overrides: Partial<Paper>): Paper {
  return {
    id: 'target',
    title: 'Target Paper',
    aliases: ['Target'],
    firstAuthor: 'Author',
    firstAuthorAffiliation: 'Lab',
    firstAuthorCountry: 'United States',
    firstAuthorRegion: 'North America',
    year: 2020,
    citationCount: 10000,
    citationSource: 'google_scholar_manual',
    citationCheckedAt: '2026-08-01',
    venue: 'NeurIPS',
    venueFamily: 'ML Conference',
    primaryField: 'Natural Language Processing',
    topLevelField: 'Language',
    fieldTags: ['Transformer', 'Attention'],
    bestPaper: false,
    bestPaperName: null,
    testOfTimeAward: false,
    testOfTimeAwardName: null,
    difficulty: ['classic', 'full'],
    isEnabled: true,
    links: { paper: 'https://example.com/paper', code: null },
    ...overrides,
  };
}

describe('comparePaperGuess', () => {
  const target = makePaper({});

  it('marks all attributes correct for the answer', () => {
    const feedback = comparePaperGuess(target, target);
    expect(feedback.correct).toBe(true);
    expect(Object.values(feedback.attributes).every((attr) => attr.level === 'correct')).toBe(true);
  });

  it('marks same region country as close', () => {
    const guess = makePaper({
      id: 'bert',
      firstAuthorCountry: 'Canada',
      firstAuthorRegion: 'North America',
    });
    expect(comparePaperGuess(guess, target).attributes.firstAuthorCountry.level).toBe('close');
  });

  it('adds year arrows and close range', () => {
    const guess = makePaper({ id: 'older', year: 2018 });
    const feedback = comparePaperGuess(guess, target);
    expect(feedback.attributes.year.level).toBe('close');
    expect(feedback.attributes.year.hint).toBe('higher');
  });

  it('adds citation arrows and target-relative close range', () => {
    const guess = makePaper({ id: 'less-cited', citationCount: 7600 });
    const feedback = comparePaperGuess(guess, target);
    expect(feedback.attributes.citationCount.level).toBe('close');
    expect(feedback.attributes.citationCount.hint).toBe('higher');
  });

  it('does not apply the fixed citation minimum to low-citation targets', () => {
    const zeroCitationTarget = makePaper({ citationCount: 0 });
    const zeroCitationGuess = makePaper({ id: 'new-paper', citationCount: 500 });
    expect(
      comparePaperGuess(zeroCitationGuess, zeroCitationTarget).attributes.citationCount.level
    ).toBe('wrong');

    const lowCitationTarget = makePaper({ citationCount: 100 });
    const lowCitationGuess = makePaper({ id: 'low-cited-paper', citationCount: 600 });
    expect(
      comparePaperGuess(lowCitationGuess, lowCitationTarget).attributes.citationCount.level
    ).toBe('wrong');
  });

  it('marks same venue family as close', () => {
    const guess = makePaper({ id: 'icml-paper', venue: 'ICML', venueFamily: 'ML Conference' });
    expect(comparePaperGuess(guess, target).attributes.venue.level).toBe('close');
  });

  it('marks same top-level field or overlapping tags as close', () => {
    const guess = makePaper({
      id: 'rag',
      primaryField: 'Information Retrieval',
      topLevelField: 'Language',
      fieldTags: ['Retrieval', 'Transformer'],
    });
    expect(comparePaperGuess(guess, target).attributes.primaryField.level).toBe('close');
  });

  it('compares award booleans exactly', () => {
    const guess = makePaper({ id: 'award', bestPaper: true, bestPaperName: 'Best Paper' });
    expect(comparePaperGuess(guess, target).attributes.bestPaper.level).toBe('wrong');
  });
});
