/**
 * Nebula Access Key to Account ID Tool Wrapper
 *
 * Map AWS access keys to account IDs via Nebula MCP server
 * Useful for identifying account ownership from access key IDs
 * Platform: AWS
 * Opsec Level: safe
 *
 * Schema Discovery Results:
 * - Response Format: JSON object with access_key_id, account_id, valid fields
 * - Multi-key Response: Array wrapped in "results" field
 * - Error Response: Plain text error message
 * - Tested with: single key, multiple keys (comma-separated), invalid keys
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  validateNoPathTraversal,
  validateNoCommandInjection,
  validateNoControlChars,
  validateNoXSS,
  createSecureStringValidator,
} from '../config/lib/sanitize.js';
import { parseNebulaResponse, filterMetadata } from './parse-response.js';

// ============================================================================
// Input Schema - Based on Nebula Access Key to Account ID Tool
// ============================================================================

/**
 * Input validation schema for AWS access key to account ID tool
 * NOTE: access-key-id is REQUIRED (only priority tool with required field)
 */
const InputSchema = z.object({
  // AWS access key ID(s) to map - REQUIRED
  // Supports comma-separated values for multiple keys
  'access-key-id': z.string()
    .superRefine(createSecureStringValidator('access-key-id', { maxLength: 1024 }))
    .refine(validateNoXSS, 'Invalid characters in access-key-id')
    .refine(validateNoControlChars, 'Control characters not allowed'),

  // AWS profile configuration (optional)
  profile: z.string()
    .superRefine(createSecureStringValidator('profile', { maxLength: 256, allowEmpty: true }))
    .refine(validateNoXSS, 'Invalid characters in profile')
    .optional(),

  'profile-dir': z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  // Opsec level
  opsec_level: z.enum(['none', 'safe', 'moderate', 'aggressive']).optional(),
});

// ============================================================================
// Output Schema - Access Key Mapping Response
// ============================================================================

/**
 * Output validation schema
 * Response is a JSON string from Nebula that needs to be parsed
 * Can return single key or array of results for multiple keys
 */
const OutputSchema = z.object({
  access_key_id: z.string().optional(),
  account_id: z.string().optional(),
  valid: z.boolean().optional(),
  results: z.array(z.object({
    access_key_id: z.string().optional(),
    account_id: z.string().optional(),
    valid: z.boolean().optional(),
  }).passthrough()).optional(),
  // Allow other fields from Nebula
}).passthrough();

// ============================================================================
// Tool Wrapper
// ============================================================================

/**
 * AWS Access Key to Account ID Mapping via Nebula
 *
 * Usage:
 *   import { accessKeyToAccountId } from '.claude/tools/nebula/access-key-to-account-id';
 *   const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' });
 */
export const accessKeyToAccountId = {
  name: 'nebula.access-key-to-account-id',
  description: 'Map AWS access key IDs to their account IDs',

  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call Nebula MCP tool
    const rawResult = await callMCPTool('nebula', 'access-key-to-account-id', validated);

    // Parse response (handles JSON, Go maps, plain values)
    const parsed = parseNebulaResponse(rawResult);

    // Filter verbose metadata
    const filtered = filterMetadata(parsed);

    // Validate output
    return OutputSchema.parse(filtered);
  }
};

// ============================================================================
// Type Exports
// ============================================================================

export type AccessKeyToAccountIdInput = z.infer<typeof InputSchema>;
export type AccessKeyToAccountIdOutput = z.infer<typeof OutputSchema>;
