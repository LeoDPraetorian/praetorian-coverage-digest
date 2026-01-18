/**
 * subscribe_to_issue - Linear GraphQL Wrapper
 *
 * Subscribe current user (or specific user) to issue notifications
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~100 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue ID to subscribe to
 * - userId: string (optional) - User ID to subscribe (defaults to current user)
 *
 * OUTPUT (after filtering):
 * - success: boolean
 * - issue: object with id, identifier, subscribers array
 *   - subscribers: array of { id, name }
 *
 * Edge cases discovered:
 * - If userId not provided, subscribes current authenticated user
 * - Duplicate subscription attempts succeed but don't add duplicate subscribers
 *
 * @example
 * ```typescript
 * // Subscribe current user
 * await subscribeToIssue.execute({ issueId: 'issue-uuid' });
 *
 * // Subscribe specific user
 * await subscribeToIssue.execute({
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

const SUBSCRIBE_TO_ISSUE_MUTATION = `
  mutation IssueSubscribe($issueId: String!, $userId: String) {
    issueSubscribe(id: $issueId, userId: $userId) {
      success
      issue {
        id
        identifier
        subscribers {
          nodes {
            id
            name
          }
        }
      }
    }
  }
`;

export const subscribeToIssueParams = z.object({
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID to subscribe to'),
  userId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID to subscribe (defaults to current user)')
});

export type SubscribeToIssueInput = z.infer<typeof subscribeToIssueParams>;

export const subscribeToIssueOutput = z.object({
  success: z.boolean(),
  issue: z.object({
    id: z.string(),
    identifier: z.string(),
    subscribers: z.array(z.object({
      id: z.string(),
      name: z.string()
    }))
  }),
  estimatedTokens: z.number()
});

export type SubscribeToIssueOutput = z.infer<typeof subscribeToIssueOutput>;

interface IssueSubscribeResponse {
  issueSubscribe: {
    success: boolean;
    issue?: {
      id: string;
      identifier: string;
      subscribers: {
        nodes: Array<{
          id: string;
          name: string;
        }>;
      };
    };
  };
}

export const subscribeToIssue = {
  name: 'linear.subscribe_to_issue',
  description: 'Subscribe to issue notifications in Linear',
  parameters: subscribeToIssueParams,

  async execute(
    input: SubscribeToIssueInput,
    testToken?: string
  ): Promise<SubscribeToIssueOutput> {
    const validated = subscribeToIssueParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<IssueSubscribeResponse>(
      client,
      SUBSCRIBE_TO_ISSUE_MUTATION,
      {
        issueId: validated.issueId,
        userId: validated.userId
      }
    );

    if (!response.issueSubscribe?.success || !response.issueSubscribe?.issue) {
      throw new Error('Failed to subscribe to issue');
    }

    const issue = response.issueSubscribe.issue;
    const baseData = {
      success: response.issueSubscribe.success,
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        subscribers: issue.subscribers.nodes.map(sub => ({
          id: sub.id,
          name: sub.name
        }))
      }
    };

    return subscribeToIssueOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 100,
    reduction: '99%'
  }
};
