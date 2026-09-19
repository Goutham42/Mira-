import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * These tests drive a real browser against a real server and a real database.
 * That is the point: the unit suite covers pure arithmetic, and everything
 * that has actually broken in a shop like this — a variant that cannot be
 * added to the bag, a checkout that 500s, an admin action that silently does
 * nothing — only shows up when the whole stack is wired together.
 *
 * They are destructive: they place orders, ship them and create discount
 * codes. Point `DATABASE_URL` at a development database, never production.
 */

// The app reads .env through its own validated config; Playwright needs the
// seeded credentials from the same file without pulling in a dotenv dependency.
function loadEnvFile(path = '.env') {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;

      const key = match[1];
      const rawValue = match[2] ?? '';
      if (key && process.env[key] === undefined) {
        process.env[key] = rawValue.replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // No .env is fine when the variables are already exported.
  }
}

loadEnvFile();

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/.artifacts',

  // Checkout holds stock. Running specs in parallel against one seeded
  // catalogue makes them fight over the same variants, so the file order is
  // sequential by design rather than by accident.
  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'en-IN',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    /**
     * A production build, always.
     *
     * `next dev` compiles each route on first request, which on a modest
     * machine takes tens of seconds and turns the first assertion of every
     * spec into a race against the compiler. `npm run build` once up front is
     * slower to start and far faster — and more honest — to test against.
     * Set E2E_DEV=1 to drive a dev server you are already running.
     */
    command: process.env.E2E_DEV ? 'npm run dev' : 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,

    /**
     * Playwright exports `NODE_ENV=test` to everything it spawns, and
     * `next build` under that value fails while prerendering /404 with
     * "<Html> should not be imported outside of pages/_document". The server
     * under test should be a production server regardless, so say so.
     */
    env: { NODE_ENV: 'production' },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
