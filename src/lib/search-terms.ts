/**
 * Query expansion for the catalogue search.
 *
 * Shoppers type what they call the garment, not what the catalogue calls it:
 * "chudidhar" for a churidar, "pant" for trousers, "tops" for a piece titled
 * "Top". A plain substring match over the title misses all three, so a query is
 * tokenised, each token is stemmed and expanded through the groups below, and a
 * product matches when every token matches something.
 */

/**
 * Garment vocabulary. Every word in a group is treated as equivalent, so the
 * group only has to be written once and works in both directions.
 */
const SYNONYM_GROUPS: string[][] = [
  ['kurti', 'kurta', 'tunic'],
  ['salwar', 'shalwar', 'salwaar', 'churidar', 'chudidhar', 'chudidar', 'suit'],
  ['legging', 'jegging', 'tight', 'jegging'],
  ['pant', 'trouser', 'palazzo', 'culotte', 'bottom', 'pyjama', 'pajama'],
  ['top', 'tee', 'tshirt', 'blouse', 'shirt'],
  ['nightie', 'nighty', 'nightgown', 'nightdress', 'nightwear', 'nightsuit'],
  ['inner', 'camisole', 'slip', 'vest', 'bra'],
  ['inskirt', 'petticoat', 'underskirt'],
  ['dupatta', 'stole', 'chunni', 'scarf'],
  ['saree', 'sari'],
  ['lehenga', 'lehanga', 'ghagra', 'chaniya'],
  ['dress', 'frock', 'gown'],
  ['skirt', 'midi', 'maxi'],
  ['dungaree', 'jumpsuit', 'romper'],
];

/** Built once: stemmed word -> every stemmed word in its group. */
const SYNONYMS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const group of SYNONYM_GROUPS) {
    const stemmed = [...new Set(group.map(stem))];
    for (const word of stemmed) {
      map.set(word, [...new Set([...(map.get(word) ?? []), ...stemmed])]);
    }
  }
  return map;
})();

/**
 * Crude English stemmer — enough for garment nouns.
 *
 * A real stemmer would be overkill here: the only forms that matter are the
 * plural ones a shopper actually types ("tops", "sarees", "nighties").
 */
export function stem(word: string): string {
  const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.length <= 3) return lower;
  if (lower.endsWith('ies')) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith('es') && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s')) return lower.slice(0, -1);
  return lower;
}

/** How many words of a query are honoured, to bound the generated SQL. */
const MAX_TOKENS = 6;
const MAX_EXPANSIONS = 10;

export type SearchToken = {
  /** The word as typed, minus punctuation. Used for a direct substring match. */
  raw: string;
  /** Everything this token should also match, including the token itself. */
  variants: string[];
};

/**
 * Split a query into tokens and expand each one.
 *
 * Returns an empty array for a query with nothing searchable in it, which the
 * caller should treat as "no text filter" rather than "match nothing".
 */
export function buildSearchTokens(query: string): SearchToken[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 1)
    .slice(0, MAX_TOKENS);

  return words.map((raw) => {
    const stemmed = stem(raw);
    const variants = new Set<string>([raw, stemmed]);

    for (const synonym of SYNONYMS.get(stemmed) ?? []) variants.add(synonym);

    return { raw, variants: [...variants].slice(0, MAX_EXPANSIONS) };
  });
}

/** Garment names offered as one-tap searches on the empty search page. */
export const SEARCH_SUGGESTIONS = [
  'Kurtis',
  'Salwar Sets',
  'Churidar',
  'Leggings',
  'Pants',
  'Tops',
  'Nighties',
  'Inskirt',
  'Inners',
] as const;
