/**
 * createDocument - Linear GraphQL Wrapper
 *
 * Create a new document in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs Native MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - title: string (required) - Document title
 * - content: string (required) - Document content in Markdown
 * - project: string (optional) - Project ID to link document to
 * - initiative: string (optional) - Initiative ID to link document to
 *
 * OUTPUT (after filtering):
 * - success: boolean - Always true on successful creation
 * - document: object
 *   - id: string - Linear internal UUID
 *   - title: string - Document title as provided
 *   - slugId: string (optional) - URL-friendly slug
 *   - url: string - Direct link to the document
 *   - createdAt: string (optional) - ISO timestamp
 *   - updatedAt: string (optional) - ISO timestamp
 *
 * Edge cases discovered:
 * - GraphQL returns {documentCreate: {success, document}}
 * - On error, GraphQL returns errors array
 * - Project and initiative must be valid IDs
 * - Invalid project/initiative throws descriptive errors from Linear API
 *
 * @example
 * ```typescript
 * // Create simple document
 * await createDocument.execute({
 *   title: 'Security Review',
 *   content: '## Overview\n\nThis document covers security findings...'
 * });
 *
 * // Create document linked to project
 * await createDocument.execute({
 *   title: 'Implementation Plan',
 *   content: '## Phase 1\n\n- Task A\n- Task B',
 *   project: 'proj-uuid-123'
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
 * GraphQL mutation for creating a document
 */
const CREATE_DOCUMENT_MUTATION = `
  mutation DocumentCreate($title: String!, $content: String!, $projectId: String, $initiativeId: String) {
    documentCreate(input: {
      title: $title
      content: $content
      projectId: $projectId
      initiativeId: $initiativeId
    }) {
      success
      document {
        id
        title
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
 * Maps to createDocument params
 */
export const createDocumentParams = z.object({
  // Title is user content - block control chars but allow special characters
  title: z
    .string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Document title'),

  // Content is Markdown - allow whitespace control chars (tabs, newlines)
  content: z
    .string()
    .min(1)
    .refine(
      validateNoControlCharsAllowWhitespace,
      'Dangerous control characters not allowed'
    )
    .describe('Document content (Markdown)'),

  project: z
    .string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Project ID to link document to'),

  initiative: z
    .string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Initiative ID to link document to'),
});

export type CreateDocumentInput = z.infer<typeof createDocumentParams>;

/**
 * Output schema - minimal essential fields
 */
export const createDocumentOutput = z.object({
  success: z.boolean(),
  document: z.object({
    id: z.string(),
    title: z.string(),
    slugId: z.string().optional(),
    url: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  estimatedTokens: z.number(),
});

export type CreateDocumentOutput = z.infer<typeof createDocumentOutput>;

/**
 * GraphQL response type
 */
interface DocumentCreateResponse {
  documentCreate: {
    success: boolean;
    document: {
      id: string;
      title: string;
      slugId?: string | null;
      url: string;
      createdAt?: string | null;
      updatedAt?: string | null;
    };
  };
}

/**
 * Create a new document in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { createDocument } from './.claude/tools/linear';
 *
 * // Create simple document
 * const result = await createDocument.execute({
 *   title: 'Security Review',
 *   content: '## Overview\n\nSecurity findings...'
 * });
 *
 * // Create document linked to project
 * const result2 = await createDocument.execute({
 *   title: 'Implementation Plan',
 *   content: '## Phase 1\n\n- Task A',
 *   project: 'proj-uuid-123'
 * });
 *
 * console.log(result.document.url);
 * ```
 */
export const createDocument = {
  name: 'linear.createDocument',
  description: 'Create a new document in Linear',
  parameters: createDocumentParams,

  async execute(
    input: CreateDocumentInput,
    testToken?: string
  ): Promise<CreateDocumentOutput> {
    // Validate input
    const validated = createDocumentParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Map input fields to GraphQL variable names
    const variables = {
      title: validated.title,
      content: validated.content,
      projectId: validated.project,
      initiativeId: validated.initiative,
    };

    // Execute GraphQL mutation
    const response = await executeGraphQL<DocumentCreateResponse>(
      client,
      CREATE_DOCUMENT_MUTATION,
      variables
    );

    if (!response.documentCreate.success) {
      throw new Error('Failed to create document: Linear API returned success: false');
    }

    if (!response.documentCreate.document.id) {
      throw new Error('Failed to create document: No document ID returned');
    }

    // Filter to essential fields
    const baseData = {
      success: true,
      document: {
        id: response.documentCreate.document.id,
        title: response.documentCreate.document.title,
        slugId: response.documentCreate.document.slugId || undefined,
        url: response.documentCreate.document.url,
        createdAt: response.documentCreate.document.createdAt || undefined,
        updatedAt: response.documentCreate.document.updatedAt || undefined,
      },
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData),
    };

    // Validate output
    return createDocumentOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%',
  },
};
