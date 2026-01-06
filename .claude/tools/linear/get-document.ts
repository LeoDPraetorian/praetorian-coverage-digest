/**
 * get_document - Linear GraphQL Wrapper
 *
 * Get detailed information about a specific document via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (single document)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * REQUIRED fields (100% presence):
 * - id: string
 * - title: string
 *
 * OPTIONAL fields (<100% presence):
 * - content: string | null - Document content in Markdown
 * - slugId: string | null - URL-friendly slug
 * - url: string - Direct link to the document
 * - createdAt: string - ISO timestamp
 * - updatedAt: string - ISO timestamp
 *
 * Edge cases discovered:
 * - ID can be UUID or slug ID
 * - Content can be null for empty documents
 * - slugId is generated from title automatically
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
 * GraphQL query for getting a document
 */
const GET_DOCUMENT_QUERY = `
  query Document($id: String!) {
    document(id: $id) {
      id
      title
      content
      slugId
      url
      createdAt
      updatedAt
    }
  }
`;

/**
 * Input validation schema
 * Maps to get_document params
 *
 * Security: Uses individual validators for specific attack detection
 */
export const getDocumentParams = z.object({
  id: z
    .string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Document ID or slug (e.g., doc-uuid-123 or security-review)'),
});

export type GetDocumentInput = z.infer<typeof getDocumentParams>;

/**
 * Output schema - minimal essential fields
 */
export const getDocumentOutput = z.object({
  // Required fields
  id: z.string(),
  title: z.string(),

  // Optional fields with correct types
  content: z.string().optional(),
  slugId: z.string().optional(),
  url: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),

  estimatedTokens: z.number(),
});

export type GetDocumentOutput = z.infer<typeof getDocumentOutput>;

/**
 * GraphQL response type
 */
interface DocumentResponse {
  document: {
    id: string;
    title: string;
    content?: string | null;
    slugId?: string | null;
    url?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

/**
 * Get a Linear document by ID or slug using GraphQL API
 *
 * @example
 * ```typescript
 * import { getDocument } from './.claude/tools/linear';
 *
 * // Get by UUID
 * const doc = await getDocument.execute({ id: 'doc-uuid-123' });
 *
 * // Get by slug
 * const doc2 = await getDocument.execute({ id: 'security-review' });
 *
 * console.log(doc.title, doc.url, doc.content);
 * ```
 */
export const getDocument = {
  name: 'linear.get_document',
  description: 'Get detailed information about a specific Linear document',
  parameters: getDocumentParams,

  async execute(
    input: GetDocumentInput,
    testToken?: string
  ): Promise<GetDocumentOutput> {
    // Validate input
    const validated = getDocumentParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query
    const response = await executeGraphQL<DocumentResponse>(
      client,
      GET_DOCUMENT_QUERY,
      { id: validated.id }
    );

    if (!response.document) {
      throw new Error(`Document not found: ${validated.id}`);
    }

    // Filter to essential fields with correct types
    const baseData = {
      id: response.document.id,
      title: response.document.title,
      content: response.document.content?.substring(0, 1000), // Truncate for token efficiency
      slugId: response.document.slugId || undefined,
      url: response.document.url,
      createdAt: response.document.createdAt,
      updatedAt: response.document.updatedAt,
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData),
    };

    // Validate output
    return getDocumentOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%',
  },
};
