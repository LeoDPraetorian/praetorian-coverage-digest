import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema } from './shared-schemas.js';
import { sanitizeAddress, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ port: PortSchema }).strict();
export type UiGetCurrentAddressInput = z.infer<typeof InputSchema>;
export interface UiGetCurrentAddressOutput { address: string | null; selected: boolean; estimatedTokens: number; }

function filterResponse(rawData: unknown): UiGetCurrentAddressOutput {
  const raw = validateObjectResponse(rawData, 'ui-get-current-address');
  return addTokenEstimation({ address: raw.address ? sanitizeAddress(raw.address) : null, selected: Boolean(raw.address) });
}

export const uiGetCurrentAddress = { name: 'ghydra.ui-get-current-address', description: 'Get the address currently selected in Ghidra UI', inputSchema: InputSchema,
  async execute(input: UiGetCurrentAddressInput): Promise<UiGetCurrentAddressOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = {};
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'ui_get_current_address', params);
      return filterResponse(raw);
    } catch (error) { handleMCPError(error, 'ui-get-current-address'); }
  }
};

export default uiGetCurrentAddress;
