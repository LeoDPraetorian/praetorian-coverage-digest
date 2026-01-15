/**
 * Utility functions for Ghydra MCP wrappers
 *
 * Common helpers used across all 35+ wrapper tools.
 */

import { estimateTokens } from '../config/lib/response-utils.js';
import { GhydraWrapperError } from './errors.js';

// ============================================================================
// Token Estimation Utilities
// ============================================================================

/**
 * Standard wrapper result structure
 */
export interface WrapperResult<T> {
  data: T;
  estimatedTokens: number;
}

/**
 * Wrap any response with token estimation
 *
 * @param data - The response data to wrap
 * @returns Wrapped result with token count
 */
export function withTokens<T>(data: T): WrapperResult<T> {
  return {
    data,
    estimatedTokens: estimateTokens(data),
  };
}

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
// Address Utilities
// ============================================================================

/**
 * Normalize hex address to lowercase with 0x prefix
 */
export function normalizeHexAddress(addr: string): string {
  return addr.toLowerCase().startsWith('0x')
    ? addr.toLowerCase()
    : `0x${addr.toLowerCase()}`;
}

/**
 * Validate hex address format
 */
export function validateHexAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{1,16}$/.test(address);
}

/**
 * Sanitize hex address (validate and normalize, or return default)
 */
export function sanitizeAddress(address: string | undefined, defaultValue = '0x0'): string {
  if (!address) return defaultValue;
  if (!validateHexAddress(address)) return defaultValue;
  return normalizeHexAddress(address);
}

// ============================================================================
// Identifier Utilities (name OR address)
// ============================================================================

/**
 * Extract name or address from validated input
 *
 * @param input - Object with optional name and/or address
 * @returns Identifier type and value
 * @throws Error if neither name nor address provided
 */
export function getIdentifier(input: { name?: string; address?: string }): {
  type: 'name' | 'address';
  value: string;
} {
  if (input.name) return { type: 'name', value: input.name };
  if (input.address) return { type: 'address', value: normalizeHexAddress(input.address) };
  throw new Error('Either name or address required');
}

// ============================================================================
// String Sanitization Utilities
// ============================================================================

/**
 * Sanitize name (remove dangerous characters)
 */
export function sanitizeName(name: string | undefined, defaultValue = '[unnamed]'): string {
  if (!name) return defaultValue;
  const cleaned = name.replace(/[<>'"]/g, '').trim();
  return cleaned || defaultValue;
}

/**
 * Sanitize signature (remove dangerous characters)
 */
export function sanitizeSignature(signature: string | undefined): string | null {
  if (!signature) return null;
  const cleaned = signature.replace(/[<>'"]/g, '').trim();
  return cleaned || null;
}

/**
 * Sanitize comment text
 */
export function sanitizeComment(comment: string | undefined): string | null {
  if (!comment) return null;
  const cleaned = comment.replace(/[<>'"]/g, '').trim();
  return cleaned || null;
}

// ============================================================================
// Number Sanitization Utilities
// ============================================================================

/**
 * Sanitize size (ensure non-negative integer)
 */
export function sanitizeSize(size: number | undefined, defaultValue = 0): number {
  if (typeof size !== 'number') return defaultValue;
  if (size < 0) return defaultValue;
  if (!Number.isInteger(size)) return Math.floor(size);
  return size;
}

/**
 * Sanitize count (ensure non-negative integer)
 */
export function sanitizeCount(count: number | undefined, defaultValue = 0): number {
  return sanitizeSize(count, defaultValue);
}

/**
 * Sanitize port number
 */
export function sanitizePort(port: number | undefined, defaultValue = 0): number {
  if (typeof port !== 'number') return defaultValue;
  if (port < 1 || port > 65535) return defaultValue;
  if (!Number.isInteger(port)) return defaultValue;
  return port;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Standard MCP error handler for all wrappers
 *
 * @param error - The caught error
 * @param tool - Tool name (e.g., 'functions-list')
 * @throws GhydraWrapperError with appropriate type
 */
export function handleMCPError(error: unknown, tool: string): never {
  if (error instanceof Error) {
    const message = error.message;

    // Connection errors
    if (message.includes('ECONNREFUSED') || message.includes('connect ECONNREFUSED') || message.includes('Cannot connect')) {
      throw new GhydraWrapperError(
        { type: 'connection', message: 'Cannot connect to Ghydra MCP server. Is it running?', retryable: true },
        tool
      );
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out') || message.includes('ETIMEDOUT')) {
      throw new GhydraWrapperError(
        { type: 'timeout', message: 'Request timed out. Ghydra instance may be busy.', retryable: true },
        tool
      );
    }

    // Validation errors
    if (message.includes('ZodError') || message.includes('validation')) {
      throw new GhydraWrapperError(
        { type: 'validation', message: `Validation error: ${message}`, retryable: false },
        tool
      );
    }

    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      throw new GhydraWrapperError(
        { type: 'not_found', message: 'Resource not found', retryable: false },
        tool
      );
    }

    // No program loaded
    if (message.includes('no program') || message.includes('Program not loaded')) {
      throw new GhydraWrapperError(
        { type: 'not_found', message: 'No program loaded in Ghidra instance', retryable: false },
        tool
      );
    }

    // Conflict/already exists errors
    if (message.includes('already exists') || message.includes('conflict')) {
      throw new GhydraWrapperError(
        { type: 'operation', message: 'Resource already exists', retryable: false },
        tool
      );
    }

    // Operation failures
    if (message.includes('failed') || message.includes('error')) {
      throw new GhydraWrapperError(
        { type: 'operation', message: `Operation failed: ${message}`, retryable: false },
        tool
      );
    }
  }

  // Unknown errors - rethrow
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
    throw new GhydraWrapperError(
      { type: 'operation', message: 'Invalid response format', retryable: false },
      tool
    );
  }
  return rawData as Record<string, any>;
}

/**
 * Validate that response is an array
 */
export function validateArrayResponse(rawData: unknown): any[] {
  if (Array.isArray(rawData)) return rawData;
  if (!rawData || typeof rawData !== 'object') return [];
  if ('items' in rawData && Array.isArray((rawData as any).items)) return (rawData as any).items;
  return [];
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
