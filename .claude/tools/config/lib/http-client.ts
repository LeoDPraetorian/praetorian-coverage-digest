/**
 * HTTP Client Factory for REST API Wrappers
 *
 * Provides a reusable HTTP client infrastructure using Ky library for REST API wrappers.
 * Mirrors the MCP client pattern with hexagonal architecture (port/adapter pattern).
 */

import ky, { type KyInstance, HTTPError as KyHTTPError } from 'ky';
import { estimateTokens } from './response-utils.js';
import type { HTTPError } from './http-errors.js';
import { getDefaultSecretsProvider, type SecretsProvider, type SecretResult } from './secrets-provider.js';
import { createAuthErrorHint } from './auth-errors.js';

// =============================================================================
// Port Interface (Hexagonal Architecture)
// =============================================================================

/**
 * HTTP Port Interface (Hexagonal Architecture)
 *
 * Explicit contract for HTTP communication. All REST wrappers depend on this
 * abstraction, not the concrete implementation. Mirrors MCPPort pattern.
 *
 * @example Testing with port injection
 * ```typescript
 * const mockPort: HTTPPort = {
 *   request: vi.fn().mockResolvedValue({ ok: true, data: [] })
 * };
 * const adapter = new HostSearchAdapter(mockPort);
 * ```
 */
export interface HTTPPort {
  request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    options?: HTTPRequestOptions
  ): Promise<HTTPResult<T>>;
}

/**
 * Request options for HTTP calls
 */
export interface HTTPRequestOptions {
  /** Query parameters */
  searchParams?: Record<string, string | number | boolean>;
  /** Request body (for POST/PUT) */
  json?: unknown;
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Response size limit in bytes (default: 1MB) */
  maxResponseBytes?: number;
}

/**
 * Result type for explicit error handling
 */
export type HTTPResult<T> =
  | { ok: true; data: T; meta: HTTPMeta }
  | { ok: false; error: HTTPError; meta: HTTPMeta };

/**
 * Response metadata for observability
 */
export interface HTTPMeta {
  status: number;
  durationMs: number;
  retries: number;
  estimatedTokens: number;
}

// =============================================================================
// Service Configuration
// =============================================================================

/**
 * Configuration for an HTTP service
 */
export interface HTTPServiceConfig {
  /** Base URL for the service */
  baseUrl: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Authentication type */
  auth: {
    type: 'query' | 'header' | 'bearer' | 'oauth';
    /** Key name in query string or header */
    keyName: string;
    /** Credential key in credentials.json */
    credentialKey: string;
    /** OAuth-specific configuration (optional, used when type is 'oauth') */
    oauth?: {
      /** OAuth provider name (e.g., 'linear', 'github') */
      provider: string;
      /** Key in credentials.json for OAuth client ID */
      clientIdKey: string;
      /** OAuth scopes to request */
      scopes: string[];
    };
  };
  /** Default timeout (ms) */
  timeout?: number;
  /** Default retry config */
  retry?: {
    limit: number;
    methods: ('get' | 'post' | 'put' | 'delete')[];
    statusCodes: number[];
  };
}

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default configuration
 */
export const HTTP_DEFAULTS = {
  timeout: 30_000,
  maxResponseBytes: 1_000_000,
  retry: {
    limit: 3,
    methods: ['get', 'put', 'delete'] as const,
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};

// =============================================================================
// HTTP Client Factory
// =============================================================================

/**
 * Create HTTP client with explicit credentials (for testing only)
 * 
 * This is a minimal sync function for test scenarios where credentials
 * are already available (e.g., test tokens, mock credentials).
 * 
 * Production code should use createHTTPClientAsync() instead.
 * 
 * @param serviceName - Service name for logging
 * @param config - HTTP service configuration
 * @param credentials - Explicit credentials (required)
 */
export function createHTTPClientWithCredentials(
  serviceName: string,
  config: HTTPServiceConfig,
  credentials: { apiKey: string }
): HTTPPort {
  const creds = credentials;

  // Create Ky instance with service config
  const instance = ky.create({
    prefixUrl: config.baseUrl,
    timeout: config.timeout ?? HTTP_DEFAULTS.timeout,
    retry: {
      limit: config.retry?.limit ?? HTTP_DEFAULTS.retry.limit,
      methods: config.retry?.methods ?? [...HTTP_DEFAULTS.retry.methods],
      statusCodes: config.retry?.statusCodes ?? HTTP_DEFAULTS.retry.statusCodes,
    },
    hooks: {
      beforeRequest: [
        (request) => {
          // Inject authentication
          if (config.auth.type === 'query') {
            const url = new URL(request.url);
            url.searchParams.set(config.auth.keyName, creds.apiKey);
            return new Request(url.toString(), request);
          }
          if (config.auth.type === 'header') {
            request.headers.set(config.auth.keyName, creds.apiKey);
          }
          if (config.auth.type === 'bearer') {
            request.headers.set('Authorization', `Bearer ${creds.apiKey}`);
          }
          if (config.auth.type === 'oauth') {
            // OAuth tokens are injected as Bearer tokens
            request.headers.set('Authorization', `Bearer ${creds.apiKey}`);
          }
        },
      ],
      beforeRetry: [
        ({ retryCount }) => {
          console.log(`[HTTP] Retry ${retryCount} for ${serviceName}`);
        },
      ],
    },
  });

  return {
    async request<T>(
      method: 'get' | 'post' | 'put' | 'delete',
      path: string,
      options: HTTPRequestOptions = {}
    ): Promise<HTTPResult<T>> {
      const startTime = Date.now();
      let retryCount = 0;

      try {
        const response = await instance[method](path, {
          searchParams: options.searchParams,
          json: options.json,
          timeout: options.timeoutMs,
          hooks: {
            beforeRetry: [
              () => {
                retryCount++;
              },
            ],
          },
        });

        // Check response size
        const text = await response.text();
        const maxBytes = options.maxResponseBytes ?? HTTP_DEFAULTS.maxResponseBytes;
        if (text.length > maxBytes) {
          return {
            ok: false,
            error: {
              type: 'client',
              message: `Response size ${text.length} exceeds limit ${maxBytes}`,
              retryable: false,
            },
            meta: {
              status: response.status,
              durationMs: Date.now() - startTime,
              retries: retryCount,
              estimatedTokens: 0,
            },
          };
        }

        // Parse JSON
        const data = JSON.parse(text) as T;

        return {
          ok: true,
          data,
          meta: {
            status: response.status,
            durationMs: Date.now() - startTime,
            retries: retryCount,
            estimatedTokens: estimateTokens(data),
          },
        };
      } catch (error) {
        // Try to extract response body for better error messages (e.g., GraphQL errors)
        let responseBody: any = null;
        if (error instanceof KyHTTPError) {
          try {
            // Clone to avoid consuming the body
            const clone = error.response.clone();
            responseBody = await clone.json();
          } catch {
            // Response might not be JSON
          }
        }

        const httpError = classifyError(error, responseBody, serviceName);
        return {
          ok: false,
          error: httpError,
          meta: {
            status: httpError.status ?? 0,
            durationMs: Date.now() - startTime,
            retries: retryCount,
            estimatedTokens: 0,
          },
        };
      }
    },
  };
}

/**
 * Create HTTP client with async credential resolution
 *
 * Uses 1Password (or SecretsProvider) for credential resolution.
 *
 * @param serviceName - Service name for credential lookup (e.g., 'shodan')
 * @param config - HTTP service configuration
 * @param provider - Optional secrets provider (uses default if not provided)
 * @returns HTTPPort implementation with resolved credentials
 *
 * @example
 * ```typescript
 * const client = await createHTTPClientAsync('shodan', shodanConfig);
 * ```
 */
export async function createHTTPClientAsync(
  serviceName: string,
  config: HTTPServiceConfig,
  provider: SecretsProvider = getDefaultSecretsProvider()
): Promise<HTTPPort> {
  // Resolve credentials via provider
  const result = await provider.getSecret(serviceName, config.auth.credentialKey);

  if (!result.ok) {
    // Type narrowing: after !result.ok check, TypeScript should infer the error branch
    const { error, code } = result as Extract<SecretResult, { ok: false }>;
    throw new Error(
      `Failed to get credentials for ${serviceName}: ${error}\n` +
        `Code: ${code}`
    );
  }

  const creds = { apiKey: result.value };

  // Create Ky instance with service config
  const instance = ky.create({
    prefixUrl: config.baseUrl,
    timeout: config.timeout ?? HTTP_DEFAULTS.timeout,
    retry: {
      limit: config.retry?.limit ?? HTTP_DEFAULTS.retry.limit,
      methods: config.retry?.methods ?? [...HTTP_DEFAULTS.retry.methods],
      statusCodes: config.retry?.statusCodes ?? HTTP_DEFAULTS.retry.statusCodes,
    },
    hooks: {
      beforeRequest: [
        (request) => {
          // Inject authentication
          if (config.auth.type === 'query') {
            const url = new URL(request.url);
            url.searchParams.set(config.auth.keyName, creds.apiKey);
            return new Request(url.toString(), request);
          }
          if (config.auth.type === 'header') {
            request.headers.set(config.auth.keyName, creds.apiKey);
          }
          if (config.auth.type === 'bearer') {
            request.headers.set('Authorization', `Bearer ${creds.apiKey}`);
          }
          if (config.auth.type === 'oauth') {
            // OAuth tokens are injected as Bearer tokens
            request.headers.set('Authorization', `Bearer ${creds.apiKey}`);
          }
        },
      ],
      beforeRetry: [
        ({ retryCount }) => {
          console.log(`[HTTP] Retry ${retryCount} for ${serviceName}`);
        },
      ],
    },
  });

  return {
    async request<T>(
      method: 'get' | 'post' | 'put' | 'delete',
      path: string,
      options: HTTPRequestOptions = {}
    ): Promise<HTTPResult<T>> {
      const startTime = Date.now();
      let retryCount = 0;

      try {
        const response = await instance[method](path, {
          searchParams: options.searchParams,
          json: options.json,
          timeout: options.timeoutMs,
          hooks: {
            beforeRetry: [
              () => {
                retryCount++;
              },
            ],
          },
        });

        // Check response size
        const text = await response.text();
        const maxBytes = options.maxResponseBytes ?? HTTP_DEFAULTS.maxResponseBytes;
        if (text.length > maxBytes) {
          return {
            ok: false,
            error: {
              type: 'client',
              message: `Response size ${text.length} exceeds limit ${maxBytes}`,
              retryable: false,
            },
            meta: {
              status: response.status,
              durationMs: Date.now() - startTime,
              retries: retryCount,
              estimatedTokens: 0,
            },
          };
        }

        // Parse JSON
        const data = JSON.parse(text) as T;

        return {
          ok: true,
          data,
          meta: {
            status: response.status,
            durationMs: Date.now() - startTime,
            retries: retryCount,
            estimatedTokens: estimateTokens(data),
          },
        };
      } catch (error) {
        // Try to extract response body for better error messages (e.g., GraphQL errors)
        let responseBody: any = null;
        if (error instanceof KyHTTPError) {
          try {
            // Clone to avoid consuming the body
            const clone = error.response.clone();
            responseBody = await clone.json();
          } catch {
            // Response might not be JSON
          }
        }

        const httpError = classifyError(error, responseBody, serviceName);
        return {
          ok: false,
          error: httpError,
          meta: {
            status: httpError.status ?? 0,
            durationMs: Date.now() - startTime,
            retries: retryCount,
            estimatedTokens: 0,
          },
        };
      }
    },
  };
}

/**
 * Classify errors into structured types
 */
function classifyError(error: unknown, responseBody?: any, serviceName?: string): HTTPError {
  if (error instanceof KyHTTPError) {
    const status = error.response.status;
    let message = error.message;

    if (status === 401 || status === 403) {
      // Add 1Password hint for auth errors
      const hint = serviceName ? createAuthErrorHint(serviceName) : '';
      return {
        type: 'auth',
        status,
        message: hint ? `${message}\n\n${hint}` : message,
        retryable: false,
      };
    }
    if (status === 429) {
      return {
        type: 'rate_limit',
        status,
        message: 'Rate limit exceeded',
        retryable: true,
      };
    }
    if (status >= 400 && status < 500) {
      // Enhance message with GraphQL errors if available
      if (responseBody?.errors && Array.isArray(responseBody.errors)) {
        const graphqlErrors = responseBody.errors.map((e: any) => e.message).join('; ');
        message += ` - GraphQL errors: ${graphqlErrors}`;
      } else if (typeof responseBody === 'string' && responseBody.length < 500) {
        message += ` - ${responseBody}`;
      } else if (responseBody && typeof responseBody === 'object') {
        message += ` - ${JSON.stringify(responseBody).substring(0, 500)}`;
      }

      return {
        type: 'client',
        status,
        message,
        retryable: false,
      };
    }
    if (status >= 500) {
      return {
        type: 'server',
        status,
        message,
        retryable: true,
      };
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.name === 'TimeoutError') {
      return {
        type: 'timeout',
        message: error.message,
        retryable: true,
      };
    }
    if (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch failed')
    ) {
      return {
        type: 'network',
        message: error.message,
        retryable: true,
      };
    }
  }

  return {
    type: 'network',
    message: String(error),
    retryable: true,
  };
}
