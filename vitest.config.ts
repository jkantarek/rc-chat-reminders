import { defineConfig } from 'vitest/config';
import { doctest } from 'vite-plugin-doctest';

export default defineConfig({
  plugins: [doctest()],
  test: {
    globals: true,
    // Standard unit/integration tests
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // In-source doctests embedded in @example @import.meta.vitest blocks
    includeSource: ['src/**/*.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.test-utils.{ts,tsx}',
        'src/reminder/Reminder.ts',
      ],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 98,
        statements: 98,
      },
    },
  },
});
