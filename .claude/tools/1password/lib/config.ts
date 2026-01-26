/**
 * Default 1Password configuration for Claude Code Tools
 */
export const DEFAULT_CONFIG = {
  /** Default account - override with OP_ACCOUNT */
  account: 'praetorianlabs.1password.com',

  /** Default vault name - override with OP_VAULT_NAME */
  vaultName: 'Claude Code Tools',

  /** Service to 1Password item mapping */
  serviceItems: {
    currents: 'Currents API Key',
    context7: 'Context7 API Key',
    perplexity: 'Perplexity API Key',
    shodan: 'Shodan API Key',
    featurebase: 'Featurebase API Key',
    // NOTE: Linear removed - uses OAuth with PUBLIC clientId (not a secret)
  } as const,
} as const;

export type ServiceName = keyof typeof DEFAULT_CONFIG.serviceItems;

/**
 * Get the account identifier for 1Password operations
 * Required when multiple accounts are configured
 * @returns Account URL/ID from env or default from DEFAULT_CONFIG
 */
export function getAccount(): string {
  return process.env.OP_ACCOUNT || DEFAULT_CONFIG.account;
}

/**
 * Get the account flag for op CLI commands
 * @returns Array with --account flag if OP_ACCOUNT is set, empty array otherwise
 */
export function getAccountArgs(): string[] {
  const account = getAccount();
  return account ? ['--account', account] : [];
}

/**
 * Get the vault name for 1Password operations
 * @returns Vault name from env or default from DEFAULT_CONFIG
 */
export function getVaultName(): string {
  return process.env.OP_VAULT_NAME || DEFAULT_CONFIG.vaultName;
}

/**
 * Get 1Password item name for a service
 * @param serviceName - Service name (currents, context7, perplexity, shodan, featurebase)
 * @returns 1Password item name for the service
 * @throws Error if service not configured
 */
export function getItemName(serviceName: string): string {
  const itemName = DEFAULT_CONFIG.serviceItems[serviceName as ServiceName];
  if (!itemName) {
    const available = Object.keys(DEFAULT_CONFIG.serviceItems).join(', ');
    throw new Error(
      `Unknown service: ${serviceName}\n` +
      `Available services: ${available}\n` +
      `To add a new service, update DEFAULT_CONFIG.serviceItems in:\n` +
      `  .claude/tools/1password/lib/config.ts`
    );
  }
  return itemName;
}

/**
 * Get authentication mode based on environment
 * @returns 'service-account' if OP_SERVICE_ACCOUNT_TOKEN is set, otherwise 'biometric'
 */
export function getAuthMode(): 'biometric' | 'service-account' {
  return process.env.OP_SERVICE_ACCOUNT_TOKEN ? 'service-account' : 'biometric';
}

/**
 * Build a secret reference URI for op CLI
 * Quotes the reference to handle spaces in names
 *
 * @param item - Item name or ID
 * @param field - Field name (default: "password")
 * @returns Quoted op:// reference (e.g., "op://Claude Code Tools/GitHub/token")
 */
export function buildSecretReference(item: string, field: string = 'password'): string {
  const vault = getVaultName();
  return `"op://${vault}/${item}/${field}"`;
}
