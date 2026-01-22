# Parallel Execution Patterns

**Spawning patterns and batching strategies for research agents.**

## Core Principle

**Always spawn ALL research agents in a SINGLE message using the Task tool.**

Sequential spawning wastes 10-15 minutes. Parallel spawning completes in ~5 minutes.

## Research Agent Types

**Note:** The following research agents are referenced in the workflow but may not exist yet. If agents don't exist, this skill documents the INTERFACE contract for when they are created.

| Agent Type              | Purpose                              | Status        |
| ----------------------- | ------------------------------------ | ------------- |
| `codebase-researcher`   | Search local codebase                | To be created |
| `context7-researcher`   | Query Context7 documentation         | To be created |
| `github-researcher`     | Search GitHub repos/issues           | To be created |
| `arxiv-researcher`      | Search academic papers               | To be created |
| `perplexity-researcher` | AI-powered web search with citations | To be created |
| `web-researcher`        | Search web (blogs, Stack Overflow)   | To be created |

**Fallback:** If agents don't exist, use `general-purpose` agent with specific research instructions.

## Single Message Pattern

### Correct (Parallel)

```
[Single message with multiple Task tool calls]

Task 1: Research interpretation 1 via codebase
Task 2: Research interpretation 1 via github
Task 3: Research interpretation 1 via perplexity
Task 4: Research interpretation 1 via context7
Task 5: Research interpretation 2 via codebase
Task 6: Research interpretation 2 via github
...
Task N: Research interpretation M via source X
```

**Key:** All Task calls in ONE message, Claude Code executes them in parallel.

### Incorrect (Sequential)

```
❌ Message 1: Task call for codebase-researcher
[Wait for result]

❌ Message 2: Task call for github-researcher
[Wait for result]

❌ Message 3: Task call for perplexity-researcher
[Wait for result]
```

**Why wrong:** Each agent waits for previous to complete. 10-15 min wasted.

## Batch Size Considerations

**Optimal batch:** 6-12 agents in single message

**Why:**

- Claude Code handles parallel execution automatically
- No benefit to breaking into smaller batches
- More batches = more sequential overhead

**Example: 3 interpretations × 4 sources = 12 agents**

Spawn all 12 in single message. Don't split into 3 batches of 4.

## Agent Prompt Template

**Each agent needs:**

1. **Specific interpretation** being researched
2. **Keywords** for search optimization
3. **Expected output format** (structured JSON)
4. **Scope boundaries** (what NOT to research)

**Template:**

```
Research the following interpretation: "{interpretation}"

Keywords: {keywords}
Scope: {scope}

Return structured findings as JSON with these fields:
- key_findings: string[] (3-5 bullet points)
- patterns: string[] (common patterns/approaches)
- conflicts: string[] (disagreements or trade-offs)
- sources: {title: string, url: string}[]
- confidence: number (0-1)

Do NOT research: {out_of_scope_boundaries}
```

**Example:**

```
Research the following interpretation: "OAuth 2.0 flows and grant types"

Keywords: OAuth, OIDC, authorization code, PKCE, client credentials
Scope: Modern delegated authorization patterns for web applications

Return structured findings as JSON with these fields:
- key_findings: string[] (3-5 bullet points)
- patterns: string[] (common patterns/approaches)
- conflicts: string[] (disagreements or trade-offs)
- sources: {title: string, url: string}[]
- confidence: number (0-1)

Do NOT research: Legacy OAuth 1.0, SAML, proprietary protocols
```

## Handling Agent Failures

**If 1-2 agents fail:**

- Proceed with synthesis using successful agents
- Note missing sources in synthesis
- Mark status as "partial" in metadata

**If >50% agents fail:**

- Stop and investigate root cause
- Check agent availability
- Verify prompt format
- Mark status as "blocked" in metadata

## Progress Tracking

**Use TaskOutput to monitor agent progress:**

```bash
# List running tasks
/tasks

# Check specific agent output
TaskOutput(task_id="agent-123", block=false)
```

**Don't wait sequentially:** Check all at once after spawning.

## Fallback: Using general-purpose Agent

If specialized research agents don't exist, use `general-purpose` agent:

```
Task call 1: general-purpose with prompt "Search codebase for OAuth 2.0 patterns..."
Task call 2: general-purpose with prompt "Search GitHub repos for OAuth implementations..."
...
```

**Prompt format for general-purpose:**

```
You are a research agent specializing in {source_type}.

Research topic: {interpretation}
Keywords: {keywords}
Scope: {scope}

Instructions:
1. Search for {keywords} in {source_type}
2. Extract 3-5 key findings
3. Identify common patterns
4. Note any conflicts or trade-offs
5. Return as structured JSON

Output format:
{
  "key_findings": [...],
  "patterns": [...],
  "conflicts": [...],
  "sources": [{title, url}],
  "confidence": 0-1
}
```

## Example: Full Parallel Spawn

**Scenario:** 2 interpretations × 3 sources = 6 agents

**Message with 6 Task calls:**

```
I'm spawning 6 research agents in parallel to research 2 interpretations across 3 sources.

[Task call 1: codebase research for OAuth flows]
[Task call 2: github research for OAuth flows]
[Task call 3: perplexity research for OAuth flows]
[Task call 4: codebase research for JWT authentication]
[Task call 5: github research for JWT authentication]
[Task call 6: perplexity research for JWT authentication]

All agents will execute in parallel. Expected completion: 5-7 minutes.
```

## Anti-Patterns

| Anti-Pattern                    | Why It's Wrong                       | Correct Approach                   |
| ------------------------------- | ------------------------------------ | ---------------------------------- |
| Sequential spawning             | Wastes time waiting for each agent   | Spawn all in single message        |
| Spawning without interpretation | Generic results, no focus            | Include specific interpretation    |
| Generic prompts                 | Low-quality results                  | Use structured template with scope |
| Not tracking failures           | Silent failures, incomplete research | Monitor TaskOutput, mark partial   |
| Breaking into small batches     | Sequential overhead between batches  | One large batch (6-12 agents)      |

## Related Patterns

- **Sequential research**: Use `researching-skills` if parallel not needed
- **Fallback research**: Use `general-purpose` agent if specialized agents unavailable
- **Incremental research**: Spawn initial batch, review, spawn follow-up agents if needed
