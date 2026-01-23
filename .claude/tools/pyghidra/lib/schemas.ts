/**
 * Shared Zod schemas for pyghidra wrappers
 */

import { z } from 'zod';

/**
 * Validates no path traversal patterns
 */
function validateNoPathTraversal(value: string): boolean {
  return !value.includes('..') && !value.includes('~');
}

/**
 * Validates no control characters
 */
function validateNoControlChars(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/[\x00-\x1F\x7F]/.test(value);
}

/**
 * Validates no command injection characters
 */
function validateNoCommandInjection(value: string): boolean {
  return !/[;&|`$]/.test(value);
}

/**
 * Binary name schema - validates PyGhidra binary identifier
 *
 * NOTE: PyGhidra returns binary names with leading `/` (e.g., "/binary-name-hash")
 * This is the internal identifier, not a filesystem path, so we allow `/` but block
 * path traversal patterns like `..`
 */
export const BinaryNameSchema = z
  .string()
  .min(1, 'Binary name is required')
  .max(255, 'Binary name too long (max: 255)')
  .refine(validateNoPathTraversal, 'Path traversal not allowed in binary_name')
  .refine(validateNoCommandInjection, 'Invalid characters in binary_name')
  .refine(validateNoControlChars, 'Control characters not allowed in binary_name');

/**
 * Symbol name schema - validates function names and hex addresses
 */
export const SymbolNameSchema = z
  .string()
  .min(1, 'Symbol name is required')
  .max(500, 'Symbol name too long (max: 500)')
  .refine(validateNoControlChars, 'Control characters not allowed in symbol name');

/**
 * Regex query schema - validates regex patterns with ReDoS protection
 */
export const RegexQuerySchema = z
  .string()
  .max(128, 'Regex query too long (max 128 chars)')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(
    (query) => {
      // Block patterns known to cause catastrophic backtracking
      // Check for nested quantifiers like (a+)+ or (a*)*
      if (/\([^)]*[+*]\)[+*]/.test(query)) {
        return false;
      }
      // Check for multiple greedy wildcards like .*.*.* (3+ occurrences)
      if (/(\.\*).*(\.\*).*(\.\*)/.test(query)) {
        return false;
      }
      // Check for deeply nested groups (4+ levels)
      let depth = 0;
      let maxDepth = 0;
      for (const char of query) {
        if (char === '(') {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
        } else if (char === ')') {
          depth--;
        }
      }
      if (maxDepth >= 4) {
        return false;
      }
      return true;
    },
    'Query contains potentially unsafe regex patterns'
  )
  .refine(
    (query) => {
      // Validate regex syntax
      try {
        new RegExp(query);
        return true;
      } catch {
        return false;
      }
    },
    'Invalid regex pattern'
  )
  .optional()
  .describe('Optional regex filter pattern');

/**
 * Offset schema - validates pagination offset
 */
export const OffsetSchema = z
  .number()
  .int()
  .min(0, 'Offset must be non-negative')
  .max(100000, 'Offset exceeds maximum allowed value')
  .default(0);

/**
 * Create limit schema with configurable default and maximum
 */
export function createLimitSchema(defaultValue: number, max: number) {
  return z
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${max}`)
    .max(max, `Limit must be between 1 and ${max}`)
    .default(defaultValue);
}

/**
 * Address schema - validates hex addresses with optional 0x prefix
 * Used by read_bytes
 */
export const AddressSchema = z
  .string()
  .min(1, 'Address is required')
  .max(20, 'Address too long')
  .regex(/^(0x)?[0-9a-fA-F]+$/, 'Invalid hex address format');

/**
 * Read bytes size schema - validates size with DoS limit
 * Used by read_bytes
 *
 * Custom validation to provide "Size must be positive" error for negative numbers.
 */
export const ReadBytesSizeSchema = z
  .number()
  .int()
  .refine((val) => val > 0, { message: 'Size must be positive' })
  .refine((val) => val >= 1, { message: 'Size must be at least 1' })
  .refine((val) => val <= 8192, { message: 'Size exceeds maximum of 8192 bytes' })
  .default(32);
