/**
 * Salesforce MCP Wrapper Errors
 *
 * Shared error types and factory functions for all Salesforce wrappers.
 * Based on implementing-result-either-pattern skill.
 */

/**
 * Error codes for Salesforce operations
 */
export type SalesforceErrorCode =
  | 'AUTH_ERROR'           // Authentication/authorization failures
  | 'SOQL_INJECTION'       // Detected injection attempt
  | 'INVALID_QUERY'        // Malformed SOQL
  | 'RATE_LIMIT'           // API rate limit exceeded
  | 'NOT_FOUND'            // Record/org not found
  | 'PERMISSION_DENIED'    // Insufficient permissions
  | 'VALIDATION_ERROR'     // Input validation failed
  | 'NETWORK_ERROR'        // Connection/timeout issues
  | 'COMMAND_INJECTION'    // Detected command injection attempt
  | 'PATH_TRAVERSAL'       // Detected path traversal attempt
  | 'UNKNOWN_ERROR';       // Unexpected errors

/**
 * Salesforce error structure
 */
export interface SalesforceError {
  code: SalesforceErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

/**
 * Error factory functions
 */
export const SalesforceErrors = {
  authError: (message: string): SalesforceError => ({
    code: 'AUTH_ERROR',
    message,
    retryable: false
  }),

  soqlInjection: (pattern: string): SalesforceError => ({
    code: 'SOQL_INJECTION',
    message: `Dangerous SOQL pattern detected: ${pattern}`,
    retryable: false
  }),

  invalidQuery: (message: string): SalesforceError => ({
    code: 'INVALID_QUERY',
    message,
    retryable: false
  }),

  rateLimit: (retryAfter?: number): SalesforceError => ({
    code: 'RATE_LIMIT',
    message: 'Salesforce API rate limit exceeded',
    details: retryAfter ? { retryAfter } : undefined,
    retryable: true
  }),

  notFound: (entity: string, id: string): SalesforceError => ({
    code: 'NOT_FOUND',
    message: `${entity} with ID ${id} not found`,
    retryable: false
  }),

  permissionDenied: (message: string): SalesforceError => ({
    code: 'PERMISSION_DENIED',
    message,
    retryable: false
  }),

  validationError: (field: string, reason: string): SalesforceError => ({
    code: 'VALIDATION_ERROR',
    message: `Validation failed for ${field}: ${reason}`,
    retryable: false
  }),

  networkError: (message: string): SalesforceError => ({
    code: 'NETWORK_ERROR',
    message,
    retryable: true
  }),

  commandInjection: (input: string): SalesforceError => ({
    code: 'COMMAND_INJECTION',
    message: `Dangerous command pattern detected in input`,
    details: { input: input.substring(0, 50) },
    retryable: false
  }),

  pathTraversal: (path: string): SalesforceError => ({
    code: 'PATH_TRAVERSAL',
    message: `Path traversal detected`,
    details: { path: path.substring(0, 50) },
    retryable: false
  }),

  unknownError: (message: string): SalesforceError => ({
    code: 'UNKNOWN_ERROR',
    message,
    retryable: false
  })
};

/**
 * Map MCP errors to SalesforceError
 */
export function mapMCPError(error: unknown): SalesforceError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('invalid session')) {
      return SalesforceErrors.authError(error.message);
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return SalesforceErrors.rateLimit();
    }

    // Not found
    if (message.includes('not found') || message.includes('does not exist')) {
      return SalesforceErrors.notFound('Resource', 'unknown');
    }

    // Permission errors
    if (message.includes('permission') || message.includes('access denied')) {
      return SalesforceErrors.permissionDenied(error.message);
    }

    // Network errors
    if (message.includes('timeout') || message.includes('econnrefused') || message.includes('network')) {
      return SalesforceErrors.networkError(error.message);
    }
  }

  // Fallback
  return SalesforceErrors.unknownError(String(error));
}
