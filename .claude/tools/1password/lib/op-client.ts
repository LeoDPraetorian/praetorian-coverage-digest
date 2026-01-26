/**
 * 1Password CLI client - executes `op` commands via child_process
 */
import { exec } from 'child_process';
import { getAccountArgs } from './config.js';

/**
 * Error codes for 1Password CLI operations
 */
export type OpErrorCode =
  | 'AUTH_REQUIRED'      // Biometric authentication needed
  | 'NOT_SIGNED_IN'      // CLI not connected to desktop app
  | 'ITEM_NOT_FOUND'     // Item doesn't exist in vault
  | 'VAULT_NOT_FOUND'    // Vault doesn't exist or not accessible
  | 'TIMEOUT'            // Operation timed out
  | 'UNKNOWN';           // Unrecognized error

/**
 * Custom error class for 1Password CLI operations
 */
export class OpClientError extends Error {
  constructor(
    message: string,
    public code: OpErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'OpClientError';
    Object.setPrototypeOf(this, OpClientError.prototype);
  }
}

/**
 * Parse stderr from op command into structured OpClientError
 */
export function parseOpError(error: { message: string; stderr?: string; killed?: boolean }): OpClientError {
  const stderr = error.stderr || error.message || '';
  const lowerStderr = stderr.toLowerCase();

  // Check for biometric authentication errors
  if (lowerStderr.includes('biometric') || lowerStderr.includes('authentication')) {
    return new OpClientError(
      'Biometric authentication required. Please unlock 1Password using Touch ID.',
      'AUTH_REQUIRED'
    );
  }

  // Check for not signed in errors
  if (lowerStderr.includes('not currently signed in')) {
    return new OpClientError(
      'Not signed in. Please connect the 1Password CLI to the 1Password app integration.',
      'NOT_SIGNED_IN'
    );
  }

  // Check for item not found errors
  if (lowerStderr.includes('item') && lowerStderr.includes('not found')) {
    return new OpClientError(
      `Item not found: ${stderr}`,
      'ITEM_NOT_FOUND'
    );
  }

  // Check for vault not found errors
  if (lowerStderr.includes('vault') && lowerStderr.includes('not found')) {
    return new OpClientError(
      `Vault not found: ${stderr}`,
      'VAULT_NOT_FOUND'
    );
  }

  // Check for timeout errors
  if (lowerStderr.includes('timeout') || lowerStderr.includes('timed out') || error.killed) {
    return new OpClientError(
      'Operation timed out. 1Password CLI took longer than expected.',
      'TIMEOUT'
    );
  }

  // Default to unknown error
  return new OpClientError(
    `1Password CLI error: ${stderr}`,
    'UNKNOWN'
  );
}

/**
 * Execute op command with --format=json
 * @param args - Command arguments (e.g., ['item', 'get', 'MyItem'])
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Trimmed stdout from op command
 * @throws OpClientError on failure
 */
export async function execOp(args: string[], timeoutMs = 30000): Promise<string> {
  const accountArgs = getAccountArgs();
  const command = `op ${[...accountArgs, ...args].join(' ')} --format=json`;

  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(parseOpError({
          message: error.message,
          stderr: stderr || (error as any).stderr
        }));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * Execute op command without --format=json (for commands like `op read`)
 * @param args - Command arguments (e.g., ['read', 'op://vault/item/field'])
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Trimmed stdout from op command
 * @throws OpClientError on failure
 */
export async function execOpRaw(args: string[], timeoutMs = 30000): Promise<string> {
  const accountArgs = getAccountArgs();
  const command = `op ${[...accountArgs, ...args].join(' ')}`;

  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(parseOpError({
          message: error.message,
          stderr: stderr || (error as any).stderr
        }));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}
