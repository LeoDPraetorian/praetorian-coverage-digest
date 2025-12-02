/**
 * Nebula Summary Tool Wrapper
 *
 * Get authorization details in an AWS account via Nebula MCP server
 * Platform: AWS
 * Opsec Level: moderate
 *
 * Schema Discovery Results:
 * - Response Format: JSON object with account_id, regions, resources, costs
 * - Resources: Record of service name to count/details
 * - Costs: Nested by_service breakdown with totals and by_region
 * - Tested with: default config, specific profile, output options
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
// Input Schema - Based on Nebula Summary Tool
// ============================================================================

/**
 * Input validation schema for AWS summary tool
 * All fields are optional - Nebula uses defaults from AWS profile
 */
const InputSchema = z.object({
  // AWS profile configuration
  profile: z.string()
    .superRefine(createSecureStringValidator('profile', { maxLength: 256, allowEmpty: true }))
    .refine(validateNoXSS, 'Invalid characters in profile')
    .optional(),

  'profile-dir': z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  // Regions to scan (comma-separated)
  regions: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional(),

  // Resource types to scan (comma-separated)
  'resource-type': z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional(),

  // Caching options
  'cache-dir': z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  'disable-cache': z.boolean().optional(),
  'cache-ttl': z.number().int().min(0).optional(),
  'cache-ext': z.string().optional(),
  'cache-error-resp': z.boolean().optional(),
  'cache-error-resp-type': z.string().optional(),

  // Output options
  output: z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  outfile: z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  indent: z.number().int().min(0).max(8).optional(),
  'module-name': z.string().optional(),

  // Opsec level
  opsec_level: z.enum(['none', 'safe', 'moderate', 'aggressive']).optional(),
});

// ============================================================================
// Output Schema - AWS Account Summary
// ============================================================================

/**
 * Output validation schema
 * Response is a JSON string from Nebula that needs to be parsed
 */
const OutputSchema = z.object({
  account_id: z.string().optional(),
  regions: z.array(z.string()).optional(),
  resources: z.record(z.union([z.number(), z.string(), z.any()])).optional(),
  costs: z.record(z.any()).optional(),
  // Allow other fields from Nebula
}).passthrough();

// ============================================================================
// Tool Wrapper
// ============================================================================

/**
 * AWS Account Summary via Nebula
 *
 * Usage:
 *   import { summary } from '.claude/tools/nebula/summary';
 *   const result = await summary.execute({ profile: 'default' });
 */
export const summary = {
  name: 'nebula.summary',
  description: 'Get AWS account summary with cost explorer data',

  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call Nebula MCP tool
    const rawResult = await callMCPTool('nebula', 'summary', validated);

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

export type SummaryInput = z.infer<typeof InputSchema>;
export type SummaryOutput = z.infer<typeof OutputSchema>;
