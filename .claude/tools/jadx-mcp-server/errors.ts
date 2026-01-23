/**
 * Error types and handling for JADX MCP wrappers
 *
 * Following Ghydra pattern with JADX-specific error types.
 */

/**
 * JADX-specific error types
 */
export type JadxErrorType =
  | 'connection'      // Cannot connect to JADX MCP server
  | 'not_found'       // Class/resource not found
  | 'validation'      // Invalid input parameters
  | 'operation'       // Operation failed
  | 'timeout'         // Operation timed out
  | 'parse';          // Parse error (XML, code)

/**
 * Structured error information
 */
export interface JadxErrorDetails {
  type: JadxErrorType;
  message: string;
  retryable: boolean;
  tool?: string;
}

/**
 * Defines which error types are retryable
 */
export const JADX_ERROR_RETRYABILITY: Record<JadxErrorType, boolean> = {
  connection: true,
  not_found: false,
  validation: false,
  operation: false,
  timeout: true,
  parse: false,
};

/**
 * JADX wrapper error class
 *
 * Provides structured errors with tool context and retry information.
 */
export class JadxWrapperError extends Error {
  readonly details: JadxErrorDetails;
  readonly tool: string;

  constructor(details: JadxErrorDetails, tool: string) {
    super(`[jadx.${tool}] ${details.type}: ${details.message}`);
    this.name = 'JadxWrapperError';
    this.details = details;
    this.tool = tool;
  }

  toJSON() {
    return {
      error: this.details.type,
      message: this.details.message,
      tool: this.tool,
      retryable: this.details.retryable,
    };
  }
}
