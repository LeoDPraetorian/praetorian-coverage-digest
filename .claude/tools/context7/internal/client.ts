// Context7 HTTP API Client - Lazy initialization
// No longer throws at module load time

import { createContext7ClientAsync } from '../client.js';
import type { HTTPPort } from '../../config/lib/http-client.js';

let client: HTTPPort | null = null;

/**
 * Get the Context7 HTTP client (lazy initialization)
 */
async function getClient(): Promise<HTTPPort> {
  if (!client) {
    client = await createContext7ClientAsync();
  }
  return client;
}

/**
 * Call Context7 API endpoint
 */
export async function callContext7API(endpoint: string, params: any): Promise<any> {
  const httpClient = await getClient();
  // Strip leading slash - Ky's prefixUrl doesn't expect it
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const result = await httpClient.request('post', path, { json: params });

  if (!result.ok) {
    throw new Error(`Context7 API error: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Resolve library ID using Context7 API
 */
export async function resolveLibraryIdAPI(params: {
  name: string;
  version?: string;
  ecosystem?: string;
}): Promise<any> {
  return callContext7API('/resolve-library', params);
}

/**
 * Get library documentation using Context7 API
 */
export async function getLibraryDocsAPI(params: {
  libraryId: string;
}): Promise<any> {
  return callContext7API('/library-docs', params);
}

/**
 * Reset client (for testing)
 */
export function resetClient(): void {
  client = null;
}
