import { describe, expect, it } from 'vitest';

import { buildCategoryPath, slugify, uniqueSlug } from '@/lib/slug';

describe('slugify', () => {
  it('normalises text into a URL-safe slug', () => {
    expect(slugify('Isla Linen Midi Dress')).toBe('isla-linen-midi-dress');
    expect(slugify('  Café  Noir  ')).toBe('cafe-noir');
    expect(slugify('50% Off!!')).toBe('50-off');
    expect(slugify('---')).toBe('');
  });

  it('caps length so a slug cannot overflow the column', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('uniqueSlug', () => {
  it('returns the root slug when it is free', async () => {
    const result = await uniqueSlug('Wren Cotton Maxi', async () => false);
    expect(result).toBe('wren-cotton-maxi');
  });

  it('appends a counter until it finds a free slug', async () => {
    const taken = new Set(['wren', 'wren-2', 'wren-3']);
    const result = await uniqueSlug('Wren', async (candidate) => taken.has(candidate));
    expect(result).toBe('wren-4');
  });

  it('falls back to a usable slug when the input has no usable characters', async () => {
    const result = await uniqueSlug('!!!', async () => false);
    expect(result).toBe('item');
  });
});

describe('buildCategoryPath', () => {
  it('joins onto the parent path, or stands alone at the root', () => {
    expect(buildCategoryPath(null, 'dresses')).toBe('dresses');
    expect(buildCategoryPath('dresses', 'midi')).toBe('dresses/midi');
    expect(buildCategoryPath('women/dresses', 'midi')).toBe('women/dresses/midi');
  });
});
