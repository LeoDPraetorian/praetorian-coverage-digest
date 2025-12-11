/**
 * create_issue - Linear MCP Wrapper
 *
 * Create a new issue in Linear via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - title: string (required) - Issue title
 * - description: string (optional) - Issue description in Markdown
 * - team: string (required) - Team name or ID
 * - assignee: string (optional) - User ID, name, email, or "me"
 * - state: string (optional) - State type, name, or ID
 * - priority: number (optional) - 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
 * - project: string (optional) - Project name or ID
 * - labels: string[] (optional) - Label names or IDs
 * - dueDate: string (optional) - Due date in ISO format
 * - parentId: string (optional) - Parent issue ID for sub-issues
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful creation
 * - issue: object
 *   - id: string - Linear internal UUID
 *   - identifier: string - Human-readable ID (e.g., CHARIOT-1234)
 *   - title: string - Issue title as provided
 *   - url: string - Direct link to the issue
 *
 * Edge cases discovered:
 * - MCP returns the issue object directly, not wrapped in {success, issue}
 * - On error, MCP returns a string error message, not an object
 * - Team can be name ("Chariot Team") or UUID
 * - Assignee "me" resolves to authenticated user
 * - Labels must be valid label names or UUIDs
 * - Invalid team/assignee/state throws descriptive errors from Linear API
 *
 * @example
 * ```typescript
 * // Create simple issue
 * await createIssue.execute({
 *   title: 'Fix authentication bug',
 *   team: 'Engineering'
 * });
 *
 * // Create with full details
 * await createIssue.execute({
 *   title: 'Implement new feature',
 *   description: '## Requirements\n- Feature A\n- Feature B',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   priority: 2,
 *   labels: ['feature', 'backend']
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
 * Maps to create_issue params
 */
export const createIssueParams = z.object({
  // Title and description are user content - only block control chars, allow special chars
  title: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Issue title'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('Issue description (Markdown)'),
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Team name or ID'),
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
    .describe('Parent issue ID for sub-issues')
});

export type CreateIssueInput = z.infer<typeof createIssueParams>;

/**
 * Output schema - minimal essential fields
 */
export const createIssueOutput = z.object({
  success: z.boolean(),
  issue: z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string()
  })
});

export type CreateIssueOutput = z.infer<typeof createIssueOutput>;

/**
 * Create a new issue in Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { createIssue } from './.claude/tools/linear';
 *
 * // Create simple issue
 * const result = await createIssue.execute({
 *   title: 'Fix authentication bug',
 *   team: 'Engineering'
 * });
 *
 * // Create with full details
 * const result2 = await createIssue.execute({
 *   title: 'Implement new feature',
 *   description: 'Detailed description...',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   priority: 1,
 *   labels: ['bug', 'high-priority']
 * });
 *
 * console.log(result.issue.url);
 * ```
 */
export const createIssue = {
  name: 'linear.create_issue',
  description: 'Create a new issue in Linear',
  parameters: createIssueParams,

  async execute(input: CreateIssueInput): Promise<CreateIssueOutput> {
    // Validate input
    const validated = createIssueParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'create_issue',
      validated
    );

    // Linear MCP returns the issue directly, not wrapped in {success, issue}
    // Check if we got an error message instead of an issue
    if (typeof rawData === 'string') {
      throw new Error(`Failed to create issue: ${rawData}`);
    }

    if (!rawData.id) {
      throw new Error('Failed to create issue: No issue ID returned');
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
    return createIssueOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
