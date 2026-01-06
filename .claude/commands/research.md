---
description: Sequential research across multiple sources with intent expansion, conflict detection, and synthesis
argument-hint: <research query>
allowed-tools: Task, Read
---

# Research

**Query:** $ARGUMENTS

## Action

Spawn the `research-orchestrator` agent to handle this research request.

**Why spawn an agent (not invoke skill directly)?**
- Research generates massive intermediate data (6 agents × findings)
- Subagent isolation keeps 91% noise out of main conversation
- You get distilled synthesis, not raw orchestration details

```
Task(
  subagent_type: "research-orchestrator",
  prompt: "Research the following topic comprehensively:

$ARGUMENTS

Follow the orchestrating-research skill methodology:
1. Expand query via translating-intent
2. Present source selection to user
3. Spawn research agents sequentially (avoids rate limits)
4. Synthesize with conflict detection
5. Persist to .claude/.output/research/

Return: synthesis path + key findings summary",
  description: "Research: $ARGUMENTS"
)
```

## Examples

```
/research authentication patterns for our platform
/research LSP server implementation strategies
/research TanStack Query caching - check Context7 and codebase only
/research MCP server patterns with comprehensive coverage
/research rate limiting approaches in Go
```

## What Happens

1. **Intent Expansion** - Vague query expanded into multiple interpretations
2. **Source Selection** - You choose which sources (Codebase, Context7, GitHub, arxiv, Perplexity, Web)
3. **Sequential Research** - Up to 6 research agents spawned one at a time (avoids API rate limits)
4. **Synthesis** - Cross-referenced findings with conflict detection
5. **Output** - Saved to `.claude/.output/research/{timestamp}-{topic}/`

## Output

The orchestrator returns:
- Path to synthesis file (`.claude/.output/research/.../SYNTHESIS.md`)
- Key findings summary
- Knowledge gaps identified
- Recommended follow-up

## Error Handling

If orchestrator returns error or agents return "unavailable":
- Display the error message verbatim
- Note which sources were unavailable (e.g., "Context7 MCP not configured")
- Do not attempt workarounds
