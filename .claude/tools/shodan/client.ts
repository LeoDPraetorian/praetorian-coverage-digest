/**
 * Shodan API Client Configuration
 *
 * Configures the HTTP client for Shodan API access.
 * Shodan uses query parameter authentication with the 'key' parameter.
 */

import {
  createHTTPClientAsync,
  type HTTPServiceConfig,
  type HTTPPort
} from '../config/lib/http-client.js';
import type { SecretsProvider } from '../config/lib/secrets-provider.js';

/**
 * Shodan API configuration
 */
export const shodanConfig: HTTPServiceConfig = {
  baseUrl: 'https://api.shodan.io',
  auth: {
    type: 'query',
    keyName: 'key',
    credentialKey: 'apiKey',
  },
  timeout: 30_000,
  retry: {
    limit: 3,
    methods: ['get'],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};

/**
 * Create a Shodan HTTP client with async credential resolution
 *
 * Uses SecretsProvider for credential lookup:
 * - 1Password with biometric auth (if configured)
 * - Falls back to environment variables
 *
 * @param provider - Optional SecretsProvider (uses default if not provided)
 * @returns HTTPPort implementation for Shodan API
 *
 * @example
 * ```typescript
 * // Production usage (resolves credentials via default SecretsProvider)
 * const client = await createShodanClientAsync();
 *
 * // Testing usage (inject mock provider)
 * const mockProvider = { name: 'test', getSecret: async () => ({ ok: true, value: 'key' }) };
 * const client = await createShodanClientAsync(mockProvider);
 *
 * const result = await client.request('get', '/shodan/host/8.8.8.8');
 * ```
 */
export async function createShodanClientAsync(provider?: SecretsProvider): Promise<HTTPPort> {
  return createHTTPClientAsync('shodan', shodanConfig, provider);
}
