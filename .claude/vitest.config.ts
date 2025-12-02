import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      // MCP tool wrapper tests (use @claude/testing)
      'tools/**/*.unit.test.ts',
      'tools/**/*.integration.test.ts',
      // Core skill manager tests (use vitest directly)
      'skills/*/scripts/**/*.test.ts',
      'skills/*/scripts/**/*.spec.ts',
      // Library skill tests (if added)
      'skill-library/**/scripts/**/*.test.ts',
      'skill-library/**/scripts/**/*.spec.ts',
      // Shared testing infrastructure tests
      'lib/testing/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.archived/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        '**/validation-suite.ts',
        '**/test-*.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    // Allow tests to run from root
    root: __dirname,
  },
  resolve: {
    alias: {
      '@claude/testing': path.resolve(__dirname, 'lib/testing/src/index.ts'),
      '@chariot/skills-lib': path.resolve(__dirname, 'skill-library/lib'),
    },
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
  },
});
