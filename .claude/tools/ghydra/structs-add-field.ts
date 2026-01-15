import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, DataTypeSchema } from './shared-schemas.js';
import { getTimestamp, sanitizeSize, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ struct_name: SymbolNameSchema, field_name: SymbolNameSchema, field_type: DataTypeSchema, offset: z.number().int().min(0).optional(), comment: z.string().max(500).optional(), port: PortSchema }).strict();
export type StructsAddFieldInput = z.infer<typeof InputSchema>;
export interface StructsAddFieldOutput { success: boolean; structName: string; fieldName: string; newSize: number; operation: 'field_added'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: StructsAddFieldInput): StructsAddFieldOutput {
  const raw = validateObjectResponse(rawData, 'structs-add-field');
  return addTokenEstimation({ success: raw.success !== false, structName: input.struct_name, fieldName: input.field_name, newSize: sanitizeSize(raw.newSize || raw.struct?.size), operation: 'field_added' as const, timestamp: getTimestamp() });
}

export const structsAddField = { name: 'ghydra.structs-add-field', description: 'Add a field to an existing struct', inputSchema: InputSchema,
  async execute(input: StructsAddFieldInput): Promise<StructsAddFieldOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { struct_name: validated.struct_name, field_name: validated.field_name, field_type: validated.field_type };
      if (validated.offset !== undefined) params.offset = validated.offset;
      if (validated.comment) params.comment = validated.comment;
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'structs_add_field', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'structs-add-field'); }
  }
};

export default structsAddField;
