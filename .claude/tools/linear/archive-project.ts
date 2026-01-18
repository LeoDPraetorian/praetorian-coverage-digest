/**
 * archive_project - Linear GraphQL Wrapper
 *
 * Archive a project in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (archive response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Project ID or name (e.g., UUID or "Q1 2026 Sprint")
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether the archive operation succeeded
 * - entity: object - The archived project entity
 *   - id: string - Linear internal UUID
 *   - name: string - Project name
 *   - archivedAt: string - ISO timestamp when project was archived
 * - estimatedTokens: number - Token usage estimate
 *
 * Edge cases discovered:
 * - GraphQL returns {success, entity} structure via projectArchive mutation
 * - Project ID can be name, identifier, or UUID
 * - Invalid project ID returns descriptive error from Linear API
 * - Archiving an already-archived project is idempotent (succeeds)
 * - Project name can contain spaces and special characters
 *
 * @example
 * ```typescript
 * // Archive by name
 * await archiveProject.execute({ id: 'Q1 2026 Sprint' });
 *
 * // Archive by UUID
 * await archiveProject.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });
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
 * Maps to archive_project params
 */
export const archiveProjectParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Project ID or name'),
});

export type ArchiveProjectInput = z.infer<typeof archiveProjectParams>;

/**
 * Output validation schema
 */
export const archiveProjectOutput = z.object({
  success: z.boolean(),
  entity: z.object({
    id: z.string(),
    name: z.string(),
    archivedAt: z.string(),
  }),
  estimatedTokens: z.number(),
});

export type ArchiveProjectOutput = z.infer<typeof archiveProjectOutput>;

/**
 * GraphQL mutation for archiving a project
 */
const ARCHIVE_PROJECT_MUTATION = `
  mutation ProjectArchive($id: String!) {
    projectArchive(id: $id) {
      success
      entity {
        id
        name
        archivedAt
      }
    }
  }
`;

/**
 * GraphQL response type
 */
interface ProjectArchiveResponse {
  projectArchive: {
    success: boolean;
    entity?: {
      id: string;
      name: string;
      archivedAt: string;
    };
  };
}

/**
 * Archive a project in Linear
 */
export const archiveProject = {
  name: 'linear.archive_project',
  description: 'Archive a project in Linear',
  parameters: archiveProjectParams,

  async execute(
    input: ArchiveProjectInput,
    testToken?: string
  ): Promise<ArchiveProjectOutput> {
    const validated = archiveProjectParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<ProjectArchiveResponse>(
      client,
      ARCHIVE_PROJECT_MUTATION,
      { id: validated.id }
    );

    if (!response.projectArchive?.success || !response.projectArchive?.entity) {
      throw new Error('Failed to archive project');
    }

    const baseData = {
      success: response.projectArchive.success,
      entity: {
        id: response.projectArchive.entity.id,
        name: response.projectArchive.entity.name,
        archivedAt: response.projectArchive.entity.archivedAt,
      },
    };

    return archiveProjectOutput.parse({
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
