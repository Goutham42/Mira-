import 'server-only';
import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Single Prisma instance.
 *
 * Next's dev server re-evaluates modules on every hot reload, which would open
 * a new pool each time; stash the client on `globalThis` to prevent that.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Query logging is opt-in via PRISMA_LOG_QUERIES=1.
 *
 * On by default it prints every statement, which buries real errors in a wall
 * of SQL — useful when debugging a specific query, noise the rest of the time.
 */
const logQueries = process.env.PRISMA_LOG_QUERIES === '1';

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
