/**
 * Utility functions for JADX MCP wrappers
 *
 * Common helpers used across all JADX wrapper tools.
 */

import { estimateTokens } from '../config/lib/response-utils.js';
import { JadxWrapperError } from './errors.js';

// ============================================================================
// Token Estimation Utilities
// ============================================================================

/**
 * Add token estimation to an object
 *
 * @param obj - Object to add token estimation to
 * @returns Object with estimatedTokens field added
 */
export function addTokenEstimation<T extends Record<string, any>>(obj: T): T & { estimatedTokens: number } {
  return {
    ...obj,
    estimatedTokens: estimateTokens(obj),
  };
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Standard MCP error handler for ALL jadx wrappers
 * Maps common error patterns to structured JadxWrapperError
 */
export function handleMCPError(error: unknown, tool: string): never {
  if (error instanceof Error) {
    const message = error.message;

    // Connection errors
    if (message.includes('ECONNREFUSED') || message.includes('Cannot connect')) {
      throw new JadxWrapperError(
        { type: 'connection', message: 'Cannot connect to JADX MCP server. Is JADX GUI running?', retryable: true },
        tool
      );
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('timed out')) {
      throw new JadxWrapperError(
        { type: 'timeout', message: 'Request timed out. JADX may be processing large APK.', retryable: true },
        tool
      );
    }

    // Validation errors
    if (message.includes('ZodError') || message.includes('validation')) {
      throw new JadxWrapperError(
        { type: 'validation', message: `Validation error: ${message}`, retryable: false },
        tool
      );
    }

    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      throw new JadxWrapperError(
        { type: 'not_found', message: 'Resource not found', retryable: false },
        tool
      );
    }

    // No project/APK loaded
    if (message.includes('no project') || message.includes('No project') || message.includes('No APK')) {
      throw new JadxWrapperError(
        { type: 'not_found', message: 'No APK project loaded in JADX', retryable: false },
        tool
      );
    }

    // Parse errors (XML, code)
    if (message.includes('parse') || message.includes('syntax') || message.includes('JSON parse')) {
      throw new JadxWrapperError(
        { type: 'parse', message: `Parse error: ${message}`, retryable: false },
        tool
      );
    }

    // Generic operation failure
    throw new JadxWrapperError(
      { type: 'operation', message: `Operation failed: ${message}`, retryable: false },
      tool
    );
  }

  // Unknown errors
  throw error;
}

// ============================================================================
// Response Validation Utilities
// ============================================================================

/**
 * Validate that response is an object
 */
export function validateObjectResponse(rawData: unknown, tool: string): Record<string, any> {
  if (!rawData || typeof rawData !== 'object') {
    throw new JadxWrapperError(
      { type: 'operation', message: 'Invalid response format', retryable: false },
      tool
    );
  }
  return rawData as Record<string, any>;
}

/**
 * Validate that response is an array (for search/list tools)
 */
export function validateArrayResponse(rawData: unknown, tool: string): any[] {
  // Handle both direct array and { result: [] } format
  if (Array.isArray(rawData)) {
    return rawData;
  }

  if (rawData && typeof rawData === 'object' && 'result' in rawData) {
    const result = (rawData as { result: unknown }).result;
    if (Array.isArray(result)) {
      return result;
    }
  }

  throw new JadxWrapperError(
    { type: 'operation', message: 'Invalid response format: expected array', retryable: false },
    tool
  );
}

// ============================================================================
// Timestamp Utilities
// ============================================================================

/**
 * Get ISO timestamp for operation results
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}
