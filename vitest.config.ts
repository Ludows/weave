import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js'
      ],
      thresholds: {
        lines: 75,
        functions: 72,
        branches: 83,
        statements: 75
      }
    }
  }
});
