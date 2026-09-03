import { z } from 'zod';
import type { Paper } from './types';
import { normalizeSearchText } from './normalize';

export const difficultyKeySchema = z.enum(['classic', 'vision', 'language', 'full']);

const requiredText = z.string().trim().min(1);
const requiredSearchableText = z.string().trim().min(1).refine(
  (value) => normalizeSearchText(value).length > 0,
  'must contain searchable letters or numbers'
);
const snapshotDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}, 'must be a real calendar date');

export const paperSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]+$/),
  title: requiredSearchableText.refine((value) => value.length >= 3, 'must be at least 3 characters'),
  aliases: z.array(requiredSearchableText).default([]),
  firstAuthor: requiredText,
  firstAuthorAffiliation: requiredText,
  firstAuthorCountry: requiredText,
  firstAuthorRegion: requiredText,
  year: z.number().int().min(1940).max(2100),
  citationCount: z.number().int().min(0),
  citationSource: z.enum([
    'google_scholar_manual',
    'openalex',
    'semantic_scholar',
    'manual_other',
  ]),
  citationCheckedAt: snapshotDate,
  venue: requiredText,
  venueFamily: requiredText,
  primaryField: requiredText,
  topLevelField: requiredText,
  fieldTags: z.array(requiredText).min(1),
  bestPaper: z.boolean(),
  bestPaperName: requiredText.nullable(),
  testOfTimeAward: z.boolean(),
  testOfTimeAwardName: requiredText.nullable(),
  difficulty: z.array(difficultyKeySchema).min(1),
  isEnabled: z.boolean(),
  links: z.object({
    paper: z.string().url(),
    code: z.string().url().nullable(),
  }),
  arxivId: requiredText.optional(),
  openAlexId: requiredText.optional(),
  semanticScholarCorpusId: requiredText.optional(),
});

export const papersSchema = z.array(paperSchema).superRefine((papers, ctx) => {
  const ids = new Set<string>();
  const searchableNames = new Set<string>();

  for (const paper of papers) {
    if (ids.has(paper.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate paper id: ${paper.id}`,
      });
    }
    ids.add(paper.id);

    for (const name of [paper.title, ...paper.aliases]) {
      const normalized = normalizeSearchText(name);
      if (searchableNames.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate searchable name: ${name}`,
        });
      }
      searchableNames.add(normalized);
    }

    if (paper.bestPaper && !paper.bestPaperName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${paper.id} has bestPaper=true without bestPaperName`,
      });
    }
    if (!paper.bestPaper && paper.bestPaperName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${paper.id} has bestPaper=false with bestPaperName`,
      });
    }
    if (paper.testOfTimeAward && !paper.testOfTimeAwardName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${paper.id} has testOfTimeAward=true without testOfTimeAwardName`,
      });
    }
    if (!paper.testOfTimeAward && paper.testOfTimeAwardName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${paper.id} has testOfTimeAward=false with testOfTimeAwardName`,
      });
    }
    if (!paper.difficulty.includes('full')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${paper.id} must include full difficulty`,
      });
    }
    for (const name of [paper.title, ...paper.aliases]) {
      if (!normalizeSearchText(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${paper.id} has empty searchable name`,
        });
      }
    }
  }
});

export type ParsedPaper = z.infer<typeof paperSchema> & Paper;
