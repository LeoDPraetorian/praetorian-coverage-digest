// Wrapper for chrome-devtools fill tool

import { z } from 'zod';
import { PageIdSchema, SelectorSchema, TimeoutSchema, SuccessResultSchema } from './types';
import { wrapError } from './errors';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  pageId: PageIdSchema,
  selector: SelectorSchema,
  value: z.string().max(10000, 'Value too long'),
  timeout: TimeoutSchema.optional(),
  clear: z.boolean().default(true)
});

// ============================================================================
// Output Schema
// ============================================================================

const OutputSchema = SuccessResultSchema;

// ============================================================================
// Tool Wrapper
// ============================================================================

export const fill = {
  name: 'chrome-devtools.fill',
  description: 'Fill an input field with a value',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    try {
      // Validate input
      const validated = InputSchema.parse(input);

      // Security: Check for malicious patterns
      if (validated.selector.includes('<script') || validated.selector.includes('javascript:')) {
        throw new Error('Invalid selector: potential XSS detected');
      }

      // Call chrome-devtools MCP server independently via SDK
      const { callMCPTool, MCPTools } = await import('./mcp-client.js');
      await callMCPTool(MCPTools.FILL, {
        uid: validated.selector,
        value: validated.value
      });

      // Return filtered result for token efficiency
      return OutputSchema.parse({
        success: true,
        message: `Filled element: ${validated.selector}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw wrapError(error, 'fill');
    }
  }
};

// Type exports
export type FillInput = z.infer<typeof InputSchema>;
export type FillOutput = z.infer<typeof OutputSchema>;
