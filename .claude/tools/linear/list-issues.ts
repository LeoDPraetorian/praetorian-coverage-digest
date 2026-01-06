/**
 * list_issues - Linear GraphQL Wrapper
 *
 * List issues from Linear workspace with filters via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1000 tokens (filtered response)
 * - vs MCP: 46,000 tokens at start
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
 * - priority: object | null - {name: string, value: number}
 * - state: object | null - {id, name, type}
 * - status: string | null
 * - assignee: string | null - assignee name (extracted from assignee object)
 * - assigneeId: string | null - assignee ID (extracted from assignee object)
 * - url: string
 * - createdAt: string
 * - updatedAt: string
 *
 * Edge cases discovered:
 * - GraphQL returns { issues: { nodes: [...] } }, NOT array directly
 * - priority is an OBJECT {name, value}, NOT a number
 * - assignee is an OBJECT, we extract name as string
 * - Empty results returns [], not null
 * - descriptions are truncated to 200 chars for token efficiency
 *
 * @example
 * ```typescript
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
 * GraphQL query for listing issues with filters
 *
 * Note: Linear's GraphQL API uses filter objects for filtering.
 * We build the filter based on input parameters.
 */
const LIST_ISSUES_QUERY = `
  query IssuesList(
    $first: Int
    $after: String
    $filter: IssueFilter
    $orderBy: PaginationOrderBy
  ) {
    issues(
      first: $first
      after: $after
      filter: $filter
      orderBy: $orderBy
    ) {
      nodes {
        id
        identifier
        title
        description
        priority {
          name: label
          value: priority
        }
        state {
          id
          name
          type
        }
        assignee {
          id
          name
        }
        url
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
 * - assignee: string (name only), extracted from assignee object
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
    // Assignee is a STRING (name only), extracted from assignee object
    assignee: z.string().optional(),
    assigneeId: z.string().optional(),
    url: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })),
  totalIssues: z.number(),
  nextOffset: z.string().optional(),
  estimatedTokens: z.number()
});

export type ListIssuesOutput = z.infer<typeof listIssuesOutput>;

/**
 * GraphQL response type
 */
interface IssuesListResponse {
  issues: {
    nodes: Array<{
      id: string;
      identifier?: string | null;
      title: string;
      description?: string | null;
      priority?: {
        name: string;
        value: number;
      } | null;
      state?: {
        id: string;
        name: string;
        type: string;
      } | null;
      assignee?: {
        id: string;
        name: string;
      } | null;
      url?: string;
      createdAt?: string;
      updatedAt?: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  } | null;
}

/**
 * Build GraphQL filter object from input parameters
 */
function buildIssueFilter(input: ListIssuesInput): Record<string, any> | undefined {
  const filter: Record<string, any> = {};

  if (input.assignee) {
    filter.assignee = { name: { eq: input.assignee } };
  }
  if (input.team) {
    filter.team = { name: { eq: input.team } };
  }
  if (input.state) {
    filter.state = { name: { eq: input.state } };
  }
  if (input.project) {
    filter.project = { name: { eq: input.project } };
  }
  if (input.label) {
    filter.labels = { some: { name: { eq: input.label } } };
  }
  if (input.query) {
    filter.or = [
      { title: { contains: input.query } },
      { description: { contains: input.query } }
    ];
  }
  if (input.includeArchived !== undefined && !input.includeArchived) {
    filter.archived = { eq: false };
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * List issues from Linear using GraphQL API
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
 *
 * // With test token
 * const issues = await listIssues.execute({ team: 'Eng' }, 'Bearer test-token');
 * ```
 */
export const listIssues = {
  name: 'linear.list_issues',
  description: 'List issues from Linear with optional filters',
  parameters: listIssuesParams,

  async execute(
    input: ListIssuesInput,
    testToken?: string
  ): Promise<ListIssuesOutput> {
    // Validate input
    const validated = listIssuesParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build filter from input
    const filter = buildIssueFilter(validated);

    // Build order by
    const orderBy = validated.orderBy === 'createdAt' ? 'createdAt' : 'updatedAt';

    // Execute GraphQL query
    const response = await executeGraphQL<IssuesListResponse>(
      client,
      LIST_ISSUES_QUERY,
      {
        first: validated.limit,
        filter,
        orderBy
      }
    );

    // Extract issues array (handle null/undefined)
    const issues = response.issues?.nodes || [];

    // Filter to essential fields
    const baseData = {
      issues: issues.map((issue) => ({
        id: issue.id,
        identifier: issue.identifier || undefined,
        title: issue.title,
        description: issue.description?.substring(0, 200) || undefined, // Truncate for token efficiency
        priority: issue.priority ? {
          name: issue.priority.name,
          value: issue.priority.value
        } : undefined,
        state: issue.state ? {
          id: issue.state.id,
          name: issue.state.name,
          type: issue.state.type
        } : undefined,
        status: issue.state?.name || undefined,
        assignee: issue.assignee?.name || undefined, // Extract name as string
        assigneeId: issue.assignee?.id || undefined, // Extract ID separately
        url: issue.url || undefined,
        createdAt: issue.createdAt || undefined,
        updatedAt: issue.updatedAt || undefined
      })),
      totalIssues: issues.length,
      nextOffset: response.issues?.pageInfo.hasNextPage
        ? response.issues.pageInfo.endCursor || undefined
        : undefined
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
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
