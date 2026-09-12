import { clamp } from './utils';

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 60;

export type PageParams = { page: number; pageSize: number; skip: number; take: number };

/** Parse untrusted page/pageSize query params into safe bounds. */
export function parsePageParams(
  page: unknown,
  pageSize: unknown,
  defaultSize = DEFAULT_PAGE_SIZE,
): PageParams {
  const parsedPage = clamp(Math.trunc(Number(page)) || 1, 1, 10_000);
  const parsedSize = clamp(Math.trunc(Number(pageSize)) || defaultSize, 1, MAX_PAGE_SIZE);
  return {
    page: parsedPage,
    pageSize: parsedSize,
    skip: (parsedPage - 1) * parsedSize,
    take: parsedSize,
  };
}

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export function paginate<T>(items: T[], total: number, params: PageParams): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    hasPrevious: params.page > 1,
    hasNext: params.page < totalPages,
  };
}
