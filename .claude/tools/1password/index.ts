/**
 * 1Password CLI Wrapper Tools
 *
 * Provides secure credential access via biometric-authenticated 1Password CLI.
 * Requires 1Password desktop app with CLI integration enabled.
 */

export { readSecret, readSecretInput, readSecretOutput, type ReadSecretInput, type ReadSecretOutput } from './read-secret.js';
export { listItems, listItemsInput, listItemsOutput, type ListItemsOutput } from './list-items.js';
export { getItem, getItemInput, getItemOutput, type GetItemInput, type GetItemOutput } from './get-item.js';
export { runWithSecrets, runWithSecretsInput, runWithSecretsOutput, type RunWithSecretsInput, type RunWithSecretsOutput } from './run-with-secrets.js';

// Re-export error types for consumers
export { OpClientError, type OpErrorCode } from './lib/op-client.js';
export { getVaultName, buildSecretReference } from './lib/config.js';
