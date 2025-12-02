// Praetorian-CLI MCP Wrapper: attributes_get
// Purpose: Get specific attribute with validation
// Token savings: ~50% (detailed attribute × 200 tokens → 100 tokens filtered)

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  key: z.string().min(1).startsWith('#attribute#')
});

// ============================================================================
// Output Schema (Filtered)
// ============================================================================

const FilteredOutputSchema = z.object({
  key: z.string(),
  name: z.string(),
  value: z.string(),
  source: z.string().optional(),
  estimated_tokens: z.number()
}).nullable();

// ============================================================================
// Tool Wrapper
// ============================================================================

export const attributesGet = {
  name: 'praetorian-cli.attributes_get',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // TODO: Replace with actual MCP client call
    const rawResult = await callMCPTool('praetorian-cli', 'attributes_get', validated);

    if (!rawResult) {
      return null;
    }

    // Filter: Return essential fields only
    const filtered = {
      key: rawResult.key,
      name: rawResult.name,
      value: rawResult.value,
      source: rawResult.source,
      estimated_tokens: 100
    };

    // Validate output
    return FilteredOutputSchema.parse(filtered);
  }
};

// REMOVED: Mock function - now using real MCP server
// /**
//  * Mock MCP call (replace with real implementation)
//  */
// async function mockAttributesGetCall(params: any): Promise<any> {
//   return {
//     key: params.key,
//     name: 'port',
//     value: '22',
//     source: '#asset#example.com#1.2.3.4',
//     created: '2025-01-01T00:00:00Z'
//   };
// }
// 
// 

// ============================================================================
// Type Exports
// ============================================================================

export type AttributesGetInput = z.infer<typeof InputSchema>;
export type AttributesGetOutput = z.infer<typeof FilteredOutputSchema>;
