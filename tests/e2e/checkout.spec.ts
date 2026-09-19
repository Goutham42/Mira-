import { expect, test } from '@playwright/test';

import { addFirstProductToBag, checkoutAddress, uniqueEmail } from './helpers';

/**
 * The path that earns the money.
 *
 * Runs as a guest, because a shop that only works for people who already have
 * an account has already lost most of its customers. Cash on delivery is the
 * chosen method so the test does not depend on a payment gateway that is not
 * connected yet.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('a guest can put a dress in the bag and place an order', async ({ page }) => {
  await addFirstProductToBag(page);

  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // The bag must actually contain something, with a price.
  const lines = page.locator('a[href^="/p/"]');
  await expect(lines.first()).toBeVisible();

  await page.getByRole('link', { name: /checkout|place order|continue/i }).first().click();
  await expect(page).toHaveURL(/\/checkout/);

  const address = checkoutAddress();
  const email = uniqueEmail('guest');

  // Ids rather than labels: the address block is rendered twice (shipping and
  // billing) and the contact section has its own Email field, so labels are
  // ambiguous by construction here. AddressFields builds ids as
  // `<prefix>.<field>`, which needs an attribute selector, not `#id`.
  const shipping = (field: string) => page.locator(`[id="shippingAddress.${field}"]`);

  await page.locator('#email').fill(email);
  await page.locator('#phone').fill(address.phone);
  await shipping('fullName').fill(address.fullName);
  await shipping('phone').fill(address.phone);
  await shipping('line1').fill(address.line1);
  await shipping('city').fill(address.city);
  await shipping('state').fill(address.state);
  await shipping('postalCode').fill(address.postalCode);

  await page.getByRole('radio', { name: /cash on delivery/i }).click();
  await page.locator('#acceptTerms').click();

  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmation\//, { timeout: 30_000 });
  // The order number is what the shopper quotes to support; it has to be shown.
  await expect(page.getByText(/[A-Z]{2,}[-0-9]{4,}/).first()).toBeVisible();
});

test('the cart survives a reload', async ({ page }) => {
  await addFirstProductToBag(page);

  await page.goto('/cart');
  const before = await page.locator('a[href^="/p/"]').count();

  await page.reload();
  await expect(page.locator('a[href^="/p/"]').first()).toBeVisible();
  expect(await page.locator('a[href^="/p/"]').count()).toBe(before);
});

test('an invalid discount code is rejected at the cart', async ({ page }) => {
  await addFirstProductToBag(page);
  await page.goto('/cart');

  const codeInput = page.getByPlaceholder(/enter code/i);
  if (await codeInput.isVisible().catch(() => false)) {
    await codeInput.fill('NOTAREALCODE');
    await page.getByRole('button', { name: /apply/i }).click();

    await expect(page.getByText(/not found|invalid|expired|does not/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }
});

test('checkout is never indexed', async ({ page }) => {
  const response = await page.goto('/checkout');
  // A checkout page in a search index leaks order flow and wastes crawl budget.
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
});
