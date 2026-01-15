import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema } from './shared-schemas.js';
import { sanitizeName, sanitizeSize, sanitizeCount, addTokenEstimation, handleMCPError, validateObjectResponse, validateArrayResponse } from './utils.js';

const InputSchema = z.object({ name: SymbolNameSchema, port: PortSchema }).strict();
export type StructsGetInput = z.infer<typeof InputSchema>;

interface FilteredField { name: string; type: string; offset: number; }
export interface StructsGetOutput { name: string; size: number; fields: FilteredField[]; estimatedTokens: number; }

function filterResponse(rawData: unknown): StructsGetOutput {
  const raw = validateObjectResponse(rawData, 'structs-get');
  const rawFields = validateArrayResponse(raw.fields);
  const fields: FilteredField[] = rawFields.map((f: any) => ({ name: sanitizeName(f.name || f.fieldName), type: sanitizeName(f.type || f.dataType, 'undefined'), offset: sanitizeCount(f.offset) }));
  return addTokenEstimation({ name: sanitizeName(raw.name), size: sanitizeSize(raw.size), fields });
}

export const structsGet = { name: 'ghydra.structs-get', description: 'Get detailed information about a struct', inputSchema: InputSchema,
  async execute(input: StructsGetInput): Promise<StructsGetOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { name: validated.name };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'structs_get', params);
      return filterResponse(raw);
    } catch (error) { handleMCPError(error, 'structs-get'); }
  }
};

export default structsGet;
