import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/examples.ts'],
    },
  },
  resolve: {
    alias: {
      // Order matters: the subpath entry must win before the bare-package
      // alias, or `wiremd/embed` resolves to `src/index.ts/embed`.
      'wiremd/embed': resolve(__dirname, '../src/embed/index.ts'),
      wiremd: resolve(__dirname, '../src/index.ts'),
    },
  },
});
