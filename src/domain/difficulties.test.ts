import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY_OPTIONS_BY_KEY } from './difficulties';
import type { DifficultyKey } from './types';

describe('difficulty metadata', () => {
  it('exports one ordered option for every difficulty key', () => {
    const expectedKeys: DifficultyKey[] = ['classic', 'vision', 'language', 'full'];
    expect(Object.keys(DIFFICULTY_OPTIONS_BY_KEY)).toEqual(expectedKeys);
    expect(DIFFICULTIES.map((difficulty) => difficulty.key)).toEqual(expectedKeys);
  });

  it('has exactly one recommended option', () => {
    expect(DIFFICULTIES.filter((difficulty) => difficulty.recommended)).toHaveLength(1);
  });
});
