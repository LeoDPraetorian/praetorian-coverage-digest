import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema } from './shared-schemas.js';
import { getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ analysis_options: z.record(z.boolean()).optional(), port: PortSchema }).strict();
export type AnalysisRunInput = z.infer<typeof InputSchema>;
export interface AnalysisRunOutput { success: boolean; operation: 'analysis_run'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown): AnalysisRunOutput {
  const raw = validateObjectResponse(rawData, 'analysis-run');
  return addTokenEstimation({ success: raw.success !== false, operation: 'analysis_run' as const, timestamp: getTimestamp() });
}

export const analysisRun = { name: 'ghydra.analysis-run', description: 'Run analysis on the current program', inputSchema: InputSchema,
  async execute(input: AnalysisRunInput): Promise<AnalysisRunOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = {};
      if (validated.analysis_options) params.analysis_options = validated.analysis_options;
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'analysis_run', params);
      return filterResponse(raw);
    } catch (error) { handleMCPError(error, 'analysis-run'); }
  }
};

export default analysisRun;
