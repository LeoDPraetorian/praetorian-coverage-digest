/**
 * Unit tests for async HTTP client factory (createHTTPClientAsync)
 *
 * Tests async credential resolution via SecretsProvider.
 * Following TDD methodology: Write tests FIRST, watch them FAIL, then implement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHTTPClientAsync, type HTTPServiceConfig } from '../http-client.js';
import type { SecretsProvider, SecretResult } from '../secrets-provider.js';

// Test configuration
const testConfig: HTTPServiceConfig = {
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'query',
    keyName: 'key',
    credentialKey: 'apiKey',
  },
};

describe('createHTTPClientAsync', () => {
  describe('credential resolution', () => {
    it('should resolve credentials via SecretsProvider', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'test-api-key-123',
        } as SecretResult),
      };

      const client = await createHTTPClientAsync('test-service', testConfig, mockProvider);

      expect(mockProvider.getSecret).toHaveBeenCalledWith('test-service', 'apiKey');
      expect(client).toBeDefined();
      expect(client.request).toBeDefined();
    });

    it('should use provided provider when specified', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'env-key-456',
        } as SecretResult),
      };

      const client = await createHTTPClientAsync('test-service', testConfig, mockProvider);

      expect(client).toBeDefined();
      expect(mockProvider.getSecret).toHaveBeenCalledWith('test-service', 'apiKey');
    });

    it('should throw error when credentials not found', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: false,
          error: 'API key not found',
          code: 'NOT_FOUND',
        } as SecretResult),
      };

      await expect(
        createHTTPClientAsync('test-service', testConfig, mockProvider)
      ).rejects.toThrow(/Failed to get credentials for test-service/);
      await expect(
        createHTTPClientAsync('test-service', testConfig, mockProvider)
      ).rejects.toThrow(/API key not found/);
    });

    it('should throw error with code when provider fails', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: false,
          error: 'Biometric auth required',
          code: 'AUTH_REQUIRED',
        } as SecretResult),
      };

      await expect(
        createHTTPClientAsync('test-service', testConfig, mockProvider)
      ).rejects.toThrow(/Code: AUTH_REQUIRED/);
    });
  });

  describe('delegation to sync createHTTPClient', () => {
    it('should create functional HTTP client', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'working-key',
        } as SecretResult),
      };

      const client = await createHTTPClientAsync('test-service', testConfig, mockProvider);

      // Verify client has request method
      expect(typeof client.request).toBe('function');
    });
  });

  describe('error message formatting', () => {
    it('should include service name in error', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: false,
          error: 'Secret missing',
          code: 'NOT_CONFIGURED',
        } as SecretResult),
      };

      await expect(
        createHTTPClientAsync('my-service', testConfig, mockProvider)
      ).rejects.toThrow('Failed to get credentials for my-service');
    });

    it('should include error code in message', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: false,
          error: 'Provider error',
          code: 'PROVIDER_ERROR',
        } as SecretResult),
      };

      await expect(
        createHTTPClientAsync('test-service', testConfig, mockProvider)
      ).rejects.toThrow(/Code: PROVIDER_ERROR/);
    });
  });

  describe('integration with different credential keys', () => {
    it('should pass credentialKey to provider', async () => {
      const mockProvider: SecretsProvider = {
        name: 'test-provider',
        getSecret: vi.fn().mockResolvedValue({
          ok: true,
          value: 'token-value',
        } as SecretResult),
      };

      const configWithToken: HTTPServiceConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'bearer',
          keyName: 'Authorization',
          credentialKey: 'accessToken',
        },
      };

      await createHTTPClientAsync('test-service', configWithToken, mockProvider);

      expect(mockProvider.getSecret).toHaveBeenCalledWith('test-service', 'accessToken');
    });
  });
});
