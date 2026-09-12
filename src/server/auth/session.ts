import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import type { UserRole } from '@prisma/client';

import { forbidden, unauthenticated } from '@/server/errors';
import { auth } from './index';
import { hasPermission, isStaff, type Permission } from './rbac';

/**
 * Session access for the server.
 *
 * `cache` dedupes the lookup within a single request, so a layout, a page and
 * three services can each ask for the session without repeating the work.
 */
export const getSession = cache(async (): Promise<Session | null> => auth());

export type SessionUser = Session['user'];

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * For service functions: throws instead of redirecting, so the error taxonomy
 * decides how it surfaces (401 for an API call, a form error for an action).
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    throw forbidden(`Missing permission: ${permission}`);
  }
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

/**
 * For layouts and pages: redirects rather than throwing, because a shopper who
 * is not signed in wants the login screen, not an error page.
 */
export async function requireUserPage(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export async function requireStaffPage(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }
  if (!isStaff(user.role)) {
    // Deliberately a 404, not a 403: staff-only URLs should not confirm they
    // exist to a signed-in shopper poking around.
    notFound();
  }
  return user;
}

/**
 * Ownership guard. Every read or write of a user-scoped resource passes
 * through this — it is what makes an IDOR impossible even if a route forgets
 * to check.
 */
export function assertOwnership(resourceUserId: string | null, actor: SessionUser) {
  if (resourceUserId && resourceUserId === actor.id) return;
  if (isStaff(actor.role)) return;
  throw forbidden();
}
