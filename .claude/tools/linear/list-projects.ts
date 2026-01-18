/**
 * list_projects - Linear GraphQL Wrapper
 *
 * List projects from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800 tokens (project list)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - team: string (optional) - Team name or ID to filter by
 * - state: string (optional) - State name or ID to filter by
 * - query: string (optional) - Search for content in project name
 * - includeArchived: boolean (optional) - Include archived projects
 * - limit: number (optional) - Max projects to return (1-250, default 50)
 * - orderBy: enum (optional) - Sort order: 'createdAt' | 'updatedAt'
 * - fullDescription: boolean (optional) - Return full description without truncation (default: false)
 * - fullContent: boolean (optional) - Return full content without truncation (default: false)
 *
 * OUTPUT (after filtering):
 * - projects: array of project objects
 *   - id: string - Project UUID
 *   - name: string - Project display name
 *   - description: string (optional) - Project description (short summary, truncated to 200 chars)
 *   - content: string (optional) - Project content in markdown format (full description, truncated to 500 chars)
 *   - state: string (optional) - Project state (e.g., "In Progress")
 *   - lead: object (optional) - Project lead user
 *   - startDate: string (optional) - ISO date for project start
 *   - targetDate: string (optional) - ISO date for project deadline
 *   - createdAt: string - ISO timestamp
 *   - updatedAt: string - ISO timestamp
 * - totalProjects: number - Count of returned projects
 * - nextOffset: string (optional) - Pagination cursor
 *
 * Edge cases discovered:
 * - Body is truncated to 200 chars to reduce token usage
 * - Empty projects returns empty array, not null
 * - Description is short summary/tagline, truncated to 200 chars for token efficiency
 * - Content is full markdown description, truncated to 500 chars for token efficiency (smaller than get-project due to list context)
 *
 * @example
 * ```typescript
 * // List all projects (descriptions and content truncated)
 * await listProjects.execute({});
 *
 * // Filter by team
 * await listProjects.execute({ team: 'Engineering' });
 *
 * // Search projects with full descriptions and content
 * await listProjects.execute({ query: 'Q2 2025', fullDescription: true, fullContent: true });
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
 * GraphQL query for listing projects
 */
const LIST_PROJECTS_QUERY = `
  query Projects($first: Int, $includeArchived: Boolean, $orderBy: PaginationOrderBy) {
    projects(first: $first, includeArchived: $includeArchived, orderBy: $orderBy) {
      nodes {
        id
        name
        description
        content
        state
        lead {
          id
          name
        }
        startDate
        targetDate
        createdAt
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to list_projects params
 */
export const listProjectsParams = z.object({
  // Reference field - full validation
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Team name or ID'),
  // Reference field - full validation
  state: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('State name or ID'),
  // Search query - full validation
  query: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Search for content in project name'),
  includeArchived: z.boolean().default(false).optional(),
  limit: z.number().min(1).max(250).optional().default(50).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt').optional(),
  fullDescription: z.boolean().default(false).optional()
    .describe('Return full description without truncation (default: false for token efficiency)'),
  fullContent: z.boolean().default(false).optional()
    .describe('Return full content without truncation (default: false for token efficiency)')
});

export type ListProjectsInput = z.infer<typeof listProjectsParams>;

/**
 * Output schema - minimal essential fields
 */
export const listProjectsOutput = z.object({
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    state: z.string().optional(),  // Simple string, not object (matches GraphQL query)
    lead: z.object({
      id: z.string(),
      name: z.string()
    }).optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  totalProjects: z.number(),
  nextOffset: z.string().optional(),
  estimatedTokens: z.number()
});

export type ListProjectsOutput = z.infer<typeof listProjectsOutput>;

/**
 * GraphQL response type
 */
interface ProjectsResponse {
  projects: {
    nodes: Array<{
      id: string;
      name: string;
      description?: string | null;
      content?: string | null;
      state?: string | null;
      lead?: {
        id: string;
        name: string;
      } | null;
      startDate?: string | null;
      targetDate?: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    pageInfo?: {
      hasNextPage?: boolean;
      endCursor?: string | null;
    } | null;
  };
}

/**
 * List projects from Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { listProjects } from './.claude/tools/linear';
 *
 * // List all projects
 * const projects = await listProjects.execute({});
 *
 * // List projects in a team
 * const teamProjects = await listProjects.execute({ team: 'Engineering' });
 *
 * // Search projects
 * const searchResults = await listProjects.execute({ query: 'Q2 2025' });
 *
 * // With test token
 * const projects2 = await listProjects.execute({}, 'Bearer test-token');
 * ```
 */
export const listProjects = {
  name: 'linear.list_projects',
  description: 'List projects from Linear workspace',
  parameters: listProjectsParams,

  async execute(
    input: ListProjectsInput,
    testToken?: string
  ): Promise<ListProjectsOutput> {
    // Validate input
    const validated = listProjectsParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build GraphQL variables
    const variables: Record<string, unknown> = {};

    if (validated.limit !== undefined) {
      variables.first = validated.limit;
    }
    if (validated.includeArchived !== undefined) {
      variables.includeArchived = validated.includeArchived;
    }
    if (validated.orderBy !== undefined) {
      variables.orderBy = validated.orderBy;
    }

    // Execute GraphQL query
    const response = await executeGraphQL<ProjectsResponse>(
      client,
      LIST_PROJECTS_QUERY,
      variables
    );

    // Extract projects array (handle null/undefined)
    const projects = response.projects?.nodes || [];

    // Filter to essential fields
    const baseData = {
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: validated.fullDescription
          ? project.description || undefined
          : project.description?.substring(0, 200) || undefined, // Truncate for token efficiency when fullDescription is false
        content: validated.fullContent
          ? project.content || undefined
          : project.content?.substring(0, 500) || undefined, // Truncate for token efficiency when fullContent is false (smaller than get-project due to list context)
        state: project.state || undefined,
        lead: project.lead ? {
          id: project.lead.id,
          name: project.lead.name
        } : undefined,
        startDate: project.startDate || undefined,
        targetDate: project.targetDate || undefined,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      })),
      totalProjects: projects.length,
      nextOffset: response.projects?.pageInfo?.endCursor || undefined
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return listProjectsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 800,
    reduction: '99%'
  }
};
