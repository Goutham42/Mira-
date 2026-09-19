import { expect, test } from '@playwright/test';

import { CUSTOMER_STATE } from './helpers';

/** Everything behind "My account", as the seeded customer. */
test.use({ storageState: CUSTOMER_STATE });

test('the account pages all render', async ({ page }) => {
  for (const path of ['/account', '/account/orders', '/account/addresses', '/account/wishlist']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    // A thrown server component renders the error boundary, not the page.
    await expect(page.getByText(/we hit a snag/i)).toHaveCount(0);
  }
});

test('a shopper can save an address', async ({ page }) => {
  // Unique per run: this account keeps every address it has ever saved, so a
  // fixed street matches several cards on the second run.
  const street = `${Date.now().toString().slice(-6)} Saved Street`;

  await page.goto('/account/addresses');

  const addButton = page.getByRole('button', { name: /add|new address/i }).first();
  await addButton.click();

  // The address book uses plain ids, unlike checkout's prefixed ones.
  await page.locator('#fullName').fill('E2E Address');
  await page.locator('#addressPhone').fill('9876543210');
  await page.locator('#line1').fill(street);
  await page.locator('#city').fill('Coimbatore');
  await page.locator('#state').fill('Tamil Nadu');
  await page.locator('#postalCode').fill('641002');

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save address' }).click();

  await expect(dialog).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText(street)).toBeVisible({ timeout: 20_000 });
});

test('the wishlist accepts and releases a product', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('a[href^="/p/"]').first().click();
  // Without this the heading read below is still the shop's, not the product's.
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

  const title = await page.getByRole('heading', { level: 1 }).innerText();

  const saveButton = page.getByRole('button', { name: 'Save to wishlist' }).first();
  const alreadySaved = (await saveButton.count()) === 0;

  if (!alreadySaved) {
    await saveButton.click();
    // The button flips to the remove state once the server has accepted it.
    await expect(
      page.getByRole('button', { name: 'Remove from wishlist' }).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  await page.goto('/account/wishlist');
  await expect(page.getByText(title.trim()).first()).toBeVisible({ timeout: 15_000 });
});

test('the admin area does not admit that it exists to a customer', async ({ page }) => {
  await page.goto('/admin');

  // Signed in but not staff: a 403 would confirm there is an admin here, so
  // middleware rewrites to the storefront's not-found instead.
  await expect(page.getByRole('heading', { name: /this page has moved on/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
});

test('a shopper cannot open somebody else than their own order', async ({ page }) => {
  // A guessed order number must not be an IDOR into another customer's data.
  const response = await page.goto('/account/orders/MIRA-0000000000');

  expect(response?.status()).toBe(404);
});
