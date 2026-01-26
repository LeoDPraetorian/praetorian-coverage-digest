import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readSecret, readSecretInput } from './read-secret.js';

// Mock the op-client module
vi.mock('./lib/op-client.js', () => ({
  execOpRaw: vi.fn(),
  OpClientError: class OpClientError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'OpClientError';
    }
  }
}));

// Mock the config module
vi.mock('./lib/config.js', () => ({
  buildSecretReference: vi.fn((item: string, field: string) => `op://${item}/${field}`)
}));

import { execOpRaw, OpClientError } from './lib/op-client.js';
import { buildSecretReference } from './lib/config.js';

describe('read-secret', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readSecretInput schema', () => {
    it('validates valid input with default field', () => {
      const result = readSecretInput.parse({
        item: 'my-secret'
      });

      expect(result).toEqual({
        item: 'my-secret',
        field: 'password'
      });
    });

    it('validates valid input with custom field', () => {
      const result = readSecretInput.parse({
        item: 'my-secret',
        field: 'username'
      });

      expect(result).toEqual({
        item: 'my-secret',
        field: 'username'
      });
    });

    it('rejects empty item name', () => {
      expect(() => {
        readSecretInput.parse({ item: '' });
      }).toThrow('Item name is required');
    });

    it('rejects item name with shell metacharacters', () => {
      const unsafeInputs = [
        { item: 'test;rm -rf /' },
        { item: 'test&whoami' },
        { item: 'test|cat /etc/passwd' },
        { item: 'test`echo hacked`' },
        { item: 'test$(whoami)' },
        { item: 'test()' }
      ];

      unsafeInputs.forEach(input => {
        expect(() => {
          readSecretInput.parse(input);
        }).toThrow('Item name contains unsafe characters');
      });
    });

    it('rejects field name with shell metacharacters', () => {
      const unsafeInputs = [
        { item: 'my-secret', field: 'password;rm -rf /' },
        { item: 'my-secret', field: 'pass&whoami' },
        { item: 'my-secret', field: 'pass|cat' },
        { item: 'my-secret', field: 'pass`cmd`' },
        { item: 'my-secret', field: 'pass$(cmd)' },
        { item: 'my-secret', field: 'pass()' }
      ];

      unsafeInputs.forEach(input => {
        expect(() => {
          readSecretInput.parse(input);
        }).toThrow('Field name contains unsafe characters');
      });
    });

    it('accepts safe item and field names', () => {
      const safeInputs = [
        { item: 'my-secret', field: 'password' },
        { item: 'my-secret-123', field: 'username' },
        { item: 'database_credentials', field: 'host' },
        { item: 'API-Key-Production', field: 'token' }
      ];

      safeInputs.forEach(input => {
        expect(() => {
          readSecretInput.parse(input);
        }).not.toThrow();
      });
    });
  });

  describe('readSecret.execute', () => {
    it('retrieves secret value successfully with default field', async () => {
      vi.mocked(execOpRaw).mockResolvedValue('my-secret-value');
      vi.mocked(buildSecretReference).mockReturnValue('op://vault/my-secret/password');

      const result = await readSecret.execute({ item: 'my-secret' });

      expect(buildSecretReference).toHaveBeenCalledWith('my-secret', 'password');
      expect(execOpRaw).toHaveBeenCalledWith(['read', 'op://vault/my-secret/password']);
      expect(result).toEqual({
        value: 'my-secret-value',
        item: 'my-secret',
        field: 'password'
      });
    });

    it('retrieves secret value successfully with custom field', async () => {
      vi.mocked(execOpRaw).mockResolvedValue('admin@example.com');
      vi.mocked(buildSecretReference).mockReturnValue('op://vault/my-secret/username');

      const result = await readSecret.execute({
        item: 'my-secret',
        field: 'username'
      });

      expect(buildSecretReference).toHaveBeenCalledWith('my-secret', 'username');
      expect(execOpRaw).toHaveBeenCalledWith(['read', 'op://vault/my-secret/username']);
      expect(result).toEqual({
        value: 'admin@example.com',
        item: 'my-secret',
        field: 'username'
      });
    });

    it('throws OpClientError when item not found', async () => {
      const error = new OpClientError('item not found', 'NOT_FOUND');
      vi.mocked(execOpRaw).mockRejectedValue(error);

      await expect(readSecret.execute({ item: 'nonexistent' }))
        .rejects.toThrow(OpClientError);

      await expect(readSecret.execute({ item: 'nonexistent' }))
        .rejects.toMatchObject({
          message: 'item not found',
          code: 'NOT_FOUND'
        });
    });

    it('throws OpClientError on biometric timeout', async () => {
      const error = new OpClientError('biometric authentication timeout', 'BIOMETRIC_TIMEOUT');
      vi.mocked(execOpRaw).mockRejectedValue(error);

      await expect(readSecret.execute({ item: 'my-secret' }))
        .rejects.toThrow(OpClientError);

      await expect(readSecret.execute({ item: 'my-secret' }))
        .rejects.toMatchObject({
          message: 'biometric authentication timeout',
          code: 'BIOMETRIC_TIMEOUT'
        });
    });

    it('validates input before execution', async () => {
      await expect(readSecret.execute({ item: '' } as any))
        .rejects.toThrow('Item name is required');

      // Verify execOpRaw was never called
      expect(execOpRaw).not.toHaveBeenCalled();
    });
  });
});
