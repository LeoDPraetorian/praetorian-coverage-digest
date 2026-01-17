---
name: orchestrating-research
description: Use when coordinating complex research across multiple sources - supports deep mode (with intent expansion via translating-intent) and lite mode (direct research) - spawns sequential research agents, synthesizes cross-referenced results, persists to .claude/.output/research/
allowed-tools: Task, TodoWrite, Read, Write, AskUserQuestion, Glob, Grep, Bash
---

# Orchestrating Research

**Sequential research orchestration with two modes: deep research (with intent expansion) and lite research (direct queries).**

## When to Use

Use this skill when:

- Research topic requires coordination across multiple sources
- Need synthesis with conflict detection and cross-referencing
- Want sequential execution across multiple research agents
- Previous research attempts were too narrow or incomplete

**Choose mode based on query clarity:**

- **Deep mode** (with intent expansion): Vague/multi-faceted queries (e.g., "research authentication patterns")
- **Lite mode** (direct research): Focused queries with clear scope (e.g., "research React Hook Form validation patterns")

**Do NOT use when:**

- Single source is sufficient → Use specific research agent directly
- No synthesis needed → Use specific research agent directly

## Key Features

- **Two Research Modes**: Deep (with intent expansion) or Lite (direct queries)
- **Sequential Execution**: Spawns research agents one at a time to avoid API rate limits
- **Intent Expansion** (Deep mode): Uses `translating-intent` to derive semantic interpretations (max 3) from vague queries
- **Cross-Source Synthesis**: Aggregates results from multiple research sources with conflict detection
- **User Control**: Select research mode and sources upfront

Uses library skills in `.claude/skill-library/research/` as knowledge base.

## Quick Reference

| Phase              | Purpose                                                 | Tools                | Duration | Applies To   |
| ------------------ | ------------------------------------------------------- | -------------------- | -------- | ------------ |
| 0. Mode Selection  | Choose deep or lite research mode                       | `AskUserQuestion`    | 1 min    | Both modes   |
| 1. Intent Expand   | Derive semantic interpretations (max 3)                 | `translating-intent` | 2-3 min  | Deep only    |
| 2. User Review     | Review queries + select research methods                | `AskUserQuestion`    | 2-3 min  | Both modes   |
| 3. Sequential Exec | Spawn agents SEQUENTIALLY (1 at a time)                 | `Task` (sequential)  | 5-15 min | Both modes   |
| 4. Synthesize      | Cross-reference, detect conflicts                       | Manual synthesis     | 5-10 min | Both modes   |
| 5. Persist         | Save to `.claude/.output/research/{timestamp}-{topic}/` | `Write`, `Bash`      | 2 min    | Both modes   |
| 6. Handoff         | Return to parent workflow or complete                   | TodoWrite check      | 1 min    | Both modes   |

**Total time:**
- Deep mode: 15-30 minutes (with intent expansion)
- Lite mode: 10-25 minutes (direct research)

**YOU MUST use TodoWrite** to track all phases (7 for deep mode, 6 for lite mode).

## Integration Points

### translating-intent Skill

**Purpose:** Expand vague queries into multiple semantic interpretations

**Invocation:**

```yaml
Read(".claude/skill-library/research/translating-intent/SKILL.md")
```

**Mode:** Use ANALYZE mode (structured output, no user interaction)

**Input:** User's research query (e.g., "research authentication patterns")

**Output:** JSON with interpretations array:

```json
{
  "topic": "authentication-patterns",
  "interpretations": [
    {
      "interpretation": "OAuth 2.0 flows and grant types",
      "scope": "Modern delegated authorization patterns",
      "keywords": ["OAuth", "OIDC", "authorization code", "PKCE"]
    },
    {
      "interpretation": "JWT token authentication",
      "scope": "Stateless token-based auth",
      "keywords": ["JWT", "claims", "signing", "validation"]
    },
    {
      "interpretation": "Session-based authentication",
      "scope": "Traditional server-side session management",
      "keywords": ["session", "cookie", "server-side state"]
    }
  ]
}
```

**Confidence threshold:** If confidence > 0.9 on single interpretation, skip expansion and proceed with literal query.

**See:** [references/intent-integration.md](references/intent-integration.md)

### Research Agents (Parallel Execution)

**Six specialized agents to spawn via Task tool:**

| Agent                   | Source                            | Best For                                     |
| ----------------------- | --------------------------------- | -------------------------------------------- |
| `codebase-researcher`   | Local files                       | Existing patterns, conventions               |
| `context7-researcher`   | Official npm/library docs         | Framework/library official documentation     |
| `github-researcher`     | GitHub repos, issues, discussions | Open source implementations, community input |
| `arxiv-researcher`      | Academic papers                   | Research papers, formal analysis             |
| `perplexity-researcher` | AI-powered web search             | Current best practices with citations        |
| `web-researcher`        | Blogs, tutorials, Stack Overflow  | Practical guides, troubleshooting            |

**Critical Rule:** Spawn ALL selected agents in **SINGLE message** using Task tool.

**Agent prompt template:**

```text
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

**See:** [references/agent-prompt-templates.md](references/agent-prompt-templates.md)

### Research Patterns

**Standard patterns for research orchestration:**

- **Topic identification**: Derive kebab-case semantic names from user query
- **Source recommendation logic**: Keyword detection for intelligent source selection
- **Synthesis template structure**: Executive summary + findings + recommendations
- **Persistence directory format**: `.claude/.output/research/{timestamp}-{topic}/`

## Workflow Phases

### Phase 0: Mode Selection

**Goal:** Let user choose between deep and lite research modes

Use AskUserQuestion at the very beginning to determine research approach:

```javascript
AskUserQuestion({
  questions: [
    {
      header: "Mode",
      question: "Which research mode do you want to use? (You can respond with 1 or 2)",
      multiSelect: false,
      options: [
        {
          label: "Deep Research (Recommended)",
          description: "Expands vague queries into multiple interpretations via intent analysis - best for broad topics"
        },
        {
          label: "Lite Research",
          description: "Direct research without intent expansion - best for focused, specific queries"
        }
      ]
    }
  ]
});
```

**Numeric Response Handling:**

After receiving the user's answer, normalize the response to handle numeric inputs:

```javascript
// Normalize response to handle numeric values
let selectedMode = userAnswer; // e.g., "Deep Research (Recommended)" or "1"
if (selectedMode === "1") {
  selectedMode = "Deep Research (Recommended)";
} else if (selectedMode === "2") {
  selectedMode = "Lite Research";
}

// Then check selectedMode to determine which mode was selected
```

**Mode behaviors:**

| Mode | Intent Expansion | Best For | Example Query |
|------|------------------|----------|---------------|
| **Deep** | ✅ Yes (Phase 1) | Vague, multi-faceted topics | "research authentication patterns" |
| **Lite** | ❌ No (skip Phase 1) | Focused, specific questions | "research React Hook Form validation patterns" |

**After user selects mode:**

- **Deep mode**: Continue to Phase 1 (Intent Expansion)
- **Lite mode**: Skip Phase 1, go directly to Phase 2 with user's original query as the single interpretation

### Phase 1: Intent Expansion (Deep Mode Only)

**Goal:** Transform vague query into multiple semantic interpretations

**SKIP THIS PHASE IN LITE MODE** - use user's original query as-is.

1. Extract research topic from user request
2. Derive semantic topic name (kebab-case, 2-4 words)
3. Invoke `translating-intent` skill in ANALYZE mode
4. Capture all valid interpretations with keywords and scope
5. If confidence > 0.9 on single interpretation, skip expansion

**Output:** `{topic: string, interpretations: [{interpretation, scope, keywords}]}`

**Lite mode behavior:** Skip all of the above. Create a single interpretation from user's original query:

```javascript
{
  topic: "derived-from-user-query",
  interpretations: [
    {
      interpretation: "{user's original query}",
      scope: "{inferred from query}",
      keywords: ["{extracted from query}"]
    }
  ]
}
```

**See:** [references/intent-integration.md](references/intent-integration.md) for complete invocation patterns

### Phase 2: User Review (Query Selection + Research Methods)

**Goal:** Let user review/modify queries (from Phase 1 in deep mode, or original query in lite mode), then select research methods

**RATE LIMIT PROTECTION:** Maximum 3 interpretations per session to avoid API 429 errors.

**Critical:** Use AskUserQuestion tool with 2-4 questions in a SINGLE call (all multiSelect: true).

#### Step 1: Query Selection (Dynamic based on query count)

**Deep mode:** Queries come from Phase 1 (translating-intent output).
**Lite mode:** Single query is the user's original request.

Present queries to user for selection/modification.

**If query count > 3:** Ask user to SELECT TOP 3 PRIORITIES with note: "Select up to 3 priorities (limited to avoid rate limits and token usage)". If user selects more than 3, take first 3 selected.

**IF number of queries ≤ 4:**

Single question (header: 'Queries', multiSelect: true):

- Each option: {label: short query name, description: keywords/scope from translating-intent}
- User can select 'Other' to type a custom query

**IF number of queries > 4:**

Split into 2 questions by theme:

**Q1 (header: 'Design', multiSelect: true):** Architecture/protocol queries (up to 4)

- Each option: {label: short interpretation name, description: scope + keywords from Phase 1}
- User can select 'Other' to add custom queries

**Q2 (header: 'Operations', multiSelect: true):** Performance/deployment queries (up to 4)

- Each option: {label: short interpretation name, description: scope + keywords from Phase 1}
- User can select 'Other' to add custom queries

#### Step 2: Research Method Selection (Fixed 2 questions)

**Q3 (header: 'Code', multiSelect: true):**

- {label: 'Local Codebase', description: 'Existing patterns in your repo'}
- {label: 'GitHub', description: 'Open source repos, issues, discussions'}
- {label: 'Context7', description: 'Official library documentation'}

**Q4 (header: 'Web', multiSelect: true):**

- {label: 'Perplexity', description: 'AI-powered search with citations'}
- {label: 'Classic Web', description: 'Blogs, tutorials, Stack Overflow'}
- {label: 'arxiv', description: 'Academic papers and research'}

#### Example AskUserQuestion call (≤4 queries):

```javascript
AskUserQuestion({
  questions: [
    {
      header: "Queries",
      question: "Which queries do you want to research? (Deselect any you want to skip)",
      multiSelect: true,
      options: [
        { label: "OAuth 2.0 flows", description: "OIDC, PKCE, authorization code" },
        { label: "JWT authentication", description: "Claims, signing, RS256 validation" },
        { label: "Session-based auth", description: "Cookies, server-side state, CSRF" },
      ],
    },
    {
      header: "Code",
      question: "Which code sources should be searched?",
      multiSelect: true,
      options: [
        { label: "Local Codebase", description: "Existing patterns in your repo" },
        { label: "GitHub", description: "Open source repos, issues, discussions" },
        { label: "Context7", description: "Official library documentation" },
      ],
    },
    {
      header: "Web",
      question: "Which web sources should be searched?",
      multiSelect: true,
      options: [
        { label: "Perplexity", description: "AI-powered search with citations" },
        { label: "Classic Web", description: "Blogs, tutorials, Stack Overflow" },
        { label: "arxiv", description: "Academic papers and research" },
      ],
    },
  ],
});
```

#### Example AskUserQuestion call (>4 queries):

```javascript
AskUserQuestion({
  questions: [
    {
      header: "Design",
      question: "Which design aspects do you want to research?",
      multiSelect: true,
      options: [
        {
          label: "Architecture",
          description: "Client-server patterns, messaging, state management",
        },
        {
          label: "Protocol",
          description: "Initialization, capabilities negotiation, notifications",
        },
        { label: "Language", description: "Parsing, semantic analysis, incremental updates" },
      ],
    },
    {
      header: "Operations",
      question: "Which operational aspects do you want to research?",
      multiSelect: true,
      options: [
        { label: "Performance", description: "Caching, lazy loading, memory management" },
        { label: "Testing", description: "Unit tests, integration tests, deployment strategies" },
      ],
    },
    {
      header: "Code",
      question: "Which code sources should be searched?",
      multiSelect: true,
      options: [
        { label: "Local Codebase", description: "Existing patterns in your repo" },
        { label: "GitHub", description: "Open source repos, issues, discussions" },
        { label: "Context7", description: "Official library documentation" },
      ],
    },
    {
      header: "Web",
      question: "Which web sources should be searched?",
      multiSelect: true,
      options: [
        { label: "Perplexity", description: "AI-powered search with citations" },
        { label: "Classic Web", description: "Blogs, tutorials, Stack Overflow" },
        { label: "arxiv", description: "Academic papers and research" },
      ],
    },
  ],
});
```

**Default assumption:** All options selected unless user deselects.

**Handling 'Other' responses:** Add custom queries to the research matrix with same structure as Phase 1 interpretations.

#### Step 3: Build research matrix

After user responds:

1. Extract selected queries (from Q1 or Q1+Q2)
2. Add any custom queries from 'Other' responses
3. Extract selected research methods (from Q3+Q4)
4. Cross-multiply: (selected queries) × (selected research methods)
5. Result: N agents to spawn = (selected queries) × (selected sources)

**Output:** Selected queries × selected sources = N agents to spawn

### Phase 3: Sequential Execution (CRITICAL)

**Goal:** Spawn research agents ONE AT A TIME to avoid API rate limits

#### Step 1: Create Output Directory (BEFORE spawning agents)

**YOU MUST run the actual `date` command — DO NOT approximate or invent timestamps.**

```bash
# Step 1: Get repository root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"

# Step 2: Get EXACT timestamp by running this command
date +"%Y-%m-%d-%H%M%S"
# Example output: 2026-01-03-152847

# Step 3: Generate topic slug from research query (lowercase, hyphenated, 2-4 words)
# Examples: authentication-patterns, mcp-server-architecture, react-state-management

# Step 4: Create directory with EXACT timestamp from Step 2
mkdir -p "$ROOT/.claude/.output/research/2026-01-03-152847-your-topic-here"
```

**WRONG:** Guessing `103000` (rounded to 10:30:00)
**RIGHT:** Using actual output like `152847` (15:28:47)

**One-liner alternative:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && \
TOPIC="your-topic-slug" && \
OUTPUT_DIR="$ROOT/.claude/.output/research/$(date +%Y-%m-%d-%H%M%S)-${TOPIC}" && \
mkdir -p "$OUTPUT_DIR"
```

**Store OUTPUT_DIR** - you will pass it to every agent.

#### Step 2: Spawn Agents Sequentially (One at a Time)

**Critical Rule:** Spawn ONE agent, wait for completion, then spawn next. This avoids API rate limits.

**Add progress tracking:** "Researching interpretation X of Y..."

**Example for 3 interpretations × 2 sources = 6 sequential agents:**

```text
Message 1: Task call - codebase-researcher for interpretation 1
  → Wait for result
Message 2: Task call - github-researcher for interpretation 1
  → Wait for result
Message 3: Task call - codebase-researcher for interpretation 2
  → Wait for result
Message 4: Task call - github-researcher for interpretation 2
  → Wait for result
Message 5: Task call - codebase-researcher for interpretation 3
  → Wait for result
Message 6: Task call - github-researcher for interpretation 3
  → Wait for result
```

**Progress updates between agents:**

- "Researching interpretation 1 of 3 via codebase..."
- "Researching interpretation 1 of 3 via github..."
- "Researching interpretation 2 of 3 via codebase..."

#### Step 3: Agent Prompt Requirements

Each agent prompt MUST include:

- Specific interpretation being researched
- Keywords for search optimization
- Expected output format (structured JSON)
- Scope boundaries (what NOT to research)
- **OUTPUT_DIR** (orchestrated mode context):
  ```
  OUTPUT_DIR: {the directory created in Phase 3 Step 1}
  Mode: orchestrated
  Output file: ${OUTPUT_DIR}/{source}-{interpretation-slug}.md
  ```

**CRITICAL**: Agents detect orchestrated mode when OUTPUT_DIR is provided. They will:

- Save to `${OUTPUT_DIR}/{source}-{interpretation-slug}.md`
- NOT create their own timestamped directory
- Use the parent's directory structure

**See:** [references/parallel-execution.md](references/parallel-execution.md) for spawning patterns

### Phase 4: Synthesis

**Goal:** Cross-reference results and detect conflicts using multi-path aggregation

**Self-Consistency Protocol (MANDATORY):**

Before finalizing synthesis, perform three aggregation passes:

**Pass 1 - Source-First**:
Start with each agent's output, extract findings, combine by theme.
Document: "Source-first synthesis: [key points]"

**Pass 2 - Claim-First**:
Identify major claims across all sources, check which agents support each.
Document: "Claim-first synthesis: [key points]"

**Pass 3 - Conflict-First**:
Start with disagreements between sources, resolve them, build consensus.
Document: "Conflict-first synthesis: [key points]"

**Consistency Check**:
| Aspect | Pass 1 | Pass 2 | Pass 3 | Consistent? |
|--------|--------|--------|--------|-------------|
| Main conclusion | | | | |
| Finding 1 | | | | |
| Finding 2 | | | | |

- All three agree → High confidence (0.85+)
- Two agree → Medium confidence (0.7), investigate difference
- All differ → Low confidence (0.5), flag for human review

**After all agents return:**

1. **Perform three aggregation passes** (source-first, claim-first, conflict-first)
2. **Check consistency** across passes
3. **Group by interpretation**: Organize findings by interpretation first
4. **Merge within interpretation**: Combine all source findings for each interpretation
5. **Cross-reference patterns**: Identify themes appearing across multiple interpretations
6. **Detect conflicts**: Flag disagreements between sources with analysis
7. **Adjust confidence**: Based on consistency check results
8. **Generate executive summary**: 2-3 paragraphs synthesizing key findings
9. **Create recommendations**: Prioritized next steps based on findings

**Synthesis structure:**

```markdown
# Executive Summary

[2-3 paragraphs synthesizing all findings]

**Synthesis Confidence: [0.0-1.0]**
- Consistency check: [All agree | Two agree | Mixed]
- Evidence quality: [Strong | Moderate | Weak]
- Source agreement: [High | Medium | Low]

# Findings by Interpretation

## Interpretation 1: {name}

### Key Findings (confidence: X.X)

- ...

### Patterns Observed

- ...

## Interpretation 2: {name}

...

# Cross-Interpretation Patterns

[Themes appearing across multiple interpretations]

# Conflicts & Discrepancies

[Disagreements between sources with analysis]

**Resolution approach for each conflict:**
1. State the conflicting claims
2. Analyze WHY sources disagree (context, date, scope)
3. Provide nuanced synthesis or flag as unresolved

# Knowledge Gaps

[What wasn't found or needs further research]

# Recommendations

1. [Priority 1 recommendation] (confidence: X.X)
2. [Priority 2 recommendation] (confidence: X.X)
   ...

# Full Citations

[All URLs, arxiv IDs, file paths]

# Methodology Notes

- Aggregation passes performed: 3 (source-first, claim-first, conflict-first)
- Consistency check result: [outcome]
- Total sources analyzed: N
- Date range of sources: [range]
```

**See:** [references/synthesis-protocol.md](references/synthesis-protocol.md) for conflict detection patterns

### Phase 5: Persist

**Goal:** Write synthesis and metadata to the output directory

**Directory was created in Phase 3 Step 1.** Agent results are already saved there:

```
${OUTPUT_DIR}/
├── github-oauth-flows.md           ← Created by agent in Phase 3
├── github-jwt-auth.md              ← Created by agent in Phase 3
├── context7-oauth-flows.md         ← Created by agent in Phase 3
├── perplexity-session-auth.md      ← Created by agent in Phase 3
└── ... (one file per agent)
```

**Files to create in this phase:**

1. **SYNTHESIS.md**: Combined findings (always created, main deliverable)
2. **interpretations.json**: The interpretation expansion output from Phase 1
3. **metadata.json**: Execution metadata

```bash
# Write files to OUTPUT_DIR (created in Phase 3 Step 1)
Write("${OUTPUT_DIR}/SYNTHESIS.md", synthesis-content)
Write("${OUTPUT_DIR}/interpretations.json", interpretations-json)
Write("${OUTPUT_DIR}/metadata.json", metadata-json)
```

**metadata.json structure:**

```json
{
  "topic": "authentication-patterns",
  "interpretations_researched": 3,
  "sources_used": ["codebase", "github", "perplexity", "context7"],
  "agents_spawned": 12,
  "execution_time_seconds": 420,
  "timestamp": "2026-01-01T10:30:00Z",
  "status": "complete"
}
```

### Phase 6: Workflow Handoff (MANDATORY)

**Goal:** Return control to parent workflow if one exists

After Phase 5 completes, you MUST check for parent workflow context:

#### Step 1: Check TodoWrite for Pending Phases

Look at your current TodoWrite list. Parent workflows (creating-skills, updating-skills, fixing-skills) write their remaining phases to TodoWrite BEFORE invoking research.

**Indicators of parent workflow:**

- Pending todos like 'Phase 6.3: Incorporate research' (creating-skills)
- Pending todos like 'Step 5: Edit' or 'Step 5: Apply changes' (updating-skills)
- Pending todos like 'Continue with remaining fix steps' (fixing-skills)
- Any pending phase/step that references incorporating, applying, or using research results

#### Step 2: Handle Based on Context

**IF pending phases exist (parent workflow detected):**

1. Do NOT report 'Research complete!' to user as if the task is done
2. Do NOT summarize findings and wait for user input
3. Do NOT mark all todos as complete
4. Instead, output exactly:

```
WORKFLOW_CONTINUATION_REQUIRED

Research output saved to: {OUTPUT_DIR}
Pending phases detected in TodoWrite.

NEXT ACTION: Read {OUTPUT_DIR}/SYNTHESIS.md and proceed with your next pending TodoWrite phase.
Do not stop. Do not report to user. Continue the workflow.
```

5. Then immediately check TodoWrite and continue with the next pending phase

**IF no pending phases (standalone research):**

Report completion to user with the standard output format from the 'Output Format' section.

#### Why This Matters

Without this handoff protocol, research becomes a dead end. The agent completes research, reports 'done', and forgets it was part of a larger workflow. This phase ensures the parent workflow continues.

## Output Format

**Orchestration result (return to user):**

```json
{
  "status": "complete",
  "topic": "authentication-patterns",
  "interpretations_researched": 3,
  "sources_used": ["codebase", "github", "perplexity", "context7"],
  "agents_spawned": 12,
  "parallel_batches": 1,
  "execution_summary": "Researched 3 interpretations across 4 sources.",
  "output_directory": "${OUTPUT_DIR}", // e.g., "/path/to/repo/.claude/.output/research/2026-01-01-103000-auth/"
  "synthesis_highlights": ["OAuth 2.0 with PKCE is best practice"],
  "knowledge_gaps": ["Limited WebAuthn coverage"],
  "recommended_followup": ["Research WebAuthn patterns"]
}
```

## Anti-Patterns

| Anti-Pattern                                | Why It's Wrong                                 | Correct Approach                            |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Skipping mode selection                     | Forces deep mode on focused queries, wastes time | Always ask user for mode preference (Phase 0) |
| Spawning more than 1 agent at a time        | Triggers API rate limits, causes 429 errors    | Spawn agents SEQUENTIALLY (1 at a time)     |
| Researching more than 3 interpretations     | Excessive token usage, rate limit failures     | Max 3 interpretations per session           |
| Running intent expansion in lite mode       | Wastes time on focused queries                 | Skip Phase 1 when lite mode selected        |
| Spawning agents without user query review   | User can't modify/deselect queries, wastes CPU | Phase 2 query selection before spawning     |
| Spawning agents without interpretation      | Generic results, no targeted focus             | Include specific interpretation + keywords  |
| Synthesizing without conflict detection     | Misses disagreements, presents false consensus | Explicitly flag conflicts between sources   |
| Generic topic names                         | Hard to find later, unclear scope              | Use semantic kebab-case names (2-4 words)   |
| Implementing research logic inline          | Duplicates agent code, hard to maintain        | Delegate to research agents                 |
| Single-pass synthesis                       | Misses conflicts, first-impression bias        | Three-pass aggregation with consistency check |
| Unjustified confidence                      | Scores meaningless for weighting               | Require evidence-based calibration          |
| Ignoring contradictions                     | False consensus in synthesis                   | Conflict-first pass surfaces disagreements  |

## Key Principles

1. **USER CONTROL**: Always ask user to choose research mode (Phase 0) - deep or lite
2. **WORKFLOW CONTINUITY**: Always check for and return to parent workflows via Phase 6 handoff
3. **MODE ADHERENCE**: Skip Phase 1 in lite mode, include it in deep mode
4. **INTERPRETATION EXPANSION** (deep mode): Use translating-intent to maximize coverage for vague queries (limit to 3)
5. **STRUCTURED DELEGATION**: Each agent gets specific interpretation + keywords
6. **COMPREHENSIVE SYNTHESIS**: Cross-reference across all dimensions (interpretations × sources)
7. **PERSISTENT OUTPUT**: Always save to .claude/.output/research/ with full metadata
8. **PARENT WORKFLOW DETECTION**: Check TodoWrite for pending phases before reporting completion

## Common Rationalizations

**"This query is clear/vague enough, I'll pick the mode for them"**

→ WRONG. Always ask user to choose mode in Phase 0. They understand their research needs better than you do.

**"This query is clear enough, skip intent expansion"**

→ DEPENDS. If user selected lite mode, correct. If user selected deep mode, wrong - honor their choice even if query seems focused.

**"Let me spawn all agents in parallel for speed"**

→ WRONG. Parallel spawning triggers API rate limits and 429 errors. Sequential execution is required - 3 sequential agents complete reliably, while 6+ parallel agents fail with rate limit errors.

**"I'll synthesize as I go"**

→ WRONG. Wait for ALL agents to complete before synthesizing. Cross-referencing requires seeing all results together.

**"Synthesis is just concatenating agent outputs"**

→ WRONG. Synthesis requires:

- Grouping by interpretation
- Detecting conflicts between sources
- Identifying cross-interpretation patterns
- Generating executive summary

## Related Skills

| Skill                                 | Access Method                                                                           | Purpose                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| `translating-intent`                  | `Read(".claude/skill-library/research/translating-intent/SKILL.md")`                    | Query expansion (invoke in analyze mode)      |
| `orchestrating-multi-agent-workflows` | `skill: "orchestrating-multi-agent-workflows"`                                          | General orchestration patterns                |
| `persisting-agent-outputs`            | `skill: "persisting-agent-outputs"`                                                     | Output persistence patterns                   |
| `orchestration-prompt-patterns`       | `Read(".claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md")`        | Prompt quality patterns for agents and synthesis |

## Progressive Disclosure

**Quick Start (5 min):** Understand phases 1-5, spawn pattern, synthesis structure

**Deep Dives (references/):**

- [Intent integration patterns](references/intent-integration.md) - translating-intent invocation
- [Parallel execution](references/parallel-execution.md) - Spawning patterns and batching
- [Synthesis protocol](references/synthesis-protocol.md) - Cross-referencing and conflict detection
- [Agent prompt templates](references/agent-prompt-templates.md) - Templates for each research agent type
