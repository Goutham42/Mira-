import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from './helpers';

/**
 * The admin, as the shop owner uses it.
 *
 * These are the features that had no interface at all until now — a review
 * that could never be approved, a code that could only be created in psql, a
 * parcel with nowhere to put its tracking number. Each one is exercised
 * through the actual UI, because that is where the gap was.
 */
test.use({ storageState: ADMIN_STATE });

test('every admin section loads', async ({ page }) => {
  const sections = [
    '/admin',
    '/admin/orders',
    '/admin/products',
    '/admin/categories',
    '/admin/inventory',
    '/admin/reviews',
    '/admin/discounts',
    '/admin/customers',
  ];

  for (const path of sections) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/we hit a snag/i)).toHaveCount(0);
  }
});

test('a discount code can be created, switched off and deleted', async ({ page }) => {
  const code = `E2E${Date.now().toString().slice(-8)}`;

  await page.goto('/admin/discounts');
  await page.getByRole('button', { name: 'New code' }).click();

  // Ids, not labels: "Code" also matches the search box and the dialog itself.
  await page.locator('#code').fill(code);
  await page.locator('#discountDescription').fill('Created by the e2e suite');
  await page.locator('#percentValue').fill('15');
  await page.getByRole('button', { name: 'Save code' }).click();

  const row = page.getByRole('row', { name: new RegExp(code, 'i') });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.getByText('15% off')).toBeVisible();

  await row.getByRole('button', { name: 'Turn off' }).click();
  await expect(row.getByRole('button', { name: 'Turn on' })).toBeVisible({ timeout: 15_000 });

  // Never redeemed, so deleting it is allowed and leaves no history behind.
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('row', { name: new RegExp(code, 'i') })).toHaveCount(0, {
    timeout: 15_000,
  });
});

test('a percentage over 100 is refused before it reaches the database', async ({ page }) => {
  await page.goto('/admin/discounts');
  await page.getByRole('button', { name: 'New code' }).click();

  await page.locator('#code').fill('E2EBAD');
  await page.locator('#percentValue').fill('150');
  await page.getByRole('button', { name: 'Save code' }).click();

  await expect(page.getByText(/between 1 and 100/i)).toBeVisible();
});

test('the review queue renders each tab', async ({ page }) => {
  await page.goto('/admin/reviews');

  for (const tab of ['Pending', 'Published', 'Rejected', 'All']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  }
});

test('an order can be paid, shipped and delivered', async ({ page }) => {
  await page.goto('/admin/orders');

  const firstOrder = page.locator('a[href^="/admin/orders/"]').first();
  test.skip(
    (await firstOrder.count()) === 0,
    'No orders in the database — run the checkout spec first.',
  );

  await firstOrder.click();
  await expect(page).toHaveURL(/\/admin\/orders\//);

  // Offline settlement: this is what commits the stock reservation.
  const recordPayment = page.getByRole('button', { name: 'Record payment' });
  if (await recordPayment.isVisible().catch(() => false)) {
    await recordPayment.click();
    await expect(recordPayment).toHaveCount(0, { timeout: 20_000 });
  }

  const createShipment = page.getByRole('button', { name: 'Create shipment' });
  if (await createShipment.isVisible().catch(() => false)) {
    await createShipment.click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('#carrier').fill('Delhivery');
    await dialog.locator('#trackingNumber').fill(`E2E${Date.now()}`);
    // Do not send mail from a test run.
    await dialog.locator('#notifyShipment').click();
    await dialog.getByRole('button', { name: 'Create shipment' }).click();

    await expect(page.getByText('Delhivery').first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Mark delivered' }).first().click();
    await expect(page.getByText('Delivered').first()).toBeVisible({ timeout: 20_000 });
  }
});

test('the customer list offers account controls to an admin', async ({ page }) => {
  await page.goto('/admin/customers');

  const manage = page.getByRole('button', { name: /manage /i }).first();
  await expect(manage).toBeVisible();

  await manage.click();
  await expect(page.getByRole('menuitem', { name: /sign out everywhere/i })).toBeVisible();
  await page.keyboard.press('Escape');
});
