/**
 * Nebula Public Resources Tool Wrapper
 *
 * AWS/Azure public exposure detection via Nebula MCP server
 * Finds publicly accessible resources (S3 buckets, EC2 instances, etc.)
 * Platform: AWS, Azure
 * Opsec Level: safe
 *
 * Schema Discovery Results:
 * - Response Format: JSON object with resources array and summary
 * - Resources: type, name, public flag, region, ip fields
 * - Summary: total count, public count, by_type breakdown
 * - Tested with: default config, specific regions, resource type filters
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
// Input Schema - Based on Nebula Public Resources Tool
// ============================================================================

/**
 * Input validation schema for public resources detection tool
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

  // Output options
  output: z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  outfile: z.string()
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .optional(),

  // Opsec level
  opsec_level: z.enum(['none', 'safe', 'moderate', 'aggressive']).optional(),
});

// ============================================================================
// Output Schema - Public Resources Response
// ============================================================================

/**
 * Output validation schema
 * Response is a JSON string from Nebula that needs to be parsed
 */
const OutputSchema = z.object({
  resources: z.array(z.object({
    type: z.string().optional(),
    name: z.string().optional(),
    public: z.boolean().optional(),
    region: z.string().optional(),
    ip: z.string().optional(),
  }).passthrough()).optional(),
  summary: z.object({
    total: z.number().optional(),
    public: z.number().optional(),
    by_type: z.record(z.number()).optional(),
  }).passthrough().optional(),
  // Allow other fields from Nebula
}).passthrough();

// ============================================================================
// Tool Wrapper
// ============================================================================

/**
 * Public Resources Detection via Nebula
 *
 * Usage:
 *   import { publicResources } from '.claude/tools/nebula/public-resources';
 *   const result = await publicResources.execute({});
 */
export const publicResources = {
  name: 'nebula.public-resources',
  description: 'Detect publicly accessible AWS/Azure resources',

  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call Nebula MCP tool
    const rawResult = await callMCPTool('nebula', 'public-resources', validated);

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

export type PublicResourcesInput = z.infer<typeof InputSchema>;
export type PublicResourcesOutput = z.infer<typeof OutputSchema>;
