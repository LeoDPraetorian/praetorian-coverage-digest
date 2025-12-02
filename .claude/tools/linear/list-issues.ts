/**
 * list_issues - Linear MCP Wrapper
 *
 * List issues from Linear workspace with filters via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1000 tokens (filtered response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS (all optional):
 * - assignee: string - User ID, name, email, or "me"
 * - team: string - Team name or ID
 * - state: string - State name or ID
 * - project: string - Project name or ID
 * - label: string - Label name or ID
 * - query: string - Search for content in title or description
 * - limit: number - Number of results (1-250, default 50)
 * - includeArchived: boolean - Include archived issues (default true)
 * - orderBy: 'createdAt' | 'updatedAt' - Sort order (default 'updatedAt')
 *
 * OUTPUT fields per issue:
 * - id: string (required)
 * - identifier: string (optional)
 * - title: string (required)
 * - description: string | null (truncated to 200 chars)
 * - priority: object | null ⚠️ TYPE VARIANCE - object with {name: string, value: number}
 * - state: object | null - {id, name, type}
 * - status: string | null
 * - assignee: string | null - appears as string (assignee name), NOT object
 * - assigneeId: string | null
 * - url: string
 * - createdAt: string
 * - updatedAt: string
 *
 * Edge cases discovered:
 * - MCP returns array directly [issue1, issue2], NOT { issues: [...] }
 * - priority is an OBJECT {name, value}, NOT a number
 * - assignee is a STRING (name only), NOT an object
 * - Empty results returns [], not null
 * - descriptions are truncated to 200 chars for token efficiency
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
 * Maps to list_issues params
 */
export const listIssuesParams = z.object({
  assignee: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID, name, email, or "me"'),
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Team name or ID'),
  state: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('State name or ID'),
  project: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Project name or ID'),
  label: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Label name or ID'),
  query: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Search for content in title or description'),
  limit: z.number().min(1).max(250).default(50).describe('Number of results (max 250)'),
  includeArchived: z.boolean().default(true).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt').optional()
});

export type ListIssuesInput = z.infer<typeof listIssuesParams>;

/**
 * Output schema - minimal essential fields
 *
 * Schema aligned with get-issue.ts based on real API testing:
 * - priority: object {name, value}, NOT number
 * - assignee: string (name only), NOT object
 */
export const listIssuesOutput = z.object({
  issues: z.array(z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    // Priority is an OBJECT with name and value (not a number!)
    priority: z.object({
      name: z.string(),
      value: z.number()
    }).optional(),
    state: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string()
    }).optional(),
    status: z.string().optional(),
    // Assignee is a STRING (name only), not an object - matches get-issue.ts
    assignee: z.string().optional(),
    assigneeId: z.string().optional(),
    url: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })),
  totalIssues: z.number(),
  nextOffset: z.string().optional()
});

export type ListIssuesOutput = z.infer<typeof listIssuesOutput>;

/**
 * List issues from Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { listIssues } from './.claude/tools/linear';
 *
 * // List my issues
 * const myIssues = await listIssues.execute({ assignee: 'me' });
 *
 * // List issues in a team
 * const teamIssues = await listIssues.execute({ team: 'Engineering' });
 *
 * // Search issues
 * const searchResults = await listIssues.execute({ query: 'authentication' });
 * ```
 */
export const listIssues = {
  name: 'linear.list_issues',
  description: 'List issues from Linear with optional filters',
  parameters: listIssuesParams,

  async execute(input: ListIssuesInput): Promise<ListIssuesOutput> {
    // Validate input
    const validated = listIssuesParams.parse(input);

    // Call MCP tool with proper name
    const rawData = await callMCPTool(
      'linear',
      'list_issues',
      validated
    );

    // Handle null/undefined responses gracefully
    if (!rawData) {
      return { issues: [], totalIssues: 0 };
    }

    // Linear MCP returns array directly, not { issues: [...] }
    const issues = Array.isArray(rawData) ? rawData : (rawData.issues || []);

    // Filter to essential fields only
    const filtered = {
      issues: issues.map((issue: any) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description?.substring(0, 200), // Truncate for token efficiency
        // Priority is an object {name, value} - extract correctly
        priority: issue.priority ? {
          name: issue.priority.name,
          value: issue.priority.value
        } : undefined,
        state: issue.state ? {
          id: issue.state.id,
          name: issue.state.name,
          type: issue.state.type
        } : undefined,
        status: issue.status,
        // Assignee is a string (name only) - matches get-issue.ts pattern
        assignee: issue.assignee || undefined,
        assigneeId: issue.assigneeId || undefined,
        url: issue.url,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      })),
      totalIssues: issues.length,
      nextOffset: (rawData as any).nextOffset
    };

    // Validate output
    return listIssuesOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 1000,
    reduction: '99%'
  }
};
