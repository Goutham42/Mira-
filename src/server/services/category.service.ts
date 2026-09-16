import 'server-only';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { conflict, notFound } from '@/server/errors';
import { requirePermission } from '@/server/auth/session';
import { recordAudit } from './audit.service';
import { buildCategoryPath, slugify, uniqueSlug } from '@/lib/slug';
import type { CategoryInput } from '@/lib/validation/product';
import type { CategoryNode } from '@/types/catalog';

export const CATEGORY_TAG = 'categories';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  position: number;
  imageUrl: string | null;
};

function buildTree(rows: CategoryRow[], counts: Map<string, number>): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      path: row.path,
      imageUrl: row.imageUrl,
      productCount: counts.get(row.id) ?? 0,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // A parent's count should include everything beneath it, or "Dresses (0)"
  // appears whenever products only live in its subcategories.
  const rollUp = (node: CategoryNode): number => {
    const total = node.children.reduce((sum, child) => sum + rollUp(child), node.productCount);
    node.productCount = total;
    return total;
  };
  roots.forEach(rollUp);

  return roots;
}

/**
 * Full navigable tree with product counts. Cached and tag-invalidated because
 * it is rendered in the header on every page and changes only when an admin
 * edits the catalogue.
 */
export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const [rows, grouped] = await Promise.all([
      db.category.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          path: true,
          parentId: true,
          position: true,
          imageUrl: true,
        },
      }),
      db.product.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null, status: 'ACTIVE', publishedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<string, number>();
    for (const group of grouped) {
      if (group.categoryId) counts.set(group.categoryId, group._count._all);
    }

    return buildTree(rows, counts);
  },
  ['category-tree'],
  { tags: [CATEGORY_TAG], revalidate: 3600 },
);

/**
 * Request-deduped: the category page resolves the same path twice, once in
 * `generateMetadata` and once in the page body, and without this that is two
 * identical round trips on every category view. React's `cache` is the right
 * tool rather than `unstable_cache` — the result is per-request, so an admin
 * edit is visible on the next request with no tag to invalidate.
 */
export const getCategoryByPath = cache(async (path: string) => {
  return db.category.findFirst({
    where: { path, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      description: true,
      imageUrl: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
});

/**
 * The immediate children of a category, with product counts.
 *
 * Read from the cached tree rather than queried: the tree is already loaded
 * for the header on every page, so a drill-down row costs nothing extra.
 * Returns an empty array for a leaf, which is the caller's signal to render
 * nothing.
 */
export async function getChildCategories(path: string): Promise<CategoryNode[]> {
  const findByPath = (nodes: CategoryNode[]): CategoryNode | undefined => {
    for (const node of nodes) {
      if (node.path === path) return node;
      // Only descend where the path could actually live.
      if (path.startsWith(`${node.path}/`)) {
        const found = findByPath(node.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  return findByPath(await getCategoryTree())?.children ?? [];
}

/** Breadcrumb trail derived from the materialised path — no recursive query. */
export async function getBreadcrumbsForPath(path: string) {
  const segments = path.split('/').filter(Boolean);
  const paths = segments.map((_, index) => segments.slice(0, index + 1).join('/'));

  const rows = await db.category.findMany({
    where: { path: { in: paths }, deletedAt: null },
    select: { name: true, path: true },
  });

  const byPath = new Map(rows.map((row) => [row.path, row.name]));
  return paths
    .map((candidate) => {
      const name = byPath.get(candidate);
      return name ? { name, href: `/c/${candidate}` } : null;
    })
    .filter((entry): entry is { name: string; href: string } => entry !== null);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listCategoriesForAdmin() {
  await requirePermission('catalog:read');
  return db.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ path: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      parentId: true,
      position: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
}

export async function saveCategory(input: CategoryInput) {
  const actor = await requirePermission('catalog:write');

  const parentId = input.parentId || null;
  const parent = parentId
    ? await db.category.findFirst({
        where: { id: parentId, deletedAt: null },
        select: { id: true, path: true },
      })
    : null;

  if (parentId && !parent) throw notFound('Parent category');
  if (input.id && parentId === input.id) {
    throw conflict('A category cannot be its own parent.');
  }

  const slug = await uniqueSlug(input.slug || input.name, async (candidate) => {
    const existing = await db.category.findFirst({
      where: { slug: candidate, deletedAt: null, NOT: input.id ? { id: input.id } : undefined },
      select: { id: true },
    });
    return existing !== null;
  });

  const path = buildCategoryPath(parent?.path ?? null, slug);

  const data = {
    name: input.name,
    slug,
    path,
    description: input.description || null,
    parentId,
    imageUrl: input.imageUrl || null,
    isActive: input.isActive,
    position: input.position,
  } satisfies Prisma.CategoryUncheckedCreateInput;

  const saved = input.id
    ? await db.$transaction(async (tx) => {
        const before = await tx.category.findUnique({ where: { id: input.id } });
        if (!before) throw notFound('Category');

        const updated = await tx.category.update({ where: { id: input.id }, data });

        // Descendants embed the old path; rewrite them in one statement rather
        // than walking the tree in application code.
        if (before.path !== path) {
          await tx.$executeRaw`
            UPDATE "Category"
            SET "path" = ${path} || substring("path" from ${before.path.length + 1})
            WHERE "path" LIKE ${`${before.path}/%`}
          `;
        }
        return updated;
      })
    : await db.category.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: input.id ? 'category.update' : 'category.create',
    entityType: 'Category',
    entityId: saved.id,
    after: { name: saved.name, path: saved.path, isActive: saved.isActive },
  });

  revalidateTag(CATEGORY_TAG);
  return saved;
}

export async function deleteCategory(id: string) {
  const actor = await requirePermission('catalog:write');

  const category = await db.category.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, path: true, _count: { select: { children: true } } },
  });
  if (!category) throw notFound('Category');
  if (category._count.children > 0) {
    throw conflict('Move or remove the subcategories before deleting this category.');
  }

  // Soft delete: products keep pointing at it until they are re-filed, and
  // historical orders still resolve the name.
  await db.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await recordAudit({
    actorId: actor.id,
    action: 'category.delete',
    entityType: 'Category',
    entityId: id,
    before: { name: category.name, path: category.path },
  });

  revalidateTag(CATEGORY_TAG);
}

/** Slug helper shared with the product form's live preview. */
export const previewSlug = slugify;
