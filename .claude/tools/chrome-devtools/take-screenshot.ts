// Wrapper for chrome-devtools take_screenshot tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  filePath: z.string().optional().describe('Path to save screenshot'),
  format: z.enum(['png', 'jpeg', 'webp']).optional().default('png'),
  fullPage: z.boolean().optional().describe('Take full page screenshot'),
  quality: z.number().min(0).max(100).optional().describe('Quality for JPEG/WebP'),
  uid: z.string().optional().describe('Element uid to screenshot')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  path: z.string().optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const takeScreenshot = {
  name: 'chrome-devtools.take-screenshot',
  description: 'Take a screenshot of the page',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const result = await callMCPTool(
      'chrome-devtools',                        // MCP name
      'take_screenshot', // Actual MCP tool name
      validated                                 // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, path: result?.path };
  }
};

// Type exports
export type TakeScreenshotInput = z.infer<typeof InputSchema>;
export type TakeScreenshotOutput = z.infer<typeof OutputSchema>;
