/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Resolve a slug collision by appending -2, -3, ... `exists` is supplied by the
 * caller so this stays pure and testable.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'item';
  if (!(await exists(root))) return root;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`Unable to derive a unique slug from "${base}"`);
}

/** Build a category's materialised path from its parent's. */
export function buildCategoryPath(parentPath: string | null, slug: string): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}
