import type { UserRole, UserStatus } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      /**
       * Named `isEmailVerified` rather than `emailVerified` on purpose: the
       * adapter's `User.emailVerified` is a `Date | null`, and reusing the name
       * would intersect the two into an uninhabitable type.
       */
      isEmailVerified: boolean;
      firstName: string | null;
    } & DefaultSession['user'];
  }

  /**
   * Optional because the Auth.js Prisma adapter constructs `User` objects
   * itself and knows nothing about our columns.
   */
  interface User {
    role?: UserRole;
    status?: UserStatus;
    firstName?: string | null;
    sessionVersion?: number;
    /** Present on AdapterUser but not on the base User; declared so the
     *  `User | AdapterUser` union is readable without a cast. */
    emailVerified?: Date | null;
  }
}

type MiraJwtClaims = {
  uid: string;
  role: UserRole;
  status: UserStatus;
  firstName: string | null;
  isEmailVerified: boolean;
  sessionVersion: number;
  /** Epoch ms of the last database revalidation of these claims. */
  refreshedAt: number;
};

// next-auth re-exports the JWT interface from @auth/core, and a re-export does
// not merge. Augment both so the claims are visible wherever the callback
// signature comes from.
declare module 'next-auth/jwt' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging
  interface JWT extends MiraJwtClaims {}
}

declare module '@auth/core/jwt' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging
  interface JWT extends MiraJwtClaims {}
}

export {};
