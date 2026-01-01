/**
 * list_projects - Linear MCP Wrapper
 *
 * List projects from Linear workspace via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800 tokens (project list)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - team: string (optional) - Team name or ID to filter by
 * - state: string (optional) - State name or ID to filter by
 * - query: string (optional) - Search for content in project name
 * - includeArchived: boolean (optional) - Include archived projects
 * - limit: number (optional) - Max projects to return (1-250, default 50)
 * - orderBy: enum (optional) - Sort order: 'createdAt' | 'updatedAt'
 *
 * OUTPUT (after filtering):
 * - projects: array of project objects
 *   - id: string - Project UUID
 *   - name: string - Project display name
 *   - description: string (optional) - Project description (truncated to 200 chars)
 *   - state: object (optional) - Project state
 *   - lead: object (optional) - Project lead user
 *   - startDate: string (optional) - ISO date for project start
 *   - targetDate: string (optional) - ISO date for project deadline
 *   - createdAt: string - ISO timestamp
 *   - updatedAt: string - ISO timestamp
 * - totalProjects: number - Count of returned projects
 * - nextOffset: string (optional) - Pagination cursor
 *
 * Edge cases discovered:
 * - MCP returns array directly, not wrapped in { projects: [...] }
 * - Empty search returns empty array, not error
 * - Description truncated to 200 chars for token efficiency
 *
 * @example
 * ```typescript
 * // List all projects
 * await listProjects.execute({});
 *
 * // Filter by team
 * await listProjects.execute({ team: 'Engineering' });
 *
 * // Search projects
 * await listProjects.execute({ query: 'Q2 2025' });
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
  limit: z.number().min(1).max(250).default(50).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt').optional()
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
    state: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string()
    }).optional(),
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
  nextOffset: z.string().optional()
});

export type ListProjectsOutput = z.infer<typeof listProjectsOutput>;

/**
 * List projects from Linear using MCP wrapper
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
 * ```
 */
export const listProjects = {
  name: 'linear.list_projects',
  description: 'List projects from Linear workspace',
  parameters: listProjectsParams,

  async execute(input: ListProjectsInput): Promise<ListProjectsOutput> {
    // Validate input
    const validated = listProjectsParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'list_projects',
      validated
    );

    // callMCPTool already parses JSON from MCP response
    // Linear returns { content: [{project1}, {project2}, ...] }
    const projects = rawData.content || rawData.projects || (Array.isArray(rawData) ? rawData : []);

    // Filter to essential fields
    const filtered = {
      projects: projects.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description?.substring(0, 200), // Truncate for token efficiency
        state: project.state ? {
          id: project.state.id,
          name: project.state.name,
          type: project.state.type
        } : undefined,
        lead: (project.lead && project.lead.id) ? {
          id: project.lead.id,
          name: project.lead.name
        } : undefined,
        startDate: project.startDate,
        targetDate: project.targetDate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      })),
      totalProjects: projects.length,
      nextOffset: (rawData as any).nextOffset
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
