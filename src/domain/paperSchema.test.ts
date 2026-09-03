import { describe, expect, it } from 'vitest';
import papersJson from '../data/papers.json';
import { paperSchema, papersSchema } from './paperSchema';
import { searchPapers } from './search';

const validPaper = {
  id: 'attention-is-all-you-need',
  title: 'Attention Is All You Need',
  aliases: ['Transformer'],
  firstAuthor: 'Ashish Vaswani',
  firstAuthorAffiliation: 'Google Brain',
  firstAuthorCountry: 'United States',
  firstAuthorRegion: 'North America',
  year: 2017,
  citationCount: 100000,
  citationSource: 'google_scholar_manual',
  citationCheckedAt: '2026-08-01',
  venue: 'NeurIPS',
  venueFamily: 'ML Conference',
  primaryField: 'Natural Language Processing',
  topLevelField: 'Language',
  fieldTags: ['Transformer', 'Sequence Modeling', 'Attention'],
  bestPaper: false,
  bestPaperName: null,
  testOfTimeAward: false,
  testOfTimeAwardName: null,
  difficulty: ['classic', 'language', 'full'],
  isEnabled: true,
  links: {
    paper: 'https://arxiv.org/abs/1706.03762',
    code: null,
  },
};

describe('paperSchema', () => {
  it('accepts a complete paper record', () => {
    expect(paperSchema.parse(validPaper).id).toBe('attention-is-all-you-need');
  });

  it('rejects duplicate ids and aliases within the full list', () => {
    expect(() =>
      papersSchema.parse([
        validPaper,
        { ...validPaper, title: 'Another Paper' },
      ])
    ).toThrow(/Duplicate paper id/);

    expect(() =>
      papersSchema.parse([
        validPaper,
        {
          ...validPaper,
          id: 'vision-transformer',
          title: 'An Image is Worth 16x16 Words',
          aliases: ['Transformer'],
        },
      ])
    ).toThrow(/Duplicate searchable name/);
  });

  it('rejects contradictory award names', () => {
    expect(() =>
      papersSchema.parse([
        {
          ...validPaper,
          bestPaper: false,
          bestPaperName: 'Best Paper',
        },
      ])
    ).toThrow(/bestPaper=false with bestPaperName/);

    expect(() =>
      papersSchema.parse([
        {
          ...validPaper,
          testOfTimeAward: false,
          testOfTimeAwardName: 'Test of Time Award',
        },
      ])
    ).toThrow(/testOfTimeAward=false with testOfTimeAwardName/);
  });

  it('rejects invalid snapshot dates and empty normalized searchable names', () => {
    expect(() =>
      paperSchema.parse({ ...validPaper, citationCheckedAt: '2026-99-99' })
    ).toThrow();

    expect(() =>
      papersSchema.parse([{ ...validPaper, aliases: ['!!!'] }])
    ).toThrow(/empty searchable name/);
  });
});

describe('release paper catalog', () => {
  it('contains 68 enabled papers with unique ids', () => {
    const papers = papersSchema.parse(papersJson);
    const enabledPapers = papers.filter((paper) => paper.isEnabled);

    expect(enabledPapers).toHaveLength(68);
    expect(new Set(enabledPapers.map((paper) => paper.id)).size).toBe(68);
  });

  it('locks the enabled paper count for each difficulty', () => {
    const papers = papersSchema.parse(papersJson);
    const enabledPapers = papers.filter((paper) => paper.isEnabled);
    const difficulties = ['classic', 'full', 'language', 'vision'] as const;
    const counts = Object.fromEntries(
      difficulties.map((difficulty) => [
        difficulty,
        enabledPapers.filter((paper) => paper.difficulty.includes(difficulty)).length,
      ])
    );

    expect(counts).toEqual({
      classic: 34,
      full: 68,
      language: 30,
      vision: 30,
    });
  });

  it.each([
    ['LeNet-5', 'lenet-5'],
    ['LSTM', 'lstm'],
    ['XGBoost', 'xgboost'],
    ['GCN', 'gcn'],
    ['GAT', 'gat'],
    ['SimCLR', 'simclr'],
    ['MAE', 'mae'],
    ['Whisper', 'whisper'],
  ])('resolves the exact alias %s', (alias, expectedId) => {
    const papers = papersSchema.parse(papersJson);
    const paper = papers.find((candidate) => candidate.id === expectedId);

    expect(paper?.aliases).toContain(alias);
    expect(searchPapers(papers, alias)[0]).toEqual(
      expect.objectContaining({ id: expectedId, matchedName: alias })
    );
  });
});
