import type { CategoryNode } from '@/types/catalog';

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Resolve an editorial category label to a real destination.
 *
 * The homepage names its six categories in `@/config/home`, but the catalogue
 * is whatever an admin has actually created. Rather than let a tile link to a
 * category that does not exist — a 404 straight off the homepage — this matches
 * on slug or name and falls back to a search that always returns something.
 */
export function resolveCategoryHref(
  categories: CategoryNode[],
  label: string,
  slugHint?: string,
): string {
  const all = flatten(categories);
  const wanted = normalise(slugHint ?? label);

  const match = all.find(
    (node) => normalise(node.slug) === wanted || normalise(node.name) === wanted,
  );

  if (match) return `/c/${match.path}`;
  return `/shop?q=${encodeURIComponent(label)}`;
}
