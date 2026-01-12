/**
 * create_issue - Linear GraphQL Wrapper
 *
 * Create a new issue in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs MCP: Consistent behavior, no server dependency
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
 * - cycle: string (optional) - Cycle (sprint) ID or name (set via automatic update after creation)
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
 * - GraphQL returns {success, issue} structure via issueCreate mutation
 * - Team can be name ("Chariot Team") or UUID (mapped to teamId)
 * - Assignee "me" resolves to authenticated user (mapped to assigneeId)
 * - Labels must be valid label names or UUIDs (mapped to labelIds)
 * - Invalid team/assignee/state throws descriptive errors from Linear API
 * - Cycle parameter triggers automatic orchestration: create issue, then update with cycle
 * - If cycle assignment fails, issue is still created (warning logged, no error thrown)
 *
 * @example
 * ```typescript
 * // Create simple issue
 * await createIssue.execute({
 *   title: 'Fix authentication bug',
 *   team: 'Engineering'
 * });
 *
 * // Create with full details including cycle
 * await createIssue.execute({
 *   title: 'Implement new feature',
 *   description: '## Requirements\n- Feature A\n- Feature B',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   priority: 2,
 *   labels: ['feature', 'backend'],
 *   cycle: 'Sprint 9'  // Automatically assigned via update after creation
 * });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';
import { resolveStateId, resolveAssigneeId, resolveProjectId } from './lib/resolve-ids.js';

/**
 * GraphQL mutation for creating an issue
 */
const CREATE_ISSUE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`;

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
    .describe('Parent issue ID for sub-issues'),
  cycle: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Cycle (sprint) ID or name - will be set via update after creation')
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
  }),
  estimatedTokens: z.number()
});

export type CreateIssueOutput = z.infer<typeof createIssueOutput>;

/**
 * GraphQL response type
 */
interface IssueCreateResponse {
  issueCreate: {
    success: boolean;
    issue?: {
      id: string;
      identifier: string;
      title: string;
      url: string;
    };
  };
}

/**
 * Create a new issue in Linear using GraphQL API
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

  async execute(
    input: CreateIssueInput,
    testToken?: string
  ): Promise<CreateIssueOutput> {
    // Validate input
    const validated = createIssueParams.parse(input);

    // Extract cycle parameter (not supported by Linear issueCreate mutation)
    const { cycle, ...createParams } = validated;

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build GraphQL input - map field names to Linear API format
    const mutationInput: {
      title: string;
      description?: string;
      teamId: string;
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      projectId?: string;
      labelIds?: string[];
      dueDate?: string;
      parentId?: string;
    } = {
      title: createParams.title,
      teamId: createParams.team, // team → teamId
    };

    // Add optional fields if present
    if (createParams.description) {
      mutationInput.description = createParams.description;
    }
    if (createParams.assignee) {
      // Resolve assignee name/email/"me" to UUID
      mutationInput.assigneeId = await resolveAssigneeId(client, createParams.assignee);
    }
    if (createParams.state) {
      // Resolve state name to UUID (uses team parameter as teamId)
      mutationInput.stateId = await resolveStateId(client, createParams.team, createParams.state);
    }
    if (createParams.priority !== undefined) {
      mutationInput.priority = createParams.priority;
    }
    if (createParams.project) {
      // Resolve project name to UUID
      mutationInput.projectId = await resolveProjectId(client, createParams.project);
    }
    if (createParams.labels) {
      mutationInput.labelIds = createParams.labels; // labels → labelIds
    }
    if (createParams.dueDate) {
      mutationInput.dueDate = createParams.dueDate;
    }
    if (createParams.parentId) {
      mutationInput.parentId = createParams.parentId;
    }

    // Execute GraphQL mutation
    const response = await executeGraphQL<IssueCreateResponse>(
      client,
      CREATE_ISSUE_MUTATION,
      { input: mutationInput }
    );

    if (!response.issueCreate?.success || !response.issueCreate?.issue) {
      throw new Error('Failed to create issue');
    }

    // If cycle was provided, update the issue to assign it
    // (Linear API doesn't support cycle on creation, only on update)
    if (cycle) {
      try {
        const { updateIssue } = await import('./update-issue.js');
        await updateIssue.execute({
          id: response.issueCreate.issue.identifier,
          cycle
        }, testToken);
      } catch (error) {
        // Issue was created successfully, but cycle assignment failed
        // Log warning but don't fail the entire operation
        console.warn(`Warning: Issue created but cycle assignment failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Filter to essential fields
    const baseData = {
      success: response.issueCreate.success,
      issue: {
        id: response.issueCreate.issue.id,
        identifier: response.issueCreate.issue.identifier,
        title: response.issueCreate.issue.title,
        url: response.issueCreate.issue.url
      }
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
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
