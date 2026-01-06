/**
 * Global Test Safety Guard
 *
 * Catches unmocked child_process operations in unit tests.
 * If a test accidentally spawns a real process, this fails fast
 * with a clear error instead of hanging for 30+ minutes.
 */

import { vi } from 'vitest';

// Block real child_process operations in all tests
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    throw new Error(
      'Real child_process.spawn attempted in test!\n' +
      'Either:\n' +
      '  1. Mock the specific dependency (vi.mock)\n' +
      '  2. Rename to *.integration.test.ts\n' +
      '  3. Set NODE_ENV=integration for integration tests'
    );
  }),
  exec: vi.fn((cmd: string, callback?: Function) => {
    const error = new Error(
      'Real child_process.exec attempted in test!\n' +
      'Either mock the dependency or rename to integration test.'
    );
    if (callback) {
      callback(error, '', '');
      return;
    }
    throw error;
  }),
  execFile: vi.fn(() => {
    throw new Error(
      'Real child_process.execFile attempted in test!\n' +
      'Either mock the dependency or rename to integration test.'
    );
  }),
  execSync: vi.fn(() => {
    throw new Error(
      'Real child_process.execSync attempted in test!\n' +
      'Either mock the dependency or rename to integration test.'
    );
  }),
  spawnSync: vi.fn(() => {
    throw new Error(
      'Real child_process.spawnSync attempted in test!\n' +
      'Either mock the dependency or rename to integration test.'
    );
  }),
  fork: vi.fn(() => {
    throw new Error(
      'Real child_process.fork attempted in test!\n' +
      'Either mock the dependency or rename to integration test.'
    );
  }),
}));

// Block MCP SDK from spawning real processes
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => {
    throw new Error(
      'Real StdioClientTransport instantiated in test!\n' +
      'This would spawn a real MCP server process.\n' +
      'Use @claude/testing mocks instead.'
    );
  }),
}));

// Ensure NODE_ENV is set for all tests
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Global test timeout warning
console.warn('[vitest.setup.ts] Global safety guards active');
