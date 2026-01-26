/**
 * Context7 HTTP Client
 *
 * Creates HTTPPort instance for Context7 API with Bearer token authentication.
 */

import {
  createHTTPClientAsync,
  type HTTPPort,
  type HTTPServiceConfig
} from '../config/lib/http-client.js';

/**
 * Context7 API configuration
 */
export const context7Config: HTTPServiceConfig = {
  baseUrl: 'https://api.context7.com/v1',
  auth: {
    type: 'bearer',
    keyName: 'Authorization',
    credentialKey: 'apiKey',
  },
  timeout: 30_000,
  retry: {
    limit: 3,
    methods: ['get', 'post'],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};

/**
 * Create Context7 HTTP client with async credential resolution
 */
export async function createContext7ClientAsync(): Promise<HTTPPort> {
  return createHTTPClientAsync('context7', context7Config);
}
