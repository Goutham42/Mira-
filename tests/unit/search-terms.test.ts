import { describe, expect, it } from 'vitest';

import { buildSearchTokens, stem } from '@/lib/search-terms';

/**
 * Search is how a shopper who knows what they want finds it. These pin the
 * two failures that made the old substring match useless: plurals and the
 * regional names people actually type.
 */
describe('stem', () => {
  it('reduces the plural forms shoppers type', () => {
    expect(stem('tops')).toBe('top');
    expect(stem('kurtis')).toBe('kurti');
    expect(stem('nighties')).toBe('nighty');
    expect(stem('sarees')).toBe('sare');
  });

  it('leaves short words alone rather than mangling them', () => {
    expect(stem('bra')).toBe('bra');
    expect(stem('tee')).toBe('tee');
  });

  it('strips punctuation and case', () => {
    expect(stem('T-Shirt')).toBe('tshirt');
  });
});

describe('buildSearchTokens', () => {
  const variantsFor = (query: string) => buildSearchTokens(query)[0]?.variants ?? [];

  it('matches a churidar however the shopper spells it', () => {
    expect(variantsFor('chudidhar')).toContain('churidar');
    expect(variantsFor('churidar')).toContain('chudidhar');
    expect(variantsFor('chudidhar')).toContain('salwar');
  });

  it('treats a plural as its singular', () => {
    expect(variantsFor('tops')).toContain('top');
  });

  it('expands everyday words to the catalogue vocabulary', () => {
    expect(variantsFor('pant')).toContain('trouser');
    expect(variantsFor('pants')).toContain('palazzo');
    expect(variantsFor('kurta')).toContain('kurti');
  });

  it('splits a multi-word query so every word must match', () => {
    const tokens = buildSearchTokens('blue kurti');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.raw).toBe('blue');
    expect(tokens[1]?.variants).toContain('kurta');
  });

  it('ignores punctuation and single characters', () => {
    expect(buildSearchTokens('a, b! kurti')).toHaveLength(1);
  });

  it('returns nothing searchable for an empty query', () => {
    expect(buildSearchTokens('   ')).toEqual([]);
  });

  it('bounds how much SQL one query can generate', () => {
    const tokens = buildSearchTokens('one two three four five six seven eight nine');
    expect(tokens.length).toBeLessThanOrEqual(6);
    for (const token of tokens) expect(token.variants.length).toBeLessThanOrEqual(10);
  });
});
