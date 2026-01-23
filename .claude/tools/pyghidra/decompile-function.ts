/**
 * Pyghidra decompile_function wrapper - STUB IMPLEMENTATION
 *
 * This is a stub implementation to support TDD test development.
 * Full implementation will be provided by tool-developer.
 *
 * Architecture: .claude/.output/mcp-wrappers/2026-01-15-102902-pyghidra/tools/decompile_function/architecture.md
 * Test Plan: .claude/.output/mcp-wrappers/2026-01-15-102902-pyghidra/tools/decompile_function/test-plan.md
 */

import { z } from 'zod';
import { BinaryNameSchema, SymbolNameSchema } from './lib/schemas.js';
import {
  PyghidraError,
  BinaryNotFoundError,
  SymbolNotFoundError,
} from './lib/errors.js';
import { callMcpTool } from './lib/client.js';

// ============================================================================
// Input Schema
// ============================================================================

export const decompileFunctionParams = z.object({
  binary_name: BinaryNameSchema,
  name: SymbolNameSchema,
});

export type DecompileFunctionInput = z.infer<typeof decompileFunctionParams>;

// ============================================================================
// Output Types
// ============================================================================

export interface DecompileFunctionOutput {
  code: string;
  function_signature?: string;
  summary: {
    function_name: string;
    total_lines: number;
    returned_lines: number;
    was_truncated: boolean;
    truncated_lines: number;
  };
  estimatedTokens: number;
}

// ============================================================================
// Truncation Configuration
// ============================================================================

const TRUNCATION_CONFIG = {
  maxLines: 200,
  maxChars: 8000,
};

// ============================================================================
// Internal Helpers
// ============================================================================

interface TruncationResult {
  code: string;
  wasTruncated: boolean;
  totalLines: number;
  returnedLines: number;
}

function truncateDecompiledCode(rawCode: string): TruncationResult {
  const lines = rawCode.split('\n');
  const totalLines = lines.length;
  const totalChars = rawCode.length;

  const needsLineTruncation = totalLines > TRUNCATION_CONFIG.maxLines;
  const needsCharTruncation = totalChars > TRUNCATION_CONFIG.maxChars;

  if (!needsLineTruncation && !needsCharTruncation) {
    return {
      code: rawCode,
      wasTruncated: false,
      totalLines,
      returnedLines: totalLines,
    };
  }

  let truncatedCode: string;
  let returnedLines: number;

  if (needsLineTruncation) {
    const keptLines = lines.slice(0, TRUNCATION_CONFIG.maxLines);
    truncatedCode = keptLines.join('\n');
    returnedLines = TRUNCATION_CONFIG.maxLines;
  } else {
    truncatedCode = rawCode;
    returnedLines = totalLines;
  }

  if (truncatedCode.length > TRUNCATION_CONFIG.maxChars) {
    truncatedCode = truncatedCode.substring(0, TRUNCATION_CONFIG.maxChars);
    returnedLines = truncatedCode.split('\n').length;
  }

  const remainingLines = totalLines - returnedLines;
  const suffix = `\n\n// ... [truncated - function continues for ${remainingLines} more lines]`;

  return {
    code: truncatedCode + suffix,
    wasTruncated: true,
    totalLines,
    returnedLines,
  };
}

function extractFunctionSignature(code: string): string | undefined {
  // Match typical C function signature patterns
  const signatureMatch = code.match(
    /^[a-zA-Z_][a-zA-Z0-9_*\s]*\s+\**\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)/m
  );
  return signatureMatch ? signatureMatch[0].trim() : undefined;
}

function parseDecompileError(
  error: unknown,
  binaryName: string,
  functionName: string
): PyghidraError {
  const message = error instanceof Error ? error.message : String(error);

  if (/function not found|symbol not found/i.test(message)) {
    const suggestMatch = message.match(/did you mean:\s*(.+)/i);
    const suggestions = suggestMatch
      ? suggestMatch[1].split(',').map((s) => s.trim())
      : undefined;
    return new SymbolNotFoundError(functionName, binaryName, suggestions);
  }

  if (/binary not found/i.test(message)) {
    const suggestMatch = message.match(/did you mean:\s*(.+)/i);
    const suggestions = suggestMatch
      ? suggestMatch[1].split(',').map((s) => s.trim())
      : undefined;
    return new BinaryNotFoundError(binaryName, suggestions);
  }

  if (/timeout|timed out/i.test(message)) {
    return new PyghidraError(
      `Decompilation timed out for "${functionName}". Function may be too complex.`,
      'TIMEOUT',
      { binaryName, functionName }
    );
  }

  return new PyghidraError(message, 'MCP_ERROR', { binaryName, functionName });
}

function estimateTokens(response: DecompileFunctionOutput): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(response.code.length / 4);
}

// ============================================================================
// MCP Response Type
// ============================================================================

interface RawDecompileResponse {
  decompiled_code: string;
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const decompileFunction = {
  name: 'pyghidra.decompile_function',
  description: 'Decompile a function from a binary into pseudo-C code (truncated to 200 lines/8KB)',
  parameters: decompileFunctionParams,

  tokenEstimate: {
    withoutCustomTool: 20000,
    withCustomTool: 0,
    whenUsed: 1500,
    reduction: '92%',
  },

  async execute(input: DecompileFunctionInput): Promise<DecompileFunctionOutput> {
    // 1. Validate input (Zod parse)
    const validated = decompileFunctionParams.parse(input);

    // 2. Call MCP tool
    let raw: RawDecompileResponse;
    try {
      raw = await callMcpTool<RawDecompileResponse>('decompile_function', {
        binary_name: validated.binary_name,
        name: validated.name,
      });
    } catch (error) {
      throw parseDecompileError(error, validated.binary_name, validated.name);
    }

    // 3. Validate non-empty response
    if (!raw.decompiled_code || raw.decompiled_code.trim().length === 0) {
      throw new PyghidraError(
        `Decompilation returned empty result for "${validated.name}"`,
        'EMPTY_RESULT',
        { binaryName: validated.binary_name, functionName: validated.name }
      );
    }

    // 4. Truncate code (200 lines / 8KB limit)
    const truncation = truncateDecompiledCode(raw.decompiled_code);

    // 5. Extract function signature
    const functionSignature = extractFunctionSignature(truncation.code);

    // 6. Build response with metadata
    const response: DecompileFunctionOutput = {
      code: truncation.code,
      function_signature: functionSignature,
      summary: {
        function_name: validated.name,
        total_lines: truncation.totalLines,
        returned_lines: truncation.returnedLines,
        was_truncated: truncation.wasTruncated,
        truncated_lines: truncation.totalLines - truncation.returnedLines,
      },
      estimatedTokens: 0,
    };

    // 7. Calculate token estimate
    response.estimatedTokens = estimateTokens(response);

    return response;
  },
};
