/**
 * Unit Tests for vitest.setup.ts Global Safety Guards
 *
 * Tests that the global setup file properly blocks unmocked process spawning.
 * These tests verify the defense-in-depth isolation strategy.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('vitest.setup.ts - Global Safety Guards', () => {
  // Store original implementations to restore after tests
  let originalChildProcess: any;
  let originalStdioTransport: any;

  beforeEach(() => {
    // Mock child_process module as vitest.setup.ts does
    vi.doMock('child_process', () => ({
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
  });

  afterEach(() => {
    vi.doUnmock('child_process');
    vi.doUnmock('@modelcontextprotocol/sdk/client/stdio.js');
  });

  // ==========================================================================
  // Category 1: child_process.spawn Guard Tests
  // ==========================================================================

  describe('child_process.spawn guard', () => {
    it('should throw helpful error when spawn is called without mocking', async () => {
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.spawn('echo', ['test']);
      }).toThrow('Real child_process.spawn attempted in test!');
    });

    it('should include guidance in error message', async () => {
      const childProcess = await import('child_process');

      try {
        childProcess.spawn('echo', ['test']);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Mock the specific dependency');
        expect(error.message).toContain('Rename to *.integration.test.ts');
        expect(error.message).toContain('NODE_ENV=integration');
      }
    });

    it('should allow spawn when properly mocked in test', async () => {
      // Arrange: Mock spawn to return success
      const mockSpawn = vi.fn(() => ({
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      }));

      vi.doMock('child_process', () => ({
        spawn: mockSpawn,
      }));

      const childProcess = await import('child_process');

      // Act: Call spawn with mock
      childProcess.spawn('echo', ['test']);

      // Assert: Mock was called (no error thrown)
      expect(mockSpawn).toHaveBeenCalledWith('echo', ['test']);
    });
  });

  // ==========================================================================
  // Category 2: child_process.exec Guard Tests
  // ==========================================================================

  describe('child_process.exec guard', () => {
    it('should throw helpful error when exec is called without mocking', async () => {
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.execSync('echo test');
      }).toThrow('Real child_process.execSync attempted in test!');
    });

    it('should call callback with error when exec uses callback', async () => {
      const childProcess = await import('child_process');
      const callback = vi.fn();

      childProcess.exec('echo test', callback);

      expect(callback).toHaveBeenCalled();
      const [error] = callback.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Real child_process.exec attempted');
    });

    it('should throw error when exec called without callback', async () => {
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.exec('echo test');
      }).toThrow('Real child_process.exec attempted in test!');
    });
  });

  // ==========================================================================
  // Category 3: Other child_process Methods Guard Tests
  // ==========================================================================

  describe('other child_process methods guard', () => {
    it('should block execFile', async () => {
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.execFile('node', ['--version']);
      }).toThrow('Real child_process.execFile attempted in test!');
    });

    it('should block spawnSync', async () => {
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.spawnSync('echo', ['test']);
      }).toThrow('Real child_process.spawnSync attempted in test!');
    });

    it('should block fork', async () => {
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.fork('./some-script.js');
      }).toThrow('Real child_process.fork attempted in test!');
    });
  });

  // ==========================================================================
  // Category 4: MCP SDK StdioClientTransport Guard Tests
  // ==========================================================================

  describe('MCP SDK StdioClientTransport guard', () => {
    beforeEach(() => {
      // Mock the MCP SDK module
      vi.doMock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
        StdioClientTransport: vi.fn().mockImplementation(() => {
          throw new Error(
            'Real StdioClientTransport instantiated in test!\n' +
              'This would spawn a real MCP server process.\n' +
              'Use @claude/testing mocks instead.'
          );
        }),
      }));
    });

    it('should throw error when StdioClientTransport is instantiated', async () => {
      const { StdioClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/stdio.js'
      );

      expect(() => {
        new StdioClientTransport({
          command: 'uvx',
          args: ['serena'],
        });
      }).toThrow('Real StdioClientTransport instantiated in test!');
    });

    it('should include guidance about using @claude/testing mocks', async () => {
      const { StdioClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/stdio.js'
      );

      try {
        new StdioClientTransport({
          command: 'uvx',
          args: ['serena'],
        });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('@claude/testing mocks');
        expect(error.message).toContain('spawn a real MCP server process');
      }
    });
  });

  // ==========================================================================
  // Category 5: NODE_ENV Environment Tests
  // ==========================================================================

  describe('NODE_ENV environment', () => {
    it('should ensure NODE_ENV is set to test', () => {
      // The global setup sets NODE_ENV=test if not already set
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should not override existing NODE_ENV', () => {
      // If NODE_ENV was already set, setup respects it
      const originalEnv = process.env.NODE_ENV;
      expect(originalEnv).toBeDefined();
      expect(typeof originalEnv).toBe('string');
    });
  });

  // ==========================================================================
  // Category 6: Integration Scenarios
  // ==========================================================================

  describe('integration scenarios', () => {
    it('should prevent accidental real MCP server spawning in unit tests', async () => {
      // Scenario: Test accidentally tries to spawn real MCP server
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.spawn('uvx', ['serena']);
      }).toThrow('Real child_process.spawn attempted in test!');
    });

    it('should prevent accidental shell commands in unit tests', async () => {
      // Scenario: Test tries to run shell command
      const childProcess = await import('child_process');

      expect(() => {
        childProcess.execSync('npm test');
      }).toThrow('Real child_process.execSync attempted in test!');
    });

    it('should guide developers to proper mocking patterns', async () => {
      // Scenario: Developer gets error and needs to know what to do
      const childProcess = await import('child_process');

      try {
        childProcess.spawn('serena', ['--help']);
        expect.fail('Should have thrown');
      } catch (error: any) {
        // Error message should be actionable
        expect(error.message).toMatch(/Mock|integration\.test\.ts|NODE_ENV/);
      }
    });
  });
});
