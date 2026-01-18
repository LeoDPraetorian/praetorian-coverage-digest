/**
 * create_attachment - Linear GraphQL Wrapper
 *
 * Create a new attachment for an issue in Linear
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (creation response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (from Linear GraphQL schema):
 *
 * INPUT FIELDS:
 * - issueId: string (required) - Issue UUID to attach to
 * - title: string (required) - Attachment title
 * - url: string (required) - URL to the attachment (http/https)
 * - subtitle: string (optional) - Attachment subtitle
 * - metadata: object (optional) - Additional metadata
 *
 * OUTPUT:
 * - success: boolean - Creation success status
 * - attachment: object
 *   - id: string - Attachment UUID
 *   - title: string - Attachment title
 *   - url: string - Attachment URL
 *
 * @example
 * ```typescript
 * // Create basic attachment
 * await createAttachment.execute({
 *   issueId: 'issue-uuid-here',
 *   title: 'Design mockups',
 *   url: 'https://example.com/mockups.pdf'
 * });
 *
 * // Create with metadata
 * await createAttachment.execute({
 *   issueId: 'issue-uuid-here',
 *   title: 'Architecture diagram',
 *   subtitle: 'V2 system design',
 *   url: 'https://example.com/diagram.png',
 *   metadata: { version: 2, size: 2048 }
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
 * GraphQL mutation for creating an attachment
 */
const CREATE_ATTACHMENT_MUTATION = `
  mutation AttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
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
export const createAttachmentParams = z.object({
  issueId: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID to attach to'),
  title: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Attachment title'),
  subtitle: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Attachment subtitle'),
  url: z.string()
    .url('Must be valid URL')
    .regex(/^https?:\/\//, 'Must be http or https URL')
    .describe('URL to the attachment'),
  metadata: z.record(z.unknown())
    .optional()
    .describe('Additional metadata')
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentParams>;

/**
 * Output validation schema
 */
export const createAttachmentOutput = z.object({
  success: z.boolean(),
  attachment: z.object({
    id: z.string(),
    title: z.string(),
    url: z.string()
  }),
  estimatedTokens: z.number()
});

export type CreateAttachmentOutput = z.infer<typeof createAttachmentOutput>;

/**
 * GraphQL response type
 */
interface AttachmentCreateResponse {
  attachmentCreate: {
    success: boolean;
    attachment?: {
      id: string;
      title: string;
      url: string;
    };
  };
}

/**
 * Create attachment wrapper
 */
export const createAttachment = {
  name: 'linear.create_attachment',
  description: 'Create a new attachment in Linear',
  parameters: createAttachmentParams,

  async execute(
    input: CreateAttachmentInput,
    testToken?: string
  ): Promise<CreateAttachmentOutput> {
    const validated = createAttachmentParams.parse(input);
    const client = await createLinearClient(testToken);

    // Build mutation input
    const mutationInput: Record<string, unknown> = {
      issueId: validated.issueId,
      title: validated.title,
      url: validated.url
    };
    if (validated.subtitle) mutationInput.subtitle = validated.subtitle;
    if (validated.metadata) mutationInput.metadata = validated.metadata;

    const response = await executeGraphQL<AttachmentCreateResponse>(
      client,
      CREATE_ATTACHMENT_MUTATION,
      { input: mutationInput }
    );

    if (!response.attachmentCreate?.success || !response.attachmentCreate?.attachment) {
      throw new Error('Failed to create attachment');
    }

    const baseData = {
      success: response.attachmentCreate.success,
      attachment: {
        id: response.attachmentCreate.attachment.id,
        title: response.attachmentCreate.attachment.title,
        url: response.attachmentCreate.attachment.url
      }
    };

    return createAttachmentOutput.parse({
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
