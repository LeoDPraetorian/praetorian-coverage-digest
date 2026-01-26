/**
 * Unit tests for async Featurebase client factory (createFeaturebaseClientAsync)
 *
 * Tests async credential resolution for Featurebase API.
 * Following TDD methodology: Write tests FIRST, watch them FAIL, then implement.
 */

import { describe, it, expect, vi } from 'vitest';
import { createFeaturebaseClientAsync } from '../client.js';
import type { SecretsProvider, SecretResult } from '../../config/lib/secrets-provider.js';

describe('createFeaturebaseClientAsync', () => {
  describe('credential resolution', () => {
    it('should resolve Featurebase API key via SecretsProvider', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'featurebase-test-key',
        } as SecretResult),
      };

      const client = await createFeaturebaseClientAsync(mockProvider);

      expect(client).toBeDefined();
      expect(client.request).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('featurebase', 'apiKey');
    });

    it('should use provided SecretsProvider', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'env-featurebase-key',
        } as SecretResult),
      };

      const client = await createFeaturebaseClientAsync(mockProvider);

      expect(client).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('featurebase', 'apiKey');
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

      await expect(createFeaturebaseClientAsync(mockProvider)).rejects.toThrow(
        /Failed to get credentials for featurebase/
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

      const client = await createFeaturebaseClientAsync(mockProvider);

      expect(typeof client.request).toBe('function');
    });
  });

  describe('service configuration', () => {
    it('should use correct service name for credential lookup', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'featurebase-key',
        } as SecretResult),
      };

      const client = await createFeaturebaseClientAsync(mockProvider);

      expect(client).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('featurebase', 'apiKey');
    });
  });
});
