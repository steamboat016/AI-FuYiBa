import type { AttributeFeedback, GuessFeedback, Paper } from './types';

export const MAX_GUESSES = 8;
const YEAR_CLOSE_RANGE = 2;
const CITATION_CLOSE_RATIO = 0.25;
const CITATION_CLOSE_MINIMUM = 500;

function booleanAttribute(value: boolean, targetValue: boolean): AttributeFeedback<boolean> {
  return { value, level: value === targetValue ? 'correct' : 'wrong' };
}

function numericAttribute(
  value: number,
  targetValue: number,
  closeRange: number
): AttributeFeedback<number> {
  if (value === targetValue) return { value, level: 'correct' };
  return {
    value,
    level: Math.abs(value - targetValue) <= closeRange ? 'close' : 'wrong',
    hint: targetValue > value ? 'higher' : 'lower',
  };
}

function countryAttribute(guess: Paper, target: Paper): AttributeFeedback<string> {
  if (guess.firstAuthorCountry === target.firstAuthorCountry) {
    return { value: guess.firstAuthorCountry, level: 'correct' };
  }
  if (guess.firstAuthorRegion === target.firstAuthorRegion) {
    return { value: guess.firstAuthorCountry, level: 'close' };
  }
  return { value: guess.firstAuthorCountry, level: 'wrong' };
}

function citationCloseRange(targetCitationCount: number): number {
  const relativeRange = Math.round(targetCitationCount * CITATION_CLOSE_RATIO);
  const boundedMinimum = Math.min(CITATION_CLOSE_MINIMUM, targetCitationCount);
  return Math.max(boundedMinimum, relativeRange);
}

function venueAttribute(guess: Paper, target: Paper): AttributeFeedback<string> {
  if (guess.venue === target.venue) return { value: guess.venue, level: 'correct' };
  if (guess.venueFamily === target.venueFamily) return { value: guess.venue, level: 'close' };
  return { value: guess.venue, level: 'wrong' };
}

function fieldAttribute(guess: Paper, target: Paper): AttributeFeedback<string> {
  if (guess.primaryField === target.primaryField) {
    return { value: guess.primaryField, level: 'correct' };
  }
  const targetTags = new Set(target.fieldTags);
  const overlaps = guess.fieldTags.some((tag) => targetTags.has(tag));
  if (guess.topLevelField === target.topLevelField || overlaps) {
    return { value: guess.primaryField, level: 'close' };
  }
  return { value: guess.primaryField, level: 'wrong' };
}

export function comparePaperGuess(guess: Paper, target: Paper): GuessFeedback {
  return {
    paperId: guess.id,
    title: guess.title,
    correct: guess.id === target.id,
    attributes: {
      firstAuthorCountry: countryAttribute(guess, target),
      year: numericAttribute(guess.year, target.year, YEAR_CLOSE_RANGE),
      citationCount: numericAttribute(
        guess.citationCount,
        target.citationCount,
        citationCloseRange(target.citationCount)
      ),
      venue: venueAttribute(guess, target),
      primaryField: fieldAttribute(guess, target),
      bestPaper: booleanAttribute(guess.bestPaper, target.bestPaper),
      testOfTimeAward: booleanAttribute(guess.testOfTimeAward, target.testOfTimeAward),
    },
  };
}
