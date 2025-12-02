/**
 * get_issue - Linear MCP Wrapper
 *
 * Get detailed information about a specific issue via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (single issue)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT-1516):
 *
 * REQUIRED fields (100% presence):
 * - id: string
 * - identifier: string
 * - title: string
 *
 * OPTIONAL fields (<100% presence):
 * - description: string | null
 * - priority: object | null ⚠️ TYPE VARIANCE - object with {name: string, value: number}
 * - priorityLabel: string | null (deprecated - use priority.name)
 * - estimate: object | null - object with {name: string, value: number}
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
 * - priority is an OBJECT {name, value}, NOT a number
 * - assignee can be null (unassigned issues)
 * - state can be undefined (some workflow states)
 * - Empty attachments returns empty array, not null
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
    .describe('Issue ID or identifier (e.g., CHARIOT-1366 or UUID)')
});

export type GetIssueInput = z.infer<typeof getIssueParams>;

/**
 * Output schema - minimal essential fields
 * Fixed based on schema discovery from CHARIOT-1516
 */
export const getIssueOutput = z.object({
  // Required fields
  id: z.string(),
  identifier: z.string(),
  title: z.string(),

  // Optional fields with correct types
  description: z.string().optional(),

  // Priority is an OBJECT, not a number
  priority: z.object({
    name: z.string(),
    value: z.number()
  }).optional(),

  priorityLabel: z.string().optional(),

  // Estimate follows same pattern as priority
  estimate: z.object({
    name: z.string(),
    value: z.number()
  }).optional(),

  state: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
  }).optional(),

  // Assignee is a STRING (name), not an object
  assignee: z.string().optional(),
  assigneeId: z.string().optional(),

  url: z.string().optional(),
  branchName: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),

  attachments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    url: z.string()
  })).optional()
});

export type GetIssueOutput = z.infer<typeof getIssueOutput>;

/**
 * Get a Linear issue by ID or identifier using MCP wrapper
 *
 * @example
 * ```typescript
 * import { getIssue } from './.claude/tools/linear';
 *
 * // Get by identifier
 * const issue = await getIssue.execute({ id: 'CHARIOT-1366' });
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

  async execute(input: GetIssueInput): Promise<GetIssueOutput> {
    // Validate input
    const validated = getIssueParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'get_issue',
      validated
    );

    if (!rawData) {
      throw new Error(`Issue not found: ${validated.id}`);
    }

    // Filter to essential fields with correct types
    const filtered = {
      id: rawData.id,
      identifier: rawData.identifier,
      title: rawData.title,
      description: rawData.description?.substring(0, 500), // Truncate for token efficiency

      // Priority is an object with name and value
      priority: rawData.priority ? {
        name: rawData.priority.name,
        value: rawData.priority.value
      } : undefined,

      priorityLabel: rawData.priorityLabel,

      // Estimate follows same pattern as priority
      estimate: rawData.estimate ? {
        name: rawData.estimate.name,
        value: rawData.estimate.value
      } : undefined,

      state: rawData.state ? {
        id: rawData.state.id,
        name: rawData.state.name,
        type: rawData.state.type
      } : undefined,

      // Assignee is a string (name), not an object
      assignee: rawData.assignee || undefined,
      assigneeId: rawData.assigneeId || undefined,

      url: rawData.url,
      branchName: rawData.gitBranchName || rawData.branchName, // API uses gitBranchName
      createdAt: rawData.createdAt,
      updatedAt: rawData.updatedAt,

      attachments: rawData.attachments?.map((a: any) => ({
        id: a.id,
        title: a.title,
        url: a.url
      }))
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
