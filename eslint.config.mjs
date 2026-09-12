import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'next-env.d.ts',
      'src/generated/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // Prisma and Auth.js both surface floating promises easily; catching them
      // early is worth the occasional explicit void.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The seed script is a CLI entry point; console output is the interface.
    files: ['prisma/**/*.ts', '*.config.ts', '*.config.mjs'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
