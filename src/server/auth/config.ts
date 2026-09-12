import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Edge-safe Auth.js configuration.
 *
 * This module is imported by middleware, which runs on the edge runtime and
 * cannot load Prisma or the native Argon2 binding. It therefore contains no
 * database access and reads `process.env` through literal property names so
 * Next can inline the values at build time.
 *
 * The Node-only pieces — the Prisma adapter, the credentials provider and the
 * database-backed JWT revalidation — are layered on in `./index.ts`.
 */

const googleId = process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET;

export const googleEnabled = Boolean(googleId && googleSecret);

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,

  /**
   * JWT rather than database sessions.
   *
   * Auth.js only supports the credentials provider under the JWT strategy, and
   * email+password is a hard requirement here. Revocability — the reason to
   * prefer database sessions — is recovered by `User.sessionVersion`: the token
   * carries the version it was minted with, and `./index.ts` re-checks it
   * against the database every few minutes and on every privileged action.
   */
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: googleEnabled
    ? [
        Google({
          clientId: googleId,
          clientSecret: googleSecret,
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : [],

  callbacks: {
    /**
     * Reads claims already present on the token. The database-aware version in
     * `./index.ts` overrides this; middleware only needs signature validation
     * plus the claims as minted.
     */
    session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.firstName = token.firstName;
        session.user.isEmailVerified = token.isEmailVerified;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
