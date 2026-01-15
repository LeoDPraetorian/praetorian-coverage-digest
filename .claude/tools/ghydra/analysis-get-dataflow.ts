import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema } from './shared-schemas.js';
import { normalizeHexAddress, sanitizeAddress, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ address: HexAddressSchema, direction: z.enum(['forward', 'backward']).default('forward'), max_steps: z.number().int().min(1).max(500).default(50), port: PortSchema }).strict();
export type AnalysisGetDataflowInput = z.infer<typeof InputSchema>;

interface DataflowStep { address: string; instruction: string; }
export interface AnalysisGetDataflowOutput { startAddress: string; direction: string; steps: DataflowStep[]; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: AnalysisGetDataflowInput): AnalysisGetDataflowOutput {
  const raw = validateObjectResponse(rawData, 'analysis-get-dataflow');
  const steps: DataflowStep[] = (Array.isArray(raw.steps) ? raw.steps : []).map((s: any) => ({ address: sanitizeAddress(s.address), instruction: (s.instruction || s.mnemonic || '').substring(0, 200) }));
  return addTokenEstimation({ startAddress: normalizeHexAddress(input.address), direction: input.direction, steps });
}

export const analysisGetDataflow = { name: 'ghydra.analysis-get-dataflow', description: 'Perform data flow analysis from an address', inputSchema: InputSchema,
  async execute(input: AnalysisGetDataflowInput): Promise<AnalysisGetDataflowOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { address: normalizeHexAddress(validated.address), direction: validated.direction, max_steps: validated.max_steps };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'analysis_get_dataflow', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'analysis-get-dataflow'); }
  }
};

export default analysisGetDataflow;
