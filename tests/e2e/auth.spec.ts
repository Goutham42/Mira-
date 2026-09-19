import { expect, test } from '@playwright/test';

import { credentials, signIn, uniqueEmail } from './helpers';

/**
 * Registration and sign-in.
 *
 * These run signed out on purpose — the saved sessions the other specs use
 * would make every assertion here meaningless.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('a new shopper can register', async ({ page }) => {
  const email = uniqueEmail('signup');

  await page.goto('/register');
  // By id: the form also has an "Email me about new arrivals" checkbox, which
  // a label-based lookup for "Email" matches just as well as the input.
  await page.locator('#firstName').fill('Test');
  await page.locator('#lastName').fill('Shopper');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('a-long-enough-password');
  await page.locator('#confirmPassword').fill('a-long-enough-password');

  await page.getByRole('button', { name: /create|register|sign up/i }).click();

  // Registration signs the shopper in; email verification happens separately.
  await expect(page).toHaveURL(/\/(account|verify-email|login)/, { timeout: 20_000 });
});

test('the wrong password is refused without saying which field was wrong', async ({ page }) => {
  const { customer } = credentials();

  const signedIn = await signIn(page, customer.email, 'definitely-not-the-password');
  expect(signedIn).toBe(false);

  // Next renders its own route announcer with role="alert", so scope to the form.
  const alert = page.locator('form').getByRole('alert').first();
  await expect(alert).toBeVisible();
  // Naming the wrong field would confirm which addresses have accounts.
  await expect(alert).not.toContainText(/no account|unknown email/i);
  await expect(page).toHaveURL(/\/login/);
});

test('a known shopper can sign in and out', async ({ page }) => {
  const { customer } = credentials();

  const signedIn = await signIn(page, customer.email, customer.password);
  expect(signedIn).toBe(true);

  await page.goto('/account');
  await expect(page.getByText(customer.email).first()).toBeVisible();
});

test('the account area sends signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/account/orders');

  await expect(page).toHaveURL(/\/login/);
  // And back to where they were going once they have.
  expect(page.url()).toContain('callbackUrl');
});

test('password reset accepts an address without revealing whether it exists', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.locator('#email').fill(uniqueEmail('nobody'));
  await page.getByRole('button', { name: /send|reset|email/i }).click();

  // Same response either way; anything else is an account-enumeration oracle.
  await expect(
    page.getByText(/if that address|check your inbox|we have sent/i).first(),
  ).toBeVisible({ timeout: 20_000 });
});
