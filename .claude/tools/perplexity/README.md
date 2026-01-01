# Perplexity MCP Wrappers

Custom TypeScript wrappers for the Perplexity MCP server, providing 80-90% token reduction compared to direct MCP usage.

## Overview

The Perplexity MCP server provides access to 4 powerful AI capabilities:

1. **perplexity_search** - Web search with ranked results
2. **perplexity_ask** - Conversational AI with real-time web search (sonar-pro)
3. **perplexity_research** - Deep research with citations (sonar-deep-research)
4. **perplexity_reason** - Advanced reasoning and problem-solving (sonar-reasoning-pro)

**Key Finding:** Unlike most MCP servers, Perplexity returns **plain text/markdown** responses, not JSON.

## Token Reduction

| Tool | Without Wrapper | With Wrapper | Reduction |
|------|----------------|--------------|-----------|
| perplexity_search | ~5000 tokens | 0 at start, ~500 when used | 90% |
| perplexity_ask | ~5000 tokens | 0 at start, ~1000 when used | 80% |
| perplexity_research | ~8000 tokens | 0 at start, ~2000 when used | 75% |
| perplexity_reason | ~7000 tokens | 0 at start, ~1500 when used | 79% |

## Installation

### 1. Install Perplexity MCP Server

```bash
npx -y @perplexity-ai/mcp-server
```

### 2. Configure Credentials

Add your Perplexity API key to `.claude/tools/config/credentials.json`:

```json
{
  "perplexity": {
    "apiKey": "pplx-your-api-key-here"
  }
}
```

Get your API key from: https://www.perplexity.ai/account/api/group

### 3. MCP Client Configuration

The Perplexity MCP server is already configured in `.claude/tools/config/lib/mcp-client.ts`:

```typescript
'perplexity': {
  command: 'npx',
  args: ['-y', '@perplexity-ai/mcp-server'],
  envVars: { 'PERPLEXITY_API_KEY': 'apiKey' }
}
```

## Usage Examples

### Web Search

```typescript
import { perplexitySearch } from './.claude/tools/perplexity';

// Simple search
const results = await perplexitySearch.execute({
  query: 'TypeScript async/await best practices 2025'
});

// Search with options
const filtered = await perplexitySearch.execute({
  query: 'AI news December 2025',
  max_results: 5,
  country: 'US',
  max_tokens_per_page: 512
});

console.log(results.content); // Plain text: "Found N search results..."
```

### Conversational AI

```typescript
import { perplexityAsk } from './.claude/tools/perplexity';

// Simple question
const answer = await perplexityAsk.execute({
  messages: [
    { role: 'user', content: 'What is Model Context Protocol?' }
  ]
});

// Multi-turn conversation
const response = await perplexityAsk.execute({
  messages: [
    { role: 'user', content: 'What are REST APIs?' },
    { role: 'assistant', content: 'REST APIs are architectural style...' },
    { role: 'user', content: 'How do they compare to GraphQL?' }
  ]
});

console.log(answer.content); // Markdown: "**MCP** is a protocol..."
```

### Deep Research

```typescript
import { perplexityResearch } from './.claude/tools/perplexity';

// Comprehensive research with citations
const research = await perplexityResearch.execute({
  messages: [
    { role: 'user', content: 'Research the latest developments in large language models' }
  ]
});

// Research without thinking tags (saves tokens)
const concise = await perplexityResearch.execute({
  messages: [
    { role: 'user', content: 'Compare React state management approaches' }
  ],
  strip_thinking: true
});

console.log(research.content); // Includes citations: [1], [2], [3]
console.log(research.metadata?.citationCount); // Number of citations
```

### Advanced Reasoning

```typescript
import { perplexityReason } from './.claude/tools/perplexity';

// Logical reasoning with thinking process
const reasoning = await perplexityReason.execute({
  messages: [
    { role: 'user', content: 'If all cats are animals, and some animals are pets, what can we conclude?' }
  ]
});

// Mathematical reasoning without thinking tags
const math = await perplexityReason.execute({
  messages: [
    { role: 'user', content: 'Explain why the sum of angles in a triangle is 180 degrees' }
  ],
  strip_thinking: true
});

console.log(reasoning.content); // Includes <think>...</think> tags
console.log(math.content); // Only conclusion, no thinking process
```

## Response Formats

### Search Response

**Format:** Plain text
```
Found 10 search results about TypeScript:

1. Official TypeScript Documentation...
2. TypeScript Handbook...
3. Advanced TypeScript Patterns...
```

### Ask Response

**Format:** Markdown
```
**TypeScript** is a typed superset of JavaScript that compiles to plain JavaScript.

Key features:
- Static typing
- Type inference
- Interfaces and generics
```

### Research Response

**Format:** Plain text with citations
```
Recent developments in large language models:

1. **Architecture improvements**: Transformer models have evolved...
2. **Training efficiency**: New techniques like LoRA...

**Sources:**
[1] https://example.com/source1
[2] https://example.com/source2
```

### Reason Response

**Format:** Plain text with optional `<think>` tags
```
<think>
To solve this logical problem, I need to consider:
1. All cats are animals (universal statement)
2. Some animals are pets (existential statement)
</think>

Conclusion: We can only conclude that some cats might be pets...
```

## Configuration Options

### Search Options

```typescript
{
  query: string;                    // Required: Search query
  max_results?: number;             // Optional: 1-20, default 10
  max_tokens_per_page?: number;     // Optional: 256-2048, default 1024
  country?: string;                 // Optional: ISO 3166-1 alpha-2 (e.g., "US")
}
```

### Conversational/Research/Reason Options

```typescript
{
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  strip_thinking?: boolean;         // Optional: Remove <think> tags (research/reason only)
}
```

## Timeouts

- **perplexity_search**: 30s (default)
- **perplexity_ask**: 30s (default)
- **perplexity_research**: 60s (deep research takes time)
- **perplexity_reason**: 60s (complex reasoning takes time)

## Security

All wrappers include:
- **Input validation**: Zod schema validation
- **Control character detection**: Rejects null bytes, escape sequences
- **Path traversal prevention**: Validates no `../` patterns
- **Command injection protection**: Sanitizes shell metacharacters
- **API key protection**: Never exposes keys in error messages

## Testing

```bash
# Run unit tests for all wrappers
cd .claude/tools/perplexity
npx vitest run

# Test specific wrapper
npx vitest run perplexity_search.unit.test.ts
```

## Token Optimization Strategies

### 1. Use `strip_thinking` for Research/Reason

```typescript
// Without strip_thinking: ~5000 tokens
const verbose = await perplexityResearch.execute({
  messages: [{ role: 'user', content: 'Research topic' }]
});

// With strip_thinking: ~2000 tokens (60% reduction)
const concise = await perplexityResearch.execute({
  messages: [{ role: 'user', content: 'Research topic' }],
  strip_thinking: true
});
```

### 2. Limit Search Results

```typescript
// Default (10 results): ~1500 tokens
const standard = await perplexitySearch.execute({
  query: 'AI news'
});

// Limited (5 results): ~800 tokens (47% reduction)
const limited = await perplexitySearch.execute({
  query: 'AI news',
  max_results: 5
});
```

### 3. Truncation

All wrappers automatically truncate responses to prevent excessive token usage:
- **Search**: 3000 chars
- **Ask**: 3000 chars
- **Research**: 8000 chars
- **Reason**: 5000 chars

## Troubleshooting

### "Empty response from Perplexity"

**Cause:** MCP server returned no data
**Fix:** Check API key is valid and has sufficient credits

### "Authentication failed"

**Cause:** Invalid or missing API key
**Fix:** Verify `PERPLEXITY_API_KEY` in credentials.json

### "Rate limit exceeded"

**Cause:** Too many requests
**Fix:** Implement rate limiting in your application

### "Request timed out"

**Cause:** Research/reason query took too long
**Fix:** Already handled with 60s timeout, but complex queries may still timeout

## Architecture

```
.claude/tools/perplexity/
├── index.ts                          # Main exports
├── perplexity_search.ts              # Web search wrapper
├── perplexity_ask.ts                 # Conversational AI wrapper
├── perplexity_research.ts            # Deep research wrapper
├── perplexity_reason.ts              # Advanced reasoning wrapper
├── perplexity_search.unit.test.ts    # Search tests (≥18 tests)
├── perplexity_ask.unit.test.ts       # Ask tests (≥18 tests)
├── perplexity_research.unit.test.ts  # Research tests (≥18 tests)
├── perplexity_reason.unit.test.ts    # Reason tests (≥18 tests)
├── explore.ts                        # Schema discovery script
└── docs/                             # Discovery documentation
    ├── perplexity_search-discovery.md
    ├── perplexity_ask-discovery.md
    ├── perplexity_research-discovery.md
    └── perplexity_reason-discovery.md
```

## Documentation

- [Perplexity MCP Server](https://github.com/perplexityai/modelcontextprotocol)
- [Perplexity API Docs](https://docs.perplexity.ai/)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)

## Support

For issues or questions:
1. Check this README
2. Review discovery docs in `docs/`
3. Check test files for usage examples
4. Consult Perplexity API documentation
