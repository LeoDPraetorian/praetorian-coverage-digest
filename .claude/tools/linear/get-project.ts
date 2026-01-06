/**
 * get_project - Linear GraphQL Wrapper
 *
 * Get detailed information about a specific project via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (single project)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (required) - Project UUID or name
 * - fullDescription: boolean (optional) - Return full description without truncation (default: false)
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
 * // Get by name (description truncated to 500 chars)
 * await getProject.execute({ query: 'Q2 2025 Auth Overhaul' });
 *
 * // Get by ID with full description
 * await getProject.execute({ query: 'abc123...', fullDescription: true });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';

/**
 * GraphQL query for getting a project
 */
const GET_PROJECT_QUERY = `
  query Project($id: String!) {
    project(id: $id) {
      id
      name
      description
      state {
        id
        name
        type
      }
      lead {
        id
        name
        email
      }
      startDate
      targetDate
      createdAt
      updatedAt
    }
  }
`;

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
    .describe('Project ID or name'),
  fullDescription: z.boolean().default(false).optional()
    .describe('Return full description without truncation (default: false for token efficiency)')
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
  updatedAt: z.string().optional(),
  estimatedTokens: z.number()
});

export type GetProjectOutput = z.infer<typeof getProjectOutput>;

/**
 * GraphQL response type
 */
interface ProjectResponse {
  project: {
    id: string;
    name: string;
    description?: string | null;
    state?: {
      id: string;
      name: string;
      type: string;
    } | null;
    lead?: {
      id: string;
      name: string;
      email: string;
    } | null;
    startDate?: string | null;
    targetDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

/**
 * Get a Linear project by ID or name using GraphQL API
 *
 * @example
 * ```typescript
 * import { getProject } from './.claude/tools/linear';
 *
 * // Get by name (description truncated to 500 chars)
 * const project = await getProject.execute({ query: 'Q2 2025 Auth Overhaul' });
 *
 * // Get by ID with full description
 * const project2 = await getProject.execute({ query: 'abc123...', fullDescription: true });
 * ```
 */
export const getProject = {
  name: 'linear.get_project',
  description: 'Get detailed information about a specific Linear project',
  parameters: getProjectParams,

  async execute(
    input: GetProjectInput,
    testToken?: string
  ): Promise<GetProjectOutput> {
    // Validate input
    const validated = getProjectParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<ProjectResponse>(
      client,
      GET_PROJECT_QUERY,
      { id: validated.query }
    );

    if (!response.project) {
      throw new Error(`Project not found: ${validated.query}`);
    }

    // Filter to essential fields
    const baseData = {
      id: response.project.id,
      name: response.project.name,
      description: validated.fullDescription
        ? response.project.description || undefined
        : response.project.description?.substring(0, 500) || undefined, // Truncate for token efficiency when fullDescription is false
      state: response.project.state ? {
        id: response.project.state.id,
        name: response.project.state.name,
        type: response.project.state.type
      } : undefined,
      lead: response.project.lead ? {
        id: response.project.lead.id,
        name: response.project.lead.name,
        email: response.project.lead.email
      } : undefined,
      startDate: response.project.startDate || undefined,
      targetDate: response.project.targetDate || undefined,
      createdAt: response.project.createdAt,
      updatedAt: response.project.updatedAt
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
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
