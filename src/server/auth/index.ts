import 'server-only';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { UserRole, UserStatus } from '@prisma/client';

import { db } from '@/server/db';
import { loginSchema } from '@/lib/validation/auth';
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit';
import { authConfig } from './config';
import { verifyPassword } from './password';

/** How stale a token's claims may get before we re-read them from the database. */
const REVALIDATE_AFTER_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),

  providers: [
    ...authConfig.providers,
    Credentials({
      id: 'credentials',
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema
          .pick({ email: true, password: true })
          .safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Keyed on the email so one address cannot be brute-forced from many
        // IPs, and a shared IP cannot lock out an unrelated account.
        await enforceRateLimit(
          `login:${email}`,
          rateLimits.login.limit,
          rateLimits.login.windowMs,
        );

        const user = await db.user.findFirst({
          where: { email, deletedAt: null },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            firstName: true,
            role: true,
            status: true,
            emailVerified: true,
            sessionVersion: true,
          },
        });

        // Always runs, even when the user is absent, so timing does not
        // disclose whether the address is registered.
        const valid = await verifyPassword(user?.passwordHash, password);
        if (!user || !valid || user.status !== 'ACTIVE') return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          firstName: user.firstName,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    /**
     * Mints claims at sign-in and re-checks them against the database
     * periodically. Returning null here invalidates the session, which is how
     * a suspended, deleted or force-logged-out user loses access without
     * database-backed sessions.
     */
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.uid = user.id;
        token.role = user.role ?? 'CUSTOMER';
        token.status = user.status ?? 'ACTIVE';
        token.firstName = user.firstName ?? null;
        token.isEmailVerified = Boolean(user.emailVerified);
        token.sessionVersion = user.sessionVersion ?? 0;
        token.refreshedAt = Date.now();
        return token;
      }

      if (!token.uid) return token;

      const stale = Date.now() - (token.refreshedAt ?? 0) > REVALIDATE_AFTER_MS;
      if (!stale && trigger !== 'update') return token;

      const current = await db.user.findFirst({
        where: { id: token.uid, deletedAt: null },
        select: {
          role: true,
          status: true,
          firstName: true,
          emailVerified: true,
          sessionVersion: true,
        },
      });

      if (
        !current ||
        current.status !== 'ACTIVE' ||
        current.sessionVersion !== token.sessionVersion
      ) {
        return null;
      }

      token.role = current.role satisfies UserRole;
      token.status = current.status satisfies UserStatus;
      token.firstName = current.firstName;
      token.isEmailVerified = Boolean(current.emailVerified);
      token.refreshedAt = Date.now();
      return token;
    },
  },

  events: {
    /**
     * OAuth sign-ups arrive through the adapter with no role or password. Seed
     * the fields our own code depends on.
     */
    async createUser({ user }) {
      if (!user.id) return;
      const [firstName, ...rest] = (user.name ?? '').trim().split(/\s+/);
      await db.user.update({
        where: { id: user.id },
        data: {
          firstName: firstName || null,
          lastName: rest.join(' ') || null,
        },
      });
    },
  },
});
