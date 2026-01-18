/**
 * get_issue - Linear GraphQL Wrapper
 *
 * Get detailed information about a specific issue via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (single issue)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with ENG-1516):
 *
 * REQUIRED fields (100% presence):
 * - id: string
 * - identifier: string
 * - title: string
 *
 * OPTIONAL fields (<100% presence):
 * - description: string | null
 * - priority: number | null - 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
 * - priorityLabel: string | null - String label ("Urgent", "High", "Normal", "Low")
 * - estimate: number | null - Story points estimate
 * - state: object | null
 * - assignee: string | null - appears as string (assignee name)
 * - assigneeId: string | null
 * - url: string
 * - branchName: string (gitBranchName in API)
 * - createdAt: string
 * - updatedAt: string
 * - attachments: array
 *
 * Edge cases discovered:
 * - priority is a NUMBER (0-4), priorityLabel is the string version
 * - assignee can be null (unassigned issues)
 * - state can be undefined (some workflow states)
 * - Empty attachments returns empty array, not null
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
 * GraphQL query for getting an issue
 */
const GET_ISSUE_QUERY = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      priority
      priorityLabel
      estimate
      state {
        id
        name
        type
      }
      assignee {
        id
        name
        email
      }
      url
      branchName
      createdAt
      updatedAt
      attachments {
        nodes {
          id
          title
          url
        }
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to get_issue params
 *
 * Security: Uses individual validators for specific attack detection
 */
export const getIssueParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier (e.g., ENG-1366 or UUID)')
});

export type GetIssueInput = z.infer<typeof getIssueParams>;

/**
 * Output schema - minimal essential fields
 * Fixed based on schema discovery from ENG-1516
 */
export const getIssueOutput = z.object({
  // Required fields
  id: z.string(),
  identifier: z.string(),
  title: z.string(),

  // Optional fields with correct types
  description: z.string().optional(),

  // Priority is a number (0-4): 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
  priority: z.number().nullable().optional(),

  // priorityLabel is the string version ("Urgent", "High", etc.)
  priorityLabel: z.string().optional(),

  // Estimate is a number (story points)
  estimate: z.number().nullable().optional(),

  state: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
  }).optional(),

  // Assignee is returned as object with id, name, email
  assignee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }).nullable().optional(),

  url: z.string().optional(),
  branchName: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),

  attachments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    url: z.string()
  })).optional(),

  estimatedTokens: z.number()
});

export type GetIssueOutput = z.infer<typeof getIssueOutput>;

/**
 * GraphQL response type
 */
interface IssueResponse {
  issue: {
    id: string;
    identifier: string;
    title: string;
    description?: string | null;
    priority?: number | null;
    priorityLabel?: string | null;
    estimate?: number | null;
    state?: {
      id: string;
      name: string;
      type: string;
    } | null;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
    assigneeId?: string | null;
    url?: string;
    branchName?: string;
    createdAt?: string;
    updatedAt?: string;
    attachments?: {
      nodes: Array<{
        id: string;
        title: string;
        url: string;
      }>;
    };
  } | null;
}

/**
 * Get a Linear issue by ID or identifier using GraphQL API
 *
 * @example
 * ```typescript
 * import { getIssue } from './.claude/tools/linear';
 *
 * // Get by identifier
 * const issue = await getIssue.execute({ id: 'ENG-1366' });
 *
 * // Get by UUID
 * const issue2 = await getIssue.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });
 *
 * console.log(issue.title, issue.state.name, issue.branchName);
 * ```
 */
export const getIssue = {
  name: 'linear.get_issue',
  description: 'Get detailed information about a specific Linear issue',
  parameters: getIssueParams,

  async execute(
    input: GetIssueInput,
    testToken?: string
  ): Promise<GetIssueOutput> {
    // Validate input
    const validated = getIssueParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<IssueResponse>(
      client,
      GET_ISSUE_QUERY,
      { id: validated.id }
    );

    if (!response.issue) {
      throw new Error(`Issue not found: ${validated.id}`);
    }

    // Filter to essential fields with correct types
    const baseData = {
      id: response.issue.id,
      identifier: response.issue.identifier,
      title: response.issue.title,
      description: response.issue.description?.substring(0, 500), // Truncate for token efficiency

      // Priority is a number (not object)
      priority: response.issue.priority ?? undefined,

      priorityLabel: response.issue.priorityLabel || undefined,

      // Estimate is a number (not object)
      estimate: response.issue.estimate ?? undefined,

      state: (response.issue.state && response.issue.state.id) ? {
        id: response.issue.state.id,
        name: response.issue.state.name,
        type: response.issue.state.type
      } : undefined,

      // Assignee is an object with id, name, email
      assignee: response.issue.assignee || undefined,

      url: response.issue.url,
      branchName: response.issue.branchName,
      createdAt: response.issue.createdAt,
      updatedAt: response.issue.updatedAt,

      attachments: response.issue.attachments?.nodes?.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url
      }))
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return getIssueOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
