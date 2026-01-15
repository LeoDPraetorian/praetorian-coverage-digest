/**
 * Ghydra MCP Wrapper: comments-set
 *
 * Sets a comment at the specified address.
 * Implements token reduction by returning minimal confirmation.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema, CommentTypeSchema, CommentSchema } from './shared-schemas.js';
import {
  normalizeHexAddress,
  getTimestamp,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    address: HexAddressSchema,
    comment: CommentSchema.default(''),
    comment_type: CommentTypeSchema,
    port: PortSchema,
  })
  .strict();

export type CommentsSetInput = z.infer<typeof InputSchema>;

export interface CommentsSetOutput {
  success: boolean;
  address: string;
  commentType: string;
  operation: 'comment_set' | 'comment_removed';
  timestamp: string;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: CommentsSetInput): CommentsSetOutput {
  const raw = validateObjectResponse(rawData, 'comments-set');

  return addTokenEstimation({
    success: raw.success !== false,
    address: normalizeHexAddress(input.address),
    commentType: input.comment_type,
    operation: (input.comment === '' ? 'comment_removed' : 'comment_set') as 'comment_set' | 'comment_removed',
    timestamp: getTimestamp(),
  });
}

export const commentsSet = {
  name: 'ghydra.comments-set',
  description: 'Set a comment at the specified address',
  inputSchema: InputSchema,

  async execute(input: CommentsSetInput): Promise<CommentsSetOutput> {
    const validated = InputSchema.parse(input);

    try {
      const params: any = {
        address: normalizeHexAddress(validated.address),
        comment: validated.comment,
        comment_type: validated.comment_type,
      };
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'comments_set', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'comments-set');
    }
  },
};

export default commentsSet;
