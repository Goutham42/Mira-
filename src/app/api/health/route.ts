import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/**
 * Liveness + database readiness.
 *
 * Returns 503 when the database is unreachable so a load balancer takes the
 * instance out of rotation rather than serving errors to shoppers.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'up' });
  } catch {
    // The error itself is deliberately not returned — a health endpoint is
    // unauthenticated and must not leak connection details.
    return NextResponse.json({ status: 'degraded', database: 'down' }, { status: 503 });
  }
}
