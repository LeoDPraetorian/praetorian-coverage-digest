/**
 * archive_issue - Linear GraphQL Wrapper
 *
 * Archive an issue in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (archive response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Issue ID or identifier (e.g., ENG-1234 or UUID)
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether the archive operation succeeded
 * - entity: object - The archived issue entity
 *   - id: string - Linear internal UUID
 *   - identifier: string - Human-readable ID (e.g., ENG-1234)
 *   - archivedAt: string - ISO timestamp when issue was archived
 * - estimatedTokens: number - Token usage estimate
 *
 * Edge cases discovered:
 * - GraphQL returns {success, entity} structure via issueArchive mutation
 * - Issue ID can be identifier (ENG-1234) or UUID
 * - Invalid issue ID returns descriptive error from Linear API
 * - Archiving an already-archived issue is idempotent (succeeds)
 *
 * @example
 * ```typescript
 * // Archive by identifier
 * await archiveIssue.execute({ id: 'ENG-1366' });
 *
 * // Archive by UUID
 * await archiveIssue.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });
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
 * Maps to archive_issue params
 */
export const archiveIssueParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier'),
});

export type ArchiveIssueInput = z.infer<typeof archiveIssueParams>;

/**
 * Output validation schema
 */
export const archiveIssueOutput = z.object({
  success: z.boolean(),
  entity: z.object({
    id: z.string(),
    identifier: z.string(),
    archivedAt: z.string(),
  }),
  estimatedTokens: z.number(),
});

export type ArchiveIssueOutput = z.infer<typeof archiveIssueOutput>;

/**
 * GraphQL mutation for archiving an issue
 */
const ARCHIVE_ISSUE_MUTATION = `
  mutation IssueArchive($id: String!) {
    issueArchive(id: $id) {
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
interface IssueArchiveResponse {
  issueArchive: {
    success: boolean;
    entity?: {
      id: string;
      identifier: string;
      archivedAt: string;
    };
  };
}

/**
 * Archive an issue in Linear
 */
export const archiveIssue = {
  name: 'linear.archive_issue',
  description: 'Archive an issue in Linear',
  parameters: archiveIssueParams,

  async execute(
    input: ArchiveIssueInput,
    testToken?: string
  ): Promise<ArchiveIssueOutput> {
    const validated = archiveIssueParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<IssueArchiveResponse>(
      client,
      ARCHIVE_ISSUE_MUTATION,
      { id: validated.id }
    );

    if (!response.issueArchive?.success || !response.issueArchive?.entity) {
      throw new Error('Failed to archive issue');
    }

    const baseData = {
      success: response.issueArchive.success,
      entity: {
        id: response.issueArchive.entity.id,
        identifier: response.issueArchive.entity.identifier,
        archivedAt: response.issueArchive.entity.archivedAt,
      },
    };

    return archiveIssueOutput.parse({
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
