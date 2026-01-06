/**
 * get_project - Linear MCP Wrapper
 *
 * Get detailed information about a specific project via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (single project)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (required) - Project UUID or name
 *
 * OUTPUT (after filtering):
 * - id: string - Project UUID
 * - name: string - Project display name
 * - description: string (optional) - Project description (truncated to 500 chars)
 * - state: object (optional) - Project state
 *   - id: string - State UUID
 *   - name: string - State name (e.g., "In Progress")
 *   - type: string - State type
 * - lead: object (optional) - Project lead user
 *   - id: string - User UUID
 *   - name: string - User name
 *   - email: string - User email
 * - startDate: string (optional) - ISO date for project start
 * - targetDate: string (optional) - ISO date for project deadline
 * - createdAt: string (optional) - ISO timestamp
 * - updatedAt: string (optional) - ISO timestamp
 *
 * Edge cases discovered:
 * - Query can match by UUID or name (fuzzy matching)
 * - Returns null/undefined if project not found
 * - Description truncated to 500 chars for token efficiency
 *
 * @example
 * ```typescript
 * // Get by name
 * await getProject.execute({ query: 'Q2 2025 Auth Overhaul' });
 *
 * // Get by ID
 * await getProject.execute({ query: 'abc123...' });
 * ```
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Input validation schema
 * Maps to get_project params
 */
export const getProjectParams = z.object({
  // Reference/search field - full validation
  query: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Project ID or name')
});

export type GetProjectInput = z.infer<typeof getProjectParams>;

/**
 * Output schema - minimal essential fields
 */
export const getProjectOutput = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  state: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
  }).optional(),
  lead: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
  }).optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type GetProjectOutput = z.infer<typeof getProjectOutput>;

/**
 * Get a Linear project by ID or name using MCP wrapper
 *
 * @example
 * ```typescript
 * import { getProject } from './.claude/tools/linear';
 *
 * // Get by name
 * const project = await getProject.execute({ query: 'Q2 2025 Auth Overhaul' });
 *
 * // Get by ID
 * const project2 = await getProject.execute({ query: 'abc123...' });
 * ```
 */
export const getProject = {
  name: 'linear.get_project',
  description: 'Get detailed information about a specific Linear project',
  parameters: getProjectParams,

  async execute(input: GetProjectInput): Promise<GetProjectOutput> {
    // Validate input
    const validated = getProjectParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'get_project',
      validated
    );

    if (!rawData) {
      throw new Error(`Project not found: ${validated.query}`);
    }

    // Filter to essential fields
    const filtered = {
      id: rawData.id,
      name: rawData.name,
      description: rawData.description?.substring(0, 500), // Truncate for token efficiency
      state: rawData.state ? {
        id: rawData.state.id,
        name: rawData.state.name,
        type: rawData.state.type
      } : undefined,
      lead: rawData.lead ? {
        id: rawData.lead.id,
        name: rawData.lead.name,
        email: rawData.lead.email
      } : undefined,
      startDate: rawData.startDate,
      targetDate: rawData.targetDate,
      createdAt: rawData.createdAt,
      updatedAt: rawData.updatedAt
    };

    // Validate output
    return getProjectOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
