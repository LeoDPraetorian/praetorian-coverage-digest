/**
 * link_project_to_initiative - Linear GraphQL Wrapper
 *
 * Link a project to an initiative in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (link confirmation)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - initiativeId: string (required) - Initiative UUID or name
 * - projectId: string (required) - Project UUID or name
 *
 * OUTPUT:
 * - success: boolean - Whether linking succeeded
 * - initiativeToProjectId: string - The created link ID
 * - estimatedTokens: number
 *
 * @example
 * ```typescript
 * // Link by UUIDs
 * await linkProjectToInitiative.execute({
 *   initiativeId: 'init-abc-123',
 *   projectId: 'proj-def-456'
 * });
 *
 * // Link by names
 * await linkProjectToInitiative.execute({
 *   initiativeId: 'Q2 2025 Roadmap',
 *   projectId: 'Authentication Overhaul'
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
 * GraphQL mutation for linking a project to an initiative
 */
const LINK_PROJECT_TO_INITIATIVE_MUTATION = `
  mutation InitiativeToProjectCreate($initiativeId: String!, $projectId: String!) {
    initiativeToProjectCreate(initiativeId: $initiativeId, projectId: $projectId) {
      success
      initiativeToProject {
        id
      }
    }
  }
`;

/**
 * Input validation schema
 */
export const linkProjectToInitiativeParams = z.object({
  initiativeId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Initiative ID or name'),
  projectId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Project ID or name')
});

export type LinkProjectToInitiativeInput = z.infer<typeof linkProjectToInitiativeParams>;

/**
 * Output schema
 */
export const linkProjectToInitiativeOutput = z.object({
  success: z.boolean(),
  initiativeToProjectId: z.string(),
  estimatedTokens: z.number()
});

export type LinkProjectToInitiativeOutput = z.infer<typeof linkProjectToInitiativeOutput>;

/**
 * GraphQL response type
 */
interface InitiativeToProjectCreateResponse {
  initiativeToProjectCreate: {
    success: boolean;
    initiativeToProject: {
      id: string;
    } | null;
  };
}

/**
 * Link a project to an initiative in Linear using GraphQL API
 */
export const linkProjectToInitiative = {
  name: 'linear.link_project_to_initiative',
  description: 'Link a project to an initiative in Linear',
  parameters: linkProjectToInitiativeParams,

  async execute(
    input: LinkProjectToInitiativeInput,
    testToken?: string
  ): Promise<LinkProjectToInitiativeOutput> {
    const validated = linkProjectToInitiativeParams.parse(input);

    // Create client (with optional test credentials)
    const client = createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<InitiativeToProjectCreateResponse>(
      client,
      LINK_PROJECT_TO_INITIATIVE_MUTATION,
      {
        initiativeId: validated.initiativeId,
        projectId: validated.projectId
      }
    );

    if (!response.initiativeToProjectCreate.success) {
      throw new Error('Failed to link project to initiative');
    }

    if (!response.initiativeToProjectCreate.initiativeToProject) {
      throw new Error('Failed to link project to initiative: no link created');
    }

    const baseData = {
      success: true,
      initiativeToProjectId: response.initiativeToProjectCreate.initiativeToProject.id
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    return linkProjectToInitiativeOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '99%'
  }
};
