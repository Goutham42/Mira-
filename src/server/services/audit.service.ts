import 'server-only';
import { headers } from 'next/headers';
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { logger } from '@/lib/logger';

type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

/**
 * Records a privileged action.
 *
 * Never throws: an audit write failing must not roll back the operation the
 * admin actually performed. A dropped audit row is logged loudly instead.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');

    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: entry.before ?? undefined,
        after: entry.after ?? undefined,
        ip: forwardedFor?.split(',')[0]?.trim() ?? null,
        userAgent: headerList.get('user-agent')?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error, action: entry.action }, 'Failed to write audit log entry');
  }
}

export async function listAuditLog(limit = 100) {
  return db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { id: true, email: true, firstName: true } },
    },
  });
}
