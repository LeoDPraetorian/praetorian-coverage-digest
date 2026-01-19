/**
 * update_post - FeatureBase REST Wrapper
 *
 * Update an existing post in feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (updated post)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - Partial updates supported
 * - All fields optional except postId
 * - Returns updated post
 *
 * Required fields:
 * - postId: string
 *
 * Optional fields:
 * - title: string
 * - content: string
 * - statusId: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - Partial updates allowed
 * - Returns 404 if post doesn't exist
 * - Status changes via statusId
 */

import { z } from 'zod';
import type { HTTPPort } from '../config/lib/http-client.js';
import { sanitizeErrorMessage } from './internal/sanitize-error.js';
import { validateNoControlChars, validateNoPathTraversal, validateNoCommandInjection } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

export const updatePostParams = z.object({
  postId: z.string()
    .min(1, 'postId is required')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Post ID to update'),

  title: z.string()
    .max(255, 'title cannot exceed 255 characters')
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Post title'),

  content: z.string()
    .optional()
    .describe('Post content (markdown supported)'),

  statusId: z.string()
    .optional()
    .refine((val) => val === undefined || validateNoControlChars(val), 'Control characters not allowed')
    .describe('Status ID'),

  tags: z.array(z.string())
    .optional()
    .describe('Tags'),
});

export type UpdatePostInput = z.infer<typeof updatePostParams>;

export const updatePostOutput = z.object({
  post: z.object({
    id: z.string(),
    slug: z.string().optional(),
    title: z.string(),
    content: z.string(), // API uses "content", not "body"
    lastModified: z.string(), // API uses "lastModified", not "updatedAt"
  }),
  estimatedTokens: z.number(),
});

export type UpdatePostOutput = z.infer<typeof updatePostOutput>;

/**
 * FeatureBase API response schema for update post endpoint
 */
interface UpdatePostAPIResponse {
  id: string;
  slug?: string;
  title: string;
  content?: string;
  body?: string; // Fallback field name
  lastModified?: string;
  updatedAt?: string; // Fallback field name
}

/**
 * Partial update data for post
 */
interface UpdatePostData {
  title?: string;
  content?: string;
  statusId?: string;
  tags?: string[];
}

export const updatePost = {
  name: 'featurebase.update_post',
  description: 'Update an existing post',
  parameters: updatePostParams,

  async execute(
    input: UpdatePostInput,
    client: HTTPPort
  ): Promise<UpdatePostOutput> {
    const validated = updatePostParams.parse(input);

    const updateData: UpdatePostData = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.content) updateData.content = validated.content; // Use "content" field
    if (validated.statusId) updateData.statusId = validated.statusId;
    if (validated.tags) updateData.tags = validated.tags;

    const response = await client.request<UpdatePostAPIResponse>(
      'put',
      `v2/posts/${validated.postId}`,
      { json: updateData }
    );

    if (!response.ok) {
      const sanitized = sanitizeErrorMessage(response.error.message);
      throw new Error(`Failed to update post: ${sanitized}`);
    }

    const post = response.data;

    const postData = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content || post.body || '', // Handle both field names
      lastModified: post.lastModified || post.updatedAt || new Date().toISOString(),
    };

    return updatePostOutput.parse({
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
