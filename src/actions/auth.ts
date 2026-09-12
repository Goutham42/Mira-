'use server';

import { AuthError } from 'next-auth';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { AppError } from '@/server/errors';
import { signIn, signOut } from '@/server/auth';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validation/auth';
import * as userService from '@/server/services/user.service';
import { mergeGuestCartIntoUser } from '@/server/services/cart.service';
import { db } from '@/server/db';

/** Only same-origin paths may be used as a post-login destination. */
function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/account';
  return target;
}

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  return run(async () => {
    const parsed = loginSchema.parse(input);

    try {
      await signIn('credentials', {
        email: parsed.email,
        password: parsed.password,
        redirect: false,
      });
    } catch (error) {
      // Auth.js wraps everything, including our rate-limit error, in AuthError.
      if (error instanceof AuthError) {
        const cause = error.cause;
        if (cause && typeof cause === 'object' && 'err' in cause && cause.err instanceof AppError) {
          throw cause.err;
        }
        throw new AppError('UNAUTHENTICATED', 'That email or password is not correct.');
      }
      throw error;
    }

    // Fold anything added while signed out into the account's cart.
    const user = await db.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (user) await mergeGuestCartIntoUser(user.id);

    return { redirectTo: safeRedirect(parsed.redirectTo) };
  });
}

export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  return run(async () => {
    const parsed = registerSchema.parse(input);
    const user = await userService.registerUser(parsed);

    await signIn('credentials', {
      email: parsed.email,
      password: parsed.password,
      redirect: false,
    });

    await mergeGuestCartIntoUser(user.id);

    return { redirectTo: '/account' };
  });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { email } = forgotPasswordSchema.parse(input);
    await userService.requestPasswordReset(email);
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const parsed = resetPasswordSchema.parse(input);
    await userService.resetPassword(parsed.token, parsed.password);
  });
}

export async function verifyEmailAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { token } = z.object({ token: z.string().min(1) }).parse(input);
    await userService.verifyEmail(token);
  });
}
