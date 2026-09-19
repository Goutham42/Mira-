import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { UserRole, UserStatus } from '@prisma/client';

import { db } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { requirePermission, requireUser } from '@/server/auth/session';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit';
import { paginate, parsePageParams } from '@/lib/pagination';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/server/email/client';
import { passwordResetTemplate, verifyEmailTemplate } from '@/server/email/templates';
import type { RegisterInput } from '@/lib/validation/auth';
import type { SaveAddressInput } from '@/lib/validation/address';
import { recordAudit } from './audit.service';

const TOKEN_TTL_MINUTES = 30;

/**
 * Reset and verification tokens are stored hashed.
 *
 * A database read must not yield a usable token, so the raw value exists only
 * in the email. SHA-256 is right here rather than Argon2: the token is already
 * 256 bits of entropy, so there is nothing to brute-force and no reason to pay
 * a work factor on every verification.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
  };
}

export async function registerUser(input: RegisterInput) {
  await enforceRateLimit(
    `register:${input.email}`,
    rateLimits.register.limit,
    rateLimits.register.windowMs,
  );

  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    // Enumeration is unavoidable at registration — the form has to say the
    // address is taken. It is mitigated by the rate limit above.
    throw conflict('An account with that email already exists.');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName || null,
      name: [input.firstName, input.lastName].filter(Boolean).join(' ') || null,
      marketingOptIn: input.marketingOptIn,
      wishlist: { create: {} },
    },
    select: { id: true, email: true },
  });

  const { token, tokenHash, expiresAt } = generateToken();
  await db.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  // Delivery failure must not undo a successful registration — the shopper can
  // request a fresh verification link later.
  const { subject, html, text } = verifyEmailTemplate(token);
  const result = await sendEmail({ to: user.email, subject, html, text });
  logger.info(
    { userId: user.id, delivered: result.delivered },
    'Email verification token issued',
  );

  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await enforceRateLimit(
    `reset:${email}`,
    rateLimits.passwordReset.limit,
    rateLimits.passwordReset.windowMs,
  );

  const user = await db.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });

  // Always returns without error: the response must not reveal whether the
  // address is registered.
  if (!user) return;

  const { token, tokenHash, expiresAt } = generateToken();
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const { subject, html, text } = passwordResetTemplate(token);
  const result = await sendEmail({ to: email, subject, html, text });
  logger.info({ userId: user.id, delivered: result.delivered }, 'Password reset token issued');
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('That reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        // Invalidates every existing session for this user.
        sessionVersion: { increment: 1 },
      },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Any other outstanding reset links are void too.
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('That verification link is invalid or has expired.');
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const actor = await requireUser();

  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  if (!user) throw notFound('Account');

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw badRequest('Your current password is not correct.');

  // Constant-time comparison so a near-miss cannot be probed.
  const same =
    Buffer.byteLength(currentPassword) === Buffer.byteLength(newPassword) &&
    timingSafeEqual(Buffer.from(currentPassword), Buffer.from(newPassword));
  if (same) throw badRequest('Choose a password different from your current one.');

  await db.user.update({
    where: { id: actor.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      sessionVersion: { increment: 1 },
    },
  });
}

export async function getProfile() {
  const actor = await requireUser();
  const profile = await db.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      marketingOptIn: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!profile) throw notFound('Account');
  return profile;
}

export async function updateProfile(input: {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  marketingOptIn: boolean;
}) {
  const actor = await requireUser();

  return db.user.update({
    where: { id: actor.id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName || null,
      name: [input.firstName, input.lastName].filter(Boolean).join(' ') || null,
      phone: input.phone || null,
      marketingOptIn: input.marketingOptIn,
    },
    select: { id: true },
  });
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export async function listAddresses() {
  const actor = await requireUser();
  return db.address.findMany({
    where: { userId: actor.id },
    orderBy: [{ isDefaultShipping: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function saveAddress(input: SaveAddressInput) {
  const actor = await requireUser();

  if (input.id) {
    // Scoped by userId — an address id from another account must not match.
    const owned = await db.address.findFirst({
      where: { id: input.id, userId: actor.id },
      select: { id: true },
    });
    if (!owned) throw notFound('Address');
  }

  return db.$transaction(async (tx) => {
    if (input.isDefaultShipping) {
      await tx.address.updateMany({
        where: { userId: actor.id },
        data: { isDefaultShipping: false },
      });
    }
    if (input.isDefaultBilling) {
      await tx.address.updateMany({
        where: { userId: actor.id },
        data: { isDefaultBilling: false },
      });
    }

    const data = {
      userId: actor.id,
      type: input.type,
      fullName: input.fullName,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2 || null,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      isDefaultShipping: input.isDefaultShipping,
      isDefaultBilling: input.isDefaultBilling,
    };

    return input.id
      ? tx.address.update({ where: { id: input.id }, data })
      : tx.address.create({ data });
  });
}

export async function deleteAddress(id: string) {
  const actor = await requireUser();
  const deleted = await db.address.deleteMany({ where: { id, userId: actor.id } });
  if (deleted.count === 0) throw notFound('Address');
}

export async function getDefaultShippingAddress() {
  const actor = await requireUser();
  return db.address.findFirst({
    where: { userId: actor.id, isDefaultShipping: true },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/**
 * Customer list for staff.
 *
 * Lifetime value counts paid orders only — including unpaid ones would let an
 * abandoned checkout inflate a customer's apparent worth.
 */
export async function listCustomersForAdmin(params: { q?: string; page?: number } = {}) {
  await requirePermission('customer:read');
  const page = parsePageParams(params.page, 25, 25);

  const where = {
    deletedAt: null,
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q, mode: 'insensitive' as const } },
            { firstName: { contains: params.q, mode: 'insensitive' as const } },
            { lastName: { contains: params.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  const spendByUser = new Map<string, number>();
  if (rows.length > 0) {
    const grouped = await db.order.groupBy({
      by: ['userId'],
      where: { userId: { in: rows.map((row) => row.id) }, paymentStatus: 'PAID' },
      _sum: { grandTotal: true },
    });
    for (const group of grouped) {
      if (group.userId) spendByUser.set(group.userId, group._sum.grandTotal ?? 0);
    }
  }

  const items = rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: [row.firstName, row.lastName].filter(Boolean).join(' ') || null,
    role: row.role,
    status: row.status,
    isVerified: row.emailVerified !== null,
    createdAt: row.createdAt,
    orderCount: row._count.orders,
    lifetimeSpend: spendByUser.get(row.id) ?? 0,
  }));

  return paginate(items, total, page);
}

// ---------------------------------------------------------------------------
// Account administration
// ---------------------------------------------------------------------------

/**
 * Suspend or reinstate an account.
 *
 * Suspension has to take effect now, not at the next sign-in — a suspended
 * shopper with a live JWT would otherwise keep ordering for the rest of the
 * token's life. Bumping `sessionVersion` is what makes it immediate: the jwt
 * callback re-checks the version and every existing session dies.
 */
export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const actor = await requirePermission('user:manage');

  const target = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!target) throw notFound('Customer');
  if (target.status === status) return;

  if (target.id === actor.id && status !== 'ACTIVE') {
    throw conflict('You cannot suspend your own account.');
  }

  if (status !== 'ACTIVE' && target.role === 'ADMIN') {
    await assertNotLastAdmin(target.id);
  }

  await db.user.update({
    where: { id: userId },
    data: {
      status,
      // Reinstating does not need a bump; suspending and locking must.
      ...(status === 'ACTIVE' ? {} : { sessionVersion: { increment: 1 } }),
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: status === 'ACTIVE' ? 'user.reinstate' : 'user.suspend',
    entityType: 'User',
    entityId: userId,
    before: { status: target.status },
    after: { status },
  });
}

/**
 * Change what someone is allowed to do.
 *
 * Role changes also revoke existing sessions: a demoted staff member holding a
 * token minted with the old role would otherwise keep their admin access until
 * it expired.
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const actor = await requirePermission('user:manage');

  const target = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, role: true },
  });
  if (!target) throw notFound('Customer');
  if (target.role === role) return;

  if (target.id === actor.id && role !== 'ADMIN') {
    throw conflict('You cannot remove your own admin access.');
  }

  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    await assertNotLastAdmin(target.id);
  }

  await db.user.update({
    where: { id: userId },
    data: { role, sessionVersion: { increment: 1 } },
  });

  await recordAudit({
    actorId: actor.id,
    action: 'user.role',
    entityType: 'User',
    entityId: userId,
    before: { role: target.role },
    after: { role },
  });
}

/**
 * Refuse to remove the last way into the admin.
 *
 * Without this, one careless demotion locks everybody out of the admin area
 * for good — there is no "reset an admin" path that does not involve a
 * database client.
 */
async function assertNotLastAdmin(excludingUserId: string): Promise<void> {
  const remaining = await db.user.count({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
      deletedAt: null,
      NOT: { id: excludingUserId },
    },
  });

  if (remaining === 0) {
    throw conflict('This is the last active admin. Promote someone else first.');
  }
}

/**
 * Force a customer to sign in again everywhere.
 *
 * The blunt instrument for "their laptop was stolen" — no password change, no
 * suspension, just every existing session invalidated.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const actor = await requirePermission('user:manage');

  const target = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!target) throw notFound('Customer');

  await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });

  await recordAudit({
    actorId: actor.id,
    action: 'user.revoke-sessions',
    entityType: 'User',
    entityId: userId,
  });
}
