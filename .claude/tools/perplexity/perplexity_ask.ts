/**
 * perplexity_ask - Perplexity MCP Wrapper
 *
 * General-purpose conversational AI with real-time web search using sonar-pro model
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1000 tokens (conversation response)
 * - vs Direct MCP: Unknown baseline
 * - Reduction: ~80% (estimated)
 *
 * Schema Discovery Results:
 *
 * INPUT (required):
 * - messages: Array<{role: string, content: string}>
 *
 * OUTPUT:
 * - Plain markdown text: "**Bold** formatting"
 * - Not JSON - raw text response
 *
 * Edge cases discovered:
 * - Returns markdown-formatted text, not JSON
 * - Supports multi-turn conversations
 * - Can include bold, italic, lists in response
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Message schema for conversation
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
 * Maps to perplexity_ask params
 */
export const perplexityAskParams = z.object({
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .describe('Array of conversation messages')
});

export type PerplexityAskInput = z.infer<typeof perplexityAskParams>;

/**
 * Output schema - markdown text response
 */
export const perplexityAskOutput = z.object({
  content: z.string().describe('Response as markdown-formatted text'),
  metadata: z.object({
    messageCount: z.number()
  }).optional()
});

export type PerplexityAskOutput = z.infer<typeof perplexityAskOutput>;

/**
 * Engage in conversation using Perplexity Sonar API
 *
 * @example
 * ```typescript
 * import { perplexityAsk } from './.claude/tools/perplexity';
 *
 * // Simple question
 * const answer = await perplexityAsk.execute({
 *   messages: [
 *     { role: 'user', content: 'What is TypeScript?' }
 *   ]
 * });
 *
 * // Multi-turn conversation
 * const response = await perplexityAsk.execute({
 *   messages: [
 *     { role: 'user', content: 'What are REST APIs?' },
 *     { role: 'assistant', content: 'REST APIs are...' },
 *     { role: 'user', content: 'How do they compare to GraphQL?' }
 *   ]
 * });
 *
 * console.log(answer.content);
 * ```
 */
export const perplexityAsk = {
  name: 'perplexity.ask',
  description: 'Conversational AI with real-time web search using sonar-pro model',
  parameters: perplexityAskParams,

  async execute(input: PerplexityAskInput): Promise<PerplexityAskOutput> {
    // Validate input
    const validated = perplexityAskParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'perplexity',
      'perplexity_ask',
      validated
    );

    if (!rawData) {
      throw new Error('Empty response from Perplexity ask');
    }

    // Handle plain text/markdown response (not JSON)
    const content = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

    // Truncate for token efficiency (keep first 3000 chars for conversational responses)
    const truncated = content.length > 3000
      ? content.substring(0, 3000) + '\n... [truncated for token efficiency]'
      : content;

    // Validate and return output
    return perplexityAskOutput.parse({
      content: truncated,
      metadata: {
        messageCount: validated.messages.length
      }
    });
  },

  tokenEstimate: {
    withoutCustomTool: 5000,
    withCustomTool: 0,
    whenUsed: 1000,
    reduction: '80%'
  }
};
