import path from 'node:path';
import { defineConfig } from 'prisma/config';

// The Prisma CLI stops auto-loading .env once a config file exists, so do it
// explicitly. Node's built-in loader avoids pulling in dotenv.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(process.cwd(), file));
  } catch {
    // Absent file is fine — CI and production supply real environment vars.
  }
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
