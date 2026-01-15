/**
 * Ghydra MCP Wrapper: structs-list
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema } from './shared-schemas.js';
import { sanitizeName, sanitizeSize, sanitizeCount, addTokenEstimation, handleMCPError, validateArrayResponse } from './utils.js';

const InputSchema = z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(1000).default(100), category: z.string().optional(), port: PortSchema }).strict();

export type StructsListInput = z.infer<typeof InputSchema>;

interface FilteredStruct { name: string; size: number; fieldCount: number; }

export interface StructsListOutput { structs: FilteredStruct[]; pagination: { offset: number; limit: number; total: number; hasMore: boolean; }; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: StructsListInput): StructsListOutput {
  let total = 0; let rawStructs: any[] = [];
  if (typeof rawData === 'object' && rawData !== null && 'structs' in rawData) { rawStructs = validateArrayResponse((rawData as any).structs); total = typeof (rawData as any).total === 'number' ? (rawData as any).total : rawStructs.length; }
  else { rawStructs = validateArrayResponse(rawData); total = rawStructs.length; }
  const structs: FilteredStruct[] = rawStructs.map((s) => ({ name: sanitizeName(s.name), size: sanitizeSize(s.size), fieldCount: sanitizeCount(s.fieldCount || s.numFields || s.fields?.length) }));
  const hasMore = input.offset + structs.length < total;
  return addTokenEstimation({ structs, pagination: { offset: input.offset, limit: input.limit, total, hasMore } });
}

export const structsList = { name: 'ghydra.structs-list', description: 'List all struct data types', inputSchema: InputSchema,
  async execute(input: StructsListInput): Promise<StructsListOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { offset: validated.offset, limit: validated.limit };
      if (validated.category) params.category = validated.category;
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'structs_list', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'structs-list'); }
  }
};

export default structsList;
