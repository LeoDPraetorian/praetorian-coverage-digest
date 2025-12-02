/**
 * Nebula Apollo Tool Wrapper
 *
 * AWS access control graph analysis via Nebula MCP server
 * Builds Neo4j graph of IAM relationships and permissions
 * Platform: AWS
 * Opsec Level: moderate
 *
 * Schema Discovery Results:
 * - Response Format: JSON object with graph and analysis fields
 * - Graph stats: nodes, edges, clusters counts
 * - Analysis: privilege_escalation_paths, cross_account_access, findings array
 * - Tested with: default config, custom regions, Neo4j connection params
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
// Input Schema - Based on Nebula Apollo Tool
// ============================================================================

/**
 * Input validation schema for AWS access control graph tool
 * All fields are optional - Nebula uses defaults
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

  // Neo4j connection configuration
  'neo4j-uri': z.string()
    .superRefine(createSecureStringValidator('neo4j-uri', { maxLength: 512, allowEmpty: true }))
    .optional(),

  'neo4j-username': z.string()
    .superRefine(createSecureStringValidator('neo4j-username', { maxLength: 256, allowEmpty: true }))
    .optional(),

  'neo4j-password': z.string()
    .superRefine(createSecureStringValidator('neo4j-password', { maxLength: 256, allowEmpty: true }))
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
// Output Schema - Access Control Graph Response
// ============================================================================

/**
 * Output validation schema
 * Response is a JSON string from Nebula that needs to be parsed
 */
const OutputSchema = z.object({
  graph: z.object({
    nodes: z.number().optional(),
    edges: z.number().optional(),
    clusters: z.number().optional(),
  }).passthrough().optional(),
  analysis: z.object({
    privilege_escalation_paths: z.number().optional(),
    cross_account_access: z.number().optional(),
    findings: z.array(z.any()).optional(),
  }).passthrough().optional(),
  // Allow other fields from Nebula
}).passthrough();

// ============================================================================
// Tool Wrapper
// ============================================================================

/**
 * AWS Access Control Graph Analysis via Nebula
 *
 * Usage:
 *   import { apollo } from '.claude/tools/nebula/apollo';
 *   const result = await apollo.execute({});
 */
export const apollo = {
  name: 'nebula.apollo',
  description: 'Build and analyze AWS access control graph in Neo4j',

  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call Nebula MCP tool
    const rawResult = await callMCPTool('nebula', 'apollo', validated);

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

export type ApolloInput = z.infer<typeof InputSchema>;
export type ApolloOutput = z.infer<typeof OutputSchema>;
