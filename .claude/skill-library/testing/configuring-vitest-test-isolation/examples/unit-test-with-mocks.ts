/**
 * Standard Unit Test with Mocks
 *
 * Demonstrates proper mocking patterns for unit tests that interact
 * with external dependencies (child_process, fs, http, database, etc.)
 *
 * Key Patterns:
 * - Mock external dependencies at module level
 * - Use vi.mocked() for type-safe mock access
 * - Clean up mocks between tests
 * - Fail fast with explicit timeouts
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

// Mock external modules at module level (BEFORE any imports)
vi.mock('child_process');
vi.mock('fs/promises');

// NOW safe to import code under test
import { BackupService } from '../services/backup-service';

describe('BackupService (Unit)', () => {
  let service: BackupService;

  beforeEach(() => {
    // Clear all mocks before each test to prevent cross-test pollution
    vi.clearAllMocks();

    // Create fresh service instance
    service = new BackupService();
  });

  afterEach(() => {
    // Clean up timers BEFORE async cleanup
    vi.useRealTimers();
  });

  describe('createBackup', () => {
    it('should create backup without spawning real process', async () => {
      // Arrange: Mock child_process.spawn behavior
      const mockStdout = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('Backup created successfully'));
          }
        }),
      };

      const mockProcess = {
        stdout: mockStdout,
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);  // Exit code 0 = success
          }
        }),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      // Act: Create backup (should NOT spawn real process)
      const result = await service.createBackup('/data/source', '/backup/dest');

      // Assert: Verify mock was called with correct arguments
      expect(spawn).toHaveBeenCalledWith(
        'tar',
        ['-czf', '/backup/dest/backup.tar.gz', '/data/source'],
        { shell: true }
      );

      expect(result).toEqual({
        success: true,
        message: 'Backup created successfully',
      });
    });

    it('should handle backup process failure', async () => {
      // Arrange: Mock process failure
      const mockStderr = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('Permission denied'));
          }
        }),
      };

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: mockStderr,
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1);  // Exit code 1 = failure
          }
        }),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      // Act & Assert: Should throw error on failure
      await expect(
        service.createBackup('/invalid/source', '/backup/dest')
      ).rejects.toThrow('Backup failed: Permission denied');
    });

    it('should timeout if backup takes too long', async () => {
      // Arrange: Mock slow process
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),  // Never calls 'close' event
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      // Use fake timers for controlled timeout testing
      vi.useFakeTimers();

      // Act: Start backup
      const promise = service.createBackup('/data/source', '/backup/dest');

      // Fast-forward past timeout (30s)
      await vi.advanceTimersByTimeAsync(31000);

      // Assert: Should timeout
      await expect(promise).rejects.toThrow('Backup timeout after 30s');

      // Cleanup
      vi.useRealTimers();
    });
  });

  describe('verifyBackup', () => {
    it('should verify backup file without reading real file', async () => {
      // Arrange: Mock fs.readFile
      const mockFileContent = Buffer.from('backup data');
      vi.mocked(readFile).mockResolvedValue(mockFileContent);

      // Act: Verify backup (should NOT read real file)
      const result = await service.verifyBackup('/backup/dest/backup.tar.gz');

      // Assert: Verify mock was called
      expect(readFile).toHaveBeenCalledWith('/backup/dest/backup.tar.gz');
      expect(result).toEqual({
        valid: true,
        size: mockFileContent.length,
      });
    });

    it('should handle missing backup file', async () => {
      // Arrange: Mock file not found error
      vi.mocked(readFile).mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act & Assert: Should handle error gracefully
      await expect(
        service.verifyBackup('/nonexistent/backup.tar.gz')
      ).rejects.toThrow('ENOENT');
    });
  });

  describe('listBackups', () => {
    it('should list backups using mocked glob', async () => {
      // For glob/filesystem operations, mock the underlying module
      // See complete-configuration-example.md for full pattern
    });
  });
});

/**
 * Type-Safe Mock Access Pattern
 *
 * Use vi.mocked() to get IntelliSense and type checking
 */

function exampleTypeSafeMocking() {
  // ✅ GOOD: Type-safe mock access
  vi.mocked(spawn).mockReturnValue({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
  } as any);

  // Access mock methods with type safety
  const mockFn = vi.mocked(spawn);
  expect(mockFn).toHaveBeenCalled();

  // ❌ BAD: No type safety
  (spawn as any).mockReturnValue({ /* ... */ });
}

/**
 * Cleanup Best Practices
 */

function exampleCleanupPatterns() {
  describe('With timers', () => {
    afterEach(() => {
      // CRITICAL: Call useRealTimers() BEFORE afterEach async cleanup
      vi.useRealTimers();
    });

    it('test with fake timers', async () => {
      vi.useFakeTimers();
      // ... test logic ...
      // Cleanup happens in afterEach
    });
  });

  describe('With spies', () => {
    afterEach(() => {
      // Restore all spies to original implementations
      vi.restoreAllMocks();
    });

    it('test with spy', () => {
      const spy = vi.spyOn(console, 'log');
      // ... test logic ...
      // Cleanup happens in afterEach
    });
  });
}

/**
 * Anti-Patterns (DO NOT DO THIS)
 */

// ❌ BAD: Mocking code under test
/*
vi.mock('../services/backup-service', () => ({
  BackupService: vi.fn().mockImplementation(() => ({
    createBackup: vi.fn().mockResolvedValue({ success: true }),
  })),
}));
// Problem: You're testing the mock, not the real code!
*/

// ❌ BAD: Mock after import
/*
import { BackupService } from '../services/backup-service';
vi.mock('child_process');
// Problem: Import happens BEFORE mock, child_process already loaded
*/

// ❌ BAD: No mock cleanup between tests
/*
describe('Tests', () => {
  it('test 1', () => {
    vi.mocked(spawn).mockReturnValue({ /* mock A */ });
  });

  it('test 2', () => {
    // Problem: Mock A still active, affects test 2!
  });
});
// Fix: Add vi.clearAllMocks() in beforeEach
*/

// ❌ BAD: Mixing real and mocked dependencies
/*
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: spawn,  // Real exec, mocked spawn
}));
// Problem: Inconsistent mocking causes flaky tests
// Fix: Mock all functions or none
*/

// ❌ BAD: No timeout configuration
/*
it('should create backup', async () => {
  await service.createBackup('/data', '/backup');
  // Problem: If unmocked, hangs forever waiting for real process
});
// Fix: Set testTimeout: 5000 in vitest.config.ts unit project
*/

/**
 * Integration Test Alternative
 *
 * For testing with REAL external dependencies,
 * use *.integration.test.ts naming
 */

// FILE: backup-service.integration.test.ts
/*
import { describe, it, expect } from 'vitest';
import { BackupService } from '../services/backup-service';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('BackupService (Integration)', () => {
  let testDir: string;
  let service: BackupService;

  beforeEach(async () => {
    // Create real temp directory for testing
    testDir = join(tmpdir(), `backup-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    service = new BackupService();
  });

  afterEach(async () => {
    // Clean up real files
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create real backup file', async () => {
    // Act: Create REAL backup (spawns real tar process)
    const result = await service.createBackup(
      join(testDir, 'source'),
      join(testDir, 'backup')
    );

    // Assert: Verify real file exists
    expect(result.success).toBe(true);
    const stats = await stat(join(testDir, 'backup', 'backup.tar.gz'));
    expect(stats.size).toBeGreaterThan(0);
  }, 60000);  // 60s timeout for real file operations
});
*/
