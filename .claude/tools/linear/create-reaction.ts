/**
 * create_reaction - Linear GraphQL Wrapper
 *
 * Create an emoji reaction on a comment in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - commentId: string (required) - Comment UUID to add reaction to
 * - emoji: string (required) - Emoji character(s) to use as reaction
 *
 * OUTPUT:
 * - success: boolean
 * - reaction: object with id, emoji, user { id, name }, commentId
 *
 * Edge cases discovered:
 * - Duplicate reactions are deduplicated by Linear (same user + emoji = one reaction)
 * - Invalid emoji characters are rejected by Linear API
 *
 * @example
 * ```typescript
 * const result = await createReaction.execute({
 *   commentId: 'comment-uuid',
 *   emoji: '👍'
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

const CREATE_REACTION_MUTATION = `
  mutation ReactionCreate($input: ReactionCreateInput!) {
    reactionCreate(input: $input) {
      success
      reaction {
        id
        emoji
        user {
          id
          name
        }
        comment {
          id
        }
      }
    }
  }
`;

export const createReactionParams = z.object({
  commentId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Comment ID to add reaction to'),
  emoji: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Emoji character(s) for reaction')
});

export type CreateReactionInput = z.infer<typeof createReactionParams>;

export const createReactionOutput = z.object({
  success: z.boolean(),
  reaction: z.object({
    id: z.string(),
    emoji: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string()
    }),
    commentId: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateReactionOutput = z.infer<typeof createReactionOutput>;

interface ReactionCreateResponse {
  reactionCreate: {
    success: boolean;
    reaction?: {
      id: string;
      emoji: string;
      user: {
        id: string;
        name: string;
      };
      comment: {
        id: string;
      };
    };
  };
}

export const createReaction = {
  name: 'linear.create_reaction',
  description: 'Create an emoji reaction on a comment in Linear',
  parameters: createReactionParams,

  async execute(
    input: CreateReactionInput,
    testToken?: string
  ): Promise<CreateReactionOutput> {
    const validated = createReactionParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<ReactionCreateResponse>(
      client,
      CREATE_REACTION_MUTATION,
      {
        input: {
          commentId: validated.commentId,
          emoji: validated.emoji
        }
      }
    );

    if (!response.reactionCreate?.success || !response.reactionCreate?.reaction) {
      throw new Error('Failed to create reaction');
    }

    const baseData = {
      success: response.reactionCreate.success,
      reaction: {
        id: response.reactionCreate.reaction.id,
        emoji: response.reactionCreate.reaction.emoji,
        user: {
          id: response.reactionCreate.reaction.user.id,
          name: response.reactionCreate.reaction.user.name
        },
        commentId: response.reactionCreate.reaction.comment.id
      }
    };

    return createReactionOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 150,
    reduction: '99%'
  }
};
