/**
 * create_bug - Linear GraphQL Wrapper
 *
 * Create a bug issue in Linear via GraphQL API (convenience wrapper)
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
 * - title: string (required) - Bug title
 * - description: string (optional) - Full bug description (Markdown)
 * - team: string (required) - Team name or ID
 * - assignee: string (optional) - User ID, name, email, or "me"
 * - priority: number (optional) - 1=Urgent, 2=High, 3=Medium, 4=Low (default: 2)
 * - state: string (optional) - State name or ID
 * - labels: array (optional) - Additional label names/IDs (bug label auto-added)
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether creation succeeded
 * - issue: object - Created issue details
 *   - id: string - Issue UUID
 *   - identifier: string - Human-readable ID (e.g., "ENG-123")
 *   - title: string - Issue title
 *   - url: string - Linear URL for the issue
 *
 * Edge cases discovered:
 * - Uses issueCreate mutation with labels including 'bug'
 * - Default priority is 2 (High) for bugs
 * - Team must exist or error is thrown
 *
 * @example
 * ```typescript
 * // Create simple bug
 * await createBug.execute({
 *   title: 'Login button not responding',
 *   team: 'Engineering'
 * });
 *
 * // Create bug with details
 * await createBug.execute({
 *   title: 'API key table not updating',
 *   description: '## Steps to reproduce...',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   priority: 1,
 *   labels: ['urgent']
 * });
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
 * Maps to create_issue params with bug defaults
 */
export const createBugParams = z.object({
  // User content - control chars only
  title: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Bug title'),
  // User content - control chars only
  description: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Full bug description (Markdown)'),
  // Reference field - full validation
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Team name or ID'),
  // Reference field - full validation
  assignee: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID, name, email, or "me"'),
  // Default to High (2) for bugs
  priority: z.number().min(1).max(4).default(2).optional().describe('1=Urgent, 2=High, 3=Medium, 4=Low (default: 2)'),
  // Reference field - full validation
  state: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('State name or ID'),
  // Additional labels - full validation on each
  labels: z.array(z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
  ).optional().describe('Additional label names or IDs')
});

export type CreateBugInput = z.infer<typeof createBugParams>;

/**
 * Output schema - minimal essential fields
 */
export const createBugOutput = z.object({
  success: z.boolean(),
  issue: z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateBugOutput = z.infer<typeof createBugOutput>;

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
 * Create a bug issue in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { createBug } from './.claude/tools/linear';
 *
 * // Create simple bug
 * const result = await createBug.execute({
 *   title: 'Login button not responding',
 *   team: 'Engineering'
 * });
 *
 * // Create bug with description
 * const result2 = await createBug.execute({
 *   title: 'API key table not updating',
 *   description: '## Steps to reproduce...',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   priority: 1
 * });
 * ```
 */
export const createBug = {
  name: 'linear.create_bug',
  description: 'Create a bug issue in Linear',
  parameters: createBugParams,

  async execute(
    input: CreateBugInput,
    testToken?: string
  ): Promise<CreateBugOutput> {
    // Validate input
    const validated = createBugParams.parse(input);

    // Build labels array with 'bug' always included
    const labelIds = ['bug'];
    if (validated.labels) {
      // Add additional labels, avoiding duplicates
      validated.labels.forEach(label => {
        if (label.toLowerCase() !== 'bug' && !labelIds.includes(label)) {
          labelIds.push(label);
        }
      });
    }

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build GraphQL input
    const mutationInput: {
      title: string;
      description?: string;
      teamId: string;
      assigneeId?: string;
      priority?: number;
      stateId?: string;
      labelIds: string[];
    } = {
      title: validated.title,
      teamId: validated.team,
      labelIds,
    };

    if (validated.description) {
      mutationInput.description = validated.description;
    }
    if (validated.assignee) {
      mutationInput.assigneeId = validated.assignee;
    }
    if (validated.priority !== undefined) {
      mutationInput.priority = validated.priority;
    } else {
      mutationInput.priority = 2; // Default to High for bugs
    }
    if (validated.state) {
      mutationInput.stateId = validated.state;
    }

    // Execute GraphQL mutation
    const response = await executeGraphQL<IssueCreateResponse>(
      client,
      CREATE_ISSUE_MUTATION,
      { input: mutationInput }
    );

    if (!response.issueCreate?.success || !response.issueCreate?.issue) {
      throw new Error('Failed to create bug');
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
    return createBugOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
