import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { releaseExpiredReservations } from '@/server/services/inventory.service';

export const dynamic = 'force-dynamic';

/** Constant-time bearer check so the secret cannot be probed byte by byte. */
function authorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.CRON_SECRET}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Release stock held by checkouts that were never completed.
 *
 * Without this, an abandoned checkout would keep its items locked forever and
 * the shop would show sold out while holding stock nobody is buying.
 * Schedule every few minutes.
 */
async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const released = await releaseExpiredReservations();
    return NextResponse.json({ released });
  } catch (error) {
    logger.error({ err: error }, 'Reservation sweep failed');
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}

// Vercel Cron issues GET and attaches `Authorization: Bearer $CRON_SECRET`
// automatically. POST is kept for manual invocation and other schedulers.
export const GET = handle;
export const POST = handle;
