/**
 * documents - Linear GraphQL Wrapper
 *
 * List documents from Linear workspace with filters via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1000 tokens (filtered response)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS (all optional):
 * - project: string - Project ID to filter by
 * - initiative: string - Initiative ID to filter by
 * - limit: number - Number of results (1-250, default 50)
 *
 * OUTPUT fields per document:
 * - id: string (required)
 * - title: string (required)
 * - content: string | null (truncated to 200 chars)
 * - slugId: string | null - URL-friendly slug
 * - url: string
 * - createdAt: string
 * - updatedAt: string
 *
 * Edge cases discovered:
 * - GraphQL returns { documents: { nodes: [...] } } structure
 * - Empty results returns { documents: { nodes: [] } }
 * - Content is truncated to 200 chars for token efficiency
 *
 * @example
 * ```typescript
 * // List all documents
 * await listDocuments.execute({});
 *
 * // List documents in a project
 * await listDocuments.execute({ project: 'proj-123' });
 *
 * // Limit results
 * await listDocuments.execute({ limit: 10 });
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
 * GraphQL query for listing documents
 */
const LIST_DOCUMENTS_QUERY = `
  query Documents($first: Int!, $filter: DocumentFilter) {
    documents(first: $first, filter: $filter) {
      nodes {
        id
        title
        content
        slugId
        url
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to documents params
 */
export const listDocumentsParams = z.object({
  project: z
    .string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Project ID to filter by'),

  initiative: z
    .string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Initiative ID to filter by'),

  limit: z
    .number()
    .min(1)
    .max(250)
    .default(50)
    .describe('Number of results (max 250)'),
});

export type ListDocumentsInput = z.infer<typeof listDocumentsParams>;

/**
 * Output schema - minimal essential fields
 */
export const listDocumentsOutput = z.object({
  documents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string().optional(),
      slugId: z.string().optional(),
      url: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
  ),
  totalDocuments: z.number(),
  estimatedTokens: z.number(),
});

export type ListDocumentsOutput = z.infer<typeof listDocumentsOutput>;

/**
 * GraphQL response type
 */
interface DocumentsResponse {
  documents: {
    nodes: Array<{
      id: string;
      title: string;
      content?: string | null;
      slugId?: string | null;
      url?: string;
      createdAt?: string;
      updatedAt?: string;
    }>;
  };
}

/**
 * List documents from Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { listDocuments } from './.claude/tools/linear';
 *
 * // List all documents
 * const all = await listDocuments.execute({});
 *
 * // List documents in a project
 * const projectDocs = await listDocuments.execute({ project: 'proj-123' });
 *
 * // Limit results
 * const limited = await listDocuments.execute({ limit: 10 });
 * ```
 */
export const listDocuments = {
  name: 'linear.documents',
  description: 'List documents from Linear with optional filters',
  parameters: listDocumentsParams,

  async execute(
    input: ListDocumentsInput,
    testToken?: string
  ): Promise<ListDocumentsOutput> {
    // Validate input
    const validated = listDocumentsParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Build filter object
    const filter: Record<string, any> = {};
    if (validated.project) {
      filter.project = { id: { eq: validated.project } };
    }
    if (validated.initiative) {
      filter.initiative = { id: { eq: validated.initiative } };
    }

    // Execute GraphQL query
    const response = await executeGraphQL<DocumentsResponse>(
      client,
      LIST_DOCUMENTS_QUERY,
      {
        first: validated.limit,
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
      }
    );

    // Transform to essential fields
    const transformedDocuments = response.documents.nodes.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content?.substring(0, 200) || undefined, // Truncate to 200 chars
      slugId: doc.slugId || undefined,
      url: doc.url,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    const result = {
      documents: transformedDocuments,
      totalDocuments: transformedDocuments.length,
    };

    // Estimate tokens on full response
    return listDocumentsOutput.parse({
      ...result,
      estimatedTokens: estimateTokens(result),
    });
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 1000,
    reduction: '99%',
  },
};
