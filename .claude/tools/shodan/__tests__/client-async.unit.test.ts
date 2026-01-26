/**
 * Unit tests for async Shodan client factory (createShodanClientAsync)
 *
 * Tests async credential resolution for Shodan API.
 * Following TDD methodology: Write tests FIRST, watch them FAIL, then implement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createShodanClientAsync } from '../client.js';
import type { SecretsProvider, SecretResult } from '../../config/lib/secrets-provider.js';

describe('createShodanClientAsync', () => {
  describe('credential resolution', () => {
    it('should resolve Shodan API key via SecretsProvider', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'shodan-test-key',
        } as SecretResult),
      };

      const client = await createShodanClientAsync(mockProvider);

      expect(client).toBeDefined();
      expect(client.request).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('shodan', 'apiKey');
    });

    it('should use provided SecretsProvider', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'env-shodan-key',
        } as SecretResult),
      };

      const client = await createShodanClientAsync(mockProvider);

      expect(client).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('shodan', 'apiKey');
    });

    it('should throw error when credentials not found', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: false,
          error: 'API key not configured',
          code: 'NOT_CONFIGURED',
        } as SecretResult),
      };

      await expect(createShodanClientAsync(mockProvider)).rejects.toThrow(
        /Failed to get credentials for shodan/
      );
    });
  });

  describe('client functionality', () => {
    it('should create functional HTTP client', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'functional-key',
        } as SecretResult),
      };

      const client = await createShodanClientAsync(mockProvider);

      expect(typeof client.request).toBe('function');
    });
  });

  describe('service configuration', () => {
    it('should use correct service name for credential lookup', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'shodan-key',
        } as SecretResult),
      };

      const client = await createShodanClientAsync(mockProvider);

      expect(client).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('shodan', 'apiKey');
    });
  });
});
