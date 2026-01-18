/**
 * unsubscribe_from_issue - Linear GraphQL Wrapper
 *
 * Unsubscribe current user (or specific user) from issue notifications
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue ID to unsubscribe from
 * - userId: string (optional) - User ID to unsubscribe (defaults to current user)
 *
 * OUTPUT (after filtering):
 * - success: boolean
 * - issue: object with id, identifier
 *
 * Edge cases discovered:
 * - If userId not provided, unsubscribes current authenticated user
 * - Unsubscribing when not subscribed succeeds without error
 *
 * @example
 * ```typescript
 * // Unsubscribe current user
 * await unsubscribeFromIssue.execute({ issueId: 'issue-uuid' });
 *
 * // Unsubscribe specific user
 * await unsubscribeFromIssue.execute({
 *   issueId: 'issue-uuid',
 *   userId: 'user-uuid'
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

const UNSUBSCRIBE_FROM_ISSUE_MUTATION = `
  mutation IssueUnsubscribe($issueId: String!, $userId: String) {
    issueUnsubscribe(id: $issueId, userId: $userId) {
      success
      issue {
        id
        identifier
      }
    }
  }
`;

export const unsubscribeFromIssueParams = z.object({
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID to unsubscribe from'),
  userId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID to unsubscribe (defaults to current user)')
});

export type UnsubscribeFromIssueInput = z.infer<typeof unsubscribeFromIssueParams>;

export const unsubscribeFromIssueOutput = z.object({
  success: z.boolean(),
  issue: z.object({
    id: z.string(),
    identifier: z.string()
  }),
  estimatedTokens: z.number()
});

export type UnsubscribeFromIssueOutput = z.infer<typeof unsubscribeFromIssueOutput>;

interface IssueUnsubscribeResponse {
  issueUnsubscribe: {
    success: boolean;
    issue?: {
      id: string;
      identifier: string;
    };
  };
}

export const unsubscribeFromIssue = {
  name: 'linear.unsubscribe_from_issue',
  description: 'Unsubscribe from issue notifications in Linear',
  parameters: unsubscribeFromIssueParams,

  async execute(
    input: UnsubscribeFromIssueInput,
    testToken?: string
  ): Promise<UnsubscribeFromIssueOutput> {
    const validated = unsubscribeFromIssueParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<IssueUnsubscribeResponse>(
      client,
      UNSUBSCRIBE_FROM_ISSUE_MUTATION,
      {
        issueId: validated.issueId,
        userId: validated.userId
      }
    );

    if (!response.issueUnsubscribe?.success || !response.issueUnsubscribe?.issue) {
      throw new Error('Failed to unsubscribe from issue');
    }

    const issue = response.issueUnsubscribe.issue;
    const baseData = {
      success: response.issueUnsubscribe.success,
      issue: {
        id: issue.id,
        identifier: issue.identifier
      }
    };

    return unsubscribeFromIssueOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 50,
    reduction: '99%'
  }
};
