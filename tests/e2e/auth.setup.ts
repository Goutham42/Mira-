import { expect, test as setup } from '@playwright/test';

import { ADMIN_STATE, CUSTOMER_STATE, E2E_SHOPPER, credentials, signIn } from './helpers';

/**
 * Sign in once, reuse the session everywhere.
 *
 * Logging in inside every spec would test the login form twenty times and the
 * thing under test once. `auth.spec.ts` covers the form itself; everything
 * else starts from a saved session.
 */

/**
 * The shopper account belongs to the suite, not to the seed.
 *
 * Relying on the seeded `customer@mira.example` made the whole run depend on
 * `SEED_ADMIN_PASSWORD` still matching the hash in the database — and it
 * silently stops matching the first time anyone rotates that password or
 * re-seeds with a different one. Registering on first run and signing in
 * thereafter keeps the suite honest about what it needs.
 */
setup('authenticate as customer', async ({ page }) => {
  const signedIn = await signIn(page, E2E_SHOPPER.email, E2E_SHOPPER.password);

  if (!signedIn) {
    await page.goto('/register');
    await page.locator('#firstName').fill(E2E_SHOPPER.firstName);
    await page.locator('#lastName').fill(E2E_SHOPPER.lastName);
    await page.locator('#email').fill(E2E_SHOPPER.email);
    await page.locator('#password').fill(E2E_SHOPPER.password);
    await page.locator('#confirmPassword').fill(E2E_SHOPPER.password);
    await page.getByRole('button', { name: /create|register|sign up/i }).click();

    await expect(page).toHaveURL(/\/(account|verify-email)/, { timeout: 20_000 });
  }

  await page.goto('/account');
  // The address appears twice on this page — in the verification banner and in
  // the profile card — so a bare getByText is a strict-mode violation.
  await expect(page.getByText(E2E_SHOPPER.email).first()).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: CUSTOMER_STATE });
});

setup('authenticate as admin', async ({ page }) => {
  const { admin } = credentials();

  const signedIn = await signIn(page, admin.email, admin.password);
  expect(signedIn, `Could not sign in as ${admin.email} — is SEED_ADMIN_PASSWORD current?`).toBe(
    true,
  );

  await page.goto('/admin');
  // A non-staff account is rewritten to not-found here, so reaching the admin
  // dashboard is the real assertion that the session carried the right role.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
  expect(page.url()).toContain('/admin');

  await page.context().storageState({ path: ADMIN_STATE });
});
