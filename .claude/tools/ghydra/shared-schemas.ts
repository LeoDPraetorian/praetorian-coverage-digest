/**
 * Shared Zod schemas for Ghydra MCP wrappers
 *
 * Reusable validators following OWASP allowlist patterns with defense-in-depth:
 * - Layer 1: Zod structural validation
 * - Layer 2: Security function validation (from sanitize.ts)
 * - Layer 3: Semantic validation (in wrapper execute())
 * - Layer 4: Response filtering (prevent sensitive data exposure)
 */

import { z } from 'zod';
import {
  validateNoPathTraversal,
  validateNoControlChars,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';

// ============================================================================
// Common Parameter Schemas
// ============================================================================

/**
 * Optional port parameter - present in almost all tools
 */
export const PortSchema = z
  .number()
  .int()
  .min(1)
  .max(65535)
  .optional()
  .describe('Ghidra instance port (optional, uses default if not specified)');

/**
 * Hex address validation - used for all address parameters
 * Accepts: 0x1234, 0xABCDEF, 0x00000000
 */
export const HexAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]+$/, 'Must be hex address (e.g., 0x00401000)')
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in address' }
  );

/**
 * Function/symbol name validation
 */
export const SymbolNameSchema = z
  .string()
  .min(1, 'Name cannot be empty')
  .max(256, 'Name too long (max 256 chars)')
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in name' }
  )
  .refine(
    (val) => validateNoCommandInjection(val),
    { message: 'Invalid characters in name' }
  );

/**
 * Comment text validation (more permissive, allows newlines)
 */
export const CommentSchema = z
  .string()
  .max(2000, 'Comment too long (max 2000 chars)')
  .refine(
    (val) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(val),
    { message: 'Dangerous control characters not allowed' }
  );

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(50),
});

// ============================================================================
// Mutually Exclusive Identifier Pattern
// ============================================================================

/**
 * Many ghydra tools accept EITHER name OR address (not both)
 * This schema enforces that pattern with clear error messages
 */
export const NameOrAddressSchema = z
  .object({
    name: SymbolNameSchema.optional(),
    address: HexAddressSchema.optional(),
  })
  .refine(
    (data) => {
      const hasName = data.name !== undefined;
      const hasAddress = data.address !== undefined;
      return (hasName || hasAddress) && !(hasName && hasAddress);
    },
    {
      message: 'Provide either name OR address, not both (and not neither)',
      path: ['name', 'address'],
    }
  );

// ============================================================================
// Data Type Validation
// ============================================================================

/**
 * Valid Ghidra data types for data-create/data-set-type
 */
export const DataTypeSchema = z
  .string()
  .min(1)
  .max(128)
  .refine(
    (val) => validateNoControlChars(val) && validateNoCommandInjection(val),
    { message: 'Invalid data type format' }
  );

/**
 * Comment types for comments-set
 */
export const CommentTypeSchema = z
  .enum([
    'plate',      // Before function
    'pre',        // Before instruction
    'post',       // After instruction
    'eol',        // End of line
    'repeatable', // Repeatable
  ])
  .default('plate');

// ============================================================================
// Namespace-Specific Base Schemas
// ============================================================================

export const InstancesBaseSchema = z.object({
  port: PortSchema,
});

export const FunctionsBaseSchema = InstancesBaseSchema.extend({
  name: SymbolNameSchema.optional(),
  address: HexAddressSchema.optional(),
}).refine(
  (data) => data.name || data.address,
  { message: 'Either name or address required' }
);

export const MemoryBaseSchema = InstancesBaseSchema.extend({
  address: HexAddressSchema,
  format: z.enum(['hex', 'base64', 'string']).default('hex'),
});

export const DataBaseSchema = InstancesBaseSchema.extend({
  address: HexAddressSchema.optional(),
  name: SymbolNameSchema.optional(),
});

export const StructsBaseSchema = InstancesBaseSchema.extend({
  name: SymbolNameSchema,
});

export const AnalysisBaseSchema = InstancesBaseSchema;
