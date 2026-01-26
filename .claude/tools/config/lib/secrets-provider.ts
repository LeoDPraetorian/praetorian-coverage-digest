/**
 * SecretsProvider - Async secrets abstraction layer
 *
 * Provides a unified interface for credential access with two implementations:
 *
 * - OnePasswordSecretsProvider: Biometric auth with 15-min TTL cache
 *
 * Tools migrate gradually from synchronous getToolConfig() to async provider.getSecret().
 */

import { z } from 'zod';
import { readSecret } from '../../1password/read-secret.js';
import { OpClientError } from '../../1password/lib/op-client.js';
import { getItemName } from '../../1password/lib/config.js';

// =============================================================================
// Types and Constants
// =============================================================================

/**
 * Error codes for secret retrieval operations
 */
export type SecretErrorCode =
  | 'NOT_FOUND' // Item/key doesn't exist
  | 'AUTH_REQUIRED' // Biometric authentication needed
  | 'NOT_CONFIGURED' // No configuration for this service
  | 'NOT_SIGNED_IN' // Not signed in to 1Password
  | 'PROVIDER_ERROR'; // Generic provider failure

/**
 * Result type for secret retrieval operations
 */
export type SecretResult =
  | { ok: true; value: string }
  | { ok: false; error: string; code: SecretErrorCode };

/**
 * SecretsProvider interface - async credential access abstraction
 *
 * Implementations:
 *
 * - OnePasswordSecretsProvider: Biometric auth with 15-min cache
 */
export interface SecretsProvider {
  /**
   * Get a secret value for a service
   * @param serviceName - Service name (e.g., 'currents', 'context7')
   * @param key - Key within service (e.g., 'apiKey')
   */
  getSecret(serviceName: string, key: string): Promise<SecretResult>;

  /**
   * Provider name for debugging
   */
  readonly name: string;
}

/**

// =============================================================================

// =============================================================================
// OnePasswordSecretsProvider
// =============================================================================

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Options for OnePasswordSecretsProvider
 */
export interface OnePasswordSecretsProviderOptions {
  /** Cache TTL in minutes (default: 15) */
  ttlMinutes?: number;
  // NOTE: fallback option REMOVED - 1Password is required
}

const SETUP_INSTRUCTIONS = `
1Password not configured. Please complete setup:

1. Install 1Password CLI:
   brew install 1password-cli

2. Enable CLI integration in 1Password:
   - Open 1Password desktop app
   - Go to Settings > Developer
   - Enable "Integrate with 1Password CLI"
   - Enable "Touch ID" for biometric unlock

3. Create vault with required items:
   - Currents API Key (field: password)
   - Context7 API Key (field: password)
   - Perplexity API Key (field: password)
   - Shodan API Key (field: password)
   - Featurebase API Key (field: password)

4. Verify setup:
   op vault list
`;

/**
 * 1Password secrets provider with TTL cache
 *
 * - Biometric auth on first access per session
 * - 15-minute cache reduces repeated biometric prompts
 * - 1Password is REQUIRED (no fallback)
 */
export class OnePasswordSecretsProvider implements SecretsProvider {
  readonly name = '1password';

  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(options: OnePasswordSecretsProviderOptions = {}) {
    this.ttlMs = (options.ttlMinutes ?? 15) * 60 * 1000;
  }

  async getSecret(serviceName: string, key: string): Promise<SecretResult> {
    const cacheKey = `${serviceName}:${key}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ok: true, value: cached.value };
    }

    // Get 1Password item name from centralized config
    let itemName: string;
    try {
      itemName = getItemName(serviceName);
    } catch (error) {
      return {
        ok: false,
        error: `${error instanceof Error ? error.message : String(error)}${SETUP_INSTRUCTIONS}`,
        code: 'NOT_CONFIGURED',
      };
    }

    try {
      // Fetch from 1Password
      // Map 'apiKey' to 'password' field (1Password convention)
      const fieldName = key === 'apiKey' ? 'password' : key;
      const result = await readSecret.execute({
        item: itemName,
        field: fieldName,
      });

      // Cache the result
      this.cache.set(cacheKey, {
        value: result.value,
        expiresAt: Date.now() + this.ttlMs,
      });

      return { ok: true, value: result.value };
    } catch (error) {
      // Handle specific 1Password errors
      if (error instanceof OpClientError) {
        if (error.code === 'AUTH_REQUIRED') {
          return {
            ok: false,
            error: `${error.message}${SETUP_INSTRUCTIONS}`,
            code: 'AUTH_REQUIRED',
          };
        }
        if (error.code === 'ITEM_NOT_FOUND') {
          return {
            ok: false,
            error: `${error.message}${SETUP_INSTRUCTIONS}`,
            code: 'NOT_FOUND',
          };
        }
        if (error.code === 'NOT_SIGNED_IN') {
          return {
            ok: false,
            error: `${error.message}${SETUP_INSTRUCTIONS}`,
            code: 'NOT_SIGNED_IN',
          };
        }
      }

      return {
        ok: false,
        error: `${error instanceof Error ? error.message : String(error)}${SETUP_INSTRUCTIONS}`,
        code: 'PROVIDER_ERROR',
      };
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for testing)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// =============================================================================
// Factory and Defaults
// =============================================================================

/**
 * Get the default secrets provider (1Password ONLY)
 */
export function getSecretsProvider(): SecretsProvider {
  return new OnePasswordSecretsProvider();
}

// Default singleton instance
let _defaultProvider: SecretsProvider | null = null;

/**
 * Get the singleton default provider
 */
export function getDefaultSecretsProvider(): SecretsProvider {
  if (!_defaultProvider) {
    _defaultProvider = getSecretsProvider();
  }
  return _defaultProvider;
}

/**
 * Set the default provider (for testing)
 */
export function setDefaultSecretsProvider(provider: SecretsProvider | null): void {
  _defaultProvider = provider;
}

/**
 * Reset the default provider (for testing)
 */
export function resetDefaultSecretsProvider(): void {
  _defaultProvider = null;
}
