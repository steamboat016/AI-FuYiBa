import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from './normalize';

describe('normalizeSearchText', () => {
  it('normalizes casing, punctuation, accents, and whitespace', () => {
    expect(normalizeSearchText('  Attention Is All You Need!  ')).toBe('attention is all you need');
    expect(normalizeSearchText('Fast R-CNN')).toBe('fast r cnn');
    expect(normalizeSearchText('BERT: Pre-training')).toBe('bert pre training');
  });
});
