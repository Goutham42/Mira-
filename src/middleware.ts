import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/server/auth/config';

/**
 * Middleware is a UX convenience, not the security boundary.
 *
 * It validates the session cookie's signature and redirects early so an
 * unauthenticated shopper sees the login screen instead of a flash of an empty
 * account page. Real authorization — including every ownership check — happens
 * in the service layer, which is reached by every code path. Never add a rule
 * here that does not also exist further in.
 *
 * Runs on the edge runtime, so it uses the Prisma-free `authConfig`.
 */
const { auth } = NextAuth(authConfig);

const STAFF_ROLES = new Set(['STAFF', 'ADMIN']);

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const isSignedIn = Boolean(user);

  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const isAccountRoute = nextUrl.pathname.startsWith('/account');
  const isCheckoutRoute = nextUrl.pathname.startsWith('/checkout');
  const isAuthRoute =
    nextUrl.pathname === '/login' ||
    nextUrl.pathname === '/register' ||
    nextUrl.pathname === '/forgot-password';

  if (isAuthRoute && isSignedIn) {
    return NextResponse.redirect(new URL('/account', nextUrl));
  }

  if ((isAdminRoute || isAccountRoute) && !isSignedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && !STAFF_ROLES.has(user?.role ?? '')) {
    // 404 rather than 403 — do not confirm the admin area exists.
    return NextResponse.rewrite(new URL('/not-found', nextUrl));
  }

  // Checkout is reachable as a guest; it just must never be indexed or cached.
  if (isCheckoutRoute) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /**
     * Everything except Next internals, the auth API (which must not be
     * intercepted) and static assets.
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2)$).*)',
  ],
};
