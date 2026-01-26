/**
 * Pyghidra gen_callgraph wrapper - STUB IMPLEMENTATION
 *
 * This is a stub implementation to support TDD test development.
 * Full implementation will be provided by tool-developer.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// ==========================
// Input Schemas
// ==========================

const BinaryNameSchema = z
  .string()
  .min(1, 'binary_name is required')
  .max(255, 'binary_name too long (max: 255)')
  .refine(validateNoPathTraversal, 'Path traversal not allowed in binary_name')
  .refine(validateNoControlChars, 'Control characters not allowed in binary_name');

const SymbolNameSchema = z
  .string()
  .min(1, 'Symbol name is required')
  .max(255, 'Symbol name too long')
  .refine(
    (val) => !val.match(/^(0x)?[0-9a-fA-F]+$/),
    'Use address format for hex values'
  );

const AddressSchema = z
  .string()
  .refine((val) => {
    // Must match hex pattern
    if (!val.match(/^(0x)?[0-9a-fA-F]+$/)) return false;
    // Extract hex part
    const hexPart = val.replace(/^0x/, '');
    // Must be 1-16 characters
    return hexPart.length >= 1 && hexPart.length <= 16;
  }, 'Invalid hex address format');

const DirectionSchema = z.enum(['calling', 'called']).default('calling');
const DisplayTypeSchema = z.enum(['TB', 'LR', 'BT', 'RL']).default('TB');
const MaxDepthSchema = z.coerce
  .number()
  .int('max_depth must be an integer')
  .min(1, 'max_depth must be at least 1')
  .max(10, 'max_depth cannot exceed 10 (DoS prevention)')
  .default(5);
const MaxRunTimeSchema = z.coerce
  .number()
  .int('max_run_time must be an integer')
  .min(1, 'max_run_time must be at least 1 second')
  .max(300, 'max_run_time cannot exceed 300 seconds (5 minutes)')
  .default(60);
const CondenseThresholdSchema = z.coerce
  .number()
  .int('condense_threshold must be an integer')
  .min(1)
  .max(100)
  .optional();
const LayerSchema = z.coerce.number().int().min(0).max(10).optional();

export const genCallgraphInputSchema = z.object({
  binary_name: BinaryNameSchema,
  function_name: z.union([SymbolNameSchema, AddressSchema]),
  direction: DirectionSchema,
  display_type: DisplayTypeSchema,
  include_refs: z.boolean().default(false),
  max_depth: MaxDepthSchema,
  max_run_time: MaxRunTimeSchema,
  condense_threshold: CondenseThresholdSchema,
  top_layers: LayerSchema,
  bottom_layers: LayerSchema,
  include_graph: z.boolean().default(false),
});

export type GenCallgraphInput = z.infer<typeof genCallgraphInputSchema>;

// ==========================
// Output Types
// ==========================

interface CallgraphMetrics {
  node_count: number;
  edge_count: number;
  depth_reached?: number;
}

interface GenCallgraphOutput {
  function_name: string;
  direction: 'calling' | 'called';
  mermaid_url: string;
  metrics: CallgraphMetrics;
  graph?: string;
  warning?: string;
}

interface PyghidraError {
  message: string;
  code: string;
}

interface GenCallgraphSuccess {
  ok: true;
  data: GenCallgraphOutput;
  meta: {
    estimatedTokens: number;
    tokenSavings?: string;
  };
}

interface GenCallgraphFailure {
  ok: false;
  error: PyghidraError;
}

type GenCallgraphResponse = GenCallgraphSuccess | GenCallgraphFailure;

// ==========================
// Helper Functions
// ==========================

function parseGraphMetrics(graphStr: string): CallgraphMetrics {
  if (!graphStr) {
    return { node_count: 0, edge_count: 0 };
  }

  // Count unique node IDs (A, B, C pattern)
  const nodePattern = /([A-Za-z0-9_]+)\s*\[/g;
  const nodeIds = new Set<string>();
  let match;
  while ((match = nodePattern.exec(graphStr)) !== null) {
    nodeIds.add(match[1]);
  }

  // Count edges (-->)
  const edgeCount = (graphStr.match(/-->/g) || []).length;

  // Calculate depth reached (approximate by counting levels in graph structure)
  const lines = graphStr.split('\n');
  let maxDepth = 0;
  for (const line of lines) {
    const indentMatch = line.match(/^\s+/);
    const indent = indentMatch ? indentMatch[0].length : 0;
    const depth = Math.floor(indent / 2) + 1;
    maxDepth = Math.max(maxDepth, depth);
  }

  return {
    node_count: nodeIds.size,
    edge_count: edgeCount,
    depth_reached: maxDepth || (nodeIds.size > 0 ? 1 : 0),
  };
}

function classifyError(error: Error, input?: GenCallgraphInput): PyghidraError {
  const message = error.message.toLowerCase();

  if (message.includes('not found') || message.includes('does not exist')) {
    if (message.includes('binary')) {
      return {
        message: error.message,
        code: 'BINARY_NOT_FOUND',
      };
    }
    const functionName = input?.function_name || 'unknown';
    const binaryName = input?.binary_name || '';
    return {
      message: `Symbol "${functionName}" not found in "${binaryName}".\nUse search_symbols_by_name to find valid symbols.`,
      code: 'SYMBOL_NOT_FOUND',
    };
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    const maxDepth = input?.max_depth || 5;
    return {
      message: `${error.message}\nTry reducing max_depth from ${maxDepth} or use CALLED direction for focused analysis.`,
      code: 'TIMEOUT',
    };
  }

  return {
    message: error.message,
    code: 'UNKNOWN_ERROR',
  };
}

// ==========================
// Main Execute Function - STUB
// ==========================

export async function execute(rawInput: unknown): Promise<GenCallgraphResponse> {
  // Validate input
  const parseResult = genCallgraphInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
      },
    };
  }

  const input = parseResult.data;

  try {
    // Call MCP tool
    const rawResponse = await callMCPTool<{ mermaid_url: string; graph: string }>('pyghidra',
      'gen_callgraph',
      {
        binary_name: input.binary_name,
        function_name: input.function_name,
        direction: input.direction,
        display_type: input.display_type,
        include_refs: input.include_refs,
        max_depth: input.max_depth,
        max_run_time: input.max_run_time,
        condense_threshold: input.condense_threshold,
        top_layers: input.top_layers,
        bottom_layers: input.bottom_layers,
      }
    );

    // Parse metrics from graph
    const metrics = parseGraphMetrics(rawResponse.graph || '');

    // Build output
    const output: GenCallgraphOutput = {
      function_name: input.function_name,
      direction: input.direction,
      mermaid_url: rawResponse.mermaid_url,
      metrics,
    };

    // Add warning for orphan functions
    if (metrics.edge_count === 0 && metrics.node_count === 1) {
      output.warning = `No ${input.direction} relationships found. Try direction: ${input.direction === 'calling' ? 'called' : 'calling'}.`;
    }

    // Include graph only if requested
    if (input.include_graph && rawResponse.graph) {
      output.graph = rawResponse.graph;
    }

    // Calculate token estimates
    const outputTokens = estimateTokens(output);
    const fullGraphTokens = rawResponse.graph ? estimateTokens(rawResponse.graph) : 0;

    const tokenSavings =
      fullGraphTokens > 0 && !input.include_graph
        ? `${Math.round(((fullGraphTokens - outputTokens) / fullGraphTokens) * 100)}% (omitted ${Math.round(fullGraphTokens / 250)}KB graph)`
        : undefined;

    return {
      ok: true,
      data: output,
      meta: {
        estimatedTokens: outputTokens,
        tokenSavings,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: classifyError(error as Error, input),
    };
  }
}

export const genCallgraph = {
  name: 'pyghidra.gen_callgraph',
  description:
    'Generates a MermaidJS call graph for a specified function. Returns URL only by default for token efficiency.',
  parameters: genCallgraphInputSchema,
  execute,
};
