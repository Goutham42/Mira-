import path from 'node:path';

// Tests exercise modules that validate the environment at import time, so load
// the same .env the app uses rather than duplicating values here.
for (const file of ['.env.test.local', '.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(process.cwd(), file));
  } catch {
    // Missing file is fine.
  }
}
