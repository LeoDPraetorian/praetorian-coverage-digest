// Wrapper for context7 resolve-library-id tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { validateNoPathTraversal, validateNoCommandInjection, validateNoXSS, validateNoControlChars } from '../config/lib/sanitize';

/**
 * Schema Discovery Results (3 test cases: react, typescript, nonexistent):
 *
 * ✅ Confirmed: Context7 MCP returns PLAIN TEXT, not JSON
 *
 * Response Format:
 * - Type: string (10,000+ characters)
 * - Structure: Text with "----------" delimiters
 * - Header: "Available Libraries:\n\nEach result includes:..."
 * - Entries: 30 libraries per response
 *
 * Each library entry format:
 * - Title: <name>
 * - Context7-compatible library ID: <id>
 * - Description: <text>
 * - Code Snippets: <number> (optional)
 * - Source Reputation: High|Medium|Low|Unknown (optional)
 * - Benchmark Score: <number> (optional)
 * - Versions: <comma-separated> (optional)
 *
 * Edge cases discovered:
 * - Even "nonexistent" queries return 30 results (fuzzy matching)
 * - All fields after Description are optional
 * - Versions field present for some libraries
 */

// ============================================================================
// Input Schema (matches ACTUAL context7 MCP tool signature)
// Security hardened with defense-in-depth validation
// ============================================================================

const InputSchema = z.object({
  libraryName: z.string()
    .min(1, 'Library name is required')
    .max(256, 'Library name too long (max 256 characters)')
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
    .describe('Library name to search for (alphanumeric, @, -, _, . only)')
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  libraries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    codeSnippets: z.number().optional(),
    sourceReputation: z.enum(['High', 'Medium', 'Low', 'Unknown']).optional(),
    benchmarkScore: z.number().optional(),
    versions: z.array(z.string()).optional()
  })),
  totalResults: z.number()
});

// ============================================================================
// Text Parser for Context7 Formatted Response
// ============================================================================

/**
 * Parse Context7's text-formatted library results
 *
 * @param textResponse - Plain text response from Context7 MCP
 * @returns Parsed library array
 */
function parseLibraryResults(textResponse: string): Array<{
  id: string;
  name: string;
  description?: string;
  codeSnippets?: number;
  sourceReputation?: 'High' | 'Medium' | 'Low' | 'Unknown';
  benchmarkScore?: number;
  versions?: string[];
}> {
  const libraries: Array<any> = [];

  // Split by "----------" delimiter
  const blocks = textResponse.split('----------');

  // Skip first block (header text)
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Extract fields using regex patterns
    const titleMatch = block.match(/- Title: (.+)/);
    const idMatch = block.match(/- Context7-compatible library ID: (.+)/);
    const descMatch = block.match(/- Description: (.+?)(?=\n-|\n\n|$)/s);
    const snippetsMatch = block.match(/- Code Snippets: (\d+)/);
    const reputationMatch = block.match(/- Source Reputation: (High|Medium|Low|Unknown)/);
    const scoreMatch = block.match(/- Benchmark Score: ([\d.]+)/);
    const versionsMatch = block.match(/- Versions: (.+)/);

    // ID and Title are required
    if (!idMatch || !titleMatch) continue;

    const library: any = {
      id: idMatch[1].trim(),
      name: titleMatch[1].trim()
    };

    // Add optional fields
    if (descMatch) {
      library.description = descMatch[1].trim().substring(0, 200); // Truncate for token efficiency
    }

    if (snippetsMatch) {
      library.codeSnippets = parseInt(snippetsMatch[1], 10);
    }

    if (reputationMatch) {
      library.sourceReputation = reputationMatch[1] as 'High' | 'Medium' | 'Low' | 'Unknown';
    }

    if (scoreMatch) {
      library.benchmarkScore = parseFloat(scoreMatch[1]);
    }

    if (versionsMatch) {
      library.versions = versionsMatch[1].split(',').map(v => v.trim());
    }

    libraries.push(library);
  }

  return libraries;
}

// ============================================================================
// Tool Wrapper
// ============================================================================

export const resolveLibraryId = {
  name: 'context7.resolve-library-id',
  inputSchema: InputSchema,
  parameters: InputSchema,  // For test generation compatibility
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call context7 MCP server via SHARED client
    const rawData = await callMCPTool<string>(
      'context7',
      'resolve-library-id',  // Actual Upstash context7 MCP tool name
      validated
    );

    // Parse text response into structured data
    const libraries = parseLibraryResults(rawData);

    const filtered = {
      libraries,
      totalResults: libraries.length
    };

    return OutputSchema.parse(filtered);
  }
};

// Type exports
export type ResolveLibraryIdInput = z.infer<typeof InputSchema>;
export type ResolveLibraryIdOutput = z.infer<typeof OutputSchema>;
