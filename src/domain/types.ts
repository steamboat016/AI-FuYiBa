export type DifficultyKey = 'classic' | 'vision' | 'language' | 'full';

export type FeedbackLevel = 'correct' | 'close' | 'wrong';

export interface AttributeFeedback<T = string | number | boolean> {
  value: T;
  level: FeedbackLevel;
  hint?: 'higher' | 'lower';
}

export interface PaperLinks {
  paper: string;
  code: string | null;
}

export interface Paper {
  id: string;
  title: string;
  aliases: string[];
  firstAuthor: string;
  firstAuthorAffiliation: string;
  firstAuthorCountry: string;
  firstAuthorRegion: string;
  year: number;
  citationCount: number;
  citationSource: 'google_scholar_manual' | 'openalex' | 'semantic_scholar' | 'manual_other';
  citationCheckedAt: string;
  venue: string;
  venueFamily: string;
  primaryField: string;
  topLevelField: string;
  fieldTags: string[];
  bestPaper: boolean;
  bestPaperName: string | null;
  testOfTimeAward: boolean;
  testOfTimeAwardName: string | null;
  difficulty: DifficultyKey[];
  isEnabled: boolean;
  links: PaperLinks;
  arxivId?: string;
  openAlexId?: string;
  semanticScholarCorpusId?: string;
}

export interface GuessFeedback {
  paperId: string;
  title: string;
  correct: boolean;
  attributes: {
    firstAuthorCountry: AttributeFeedback<string>;
    year: AttributeFeedback<number>;
    citationCount: AttributeFeedback<number>;
    venue: AttributeFeedback<string>;
    primaryField: AttributeFeedback<string>;
    bestPaper: AttributeFeedback<boolean>;
    testOfTimeAward: AttributeFeedback<boolean>;
  };
}
