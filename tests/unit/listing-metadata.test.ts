import { describe, expect, it } from 'vitest';

import { listingCanonical, listingMetadata } from '@/lib/listing-metadata';

describe('listingCanonical', () => {
  it('returns the bare path when there is no query', () => {
    expect(listingCanonical('/shop', {})).toBe('/shop');
  });

  it('drops filters and sort, which produce duplicate content', () => {
    const canonical = listingCanonical('/shop', {
      size: ['M', 'L'],
      color: 'Black',
      sort: 'price-asc',
      minPrice: '1000',
    });
    expect(canonical).toBe('/shop');
  });

  it('keeps page, because page 2 holds different products', () => {
    expect(listingCanonical('/shop', { page: '2' })).toBe('/shop?page=2');
    expect(listingCanonical('/c/dresses', { page: '7' })).toBe('/c/dresses?page=7');
  });

  it('treats page 1 as the bare path so it does not compete with itself', () => {
    expect(listingCanonical('/shop', { page: '1' })).toBe('/shop');
  });

  it('ignores a page value that is not a usable number', () => {
    for (const page of ['0', '-3', 'abc', '']) {
      expect(listingCanonical('/shop', { page })).toBe('/shop');
    }
  });

  it('keeps page while dropping the filters beside it', () => {
    expect(listingCanonical('/shop', { page: '3', size: 'M', sort: 'popular' })).toBe(
      '/shop?page=3',
    );
  });
});

describe('listingMetadata', () => {
  it('sets its own openGraph so the homepage card is not inherited', () => {
    const meta = listingMetadata({
      basePath: '/c/kurtis',
      searchParams: {},
      title: 'Kurtis',
      description: 'Everyday kurtis',
    });

    expect(meta.openGraph?.title).toBe('Kurtis');
    expect(meta.openGraph?.description).toBe('Everyday kurtis');
    expect(meta.alternates?.canonical).toBe('/c/kurtis');
  });

  it('distinguishes paginated pages in the title', () => {
    const meta = listingMetadata({
      basePath: '/shop',
      searchParams: { page: '4' },
      title: 'The whole collection',
    });

    expect(meta.title).toBe('The whole collection — page 4');
    expect(meta.alternates?.canonical).toBe('/shop?page=4');
  });

  it('falls back to the site description when a category has none', () => {
    const meta = listingMetadata({
      basePath: '/c/x',
      searchParams: {},
      title: 'X',
      description: null,
    });

    expect(typeof meta.description).toBe('string');
    expect((meta.description as string).length).toBeGreaterThan(0);
  });
});
