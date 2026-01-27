/**
 * Salesforce MCP Wrapper Common Schemas
 *
 * Reusable Zod schemas for input validation across all Salesforce wrappers.
 * Based on validating-with-zod-schemas and sanitizing-inputs-securely skills.
 */

import { z } from 'zod';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoAbsolutePath,
  validateNoCommandInjection,
} from '../../config/lib/sanitize.js';

/**
 * Validated Salesforce org username/alias
 * Used across all tools that accept targetOrg
 */
export const salesforceOrgIdentifier = z.string()
  .min(1, 'Org username/alias is required')
  .max(256, 'Org username/alias too long')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(validateNoCommandInjection, 'Shell metacharacters not allowed')
  .refine(
    (val) => /^[\w@.\-]+$/.test(val),
    'Invalid characters in org username'
  )
  .describe('Salesforce org username or alias');

/**
 * Optional org identifier (defaults to default org)
 */
export const optionalOrgIdentifier = salesforceOrgIdentifier.optional();

/**
 * Validated SOQL query string
 */
export const salesforceSoqlQuery = z.string()
  .min(1, 'SOQL query is required')
  .max(20000, 'SOQL query too long')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .describe('SOQL query to execute');

/**
 * Validated file path within project
 */
export const salesforceProjectPath = z.string()
  .min(1, 'Path is required')
  .max(4096, 'Path too long')
  .refine(validateNoPathTraversal, 'Path traversal not allowed')
  .refine(validateNoAbsolutePath, 'Absolute paths not allowed')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(validateNoCommandInjection, 'Shell metacharacters not allowed')
  .describe('File path within Salesforce DX project');

/**
 * Validated Apex test class/method name
 */
export const salesforceTestName = z.string()
  .min(1, 'Test name is required')
  .max(256, 'Test name too long')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(validateNoCommandInjection, 'Shell metacharacters not allowed')
  .refine(
    (val) => /^[\w.]+$/.test(val),
    'Test name must be alphanumeric with dots only'
  )
  .describe('Apex test class or method name');

/**
 * Validated operation ID (for resume operations)
 */
export const salesforceOperationId = z.string()
  .uuid('Invalid operation ID format')
  .describe('UUID of operation to resume');

/**
 * Salesforce ID pattern (15 or 18 character alphanumeric)
 */
export const salesforceId = z.string()
  .regex(/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/, 'Invalid Salesforce ID format')
  .describe('Salesforce record ID (15 or 18 characters)');

/**
 * Pagination schema (reused across list operations)
 */
export const paginationSchema = z.object({
  limit: z.number()
    .min(1, 'Limit must be at least 1')
    .max(200, 'Limit cannot exceed 200')
    .default(50),
  offset: z.number()
    .min(0, 'Offset cannot be negative')
    .optional()
});

/**
 * Target org schema (reused across org-specific operations)
 */
export const targetOrgSchema = z.object({
  targetOrg: optionalOrgIdentifier
    .describe('Org alias or username. Defaults to default org.')
});

/**
 * Deploy options schema (for metadata operations)
 */
export const deployOptionsSchema = z.object({
  checkOnly: z.boolean().default(false),
  testLevel: z.enum(['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'])
    .default('NoTestRun'),
  runTests: z.array(salesforceTestName).optional()
});

/**
 * Scratch org definition schema
 */
export const scratchOrgDefinition = z.object({
  edition: z.enum(['Developer', 'Enterprise', 'Group', 'Professional'])
    .optional()
    .describe('Salesforce edition'),
  features: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional()
});

/**
 * Boolean flags schema (common options)
 */
export const verboseFlag = z.boolean()
  .default(false)
  .describe('Include verbose output');

export const jsonFlag = z.boolean()
  .default(true)
  .describe('Return output as JSON');

/**
 * Duration schema (for scratch orgs)
 */
export const durationDays = z.number()
  .min(1, 'Duration must be at least 1 day')
  .max(30, 'Duration cannot exceed 30 days')
  .default(7)
  .describe('Duration in days');
