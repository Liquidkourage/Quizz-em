import { defineConfig } from 'vitest/config'

// Runs every workspace's tests in one pass: `npm run test:all`.
// Each project keeps its own config (aliases, include globs) where it has one.
export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'apps/server',
      'apps/host',
      'apps/player',
      'apps/display',
    ],
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/dist/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
