/**
 * Comments API Client Helper
 *
 * Comments API uses different authentication:
 * - X-API-Key header (not Bearer)
 * - application/x-www-form-urlencoded body (not JSON)
 */

import { getToolConfig } from '../config/config-loader.js';

/**
 * Make a Comments API request with correct auth/content-type
 *
 * @param method - HTTP method
 * @param path - API path
 * @param body - Form data object (will be encoded as URLSearchParams)
 * @returns Response JSON
 */
export async function commentsRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  body?: Record<string, string | boolean | undefined>,
  credentials?: { apiKey: string }
): Promise<{ ok: true; data: T } | { ok: false; error: { message: string; status?: number } }> {
  const config = credentials ?? getToolConfig<{ apiKey: string }>('featurebase');
  const baseUrl = 'https://do.featurebase.app';

  const headers: Record<string, string> = {
    'X-API-Key': config.apiKey,
  };

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (body && (method === 'post' || method === 'put' || method === 'patch')) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    }
    options.body = formData.toString();
  }

  try {
    const response = await fetch(`${baseUrl}/${path}`, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        ok: false,
        error: { message: errorText, status: response.status },
      };
    }

    const data = await response.json() as T;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: { message: error instanceof Error ? error.message : 'Network error' },
    };
  }
}
