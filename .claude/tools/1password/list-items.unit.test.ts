/**
 * Unit tests for list-items wrapper
 *
 * Test Plan:
 * - Happy path: returns array of items with id, name, category, fields
 * - Empty vault: returns empty array
 * - Field extraction: extracts field names from item fields array
 * - Vault not accessible: throws OpClientError
 * - Biometric timeout: throws OpClientError
 *
 * Coverage Target: ≥80% line/branch/function
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock op-client before imports
vi.mock('./lib/op-client.js', () => ({
  execOp: vi.fn(),
  OpClientError: class OpClientError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'OpClientError';
    }
  },
}));

vi.mock('./lib/config.js', () => ({
  getVaultName: vi.fn().mockReturnValue('Claude Code Tools'),
}));

import { execOp, OpClientError } from './lib/op-client.js';
import { getVaultName } from './lib/config.js';

const mockExecOp = execOp as MockedFunction<typeof execOp>;
const mockGetVaultName = getVaultName as MockedFunction<typeof getVaultName>;

describe('list-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVaultName.mockReturnValue('Claude Code Tools');
  });

  describe('Happy path', () => {
    it('returns array of items with id, name, category, fields', async () => {
      const { listItems } = await import('./list-items.js');

      const mockOpResponse = JSON.stringify([
        {
          id: 'abc123',
          title: 'GitHub Token',
          category: 'API_CREDENTIAL',
          fields: [
            { id: 'username', label: 'username' },
            { id: 'credential', label: 'token' },
          ],
        },
        {
          id: 'def456',
          title: 'Database',
          category: 'DATABASE',
          fields: [
            { id: 'hostname', label: 'host' },
            { id: 'port', label: 'port' },
            { id: 'password', label: 'password' },
          ],
        },
      ]);

      mockExecOp.mockResolvedValue(mockOpResponse);

      const result = await listItems.execute({});

      expect(result).toEqual([
        {
          id: 'abc123',
          name: 'GitHub Token',
          category: 'API_CREDENTIAL',
          fields: ['username', 'token'],
        },
        {
          id: 'def456',
          name: 'Database',
          category: 'DATABASE',
          fields: ['host', 'port', 'password'],
        },
      ]);

      expect(mockExecOp).toHaveBeenCalledWith([
        'item',
        'list',
        '--vault',
        '"Claude Code Tools"',
      ]);
    });
  });

  describe('Empty vault', () => {
    it('returns empty array when vault has no items', async () => {
      const { listItems } = await import('./list-items.js');

      mockExecOp.mockResolvedValue('[]');

      const result = await listItems.execute({});

      expect(result).toEqual([]);
    });
  });

  describe('Field extraction', () => {
    it('extracts field names from item fields array using label', async () => {
      const { listItems } = await import('./list-items.js');

      const mockOpResponse = JSON.stringify([
        {
          id: 'abc123',
          title: 'Test Item',
          category: 'LOGIN',
          fields: [
            { id: 'user', label: 'username' },
            { id: 'pass', label: 'password' },
          ],
        },
      ]);

      mockExecOp.mockResolvedValue(mockOpResponse);

      const result = await listItems.execute({});

      expect(result[0].fields).toEqual(['username', 'password']);
    });

    it('falls back to id when label is missing', async () => {
      const { listItems } = await import('./list-items.js');

      const mockOpResponse = JSON.stringify([
        {
          id: 'abc123',
          title: 'Test Item',
          category: 'LOGIN',
          fields: [
            { id: 'username' }, // No label
            { id: 'password', label: 'password' },
          ],
        },
      ]);

      mockExecOp.mockResolvedValue(mockOpResponse);

      const result = await listItems.execute({});

      expect(result[0].fields).toEqual(['username', 'password']);
    });

    it('filters out fields with neither label nor id', async () => {
      const { listItems } = await import('./list-items.js');

      const mockOpResponse = JSON.stringify([
        {
          id: 'abc123',
          title: 'Test Item',
          category: 'LOGIN',
          fields: [
            { id: 'username', label: 'username' },
            {}, // Missing both label and id
            { id: 'password', label: 'password' },
          ],
        },
      ]);

      mockExecOp.mockResolvedValue(mockOpResponse);

      const result = await listItems.execute({});

      expect(result[0].fields).toEqual(['username', 'password']);
    });

    it('handles items with no fields array', async () => {
      const { listItems } = await import('./list-items.js');

      const mockOpResponse = JSON.stringify([
        {
          id: 'abc123',
          title: 'Test Item',
          category: 'SECURE_NOTE',
          // No fields property
        },
      ]);

      mockExecOp.mockResolvedValue(mockOpResponse);

      const result = await listItems.execute({});

      expect(result[0].fields).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('throws OpClientError when vault not accessible', async () => {
      const { listItems } = await import('./list-items.js');

      const error = new OpClientError(
        'Vault not found: Claude Code Tools',
        'VAULT_NOT_FOUND'
      );

      mockExecOp.mockRejectedValue(error);

      await expect(listItems.execute({})).rejects.toThrow(OpClientError);
      await expect(listItems.execute({})).rejects.toThrow(/vault not found/i);
    });

    it('throws OpClientError on biometric timeout', async () => {
      const { listItems } = await import('./list-items.js');

      const error = new OpClientError(
        'Biometric authentication required. Please unlock 1Password using Touch ID.',
        'AUTH_REQUIRED'
      );

      mockExecOp.mockRejectedValue(error);

      await expect(listItems.execute({})).rejects.toThrow(OpClientError);
      await expect(listItems.execute({})).rejects.toThrow(/biometric|authentication/i);
    });
  });
});
