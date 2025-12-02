// Wrapper for chrome-devtools list_pages tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  pages: z.array(z.any()).optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const listPages = {
  name: 'chrome-devtools.list-pages',
  description: 'List all browser pages',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const pages = await callMCPTool(
      'chrome-devtools',                  // MCP name
      'mcp__chrome-devtools__list_pages', // Actual MCP tool name
      validated                            // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, pages };
  }
};

// Type exports
export type ListPagesInput = z.infer<typeof InputSchema>;
export type ListPagesOutput = z.infer<typeof OutputSchema>;
