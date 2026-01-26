import { describe, it, expect } from 'vitest';
import { createFeaturebaseClientAsync, featurebaseConfig } from '../client.js';
import type { SecretsProvider } from '../../config/lib/index.js';

describe('createFeaturebaseClientAsync', () => {
  it('creates HTTPPort with X-API-Key auth', async () => {
    const mockProvider: SecretsProvider = {
      name: 'test',
      getSecret: async () => ({ ok: true, value: 'test-key' })
    };

    const client = await createFeaturebaseClientAsync(mockProvider);

    expect(client).toBeDefined();
    expect(client.request).toBeInstanceOf(Function);
  });

  it('throws error if credentials missing', async () => {
    const failProvider: SecretsProvider = {
      name: 'test',
      getSecret: async () => ({
        ok: false,
        error: {
          type: 'NOT_CONFIGURED',
          message: 'Environment variable FEATUREBASE_API_KEY not set.'
        }
      })
    };

    await expect(createFeaturebaseClientAsync(failProvider)).rejects.toThrow(/Failed to get credentials/);
  });

  it('uses default provider when none provided', async () => {
    // This tests the fallback behavior - default provider reads from env
    // In a real environment with FEATUREBASE_API_KEY set, this would succeed
    // In tests without the env var, it should error appropriately
    await expect(createFeaturebaseClientAsync()).rejects.toThrow();
  });
});

describe('featurebaseConfig', () => {
  it('has correct base URL', () => {
    expect(featurebaseConfig.baseUrl).toBe('https://do.featurebase.app');
  });

  it('uses X-API-Key header authentication', () => {
    expect(featurebaseConfig.auth.type).toBe('header');
    expect(featurebaseConfig.auth.keyName).toBe('X-API-Key');
  });

  it('has retry configuration', () => {
    expect(featurebaseConfig.retry).toBeDefined();
    expect(featurebaseConfig.retry.limit).toBe(3);
  });
});
