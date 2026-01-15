import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema } from './shared-schemas.js';
import { sanitizeName, sanitizeAddress, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ port: PortSchema }).strict();
export type UiGetCurrentFunctionInput = z.infer<typeof InputSchema>;
export interface UiGetCurrentFunctionOutput { name: string | null; address: string | null; selected: boolean; estimatedTokens: number; }

function filterResponse(rawData: unknown): UiGetCurrentFunctionOutput {
  const raw = validateObjectResponse(rawData, 'ui-get-current-function');
  const hasFunction = Boolean(raw.name || raw.address);
  return addTokenEstimation({ name: raw.name ? sanitizeName(raw.name) : null, address: raw.address ? sanitizeAddress(raw.address) : null, selected: hasFunction });
}

export const uiGetCurrentFunction = { name: 'ghydra.ui-get-current-function', description: 'Get the function currently selected in Ghidra UI', inputSchema: InputSchema,
  async execute(input: UiGetCurrentFunctionInput): Promise<UiGetCurrentFunctionOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = {};
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'ui_get_current_function', params);
      return filterResponse(raw);
    } catch (error) { handleMCPError(error, 'ui-get-current-function'); }
  }
};

export default uiGetCurrentFunction;
