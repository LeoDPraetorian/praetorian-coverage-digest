/**
 * delete_attachment - Linear GraphQL Wrapper
 *
 * Delete an attachment from Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (deletion response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (from Linear GraphQL schema):
 *
 * INPUT FIELDS:
 * - id: string (required) - Attachment UUID to delete
 *
 * OUTPUT:
 * - success: boolean - Deletion success status
 *
 * @example
 * ```typescript
 * // Delete attachment
 * await deleteAttachment.execute({
 *   id: 'att-uuid-here'
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

/**
 * GraphQL mutation for deleting an attachment
 */
const DELETE_ATTACHMENT_MUTATION = `
  mutation AttachmentDelete($id: String!) {
    attachmentDelete(id: $id) {
      success
    }
  }
`;

/**
 * Input validation schema
 */
export const deleteAttachmentParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Attachment ID to delete')
});

export type DeleteAttachmentInput = z.infer<typeof deleteAttachmentParams>;

/**
 * Output validation schema
 */
export const deleteAttachmentOutput = z.object({
  success: z.boolean(),
  estimatedTokens: z.number()
});

export type DeleteAttachmentOutput = z.infer<typeof deleteAttachmentOutput>;

/**
 * GraphQL response type
 */
interface AttachmentDeleteResponse {
  attachmentDelete: {
    success: boolean;
  };
}

/**
 * Delete attachment wrapper
 */
export const deleteAttachment = {
  name: 'linear.delete_attachment',
  description: 'Delete an attachment from Linear',
  parameters: deleteAttachmentParams,

  async execute(
    input: DeleteAttachmentInput,
    testToken?: string
  ): Promise<DeleteAttachmentOutput> {
    const validated = deleteAttachmentParams.parse(input);
    const client = await createLinearClient(testToken);

    const response = await executeGraphQL<AttachmentDeleteResponse>(
      client,
      DELETE_ATTACHMENT_MUTATION,
      { id: validated.id }
    );

    const baseData = {
      success: response.attachmentDelete.success
    };

    return deleteAttachmentOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 200,
    reduction: '99%'
  }
};
