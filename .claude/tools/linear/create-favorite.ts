/**
 * create_favorite - Linear GraphQL Wrapper
 *
 * Create a favorite (starred item) in Linear for quick access
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~75 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - issueId: string (optional) - Issue UUID to favorite
 * - projectId: string (optional) - Project UUID to favorite
 * - At least one of issueId or projectId required
 * - Cannot specify both issueId and projectId
 *
 * OUTPUT (after filtering):
 * - success: boolean
 * - favorite: object with id, type
 *   - issue: object (if type is 'issue') with id, identifier
 *   - project: object (if type is 'project') with id, name
 *
 * Edge cases discovered:
 * - Favoriting already-favorited item succeeds without error
 * - Favorites are user-specific, not workspace-wide
 *
 * @example
 * ```typescript
 * // Favorite an issue
 * await createFavorite.execute({ issueId: 'issue-uuid' });
 *
 * // Favorite a project
 * await createFavorite.execute({ projectId: 'project-uuid' });
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

const CREATE_FAVORITE_MUTATION = `
  mutation FavoriteCreate($input: FavoriteCreateInput!) {
    favoriteCreate(input: $input) {
      success
      favorite {
        id
        type
        issue {
          id
          identifier
        }
        project {
          id
          name
        }
      }
    }
  }
`;

export const createFavoriteParams = z.object({
  issueId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Issue UUID to favorite'),
  projectId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Project UUID to favorite')
}).refine(
  data => (data.issueId || data.projectId) && !(data.issueId && data.projectId),
  'Must specify exactly one of: issueId or projectId'
);

export type CreateFavoriteInput = z.infer<typeof createFavoriteParams>;

export const createFavoriteOutput = z.object({
  success: z.boolean(),
  favorite: z.object({
    id: z.string(),
    type: z.string(),
    issue: z.object({
      id: z.string(),
      identifier: z.string()
    }).optional(),
    project: z.object({
      id: z.string(),
      name: z.string()
    }).optional()
  }),
  estimatedTokens: z.number()
});

export type CreateFavoriteOutput = z.infer<typeof createFavoriteOutput>;

interface FavoriteCreateResponse {
  favoriteCreate: {
    success: boolean;
    favorite?: {
      id: string;
      type: string;
      issue?: {
        id: string;
        identifier: string;
      } | null;
      project?: {
        id: string;
        name: string;
      } | null;
    };
  };
}

export const createFavorite = {
  name: 'linear.create_favorite',
  description: 'Create a favorite (star) in Linear',
  parameters: createFavoriteParams,

  async execute(
    input: CreateFavoriteInput,
    testToken?: string
  ): Promise<CreateFavoriteOutput> {
    const validated = createFavoriteParams.parse(input);
    const client = await createLinearClient(testToken);

    const mutationInput: Record<string, unknown> = {};
    if (validated.issueId) mutationInput.issueId = validated.issueId;
    if (validated.projectId) mutationInput.projectId = validated.projectId;

    const response = await executeGraphQL<FavoriteCreateResponse>(
      client,
      CREATE_FAVORITE_MUTATION,
      { input: mutationInput }
    );

    if (!response.favoriteCreate?.success || !response.favoriteCreate?.favorite) {
      throw new Error('Failed to create favorite');
    }

    const favorite = response.favoriteCreate.favorite;
    const baseData = {
      success: response.favoriteCreate.success,
      favorite: {
        id: favorite.id,
        type: favorite.type,
        ...(favorite.issue && {
          issue: {
            id: favorite.issue.id,
            identifier: favorite.issue.identifier
          }
        }),
        ...(favorite.project && {
          project: {
            id: favorite.project.id,
            name: favorite.project.name
          }
        })
      }
    };

    return createFavoriteOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 75,
    reduction: '99%'
  }
};
