/**
 * list_attachments - Linear GraphQL Wrapper
 *
 * List attachments from Linear (optionally filtered by issue)
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (from Linear GraphQL schema):
 *
 * INPUT FIELDS (all optional):
 * - filter.issueId: string - Filter by issue UUID
 * - limit: number - Number of results (default 100, max 250)
 *
 * OUTPUT fields per attachment:
 * - id: string (required) - Attachment UUID
 * - title: string (required) - Attachment title
 * - subtitle: string | null - Optional subtitle
 * - url: string (required) - URL to access the attachment
 * - source: string | object (required) - Source URL or source info object (e.g., {"type": "front"})
 * - sourceType: string | null - Type of source (e.g., "pdf", "image")
 * - metadata: object | null - Additional metadata
 * - issueId: string | null - Related issue UUID
 * - creatorId: string | null - Creator user UUID
 * - createdAt: string | null - ISO timestamp
 * - updatedAt: string | null - ISO timestamp
 *
 * @example
 * ```typescript
 * // List all attachments
 * const all = await listAttachments.execute({});
 *
 * // List attachments for specific issue
 * const issueAttachments = await listAttachments.execute({
 *   filter: { issueId: 'issue-uuid-here' }
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
 * GraphQL query for listing attachments
 */
const LIST_ATTACHMENTS_QUERY = `
  query Attachments($first: Int, $filter: AttachmentFilter) {
    attachments(first: $first, filter: $filter) {
      nodes {
        id
        title
        subtitle
        url
        metadata
        source
        sourceType
        issue { id }
        creator { id }
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Input validation schema
 */
export const listAttachmentsParams = z.object({
  filter: z.object({
    issueId: z.string()
      .refine(validateNoControlChars, 'Control characters not allowed')
      .refine(validateNoPathTraversal, 'Path traversal not allowed')
      .refine(validateNoCommandInjection, 'Invalid characters detected')
      .optional()
      .describe('Filter by issue ID')
  }).optional(),
  limit: z.number()
    .min(1)
    .max(250)
    .default(100)
    .describe('Number of results')
});

export type ListAttachmentsInput = {
  limit?: number;
  filter?: {
    issueId?: string;
  };
};

/**
 * Output validation schema
 */
export const listAttachmentsOutput = z.object({
  attachments: z.array(z.object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    url: z.string(),
    source: z.union([z.string(), z.object({ type: z.string() })]),
    sourceType: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    issueId: z.string().optional(),
    creatorId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })),
  totalAttachments: z.number(),
  estimatedTokens: z.number()
});

export type ListAttachmentsOutput = z.infer<typeof listAttachmentsOutput>;

/**
 * GraphQL response type
 */
interface AttachmentsResponse {
  attachments: {
    nodes: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      url: string;
      source: string | { type: string };
      sourceType?: string | null;
      metadata?: Record<string, unknown> | null;
      issue?: { id: string } | null;
      creator?: { id: string } | null;
      createdAt?: string | null;
      updatedAt?: string | null;
    }>;
  };
}

/**
 * List attachments wrapper
 */
export const listAttachments = {
  name: 'linear.list_attachments',
  description: 'List attachments from Linear',
  parameters: listAttachmentsParams,

  async execute(
    input: ListAttachmentsInput,
    testToken?: string
  ): Promise<ListAttachmentsOutput> {
    const validated = listAttachmentsParams.parse(input);
    const client = await createLinearClient(testToken);

    // Build GraphQL filter
    const filter: Record<string, unknown> = {};
    if (validated.filter?.issueId) {
      filter.issue = { id: { eq: validated.filter.issueId } };
    }

    const response = await executeGraphQL<AttachmentsResponse>(
      client,
      LIST_ATTACHMENTS_QUERY,
      {
        first: validated.limit,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      }
    );

    const attachments = response.attachments?.nodes || [];

    const baseData = {
      attachments: attachments.map(att => ({
        id: att.id,
        title: att.title,
        subtitle: att.subtitle || undefined,
        url: att.url,
        source: att.source,
        sourceType: att.sourceType || undefined,
        metadata: att.metadata || undefined,
        issueId: att.issue?.id,
        creatorId: att.creator?.id,
        createdAt: att.createdAt || undefined,
        updatedAt: att.updatedAt || undefined
      })),
      totalAttachments: attachments.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    return listAttachmentsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
