/**
 * FeatureBase HTTP Client
 *
 * Creates HTTPPort instance for FeatureBase API with X-API-Key header authentication.
 * Based on verified API from .claude/tools/config/lib/http-client.ts
 */

import { createHTTPClient, type HTTPPort, type HTTPServiceConfig } from '../config/lib/http-client.js';
import { getToolConfig } from '../config/config-loader.js';

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
 * Create FeatureBase HTTP client
 *
 * @param credentials - Optional test credentials (uses getToolConfig if not provided)
 * @returns HTTPPort instance configured for FeatureBase API
 *
 * Verified API from http-client.ts lines 150-154
 */
export function createFeaturebaseClient(
  credentials?: { apiKey: string }
): HTTPPort {
  if (!credentials) {
    // Load from config (will throw if not found)
    credentials = getToolConfig<{ apiKey: string }>('featurebase');
  }

  // Verified from http-client.ts line 150
  return createHTTPClient('featurebase', featurebaseConfig, credentials);
}
