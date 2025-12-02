/**
 * Nebula Whoami Tool Wrapper
 *
 * Covert AWS identity detection via Nebula MCP server
 * Uses various techniques to determine caller identity without logging
 * Platform: AWS
 * Opsec Level: configurable
 *
 * Schema Discovery Results:
 * - Response Format: JSON object with identity and techniques_used
 * - Identity: arn, account, user_id fields
 * - Techniques: Array of detection methods used (e.g., sts-get-caller-identity)
 * - Tested with: default config, specific actions, various opsec levels
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
// Input Schema - Based on Nebula Whoami Tool
// ============================================================================

/**
 * Input validation schema for AWS whoami tool
 * All fields are optional - Nebula uses defaults from AWS profile
 */
const InputSchema = z.object({
  // Action/technique to use for identity detection
  action: z.string()
    .superRefine(createSecureStringValidator('action', { maxLength: 256, allowEmpty: true }))
    .refine(validateNoXSS, 'Invalid characters in action')
    .optional(),

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

  // Opsec level
  opsec_level: z.enum(['none', 'safe', 'moderate', 'aggressive']).optional(),
});

// ============================================================================
// Output Schema - AWS Identity Response
// ============================================================================

/**
 * Output validation schema
 * Response is a JSON string from Nebula that needs to be parsed
 */
const OutputSchema = z.object({
  identity: z.object({
    arn: z.string().optional(),
    account: z.string().optional(),
    user_id: z.string().optional(),
  }).passthrough().optional(),
  techniques_used: z.array(z.string()).optional(),
  // Allow other fields from Nebula
}).passthrough();

// ============================================================================
// Tool Wrapper
// ============================================================================

/**
 * AWS Identity Detection via Nebula
 *
 * Usage:
 *   import { whoami } from '.claude/tools/nebula/whoami';
 *   const result = await whoami.execute({});
 */
export const whoami = {
  name: 'nebula.whoami',
  description: 'Covert AWS identity detection using various techniques',

  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call Nebula MCP tool
    const rawResult = await callMCPTool('nebula', 'whoami', validated);

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

export type WhoamiInput = z.infer<typeof InputSchema>;
export type WhoamiOutput = z.infer<typeof OutputSchema>;
