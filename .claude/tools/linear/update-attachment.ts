/**
 * update_attachment - Linear GraphQL Wrapper
 *
 * Update an existing attachment in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (update response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (from Linear GraphQL schema):
 *
 * INPUT FIELDS:
 * - id: string (required) - Attachment UUID
 * - title: string (optional) - Updated title
 * - subtitle: string (optional) - Updated subtitle
 * - metadata: object (optional) - Updated metadata
 *
 * OUTPUT:
 * - success: boolean - Update success status
 * - attachment: object
 *   - id: string - Attachment UUID
 *   - title: string - Attachment title
 *   - url: string - Attachment URL
 *
 * @example
 * ```typescript
 * // Update title only
 * await updateAttachment.execute({
 *   id: 'att-uuid-here',
 *   title: 'Updated design mockups'
 * });
 *
 * // Update multiple fields
 * await updateAttachment.execute({
 *   id: 'att-uuid-here',
 *   title: 'Architecture diagram V3',
 *   subtitle: 'Final version',
 *   metadata: { version: 3, approved: true }
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
 * GraphQL mutation for updating an attachment
 */
const UPDATE_ATTACHMENT_MUTATION = `
  mutation AttachmentUpdate($id: String!, $input: AttachmentUpdateInput!) {
    attachmentUpdate(id: $id, input: $input) {
      success
      attachment {
        id
        title
        url
      }
    }
  }
`;

/**
 * Input validation schema
 */
export const updateAttachmentParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Attachment ID'),
  title: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Updated attachment title'),
  subtitle: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Updated attachment subtitle'),
  metadata: z.record(z.unknown())
    .optional()
    .describe('Updated metadata')
});

export type UpdateAttachmentInput = z.infer<typeof updateAttachmentParams>;

/**
 * Output validation schema
 */
export const updateAttachmentOutput = z.object({
  success: z.boolean(),
  attachment: z.object({
    id: z.string(),
    title: z.string(),
    url: z.string()
  }),
  estimatedTokens: z.number()
});

export type UpdateAttachmentOutput = z.infer<typeof updateAttachmentOutput>;

/**
 * GraphQL response type
 */
interface AttachmentUpdateResponse {
  attachmentUpdate: {
    success: boolean;
    attachment?: {
      id: string;
      title: string;
      url: string;
    };
  };
}

/**
 * Update attachment wrapper
 */
export const updateAttachment = {
  name: 'linear.update_attachment',
  description: 'Update an attachment in Linear',
  parameters: updateAttachmentParams,

  async execute(
    input: UpdateAttachmentInput,
    testToken?: string
  ): Promise<UpdateAttachmentOutput> {
    const validated = updateAttachmentParams.parse(input);
    const client = await createLinearClient(testToken);

    // Build mutation input (only include fields that are provided)
    const mutationInput: Record<string, unknown> = {};
    if (validated.title !== undefined) mutationInput.title = validated.title;
    if (validated.subtitle !== undefined) mutationInput.subtitle = validated.subtitle;
    if (validated.metadata !== undefined) mutationInput.metadata = validated.metadata;

    const response = await executeGraphQL<AttachmentUpdateResponse>(
      client,
      UPDATE_ATTACHMENT_MUTATION,
      {
        id: validated.id,
        input: mutationInput
      }
    );

    if (!response.attachmentUpdate?.success || !response.attachmentUpdate?.attachment) {
      throw new Error('Failed to update attachment');
    }

    const baseData = {
      success: response.attachmentUpdate.success,
      attachment: {
        id: response.attachmentUpdate.attachment.id,
        title: response.attachmentUpdate.attachment.title,
        url: response.attachmentUpdate.attachment.url
      }
    };

    return updateAttachmentOutput.parse({
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '99%'
  }
};
