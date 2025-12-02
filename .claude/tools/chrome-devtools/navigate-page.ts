// Wrapper for chrome-devtools navigate_page tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  type: z.enum(['url', 'back', 'forward', 'reload']).optional(),
  url: z.string().url().optional(),
  timeout: z.number().int().optional(),
  ignoreCache: z.boolean().optional()
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const navigatePage = {
  name: 'chrome-devtools.navigate-page',
  description: 'Navigate browser page via chrome-devtools MCP',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                      // MCP name
      'mcp__chrome-devtools__navigate_page',  // Actual MCP tool name
      validated                                // Pass params directly (no transformation)
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type NavigatePageInput = z.infer<typeof InputSchema>;
export type NavigatePageOutput = z.infer<typeof OutputSchema>;
