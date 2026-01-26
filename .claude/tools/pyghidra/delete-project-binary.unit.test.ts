/**
 * Unit tests for delete_project_binary wrapper
 *
 * HIGH RISK _ Destructive operation
 * Comprehensive test coverage: 22 tests
 *
 * Test Categories:
 * _ Successful Operations (4 tests)
 * _ Input Validation (6 tests)
 * _ Security (5 tests)
 * _ Idempotency (2 tests)
 * _ Error Handling (3 tests)
 * _ Audit Logging (2 tests)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from './delete-project-binary.js';

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';
const mockCallMCPTool = vi.mocked(callMCPTool);

describe('delete_project_binary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // =========================================
  // Successful Operations (4 tests)
  // =========================================

  describe('successful operations', () => {
    it('deletes binary and logs audit trail', async () => {
      mockCallMCPTool.mockResolvedValue({ success: true });

      const result = await execute({ binary_name: 'firmware.bin' });

      // Verify Result pattern
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binaryName).toBe('firmware.bin');
        expect(result.data.message).toContain('deleted');
      }

      // Verify audit logging (3 phases)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('delete_project_binary'),
        expect.stringContaining('attempt')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('success')
      );
    });

    it('deletes binary with dots and underscores', async () => {
      mockCallMCPTool.mockResolvedValue({ success: true });

      const result = await execute({ binary_name: 'firmware_v2.3.1.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binaryName).toBe('firmware_v2.3.1.bin');
      }
    });

    it('deletes binary with 255_character name', async () => {
      mockCallMCPTool.mockResolvedValue({ success: true });
      const longName = 'a'.repeat(255);

      const result = await execute({ binary_name: longName });

      expect(result.ok).toBe(true);
    });

    it('includes timestamp in audit log', async () => {
      mockCallMCPTool.mockResolvedValue({ success: true });

      await execute({ binary_name: 'test.bin' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      );
    });
  });

  // =========================================
  // Input Validation (6 tests)
  // =========================================

  describe('input validation', () => {
    it('rejects empty binary_name', async () => {
      const result = await execute({ binary_name: '' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('required');
      }

      // Audit log should capture validation failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('validation_failed')
      );
    });

    it('rejects whitespace_only binary_name', async () => {
      const result = await execute({ binary_name: '   ' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects binary_name longer than 255 characters', async () => {
      const tooLong = 'a'.repeat(256);

      const result = await execute({ binary_name: tooLong });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('too long');
      }
    });

    it('rejects null binary_name', async () => {
      const result = await execute({ binary_name: null as any });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects undefined binary_name', async () => {
      const result = await execute({} as any);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects numeric binary_name', async () => {
      const result = await execute({ binary_name: 12345 as any });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('string');
      }
    });
  });

  // =========================================
  // Security (5 tests)
  // =========================================

  describe('security', () => {
    it('rejects path traversal with ../', async () => {
      const result = await execute({ binary_name: '../../../etc/passwd' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SECURITY_VIOLATION');
        expect(result.error.message).toContain('traversal');
      }

      // Audit log should capture security violation
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('security_violation')
      );
    });

    it('rejects absolute path', async () => {
      const result = await execute({ binary_name: '/etc/passwd' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SECURITY_VIOLATION');
      }
    });

    it('rejects null byte injection', async () => {
      const result = await execute({ binary_name: 'firmware\x00.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SECURITY_VIOLATION');
        expect(result.error.message).toContain('control');
      }
    });

    it('rejects newline injection', async () => {
      const result = await execute({ binary_name: 'firmware\n.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SECURITY_VIOLATION');
      }
    });

    it('rejects tab character', async () => {
      const result = await execute({ binary_name: 'firmware\t.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SECURITY_VIOLATION');
      }
    });
  });

  // =========================================
  // Idempotency (2 tests)
  // =========================================

  describe('idempotency', () => {
    it('returns NOT_FOUND for non_existent binary', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Binary not found'));

      const result = await execute({ binary_name: 'missing.bin' });

      // Result pattern (NOT an exception)
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toContain('not found');
      }

      // Audit log should capture failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('failure'),
        expect.stringContaining('NOT_FOUND')
      );
    });

    it('returns NOT_FOUND when deleting already_deleted binary', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Binary not found'));

      const result1 = await execute({ binary_name: 'temp.bin' });
      const result2 = await execute({ binary_name: 'temp.bin' });

      // Both return NOT_FOUND (idempotent)
      expect(result1.ok).toBe(false);
      expect(result2.ok).toBe(false);
      if (!result1.ok && !result2.ok) {
        expect(result1.error.code).toBe('NOT_FOUND');
        expect(result2.error.code).toBe('NOT_FOUND');
      }
    });
  });

  // =========================================
  // Error Handling (3 tests)
  // =========================================

  describe('error handling', () => {
    it('handles MCP service unavailable', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Connection refused'));

      const result = await execute({ binary_name: 'test.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      }

      // Audit log should capture infrastructure failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('failure'),
        expect.stringContaining('SERVICE_UNAVAILABLE')
      );
    });

    it('handles MCP timeout', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Operation timed out'));

      const result = await execute({ binary_name: 'large.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TIMEOUT');
        expect(result.error.message).toContain('timed out');
      }
    });

    it('handles unexpected MCP error', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Unknown internal error'));

      const result = await execute({ binary_name: 'test.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
      }
    });
  });

  // =========================================
  // Audit Logging (2 tests)
  // =========================================

  describe('audit logging', () => {
    it('logs validation failures in audit trail', async () => {
      await execute({ binary_name: '../etc/passwd' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
        expect.stringContaining('validation_failed'),
        expect.stringContaining('traversal')
      );
    });

    it('includes binary name in all audit entries', async () => {
      mockCallMCPTool.mockResolvedValue({ success: true });

      await execute({ binary_name: 'tracked.bin' });

      // All audit entries should include binary name
      const auditCalls = consoleErrorSpy.mock.calls.filter(
        call => call[0]?.includes('[AUDIT]')
      );

      auditCalls.forEach(call => {
        expect(call[0]).toContain('tracked.bin');
      });
    });
  });
});
