/**
 * FeatureBase HTTP Client
 *
 * Creates HTTPPort instance for FeatureBase API with X-API-Key header authentication.
 * Based on verified API from .claude/tools/config/lib/http-client.ts
 */

import { createHTTPClientAsync, type HTTPPort, type HTTPServiceConfig } from '../config/lib/http-client.js';
import type { SecretsProvider } from '../config/lib/secrets-provider.js';

/**
 * FeatureBase API configuration
 * Verified from http-client.ts lines 79-109
 */
export const featurebaseConfig: HTTPServiceConfig = {
  baseUrl: 'https://do.featurebase.app',
  auth: {
    type: 'header',  // X-API-Key header authentication
    keyName: 'X-API-Key',
    credentialKey: 'apiKey',
  },
  timeout: 30_000,
  retry: {
    limit: 3,
    methods: ['get', 'post', 'put', 'delete'],  // Verified line 106
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};

/**
 * Create a Featurebase HTTP client with async credential resolution
 *
 * Uses SecretsProvider for credential lookup:
 * - 1Password with biometric auth (if configured)
 * - Falls back to environment variables
 *
 * @param provider - Optional SecretsProvider (uses default if not provided)
 * @returns HTTPPort implementation for Featurebase API
 *
 * @example
 * ```typescript
 * // Production usage (resolves credentials via default SecretsProvider)
 * const client = await createFeaturebaseClientAsync();
 *
 * // Testing usage (inject mock provider)
 * const mockProvider = { name: 'test', getSecret: async () => ({ ok: true, value: 'key' }) };
 * const client = await createFeaturebaseClientAsync(mockProvider);
 *
 * const result = await client.request('get', '/v1/articles');
 * ```
 */
export async function createFeaturebaseClientAsync(provider?: SecretsProvider): Promise<HTTPPort> {
  return createHTTPClientAsync('featurebase', featurebaseConfig, provider);
}
