/**
 * Perplexity MCP Wrappers
 *
 * Custom tools that wrap Perplexity MCP server for 80%+ token reduction.
 *
 * Architecture:
 * - Filesystem discovery (0 tokens at session start)
 * - MCP calls only when imported and used
 * - Shared MCP client for independent connections
 * - Token reduction: ~5000 → 0 at start, ~500-2000 when used
 *
 * Usage:
 * ```typescript
 * import {
 *   perplexitySearch,
 *   perplexityAsk,
 *   perplexityResearch,
 *   perplexityReason
 * } from './.claude/tools/perplexity';
 *
 * // Web search
 * const searchResults = await perplexitySearch.execute({
 *   query: 'TypeScript best practices 2025'
 * });
 *
 * // Conversational AI
 * const answer = await perplexityAsk.execute({
 *   messages: [
 *     { role: 'user', content: 'What is Model Context Protocol?' }
 *   ]
 * });
 *
 * // Deep research with citations
 * const research = await perplexityResearch.execute({
 *   messages: [
 *     { role: 'user', content: 'Research large language model developments' }
 *   ],
 *   strip_thinking: true
 * });
 *
 * // Advanced reasoning
 * const reasoning = await perplexityReason.execute({
 *   messages: [
 *     { role: 'user', content: 'Explain the logic behind this problem' }
 *   ]
 * });
 * ```
 */

// Search operations
export {
  perplexitySearch,
  type PerplexitySearchInput,
  type PerplexitySearchOutput
} from './perplexity_search';

// Conversational AI operations
export {
  perplexityAsk,
  type PerplexityAskInput,
  type PerplexityAskOutput
} from './perplexity_ask';

// Research operations
export {
  perplexityResearch,
  type PerplexityResearchInput,
  type PerplexityResearchOutput
} from './perplexity_research';

// Reasoning operations
export {
  perplexityReason,
  type PerplexityReasonInput,
  type PerplexityReasonOutput
} from './perplexity_reason';

/**
 * Token Reduction Summary
 *
 * Without Custom Tools (Direct MCP):
 * - Session start: ~5000 tokens per MCP server (estimated)
 * - When used: Same ~5000 tokens
 * - Total: ~5000 tokens
 *
 * With Custom Tools (MCP Wrappers):
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: 500-2000 tokens per tool
 * - Total: ~1000 tokens per tool used
 *
 * Reduction: 80-90% (~5000 → 0 at start)
 */
