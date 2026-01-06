/**
 * create_jira_bug - Linear GraphQL Wrapper
 *
 * Create a Jira integration bug issue in Linear via GraphQL API
 * Convenience wrapper for reporting Jira sync/push failures
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - title: string (required) - Bug title (defaults to Jira-specific prefix)
 * - description: string (optional) - Full bug description (Markdown)
 * - team: string (required) - Team name or ID
 * - assignee: string (optional) - User ID, name, email, or "me"
 * - priority: number (optional) - 1=Urgent, 2=High, 3=Medium, 4=Low (default: 1 for Jira bugs)
 * - cycle: string (optional) - Cycle ID to add issue to
 * - errorCode: number (optional) - HTTP error code from Jira API
 * - errorMessage: string (optional) - Error message from Jira
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
 * - Uses issueCreate mutation with labels ['bug', 'jira', 'integration']
 * - Default priority is 1 (Urgent) for Jira integration bugs
 * - Auto-generates description template if not provided
 *
 * @example
 * ```typescript
 * // Create simple Jira bug
 * await createJiraBug.execute({
 *   title: 'Jira sync failing',
 *   team: 'Engineering'
 * });
 *
 * // Create detailed Jira bug with error info
 * await createJiraBug.execute({
 *   title: 'Push to Jira fails with status 400',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   errorCode: 400,
 *   errorMessage: 'Bad Request - Invalid field mapping'
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
 * Maps to create_issue params with Jira bug defaults
 */
export const createJiraBugParams = z.object({
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
  // Default to Urgent (1) for Jira integration bugs
  priority: z.number().min(1).max(4).default(1).optional().describe('1=Urgent, 2=High, 3=Medium, 4=Low (default: 1)'),
  // Reference field - full validation
  cycle: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Cycle ID to add issue to'),
  // Error details for Jira bugs
  errorCode: z.number().optional().describe('HTTP error code from Jira API'),
  // User content - control chars only
  errorMessage: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Error message from Jira'),
});

export type CreateJiraBugInput = z.infer<typeof createJiraBugParams>;

/**
 * Output schema - minimal essential fields
 */
export const createJiraBugOutput = z.object({
  success: z.boolean(),
  issue: z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateJiraBugOutput = z.infer<typeof createJiraBugOutput>;

/**
 * Generate default description for Jira integration bugs
 */
function generateJiraDescription(input: CreateJiraBugInput): string {
  const sections = ['## Bug Description', 'Jira integration issue encountered.'];

  if (input.errorCode) {
    sections.push(`\n## Error Code\nHTTP ${input.errorCode}`);
  }

  if (input.errorMessage) {
    sections.push(`\n## Error Message\n${input.errorMessage}`);
  }

  sections.push('\n## Expected Behavior');
  sections.push('Jira integration should sync/push issues successfully.');

  sections.push('\n## Impact');
  sections.push('Users cannot sync issues to Jira, blocking workflow integration.');

  return sections.join('\n');
}

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
    } | null;
  };
}

/**
 * Create a Jira integration bug issue in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { createJiraBug } from './.claude/tools/linear';
 *
 * // Create simple Jira bug
 * const result = await createJiraBug.execute({
 *   title: 'Jira sync failing',
 *   team: 'Engineering'
 * });
 *
 * // Create bug with error details
 * const result2 = await createJiraBug.execute({
 *   title: 'Push to Jira fails with status 400',
 *   team: 'Engineering',
 *   assignee: 'me',
 *   errorCode: 400,
 *   errorMessage: 'Bad Request'
 * });
 * ```
 */
export const createJiraBug = {
  name: 'linear.create_jira_bug',
  description: 'Create a Jira integration bug issue in Linear',
  parameters: createJiraBugParams,

  async execute(
    input: CreateJiraBugInput,
    testToken?: string
  ): Promise<CreateJiraBugOutput> {
    // Validate input
    const validated = createJiraBugParams.parse(input);

    // Generate description if not provided
    const description = validated.description || generateJiraDescription(validated);

    // Jira-specific labels
    const labelNames = ['bug', 'jira', 'integration'];

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build GraphQL input
    const issueInput: Record<string, unknown> = {
      title: validated.title,
      description,
      teamId: validated.team,
      priority: validated.priority ?? 1,
      labelNames,
    };

    // Add optional fields
    if (validated.assignee) {
      issueInput.assigneeId = validated.assignee;
    }
    if (validated.cycle) {
      issueInput.cycleId = validated.cycle;
    }

    // Execute GraphQL mutation
    const response = await executeGraphQL<IssueCreateResponse>(
      client,
      CREATE_ISSUE_MUTATION,
      { input: issueInput }
    );

    if (!response.issueCreate.success || !response.issueCreate.issue) {
      throw new Error('Failed to create Jira bug');
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
    return createJiraBugOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
