/**
 * Error types and handling for Ghydra MCP wrappers
 *
 * Following structured error pattern from existing http-errors.ts
 * with MCP-compatible exception throwing at wrapper boundaries.
 */

/**
 * Ghydra-specific error types
 */
export type GhydraErrorType =
  | 'connection'      // Cannot connect to Ghidra instance
  | 'not_found'       // Function/data/struct not found
  | 'validation'      // Invalid input parameters
  | 'operation'       // Operation failed (rename, create, etc.)
  | 'timeout'         // Operation timed out
  | 'security'        // Security validation failed
  | 'memory_access';  // Memory read/write error

/**
 * Structured error information
 */
export interface GhydraError {
  type: GhydraErrorType;
  message: string;
  code?: string;            // Optional error code from Ghidra
  address?: string;         // Related address if applicable
  retryable: boolean;
}

/**
 * Defines which error types are retryable
 */
export const GHYDRA_ERROR_RETRYABILITY: Record<GhydraErrorType, boolean> = {
  connection: true,
  not_found: false,
  validation: false,
  operation: false,     // May need investigation
  timeout: true,
  security: false,
  memory_access: false,
};

/**
 * Ghydra wrapper error class
 *
 * Provides structured errors with tool context and retry information.
 * Designed for MCP compatibility with exception-based error propagation.
 */
export class GhydraWrapperError extends Error {
  constructor(
    public readonly error: GhydraError,
    public readonly tool: string,
    public readonly params?: Record<string, unknown>
  ) {
    super(`[ghydra.${tool}] ${error.type}: ${error.message}`);
    this.name = 'GhydraWrapperError';
  }

  /**
   * Returns whether this error type is retryable
   */
  get isRetryable(): boolean {
    return GHYDRA_ERROR_RETRYABILITY[this.error.type];
  }
}
