import { expect, test } from '@playwright/test';

/**
 * The browsing half of the shop.
 *
 * Nothing here signs in: everything a first-time visitor can reach has to work
 * for someone with no account and no cart.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('the home page introduces the shop and links into the catalogue', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('a[href^="/p/"], a[href="/shop"]').first()).toBeVisible();
});

test('the shop lists products and each one opens', async ({ page }) => {
  await page.goto('/shop');

  const products = page.locator('a[href^="/p/"]');
  await expect(products.first()).toBeVisible();
  expect(await products.count()).toBeGreaterThan(0);

  await products.first().click();
  await expect(page).toHaveURL(/\/p\//);

  // A product page without a price is broken even if it renders.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /add to bag|select|sold out/i })).toBeVisible();
});

test('search finds a product by name', async ({ page }) => {
  // Take a real title from the catalogue rather than inventing one.
  await page.goto('/shop');
  const firstTitle = await page.locator('a[href^="/p/"]').first().innerText();
  const term = firstTitle.trim().split(/\s+/)[0] ?? 'dress';

  await page.goto(`/search?q=${encodeURIComponent(term)}`);

  await expect(page.locator('a[href^="/p/"]').first()).toBeVisible();
});

test('a nonsense search says so rather than erroring', async ({ page }) => {
  await page.goto('/search?q=zzzzqqqqnothing');

  await expect(page.getByText(/nothing matches|no results|nothing found/i)).toBeVisible();
});

test('filters survive the back button', async ({ page }) => {
  await page.goto('/shop?sort=price-asc');
  await expect(page).toHaveURL(/sort=price-asc/);

  await page.locator('a[href^="/p/"]').first().click();
  await expect(page).toHaveURL(/\/p\//);

  await page.goBack();
  // Filters live in the URL precisely so this works.
  await expect(page).toHaveURL(/sort=price-asc/);
});

test('the legal pages are reachable and not empty', async ({ page }) => {
  for (const slug of ['terms', 'privacy', 'shipping-returns', 'size-guide']) {
    await page.goto(`/legal/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('the admin area is closed to anyone signed out', async ({ page }) => {
  await page.goto('/admin');

  // Signed out, middleware sends you to sign in and remembers where you were
  // going. (A signed-in customer gets a not-found instead, so that the admin
  // area is not confirmed to exist — asserted in account.spec.ts, which has a
  // customer session to do it with.)
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  expect(page.url()).toContain('callbackUrl');
  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
});
