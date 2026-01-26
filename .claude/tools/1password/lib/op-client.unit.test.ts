/**
 * op-client unit tests
 * TDD: Write tests FIRST, watch them fail, then implement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execOp, OpClientError, parseOpError } from './op-client.js';
import { exec } from 'child_process';

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('op-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execOp', () => {
    it('executes op command and returns JSON output', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          opts(null, '{"id": "abc123", "title": "Test Item"}', '');
        } else if (callback) {
          callback(null, '{"id": "abc123", "title": "Test Item"}', '');
        }
        return {} as any;
      });

      const result = await execOp(['item', 'get', 'Test Item', '--vault', 'Test']);

      expect(result).toBe('{"id": "abc123", "title": "Test Item"}');
      expect(mockExec).toHaveBeenCalledWith(
        'op --account praetorianlabs.1password.com item get Test Item --vault Test --format=json',
        expect.objectContaining({ timeout: 30000 }),
        expect.any(Function)
      );
    });

    it('throws OpClientError for biometric authentication failure', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, opts, callback) => {
        const error = new Error('command failed') as any;
        error.stderr = 'biometric authentication required';
        if (typeof opts === 'function') {
          opts(error, '', error.stderr);
        } else if (callback) {
          callback(error, '', error.stderr);
        }
        return {} as any;
      });

      await expect(execOp(['read', 'op://vault/item/field']))
        .rejects
        .toThrow(OpClientError);

      await expect(execOp(['read', 'op://vault/item/field']))
        .rejects
        .toMatchObject({
          code: 'AUTH_REQUIRED',
          message: expect.stringContaining('Biometric authentication required')
        });
    });

    it('throws OpClientError when item not found', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, opts, callback) => {
        const error = new Error('command failed') as any;
        error.stderr = 'item "Missing" not found in vault';
        if (typeof opts === 'function') {
          opts(error, '', error.stderr);
        } else if (callback) {
          callback(error, '', error.stderr);
        }
        return {} as any;
      });

      await expect(execOp(['item', 'get', 'Missing']))
        .rejects
        .toMatchObject({
          code: 'ITEM_NOT_FOUND',
          message: expect.stringContaining('not found')
        });
    });

    it('throws OpClientError when not signed in', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, opts, callback) => {
        const error = new Error('command failed') as any;
        error.stderr = 'not currently signed in';
        if (typeof opts === 'function') {
          opts(error, '', error.stderr);
        } else if (callback) {
          callback(error, '', error.stderr);
        }
        return {} as any;
      });

      await expect(execOp(['item', 'list']))
        .rejects
        .toMatchObject({
          code: 'NOT_SIGNED_IN',
          message: expect.stringContaining('1Password app integration')
        });
    });

    it('respects custom timeout', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          opts(null, '{}', '');
        } else if (callback) {
          callback(null, '{}', '');
        }
        return {} as any;
      });

      await execOp(['item', 'list'], 5000);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 5000 }),
        expect.any(Function)
      );
    });
  });

  describe('parseOpError', () => {
    it('identifies biometric errors', () => {
      const error = parseOpError({
        message: 'fail',
        stderr: 'biometric unlock failed'
      });
      expect(error.code).toBe('AUTH_REQUIRED');
    });

    it('identifies item not found errors', () => {
      const error = parseOpError({
        message: 'fail',
        stderr: 'item "test" not found'
      });
      expect(error.code).toBe('ITEM_NOT_FOUND');
    });

    it('identifies not signed in errors', () => {
      const error = parseOpError({
        message: 'fail',
        stderr: 'not currently signed in to any accounts'
      });
      expect(error.code).toBe('NOT_SIGNED_IN');
    });

    it('returns UNKNOWN for unrecognized errors', () => {
      const error = parseOpError({
        message: 'some random error',
        stderr: ''
      });
      expect(error.code).toBe('UNKNOWN');
    });

    it('identifies timeout errors', () => {
      const error = parseOpError({
        message: 'fail',
        stderr: 'operation timed out',
        killed: true
      });
      expect(error.code).toBe('TIMEOUT');
    });
  });
});
