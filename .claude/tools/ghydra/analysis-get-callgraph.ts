import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, HexAddressSchema } from './shared-schemas.js';
import { sanitizeName, sanitizeAddress, getIdentifier, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ name: SymbolNameSchema.optional(), address: HexAddressSchema.optional(), max_depth: z.number().int().min(1).max(20).default(3), port: PortSchema }).strict().refine((data) => data.name || data.address, { message: 'Either name or address must be provided' });
export type AnalysisGetCallgraphInput = z.infer<typeof InputSchema>;

interface Node { name: string; address: string; }
interface Edge { from: string; to: string; type: string; }
export interface AnalysisGetCallgraphOutput { nodes: Node[]; edges: Edge[]; rootFunction: string; maxDepth: number; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: AnalysisGetCallgraphInput): AnalysisGetCallgraphOutput {
  const raw = validateObjectResponse(rawData, 'analysis-get-callgraph');
  const nodes: Node[] = (Array.isArray(raw.nodes) ? raw.nodes : []).map((n: any) => ({ name: sanitizeName(n.name), address: sanitizeAddress(n.address) }));
  const edges: Edge[] = (Array.isArray(raw.edges) ? raw.edges : []).map((e: any) => ({ from: sanitizeAddress(e.from), to: sanitizeAddress(e.to), type: (e.type || 'CALL').toUpperCase() }));
  return addTokenEstimation({ nodes, edges, rootFunction: sanitizeName(raw.rootFunction || input.name || input.address), maxDepth: input.max_depth });
}

export const analysisGetCallgraph = { name: 'ghydra.analysis-get-callgraph', description: 'Get function call graph visualization data', inputSchema: InputSchema,
  async execute(input: AnalysisGetCallgraphInput): Promise<AnalysisGetCallgraphOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier(validated);
    try {
      const params: any = { max_depth: validated.max_depth };
      if (identifier.type === 'name') params.name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'analysis_get_callgraph', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'analysis-get-callgraph'); }
  }
};

export default analysisGetCallgraph;
