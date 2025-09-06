import { describe, it, expect } from 'vitest';
import { estimateCps } from './script';

describe('estimateCps', () => {
  it('tone: energetic は fast 相当(8cps)として扱う', () => {
    expect(estimateCps('energetic')).toBe(8);
  });
});
