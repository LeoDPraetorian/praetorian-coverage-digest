import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema } from './shared-schemas.js';
import { getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ name: SymbolNameSchema, category: z.string().optional(), description: z.string().max(1000).optional(), port: PortSchema }).strict();
export type StructsCreateInput = z.infer<typeof InputSchema>;
export interface StructsCreateOutput { success: boolean; name: string; category: string | null; operation: 'created'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: StructsCreateInput): StructsCreateOutput {
  const raw = validateObjectResponse(rawData, 'structs-create');
  return addTokenEstimation({ success: raw.success !== false, name: input.name, category: input.category || null, operation: 'created' as const, timestamp: getTimestamp() });
}

export const structsCreate = { name: 'ghydra.structs-create', description: 'Create a new struct data type', inputSchema: InputSchema,
  async execute(input: StructsCreateInput): Promise<StructsCreateOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { name: validated.name };
      if (validated.category) params.category = validated.category;
      if (validated.description) params.description = validated.description;
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'structs_create', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'structs-create'); }
  }
};

export default structsCreate;
