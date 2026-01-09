/**
 * perplexity_research - Perplexity MCP Wrapper
 *
 * Deep, comprehensive research using sonar-deep-research model with citations
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~2000 tokens (research with citations)
 * - vs Direct MCP: Unknown baseline
 * - Reduction: ~75% (estimated)
 *
 * Schema Discovery Results:
 *
 * INPUT (required):
 * - messages: Array<{role: string, content: string}>
 *
 * INPUT (optional):
 * - strip_thinking: boolean (default: false) - Remove <think> tags to save tokens
 *
 * OUTPUT:
 * - Plain text with citations: "Finding...\n\n[1] Source"
 * - Not JSON - raw text response
 * - May include thinking tags unless stripped
 *
 * Edge cases discovered:
 * - Can timeout (requires 60s+ timeout)
 * - Returns comprehensive research with citations
 * - strip_thinking saves tokens by removing reasoning process
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Message schema for research query
 */
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant'])
    .describe('Role of the message sender'),
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .refine(validateNoControlChars, 'Control characters not allowed')
    // Note: Path traversal and command injection validators removed for message content
    // These are designed for file paths/shell commands, not conversational AI content
    .describe('The content of the message')
});

/**
 * Input validation schema
 * Maps to perplexity_research params
 */
export const perplexityResearchParams = z.object({
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .optional()
    .describe('Array of conversation messages'),

  // Convenience parameter - converts to messages internally
  query: z.string()
    .min(1, 'Query cannot be empty')
    .optional()
    .describe('Convenience: auto-wrapped into messages array'),

  strip_thinking: z.boolean()
    .optional()
    .describe('If true, removes <think>...</think> tags to save context tokens')
}).refine(
  data => data.messages || data.query,
  'Either messages or query is required'
);

export type PerplexityResearchInput = z.infer<typeof perplexityResearchParams>;

/**
 * Output schema - research text with citations
 */
export const perplexityResearchOutput = z.object({
  content: z.string().describe('Research findings as plain text with citations'),
  metadata: z.object({
    messageCount: z.number(),
    citationCount: z.number().optional(),
    thinkingStripped: z.boolean()
  }).optional()
});

export type PerplexityResearchOutput = z.infer<typeof perplexityResearchOutput>;

/**
 * Perform deep research using Perplexity API with citations
 *
 * @example
 * ```typescript
 * import { perplexityResearch } from './.claude/tools/perplexity';
 *
 * // Convenience: simple query string (auto-wrapped into messages)
 * const quickResearch = await perplexityResearch.execute({
 *   query: 'Research the latest developments in large language models'
 * });
 *
 * // Advanced: full messages array for multi-turn conversations
 * const research = await perplexityResearch.execute({
 *   messages: [
 *     { role: 'user', content: 'Research the latest developments in large language models' }
 *   ]
 * });
 *
 * // Research without thinking tags (saves tokens)
 * const concise = await perplexityResearch.execute({
 *   query: 'Compare React state management approaches',
 *   strip_thinking: true
 * });
 *
 * console.log(research.content); // Includes citations like [1], [2]
 * ```
 */
export const perplexityResearch = {
  name: 'perplexity.research',
  description: 'Deep research with comprehensive analysis and citations',
  parameters: perplexityResearchParams,

  async execute(input: PerplexityResearchInput): Promise<PerplexityResearchOutput> {
    // Validate input
    const validated = perplexityResearchParams.parse(input);

    // Convert query to messages format if query was provided
    const effectiveMessages = validated.messages ?? [
      { role: 'user' as const, content: validated.query! }
    ];

    // Prepare params for MCP (messages + optional strip_thinking)
    const mcpParams: { messages: typeof effectiveMessages; strip_thinking?: boolean } = {
      messages: effectiveMessages
    };
    if (validated.strip_thinking !== undefined) {
      mcpParams.strip_thinking = validated.strip_thinking;
    }

    // Call MCP tool with longer timeout (research takes time)
    const rawData = await callMCPTool(
      'perplexity',
      'perplexity_research',
      mcpParams,
      { timeoutMs: 120000 } // 2 min timeout for deep research
    );

    if (!rawData) {
      throw new Error('Empty response from Perplexity research');
    }

    // Handle plain text response (not JSON)
    const content = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

    // Count citations (format: [1], [2], etc.)
    const citationMatches = content.match(/\[\d+\]/g);
    const citationCount = citationMatches ? citationMatches.length : 0;

    // Truncate for token efficiency (keep first 8000 chars for research)
    const truncated = content.length > 8000
      ? content.substring(0, 8000) + '\n... [truncated for token efficiency]'
      : content;

    // Validate and return output
    return perplexityResearchOutput.parse({
      content: truncated,
      metadata: {
        messageCount: effectiveMessages.length,
        citationCount,
        thinkingStripped: validated.strip_thinking || false
      }
    });
  },

  tokenEstimate: {
    withoutCustomTool: 8000,
    withCustomTool: 0,
    whenUsed: 2000,
    reduction: '75%'
  }
};
