import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OnePasswordSecretsProvider,
  getSecretsProvider,
  getDefaultSecretsProvider,
  setDefaultSecretsProvider,
  resetDefaultSecretsProvider,
  type SecretResult,
  type SecretsProvider,
} from './secrets-provider.js';
import * as readSecretModule from '../../1password/read-secret.js';
import { OpClientError } from '../../1password/lib/op-client.js';
import { getItemName, DEFAULT_CONFIG } from '../../1password/lib/config.js';

// Mock the 1Password read-secret module
vi.mock('../../1password/read-secret.js', () => ({
  readSecret: {
    execute: vi.fn(),
  },
}));

describe('OnePasswordSecretsProvider', () => {
  let provider: OnePasswordSecretsProvider;
  let mockReadSecret: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSecret = readSecretModule.readSecret.execute as any;
    provider = new OnePasswordSecretsProvider();
  });

  describe('getSecret', () => {
    it('should retrieve secret from 1Password on cache miss', async () => {
      mockReadSecret.mockResolvedValueOnce({
        value: 'currents-key-123',
        item: 'Currents API Key',
        field: 'password',
      });

      const result = await provider.getSecret('currents', 'apiKey');

      expect(result).toEqual({
        ok: true,
        value: 'currents-key-123',
      });

      expect(mockReadSecret).toHaveBeenCalledWith({
        item: 'Currents API Key',
        field: 'password',
      });
    });

    it('should map apiKey to password field', async () => {
      mockReadSecret.mockResolvedValueOnce({
        value: 'test-secret',
        item: 'Context7 API Key',
        field: 'password',
      });

      await provider.getSecret('context7', 'apiKey');

      expect(mockReadSecret).toHaveBeenCalledWith({
        item: 'Context7 API Key',
        field: 'password',
      });
    });

    it('should pass through non-apiKey field names', async () => {
      mockReadSecret.mockResolvedValueOnce({
        value: 'username-value',
        item: 'Currents API Key',
        field: 'username',
      });

      await provider.getSecret('currents', 'username');

      expect(mockReadSecret).toHaveBeenCalledWith({
        item: 'Currents API Key',
        field: 'username',
      });
    });

    it('should cache secrets for TTL duration', async () => {
      mockReadSecret.mockResolvedValueOnce({
        value: 'cached-value',
        item: 'Currents API Key',
        field: 'password',
      });

      // First call - cache miss
      const result1 = await provider.getSecret('currents', 'apiKey');
      expect(result1).toEqual({ ok: true, value: 'cached-value' });
      expect(mockReadSecret).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await provider.getSecret('currents', 'apiKey');
      expect(result2).toEqual({ ok: true, value: 'cached-value' });
      expect(mockReadSecret).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should refetch after TTL expires', async () => {
      const shortTTLProvider = new OnePasswordSecretsProvider({ ttlMinutes: 0.001 }); // 60ms

      mockReadSecret.mockResolvedValueOnce({
        value: 'value-1',
        item: 'Currents API Key',
        field: 'password',
      });

      const result1 = await shortTTLProvider.getSecret('currents', 'apiKey');
      expect(result1).toEqual({ ok: true, value: 'value-1' });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      mockReadSecret.mockResolvedValueOnce({
        value: 'value-2',
        item: 'Currents API Key',
        field: 'password',
      });

      const result2 = await shortTTLProvider.getSecret('currents', 'apiKey');
      expect(result2).toEqual({ ok: true, value: 'value-2' });
      expect(mockReadSecret).toHaveBeenCalledTimes(2);
    });

    it('should return NOT_CONFIGURED error for unknown service', async () => {
      const result = await provider.getSecret('unknown-service', 'apiKey');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('NOT_CONFIGURED');
        expect(result.error).toContain('Unknown service: unknown-service');
        expect(result.error).toContain('1Password not configured');
      }
      expect(mockReadSecret).not.toHaveBeenCalled();
    });

    it('should return AUTH_REQUIRED error on biometric auth failure', async () => {
      mockReadSecret.mockRejectedValueOnce(
        new OpClientError('Biometric authentication required', 'AUTH_REQUIRED')
      );

      const result = await provider.getSecret('currents', 'apiKey');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('AUTH_REQUIRED');
        expect(result.error).toContain('Biometric authentication required');
        expect(result.error).toContain('1Password not configured');
      }
    });

    it('should return NOT_FOUND error when item does not exist', async () => {
      mockReadSecret.mockRejectedValueOnce(
        new OpClientError('Item not found', 'ITEM_NOT_FOUND')
      );

      const result = await provider.getSecret('currents', 'apiKey');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('NOT_FOUND');
        expect(result.error).toContain('Item not found');
        expect(result.error).toContain('1Password not configured');
      }
    });

    it('should return PROVIDER_ERROR on unknown error without fallback', async () => {
      mockReadSecret.mockRejectedValueOnce(new Error('Some 1Password error'));

      const result = await provider.getSecret('currents', 'apiKey');

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.code).toBe('PROVIDER_ERROR');
      expect(result.ok === false && result.error).toContain('Some 1Password error');
      expect(result.ok === false && result.error).toContain('1Password not configured');
    });

    it('should include setup instructions in error messages', async () => {
      mockReadSecret.mockRejectedValueOnce(new Error('Unknown error'));

      const result = await provider.getSecret('currents', 'apiKey');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('PROVIDER_ERROR');
        expect(result.error).toContain('Unknown error');
        expect(result.error).toContain('1Password not configured');
        expect(result.error).toContain('brew install 1password-cli');
      }
    });

    it('should support different services via getItemName', async () => {
      mockReadSecret.mockResolvedValueOnce({
        value: 'perplexity-key',
        item: 'Perplexity API Key',
        field: 'password',
      });

      await provider.getSecret('perplexity', 'apiKey');

      expect(mockReadSecret).toHaveBeenCalledWith({
        item: 'Perplexity API Key',
        field: 'password',
      });
    });
  });

  describe('clearCache', () => {
    it('should clear cached secrets', async () => {
      mockReadSecret.mockResolvedValueOnce({
        value: 'value-1',
        item: 'Currents API Key',
        field: 'password',
      });

      await provider.getSecret('currents', 'apiKey');
      expect(mockReadSecret).toHaveBeenCalledTimes(1);

      provider.clearCache();

      mockReadSecret.mockResolvedValueOnce({
        value: 'value-2',
        item: 'Currents API Key',
        field: 'password',
      });

      await provider.getSecret('currents', 'apiKey');
      expect(mockReadSecret).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(provider.getCacheSize()).toBe(0);
    });

    it('should return cache entry count', async () => {
      mockReadSecret.mockResolvedValue({
        value: 'test',
        item: 'Test',
        field: 'password',
      });

      await provider.getSecret('currents', 'apiKey');
      expect(provider.getCacheSize()).toBe(1);

      await provider.getSecret('context7', 'apiKey');
      expect(provider.getCacheSize()).toBe(2);
    });
  });

  describe('name', () => {
    it('should return 1password as provider name', () => {
      expect(provider.name).toBe('1password');
    });
  });
});

describe('getSecretsProvider factory', () => {
  it('should always return OnePasswordSecretsProvider', () => {
    const provider = getSecretsProvider();
    expect(provider).toBeInstanceOf(OnePasswordSecretsProvider);
    expect(provider.name).toBe('1password');
  });
});

describe('default provider singleton', () => {
  afterEach(() => {
    resetDefaultSecretsProvider();
  });

  it('should return 1Password provider on first call', () => {
    const provider1 = getDefaultSecretsProvider();
    const provider2 = getDefaultSecretsProvider();

    expect(provider1).toBe(provider2); // Same instance
    expect(provider1).toBeInstanceOf(OnePasswordSecretsProvider);
  });

  it('should allow setting custom provider', () => {
    const customProvider = new OnePasswordSecretsProvider();
    setDefaultSecretsProvider(customProvider);

    const provider = getDefaultSecretsProvider();
    expect(provider).toBe(customProvider);
  });

  it('should allow resetting to null', () => {
    const provider1 = getDefaultSecretsProvider();
    expect(provider1).toBeDefined();

    resetDefaultSecretsProvider();

    const provider2 = getDefaultSecretsProvider();
    expect(provider2).toBeDefined();
    expect(provider2).not.toBe(provider1); // New instance created
  });
});

describe('1Password config integration', () => {
  it('should have getItemName return correct 1Password item names', () => {
    expect(getItemName('currents')).toBe('Currents API Key');
    expect(getItemName('context7')).toBe('Context7 API Key');
    expect(getItemName('perplexity')).toBe('Perplexity API Key');
    expect(getItemName('shodan')).toBe('Shodan API Key');
    expect(getItemName('featurebase')).toBe('Featurebase API Key');
  });

  it('should throw for unknown service', () => {
    expect(() => getItemName('unknown')).toThrow('Unknown service: unknown');
  });

  it('DEFAULT_CONFIG should have all required service items', () => {
    expect(DEFAULT_CONFIG.serviceItems.currents).toBe('Currents API Key');
    expect(DEFAULT_CONFIG.serviceItems.context7).toBe('Context7 API Key');
    expect(DEFAULT_CONFIG.serviceItems.perplexity).toBe('Perplexity API Key');
    expect(DEFAULT_CONFIG.serviceItems.shodan).toBe('Shodan API Key');
    expect(DEFAULT_CONFIG.serviceItems.featurebase).toBe('Featurebase API Key');
  });
});
