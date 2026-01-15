import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema, CommentSchema } from './shared-schemas.js';
import { normalizeHexAddress, getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ address: HexAddressSchema, comment: CommentSchema.default(''), port: PortSchema }).strict();
export type FunctionsSetCommentInput = z.infer<typeof InputSchema>;
export interface FunctionsSetCommentOutput { success: boolean; address: string; operation: 'comment_set' | 'comment_removed'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: FunctionsSetCommentInput): FunctionsSetCommentOutput {
  const raw = validateObjectResponse(rawData, 'functions-set-comment');
  return addTokenEstimation({ success: raw.success !== false, address: normalizeHexAddress(input.address), operation: (input.comment === '' ? 'comment_removed' : 'comment_set') as 'comment_set' | 'comment_removed', timestamp: getTimestamp() });
}

export const functionsSetComment = { name: 'ghydra.functions-set-comment', description: 'Set a decompiler-friendly comment for a function', inputSchema: InputSchema,
  async execute(input: FunctionsSetCommentInput): Promise<FunctionsSetCommentOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { address: normalizeHexAddress(validated.address), comment: validated.comment };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'functions_set_comment', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'functions-set-comment'); }
  }
};

export default functionsSetComment;
