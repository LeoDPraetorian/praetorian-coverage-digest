/**
 * Shodan API Client Configuration
 *
 * Configures the HTTP client for Shodan API access.
 * Shodan uses query parameter authentication with the 'key' parameter.
 */

import { createHTTPClient, type HTTPServiceConfig, type HTTPPort } from '../config/lib/http-client.js';

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
 * Create a Shodan HTTP client
 *
 * @param credentials - Optional credentials for testing (uses config-loader if not provided)
 * @returns HTTPPort implementation for Shodan API
 *
 * @example
 * ```typescript
 * // Production usage (loads from credentials.json)
 * const client = createShodanClient();
 *
 * // Testing usage (inject mock credentials)
 * const client = createShodanClient({ apiKey: 'test-key' });
 * ```
 */
export function createShodanClient(credentials?: { apiKey: string }): HTTPPort {
  return createHTTPClient('shodan', shodanConfig, credentials);
}

/**
 * Default Shodan client instance (lazy initialization)
 */
let defaultClient: HTTPPort | null = null;

export function getShodanClient(): HTTPPort {
  if (!defaultClient) {
    defaultClient = createShodanClient();
  }
  return defaultClient;
}
