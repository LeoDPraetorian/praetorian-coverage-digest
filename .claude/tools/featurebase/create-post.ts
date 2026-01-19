/**
 * create_post - FeatureBase REST Wrapper
 *
 * Create a new post in the FeatureBase feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (single post)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - API uses "content" field (not "body")
 * - API uses "categoryId" (not "boardId")
 * - API uses "date" (not "createdAt")
 * - API uses "lastModified" (not "updatedAt")
 *
 * Required fields:
 * - title: string (max 255 chars)
 * - content: string (markdown supported)
 * - categoryId: string
 *
 * Optional fields:
 * - statusId: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - categoryId must be valid or request fails with 400
 * - Content can be empty string but title is required
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const createPostParams = z.object({
  title: z.string()
    .min(1, 'title is required')
    .max(255, 'title cannot exceed 255 characters')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Post title'),

  content: z.string()
    .min(1, 'content is required')
    .describe('Post content (markdown supported)'),

  categoryId: z.string()
    .min(1, 'categoryId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Category ID where post will be created'),

  statusId: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .refine((val) => val === undefined || validateNoPathTraversal(val), 'Path traversal not allowed')
    .refine((val) => val === undefined || validateNoCommandInjection(val), 'Invalid characters detected')
    .describe('Optional status ID'),

  tags: z.array(z.string())
    .optional()
    .describe('Optional tags'),
});

export type CreatePostInput = z.infer<typeof createPostParams>;

export const createPostOutput = z.object({
  post: z.object({
    id: z.string(),
    slug: z.string().optional(),
    title: z.string(),
    content: z.string(), // API uses "content", not "body"
    categoryId: z.string(), // API uses "categoryId", not "boardId"
    date: z.string(), // API uses "date", not "createdAt"
    lastModified: z.string(), // API uses "lastModified", not "updatedAt"
  }),
  estimatedTokens: z.number(),
});

export type CreatePostOutput = z.infer<typeof createPostOutput>;

/**
 * FeatureBase API response schema for create post endpoint
 */
interface CreatePostAPIResponse {
  id: string;
  slug?: string;
  title: string;
  content?: string; // API uses "content"
  categoryId?: string; // API uses "categoryId"
  date?: string; // API uses "date"
  createdAt?: string; // Fallback field name
  lastModified?: string; // API uses "lastModified"
  updatedAt?: string; // Fallback field name
  statusId?: string;
  postTags?: string[];
}

export const createPost = {
  name: 'featurebase.create_post',
  description: 'Create a new post',
  parameters: createPostParams,

  async execute(
    input: CreatePostInput,
    client: HTTPPort
  ): Promise<CreatePostOutput> {
    const validated = createPostParams.parse(input);

    const response = await client.request<CreatePostAPIResponse>('post', 'v2/posts', {
      json: {
        title: validated.title,
        content: validated.content, // Use "content" field
        categoryId: validated.categoryId, // Use "categoryId" field
        ...(validated.statusId && { statusId: validated.statusId }),
        ...(validated.tags && { tags: validated.tags }),
      },
    });

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to create post: ${sanitized}`);
    }

    const post = response.data;

    const postData = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content || '',
      categoryId: post.categoryId || '',
      date: post.date || post.createdAt || new Date().toISOString(),
      lastModified: post.lastModified || post.updatedAt || new Date().toISOString(),
    };

    return createPostOutput.parse({
      post: postData,
      estimatedTokens: estimateTokens(postData),
    });
  },

  estimatedTokens: 300,
  tokenEstimate: {
    withoutCustomTool: 2000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '85%',
  },
};
