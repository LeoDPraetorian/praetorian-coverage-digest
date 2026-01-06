/**
 * update_issue - Linear MCP Wrapper
 *
 * Update an existing issue in Linear via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (update response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Issue ID or identifier (e.g., CHARIOT-1234 or UUID)
 * - title: string (optional) - New title for the issue
 * - description: string (optional) - New description in Markdown
 * - assignee: string (optional) - User ID, name, email, or "me"
 * - state: string (optional) - State type, name, or ID
 * - priority: number (optional) - 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
 * - project: string (optional) - Project name or ID
 * - labels: string[] (optional) - Label names or IDs
 * - dueDate: string (optional) - Due date in ISO format
 * - parentId: string (optional) - Parent issue ID for sub-issues
 * - cycle: string (optional) - Cycle (sprint) ID to assign issue to
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful update
 * - issue: object
 *   - id: string - Linear internal UUID
 *   - identifier: string - Human-readable ID (e.g., CHARIOT-1234)
 *   - title: string - Issue title (updated or original)
 *   - url: string - Direct link to the issue
 *
 * Edge cases discovered:
 * - MCP returns the issue directly, not wrapped in {success, issue}
 * - On error, MCP returns a string error message, not an object
 * - Issue ID can be identifier (CHARIOT-1234) or UUID
 * - Assignee "me" resolves to authenticated user
 * - Only provided fields are updated; omitted fields remain unchanged
 * - Invalid issue ID returns descriptive error from Linear API
 *
 * @example
 * ```typescript
 * // Update assignee
 * await updateIssue.execute({
 *   id: 'CHARIOT-1366',
 *   assignee: 'me'
 * });
 *
 * // Update state and priority
 * await updateIssue.execute({
 *   id: 'CHARIOT-1366',
 *   state: 'In Progress',
 *   priority: 1
 * });
 * ```
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Input validation schema
 * Maps to update_issue params
 */
export const updateIssueParams = z.object({
  // ID field - full validation for identifier references
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier'),
  // Title and description are user content - only block control chars
  title: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New title'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('New description (Markdown)'),
  // Reference fields - full validation
  assignee: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID, name, email, or "me"'),
  state: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('State type, name, or ID'),
  priority: z.number().min(0).max(4).optional().describe('0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low'),
  project: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Project name or ID'),
  labels: z.array(z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
  ).optional().describe('Label names or IDs'),
  dueDate: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Due date (ISO format)'),
  parentId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Parent issue ID for sub-issues'),
  cycle: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Cycle (sprint) ID to assign issue to')
});

export type UpdateIssueInput = z.infer<typeof updateIssueParams>;

/**
 * Output schema - minimal essential fields
 */
export const updateIssueOutput = z.object({
  success: z.boolean(),
  issue: z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string()
  })
});

export type UpdateIssueOutput = z.infer<typeof updateIssueOutput>;

/**
 * Update an existing issue in Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { updateIssue } from './.claude/tools/linear';
 *
 * // Update assignee
 * const result = await updateIssue.execute({
 *   id: 'CHARIOT-1366',
 *   assignee: 'me'
 * });
 *
 * // Update state and priority
 * const result2 = await updateIssue.execute({
 *   id: 'CHARIOT-1366',
 *   state: 'In Progress',
 *   priority: 1
 * });
 * ```
 */
export const updateIssue = {
  name: 'linear.update_issue',
  description: 'Update an existing issue in Linear',
  parameters: updateIssueParams,

  async execute(input: UpdateIssueInput): Promise<UpdateIssueOutput> {
    // Validate input
    const validated = updateIssueParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'update_issue',
      validated
    );

    // Linear MCP returns the issue directly, not wrapped in {success, issue}
    // Check if we got an error message instead of an issue
    if (typeof rawData === 'string') {
      throw new Error(`Failed to update issue: ${rawData}`);
    }

    if (!rawData.id) {
      throw new Error('Failed to update issue: No issue ID returned');
    }

    // Filter to essential fields
    const filtered = {
      success: true,
      issue: {
        id: rawData.id,
        identifier: rawData.identifier,
        title: rawData.title,
        url: rawData.url
      }
    };

    // Validate output
    return updateIssueOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
