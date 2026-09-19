import { expect, type Page } from '@playwright/test';

/**
 * Shared steps.
 *
 * Kept deliberately thin: a helper that hides which button was clicked makes a
 * failing test harder to read than the flow it was meant to simplify.
 */

export const CUSTOMER_STATE = 'tests/e2e/.auth/customer.json';
export const ADMIN_STATE = 'tests/e2e/.auth/admin.json';

/**
 * The suite's own shopper.
 *
 * Fixed rather than random so repeat runs reuse one account instead of
 * littering the database, and independent of the seed so a rotated
 * SEED_ADMIN_PASSWORD cannot break every signed-in test at once.
 */
export const E2E_SHOPPER = {
  email: 'e2e-shopper@mira.test',
  password: 'e2e-suite-password-2026',
  firstName: 'E2E',
  lastName: 'Shopper',
};

export function credentials() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      'SEED_ADMIN_PASSWORD is not set. The e2e suite signs in as the seeded accounts; run `npm run db:seed` and set it in .env.',
    );
  }

  return {
    admin: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@mira.example', password },
    customer: E2E_SHOPPER,
  };
}

/** A fresh address every run, so repeat runs never collide on unique data. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@mira.test`;
}

/**
 * Sign in and wait for the result.
 *
 * Fields are addressed by id, not by label: several forms carry both an email
 * input and an "Email me about new arrivals" checkbox, and `getByLabel('Email')`
 * matches both. The ids come from the `Field` component, which wires `htmlFor`
 * to them, so they are as stable as the labels and unambiguous.
 *
 * Returns whether the sign-in actually took, so a caller can fall back to
 * registering rather than failing on a redirect that never came.
 */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<boolean> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Anything but /login means the credentials were accepted.
  return page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
}

/**
 * Put a buyable variant of a real product into the bag.
 *
 * The seeded catalogue has sold-out variants in it, and a real one will too,
 * so picking the first value of every option group is not enough: that lands
 * on a combination whose button reads "Sold out" and the test fails for a
 * reason that has nothing to do with what it is testing.
 *
 * Instead this walks combinations until the page itself says the variant can
 * be bought, and moves on to the next product if none can.
 */
export async function addFirstProductToBag(page: Page) {
  await page.goto('/shop');

  // By href rather than by name: the catalogue is the client's, and a test
  // that knows product names breaks the day real stock is loaded.
  const productLinks = page.locator('a[href^="/p/"]');
  const hrefs = await productLinks.evaluateAll((links) =>
    Array.from(new Set(links.map((link) => link.getAttribute('href') ?? ''))).filter(Boolean),
  );

  expect(hrefs.length, 'No products on /shop — has the database been seeded?').toBeGreaterThan(0);

  for (const href of hrefs.slice(0, 5)) {
    await page.goto(href);

    if (await selectBuyableVariant(page)) {
      await addToBagButton(page).click();

      // Adding is a Server Action, and navigating away while it is in flight
      // cancels it — which is how this test spent a run asserting against an
      // empty bag. The success toast is the page's own signal that the server
      // accepted it.
      await expect(page.getByText('Added to your bag')).toBeVisible({ timeout: 20_000 });
      return;
    }
  }

  throw new Error('No buyable variant found on the first few products.');
}

/**
 * The add button.
 *
 * There are two on a product page — the one in the page and the one in the
 * sticky bar that appears on scroll — so this is always `.first()`.
 */
export function addToBagButton(page: Page) {
  return page.getByRole('button', { name: 'Add to bag' }).first();
}

/**
 * Choose option values until the product is actually buyable.
 *
 * The button's own label is the oracle: "Select size" means the choice is
 * incomplete, "Sold out" means this combination cannot be bought, and
 * "Add to bag" means it can.
 */
export async function selectBuyableVariant(page: Page): Promise<boolean> {
  const groups = page.locator('fieldset', { has: page.locator('legend') });
  const groupCount = await groups.count();

  if (groupCount === 0) {
    return addToBagButton(page).isEnabled().catch(() => false);
  }

  const firstValues = groups.nth(0).getByRole('button');
  const firstCount = await firstValues.count();

  for (let first = 0; first < firstCount; first += 1) {
    await firstValues.nth(first).click();

    if (groupCount === 1) {
      if (await isBuyable(page)) return true;
      continue;
    }

    for (let group = 1; group < groupCount; group += 1) {
      const values = groups.nth(group).getByRole('button');
      const count = await values.count();

      for (let index = 0; index < count; index += 1) {
        await values.nth(index).click();
        if (await isBuyable(page)) return true;
      }
    }
  }

  return false;
}

async function isBuyable(page: Page): Promise<boolean> {
  const button = addToBagButton(page);
  const [label, enabled] = await Promise.all([
    button.innerText().catch(() => ''),
    button.isEnabled().catch(() => false),
  ]);
  return enabled && /add to bag/i.test(label);
}

export function checkoutAddress() {
  return {
    fullName: 'E2E Shopper',
    phone: '9876543210',
    line1: '12 Test Street',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postalCode: '641001',
  };
}
