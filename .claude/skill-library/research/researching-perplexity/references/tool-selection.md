# Tool Selection Decision Matrix

**Complete guide for selecting the right Perplexity command based on research intent.**

## Decision Tree

```
START: What do you need?

├─ Deep research with citations?
│  └─ YES → `research` (sonar-deep-research, 60s timeout)
│
├─ Quick factual lookup?
│  └─ YES → `search` (sonar, 30s timeout)
│
├─ Follow-up question or explanation?
│  └─ YES → `ask` (sonar-pro, 30s timeout)
│
└─ Logical analysis or reasoning?
   └─ YES → `reason` (sonar-reasoning-pro, 60s timeout)
```

---

## Command Profiles

### `research` - Deep Research with Citations

**Model**: sonar-deep-research
**Timeout**: 60 seconds
**Output**: Comprehensive synthesis with numbered citations [1], [2], [3]

**Use when:**

- Creating skill content (need citations for credibility)
- Comparing multiple approaches (need thorough analysis)
- Understanding complex topics (need depth)
- Academic-style research required

**Strengths:**

- Most comprehensive results
- Built-in citation tracking
- Multi-source synthesis
- Academic rigor

**Limitations:**

- Slower (60s timeout)
- More verbose output
- Higher token usage

**Example queries:**

```
"research large language model architectures"
"research React state management patterns 2025"
"research Kubernetes security best practices"
```

---

### `search` - Quick Factual Search

**Model**: sonar
**Timeout**: 30 seconds
**Output**: Ranked search results with summaries

**Use when:**

- Need quick facts or definitions
- Looking for specific documentation
- Finding recent news or updates
- Simple factual queries

**Strengths:**

- Fastest (30s timeout)
- Clear, concise results
- Lower token usage
- Good for straightforward queries

**Limitations:**

- Less depth than `research`
- Fewer citations
- No complex synthesis

**Example queries:**

```
"TypeScript 5.3 release date"
"Next.js 14 server actions syntax"
"AWS Lambda cold start times"
```

---

### `ask` - Conversational AI

**Model**: sonar-pro
**Timeout**: 30 seconds
**Output**: Natural language response with web context

**Use when:**

- Following up on previous research
- Need explanation or clarification
- Conversational context important
- Building on prior responses

**Strengths:**

- Natural conversation flow
- Web-aware responses
- Good for explanations
- Contextual understanding

**Limitations:**

- Less structured than `research`
- Fewer citations than `research`
- Not ideal for comprehensive research

**Example queries:**

```
"What is Model Context Protocol?"
"How does OAuth 2.0 differ from OAuth 1.0?"
"Explain React Server Components"
```

---

### `reason` - Logical Reasoning & Analysis

**Model**: sonar-reasoning-pro
**Timeout**: 60 seconds
**Output**: Analytical response with thinking process (optional `<think>` tags)

**Use when:**

- Comparing tradeoffs between approaches
- Analyzing complex problems
- Need logical step-by-step reasoning
- Evaluating architectural decisions

**Strengths:**

- Strongest logical analysis
- Shows thinking process
- Good for comparisons
- Evaluates tradeoffs

**Limitations:**

- Slower (60s timeout)
- More verbose with thinking tags
- Overkill for simple facts

**Example queries:**

```
"analyze tradeoffs between REST and GraphQL"
"compare Zustand vs Redux for React state"
"evaluate microservices vs monolith for our use case"
```

---

## Selection Matrix

| Research Need              | Primary Command | Fallback   | Notes                               |
| -------------------------- | --------------- | ---------- | ----------------------------------- |
| Skill content creation     | `research`      | `search`   | Citations critical for credibility  |
| Quick documentation lookup | `search`        | `ask`      | Speed over depth                    |
| Troubleshooting errors     | `search`        | `ask`      | Find solutions fast                 |
| Architecture decisions     | `reason`        | `research` | Need logical analysis               |
| Learning new concepts      | `ask`           | `research` | Explanations first, depth if needed |
| Comparing options          | `reason`        | `research` | Tradeoff analysis important         |
| Latest news/updates        | `search`        | `ask`      | Current events                      |
| Best practices             | `research`      | `search`   | Need comprehensive view             |
| Academic topics            | `research`      | `reason`   | Citations and depth required        |
| How-to / tutorials         | `search`        | `ask`      | Step-by-step instructions           |

---

## Intent Detection Keywords

| Keywords in User Request         | Suggest Command |
| -------------------------------- | --------------- |
| "research", "comprehensive"      | `research`      |
| "search", "find", "look up"      | `search`        |
| "what is", "explain", "how does" | `ask`           |
| "analyze", "compare", "tradeoff" | `reason`        |
| "best practices", "patterns"     | `research`      |
| "vs", "versus", "or"             | `reason`        |
| "quick", "fast", "brief"         | `search`        |

---

## Advanced: Multi-Command Workflows

Some research benefits from multiple commands in sequence:

### Pattern 1: Search → Research

1. `search` to find if topic exists and get overview
2. `research` to dive deep with citations

**Example:**

```bash
# Quick check
$CLAUDE_DIR/bin/perplexity.ts search "fingerprintx protocol detection"

# If relevant, deep dive
$CLAUDE_DIR/bin/perplexity.ts research "fingerprintx protocol detection methodology"
```

### Pattern 2: Research → Ask

1. `research` for comprehensive foundation
2. `ask` for specific clarifications

**Example:**

```bash
# Foundation
$CLAUDE_DIR/bin/perplexity.ts research "React 19 Server Components"

# Clarification
$CLAUDE_DIR/bin/perplexity.ts ask "How do Server Components differ from Server-Side Rendering?"
```

### Pattern 3: Ask → Reason

1. `ask` to understand concept
2. `reason` to analyze implications

**Example:**

```bash
# Understanding
$CLAUDE_DIR/bin/perplexity.ts ask "What is event-driven architecture?"

# Analysis
$CLAUDE_DIR/bin/perplexity.ts reason "analyze tradeoffs between event-driven and REST APIs"
```

---

## Default Recommendation

**When in doubt, use `research`:**

- Provides most comprehensive results
- Includes citations (critical for credibility)
- Works for 80% of research use cases
- Can always fall back to `search` if too slow

**Exception**: If speed is critical and citations not needed, start with `search`.
