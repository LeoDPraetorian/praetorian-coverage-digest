// Wrapper for chrome-devtools fill_form tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  elements: z.array(
    z.object({
      name: z.string().describe('Human-readable field name'),
      ref: z.string().describe('Element reference from snapshot'),
      type: z.enum(['textbox', 'checkbox', 'radio', 'combobox', 'slider']),
      value: z.string().describe('Value to fill')
    })
  ).min(1)
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

export const fillForm = {
  name: 'chrome-devtools.fill-form',
  description: 'Fill multiple form fields',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    await callMCPTool(
      'chrome-devtools',                  // MCP name
      'fill_form', // Actual MCP tool name
      validated                           // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true };
  }
};

// Type exports
export type FillFormInput = z.infer<typeof InputSchema>;
export type FillFormOutput = z.infer<typeof OutputSchema>;
