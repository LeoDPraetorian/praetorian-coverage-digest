// Wrapper for context7 get-library-docs tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { validateNoPathTraversal, validateNoCommandInjection, validateNoXSS, validateNoControlChars } from '../config/lib/sanitize';

/**
 * Schema Discovery Results (2 test cases: react code mode, react info mode):
 *
 * ✅ Confirmed: Context7 MCP returns PLAIN TEXT documentation
 *
 * Response Format:
 * - Type: string (5,000-6,000 characters typically)
 * - Structure: Plain text markdown documentation
 * - Tokens: ~1,300-1,400 tokens per response
 * - Content varies by mode:
 *   * code mode: API references, code examples, function signatures
 *   * info mode: Conceptual guides, overviews, tutorials
 *
 * Edge cases discovered:
 * - Response is always a string (not JSON)
 * - Length varies significantly by library
 * - No structured fields, just markdown text
 */

// ============================================================================
// Input Schema (matches ACTUAL context7 MCP tool signature)
// Security hardened with defense-in-depth validation
// ============================================================================

const InputSchema = z.object({
  context7CompatibleLibraryID: z.string()
    .min(1, 'Library ID is required')
    .max(512, 'Library ID too long (max 512 characters)')
    .refine(validateNoPathTraversal, {
      message: 'Path traversal detected'
    })
    .refine(validateNoCommandInjection, {
      message: 'Invalid characters detected - special shell characters not allowed'
    })
    .refine(validateNoXSS, {
      message: 'Invalid characters detected - XSS patterns not allowed'
    })
    .refine(validateNoControlChars, {
      message: 'Control characters not allowed'
    })
    .describe('Context7 library ID from resolve-library-id (format: /username/library)'),
  mode: z.enum(['code', 'info'])
    .optional()
    .default('code')
    .describe('Documentation mode: "code" for API references and code examples (default), "info" for conceptual guides'),
  topic: z.string()
    .max(256, 'Topic too long (max 256 characters)')
    .refine(val => !val || validateNoCommandInjection(val), {
      message: 'Invalid characters detected in topic'
    })
    .refine(val => !val || validateNoXSS(val), {
      message: 'Invalid characters detected in topic - XSS patterns not allowed'
    })
    .refine(val => !val || validateNoControlChars(val), {
      message: 'Control characters not allowed in topic'
    })
    .optional()
    .describe('Topic to focus documentation on'),
  page: z.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(10, 'Page must not exceed 10')
    .optional()
    .default(1)
    .describe('Page number for pagination')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// Compatible with skill-manager Context7Data interface
// ============================================================================

const OutputSchema = z.object({
  // Required fields for skill-manager compatibility
  libraryName: z.string().describe('Library name derived from libraryId'),
  libraryId: z.string().describe('Context7 library ID'),
  content: z.string().describe('Documentation content (rawDocs)'),
  fetchedAt: z.string().describe('ISO timestamp when docs were fetched'),

  // Optional metadata
  version: z.string().optional().describe('Library version if detected'),

  // Additional context for agent use
  mode: z.enum(['code', 'info']).describe('Documentation mode used'),
  topic: z.string().optional().describe('Topic filter applied'),
  page: z.number().describe('Page number'),
  estimatedTokens: z.number().describe('Estimated token count'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Derive library name from Context7 library ID
 * Examples:
 *   "/user/react" -> "react"
 *   "/npm/lodash" -> "lodash"
 *   "/user/@types/node" -> "@types/node"
 */
function deriveLibraryName(libraryId: string): string {
  // Split by '/' and take the last segment(s)
  const parts = libraryId.split('/').filter(Boolean);

  // Handle scoped packages (e.g., "@types/node")
  if (parts.length >= 2 && parts[parts.length - 2]?.startsWith('@')) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }

  // Return last segment
  return parts[parts.length - 1] || libraryId;
}

// ============================================================================
// Tool Wrapper
// ============================================================================

export const getLibraryDocs = {
  name: 'context7.get-library-docs',
  inputSchema: InputSchema,
  parameters: InputSchema,  // For test generation compatibility
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call context7 MCP server via SHARED client
    // Returns plain text documentation string
    const rawData = await callMCPTool<string>(
      'context7',
      'get-library-docs',  // Actual Upstash context7 MCP tool name
      validated
    );

    // Build output compatible with skill-manager Context7Data interface
    const filtered = {
      // Required for skill-manager compatibility
      libraryName: deriveLibraryName(validated.context7CompatibleLibraryID),
      libraryId: validated.context7CompatibleLibraryID,
      content: rawData,  // rawDocs equivalent
      fetchedAt: new Date().toISOString(),

      // Additional context for agent use
      mode: validated.mode || 'code',
      topic: validated.topic,
      page: validated.page || 1,
      estimatedTokens: Math.ceil(rawData.length / 4),
    };

    return OutputSchema.parse(filtered);
  },
};

// Type exports
export type GetLibraryDocsInput = z.infer<typeof InputSchema>;
export type GetLibraryDocsOutput = z.infer<typeof OutputSchema>;
