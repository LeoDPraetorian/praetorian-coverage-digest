/**
 * Auth Error Helpers for 1Password Integration
 *
 * Creates actionable error hints that reference 1Password items
 * when API authentication fails (401/403 errors).
 */

import { DEFAULT_CONFIG, ServiceName, getVaultName } from '../../1password/lib/config.js';

/**
 * Get 1Password item name for a service, or undefined if not configured
 *
 * This is a non-throwing version of getItemName() from config.ts,
 * useful for generating hints without requiring the service to be configured.
 *
 * @param serviceName - Service name (e.g., 'shodan', 'featurebase')
 * @returns 1Password item name or undefined if not configured
 */
export function getOnePasswordItemName(serviceName: string): string | undefined {
  if (!serviceName) return undefined;
  return DEFAULT_CONFIG.serviceItems[serviceName as ServiceName];
}

/**
 * Create actionable error hint for auth failures
 *
 * Provides user-friendly guidance that references the specific 1Password
 * vault and item where the API key should be verified. For services not
 * configured in DEFAULT_CONFIG.serviceItems, provides guidance on adding
 * the configuration.
 *
 * @param serviceName - Service that failed auth
 * @returns User-friendly hint with 1Password reference
 */
export function createAuthErrorHint(serviceName: string): string {
  const itemName = getOnePasswordItemName(serviceName);
  const vaultName = getVaultName();

  if (itemName) {
    return (
      `Your API key appears to be invalid or expired.\n` +
      `Please verify your API key in 1Password:\n` +
      `  Vault: "${vaultName}"\n` +
      `  Item: "${itemName}"\n` +
      `  Field: password`
    );
  }

  return (
    `Authentication failed. Check your API key configuration.\n` +
    `If using 1Password, add this service to DEFAULT_CONFIG.serviceItems in:\n` +
    `  .claude/tools/1password/lib/config.ts`
  );
}
