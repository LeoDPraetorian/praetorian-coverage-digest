/**
 * unarchive_issue - Linear GraphQL Wrapper
 *
 * Unarchive an issue in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (unarchive response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Issue ID or identifier (e.g., ENG-1234 or UUID)
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether the unarchive operation succeeded
 * - entity: object - The unarchived issue entity
 *   - id: string - Linear internal UUID
 *   - identifier: string - Human-readable ID (e.g., ENG-1234)
 *   - archivedAt: null - Timestamp (null when unarchived)
 * - estimatedTokens: number - Token usage estimate
 *
 * Edge cases discovered:
 * - GraphQL returns {success, entity} structure via issueUnarchive mutation
 * - Issue ID can be identifier (ENG-1234) or UUID
 * - Invalid issue ID returns descriptive error from Linear API
 * - Unarchiving a non-archived issue is idempotent (succeeds)
 * - archivedAt field becomes null when issue is unarchived
 *
 * @example
 * ```typescript
 * // Unarchive by identifier
 * await unarchiveIssue.execute({ id: 'ENG-1366' });
 *
 * // Unarchive by UUID
 * await unarchiveIssue.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });
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

/**
 * Input validation schema
 * Maps to unarchive_issue params
 */
export const unarchiveIssueParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier'),
});

export type UnarchiveIssueInput = z.infer<typeof unarchiveIssueParams>;

/**
 * Output validation schema
 */
export const unarchiveIssueOutput = z.object({
  success: z.boolean(),
  entity: z.object({
    id: z.string(),
    identifier: z.string(),
    archivedAt: z.string().nullable(),
  }),
  estimatedTokens: z.number(),
});

export type UnarchiveIssueOutput = z.infer<typeof unarchiveIssueOutput>;

/**
 * GraphQL mutation for unarchiving an issue
 */
const UNARCHIVE_ISSUE_MUTATION = `
  mutation IssueUnarchive($id: String!) {
    issueUnarchive(id: $id) {
      success
      entity {
        id
        identifier
        archivedAt
      }
    }
  }
`;

/**
 * GraphQL response type
 */
interface IssueUnarchiveResponse {
  issueUnarchive: {
    success: boolean;
    entity?: {
      id: string;
      identifier: string;
      archivedAt: string | null;
    };
  };
}

/**
 * Unarchive an issue in Linear
 */
export const unarchiveIssue = {
  name: 'linear.unarchive_issue',
  description: 'Unarchive an issue in Linear',
  parameters: unarchiveIssueParams,

  async execute(
    input: UnarchiveIssueInput,
    testToken?: string
  ): Promise<UnarchiveIssueOutput> {
    const validated = unarchiveIssueParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<IssueUnarchiveResponse>(
      client,
      UNARCHIVE_ISSUE_MUTATION,
      { id: validated.id }
    );

    if (!response.issueUnarchive?.success || !response.issueUnarchive?.entity) {
      throw new Error('Failed to unarchive issue');
    }

    const baseData = {
      success: response.issueUnarchive.success,
      entity: {
        id: response.issueUnarchive.entity.id,
        identifier: response.issueUnarchive.entity.identifier,
        archivedAt: response.issueUnarchive.entity.archivedAt,
      },
    };

    return unarchiveIssueOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData),
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '99%',
  },
};
