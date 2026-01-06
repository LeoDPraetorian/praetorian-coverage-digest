/**
 * updateDocument - Linear GraphQL Wrapper
 *
 * Update an existing document in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (update response)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - id: string (required) - Document ID or slug
 * - title: string (optional) - New title for the document
 * - content: string (optional) - New content in Markdown
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful update
 * - document: object
 *   - id: string - Linear internal UUID
 *   - title: string - Document title (updated or original)
 *   - slugId: string (optional) - URL-friendly slug
 *   - url: string - Direct link to the document
 *   - updatedAt: string (optional) - ISO timestamp
 *
 * Edge cases discovered:
 * - GraphQL returns {documentUpdate: {success, document}}
 * - Document ID can be UUID or slug ID
 * - Only provided fields are updated; omitted fields remain unchanged
 * - Invalid document ID returns GraphQL error
 *
 * @example
 * ```typescript
 * // Update title
 * await updateDocument.execute({
 *   id: 'doc-uuid-123',
 *   title: 'Updated Security Review'
 * });
 *
 * // Update content
 * await updateDocument.execute({
 *   id: 'security-review',
 *   content: '## Updated Overview\n\nNew content...'
 * });
 *
 * // Update both title and content
 * await updateDocument.execute({
 *   id: 'doc-uuid-123',
 *   title: 'New Title',
 *   content: 'New content...'
 * });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';

/**
 * GraphQL mutation for updating a document
 */
const UPDATE_DOCUMENT_MUTATION = `
  mutation UpdateDocument($id: String!, $title: String, $content: String) {
    documentUpdate(id: $id, input: { title: $title, content: $content }) {
      success
      document {
        id
        title
        slugId
        url
        updatedAt
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to updateDocument params
 */
export const updateDocumentParams = z.object({
  // ID field - full validation for identifier references
  id: z
    .string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Document ID or slug'),

  // Title is user content - block control chars but allow special characters
  title: z
    .string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('New title'),

  // Content is Markdown - allow whitespace control chars (tabs, newlines)
  content: z
    .string()
    .refine(
      validateNoControlCharsAllowWhitespace,
      'Dangerous control characters not allowed'
    )
    .optional()
    .describe('New content (Markdown)'),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentParams>;

/**
 * Output schema - minimal essential fields
 */
export const updateDocumentOutput = z.object({
  success: z.boolean(),
  document: z.object({
    id: z.string(),
    title: z.string(),
    slugId: z.string().optional(),
    url: z.string(),
    updatedAt: z.string().optional(),
  }),
  estimatedTokens: z.number(),
});

export type UpdateDocumentOutput = z.infer<typeof updateDocumentOutput>;

/**
 * GraphQL response type
 */
interface DocumentUpdateResponse {
  documentUpdate: {
    success: boolean;
    document: {
      id: string;
      title: string;
      slugId?: string | null;
      url: string;
      updatedAt?: string | null;
    } | null;
  };
}

/**
 * Update an existing document in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { updateDocument } from './.claude/tools/linear';
 *
 * // Update title
 * const result = await updateDocument.execute({
 *   id: 'doc-uuid-123',
 *   title: 'Updated Security Review'
 * });
 *
 * // Update content
 * const result2 = await updateDocument.execute({
 *   id: 'security-review',
 *   content: '## Updated Overview\n\nNew content...'
 * });
 *
 * console.log(result.document.url);
 * ```
 */
export const updateDocument = {
  name: 'linear.updateDocument',
  description: 'Update an existing document in Linear',
  parameters: updateDocumentParams,

  async execute(
    input: UpdateDocumentInput,
    testToken?: string
  ): Promise<UpdateDocumentOutput> {
    // Validate input
    const validated = updateDocumentParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL mutation
    const response = await executeGraphQL<DocumentUpdateResponse>(
      client,
      UPDATE_DOCUMENT_MUTATION,
      {
        id: validated.id,
        title: validated.title,
        content: validated.content,
      }
    );

    if (!response.documentUpdate.success || !response.documentUpdate.document) {
      throw new Error(`Failed to update document: ${validated.id}`);
    }

    // Filter to essential fields
    const baseData = {
      success: response.documentUpdate.success,
      document: {
        id: response.documentUpdate.document.id,
        title: response.documentUpdate.document.title,
        slugId: response.documentUpdate.document.slugId || undefined,
        url: response.documentUpdate.document.url,
        updatedAt: response.documentUpdate.document.updatedAt || undefined,
      },
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData),
    };

    // Validate output
    return updateDocumentOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%',
  },
};
