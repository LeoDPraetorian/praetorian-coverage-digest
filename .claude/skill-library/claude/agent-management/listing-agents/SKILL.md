---
name: listing-agents
description: Use when listing all agents - displays agents grouped by 8 categories (architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools) with descriptions and counts.
allowed-tools: Bash, Read, Glob
---

# Listing Agents

**Display all agents grouped by category for discovery and browsing.**

> **Compliance**: This skill USES the [Agent Compliance Contract](../../../../skills/managing-agents/references/agent-compliance-contract.md).

---

## What This Skill Does

Lists all agents in the repository:

- **Grouped by category** (8 categories)
- **Alphabetically sorted** within each category
- **Shows descriptions** (first 80 chars)
- **Provides counts** (per category and total)

**Purpose:** Agent discovery and browsing (not keyword search - use `searching-agents` for that)

---

## When to Use

- Discovering all available agents
- Understanding agent organization
- Planning which agent to use for a task
- Documentation or onboarding
- Verifying agent inventory

**NOT for:**

- Finding specific agents by keyword (use `searching-agents`)
- Checking if specific agent exists (use `searching-agents`)
- Metadata inspection (use `auditing-agents`)

---

## Quick Reference

| Command          | Purpose           | Output                        |
| ---------------- | ----------------- | ----------------------------- |
| List all         | Show every agent  | 8 categories, ~49 agents      |
| List by category | Show one category | Single category with agents   |
| Count only       | Quick inventory   | Total and per-category counts |

---

## Agent Categories

| Category         | Purpose                            | Permission Mode | Typical Count |
| ---------------- | ---------------------------------- | --------------- | ------------- |
| **architecture** | System design, patterns, decisions | plan            | 7 agents      |
| **development**  | Implementation, coding, features   | default         | 16 agents     |
| **testing**      | Unit, integration, e2e testing     | default         | 8 agents      |
| **quality**      | Code review, auditing              | default         | 5 agents      |
| **analysis**     | Security, complexity assessment    | plan            | 6 agents      |
| **research**     | Web search, documentation          | plan            | 3 agents      |
| **orchestrator** | Coordination, workflows            | default         | 2 agents      |
| **mcp-tools**    | Specialized MCP access             | default         | 2 agents      |

**Total:** ~49 agents (as of December 2024)

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any list operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-agents/references/patterns/repo-root-detection.md)

**⚠️ If agent file not found:** You are in the wrong directory. Navigate to repo root first. Never assume "built-in agent" or "system agent" - the file exists, you're looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## How to List

### List All Agents

**Workflow:**

1. **Find all agent files:**

   ```bash
   Glob pattern: ".claude/agents/**/*.md"
   ```

   Excludes: `.archived/` directories

2. **Group by category:**
   - Extract directory name from path
   - `.claude/agents/development/react-developer.md` → category: "development"

3. **Sort within category:**
   - Alphabetically by agent name
   - Ensures consistent ordering

4. **Read descriptions:**
   - For each agent, read frontmatter
   - Extract `description:` field
   - Truncate to first 80 chars if needed

5. **Format output:**

   ```markdown
   # Available Agents (Total: 49)

   ## Architecture (7 agents)

   - backend-architect: Use when designing Go backend architecture...
   - frontend-architect: Use when designing React frontend architecture...
   - security-lead: Use when designing security architecture...
     [...]

   ## Development (16 agents)

   - backend-developer: Use when developing Go backend services...
   - frontend-developer: Use when developing React applications...
   - python-developer: Use when developing Python applications...
     [...]

   ## Testing (8 agents)

   - acceptance-test-engineer: Use when creating end-to-end acceptance tests...
   - backend-tester: Use when creating backend unit tests...
     [...]

   [Continue for all 8 categories...]
   ```

### List by Category Only

**Workflow:**

1. **Find agents in specific category:**

   ```bash
   Glob pattern: ".claude/agents/development/*.md"
   ```

2. **Read and format:**

   ```markdown
   ## Development Agents (16)

   - backend-developer: Use when developing Go backend services...
   - frontend-developer: Use when developing React applications...
   - integration-developer: Use when integrating third-party APIs...
     [...]
   ```

### Count Only

**Workflow:**

1. **Count files per category:**

   ```bash
   # For each category directory
   ls .claude/agents/architecture/*.md | wc -l
   ls .claude/agents/development/*.md | wc -l
   [...]
   ```

2. **Format summary:**

   ```
   Total: 49 agents

   By category:
   - Architecture: 7
   - Development: 16
   - Testing: 8
   - Quality: 5
   - Analysis: 6
   - Research: 3
   - Orchestrator: 2
   - MCP Tools: 2
   ```

---

## Examples

### Example 1: List All Agents

```
User: "Show me all available agents"

You:
1. Glob: .claude/agents/**/*.md
   Found: 49 files

2. Group by directory:
   architecture/: 7 files
   development/: 16 files
   testing/: 8 files
   [...]

3. For each category:
   - Sort agents alphabetically
   - Read frontmatter descriptions
   - Format output

4. Present:
   "# Available Agents (Total: 49)

    ## Architecture (7 agents)
    - backend-architect: Use when designing Go backend architecture...
    - frontend-architect: Use when designing React frontend architecture...
    [all 7 listed]

    ## Development (16 agents)
    - backend-developer: Use when developing Go backend services...
    - frontend-developer: Use when developing React applications...
    [all 16 listed]

    [Continue for all 8 categories...]"
```

### Example 2: List Development Agents Only

```
User: "What development agents do we have?"

You:
1. Glob: .claude/agents/development/*.md
   Found: 16 files

2. Read descriptions for each

3. Present:
   "## Development Agents (16)

    - backend-developer: Use when developing Go backend services - REST APIs, Lambda functions...
    - frontend-developer: Use when developing React applications - components, UI bugs...
    - integration-developer: Use when integrating third-party APIs - API design, auth flows...
    - python-developer: Use when developing Python applications - CLI tools, data processing...
    [all 16 listed]"
```

### Example 3: Quick Count

```
User: "How many agents do we have?"

You:
1. Count per category:
   - ls .claude/agents/*/\*.md | wc -l per directory

2. Calculate total

3. Report:
   "Total: 49 agents

    By category:
    - Development: 16 (largest)
    - Architecture: 7
    - Testing: 8
    - Analysis: 6
    - Quality: 5
    - Research: 3
    - Orchestrator: 2
    - MCP Tools: 2"
```

### Example 4: List with Purpose Explanation

```
User: "List all agents and explain when to use each category"

You:
1. List all agents (per Example 1)

2. Add category explanations:
   "# Available Agents (Total: 49)

    ## Architecture (7 agents)
    Use for: Design decisions, system architecture, patterns

    - backend-architect: Go backend architecture, microservices, API design
    - frontend-architect: React architecture, component hierarchies, state management
    [...]

    ## Development (16 agents)
    Use for: Implementation, coding, building features

    - backend-developer: Go backend services, REST APIs, Lambda functions
    - frontend-developer: React applications, components, UI
    [...]

    [Continue with explanations for all categories...]"
```

---

## Output Format Patterns

### Full Listing Format

```markdown
# Available Agents (Total: {count})

## {Category Name} ({count} agents)

- {agent-name}: {description-first-80-chars}...
- {agent-name}: {description-first-80-chars}...
  [...]

## {Next Category} ({count} agents)

[...]
```

### Compact Format (Names Only)

```markdown
## {Category Name} ({count})

- {agent-name}
- {agent-name}
  [...]
```

**Use compact when:** User wants quick overview without descriptions

### Table Format (Alternative)

```markdown
| Agent              | Category     | Description           |
| ------------------ | ------------ | --------------------- |
| backend-architect  | architecture | Use when designing... |
| frontend-architect | architecture | Use when designing... |

[...]
```

**Use table when:** User needs structured data view

---

## Integration Patterns

### Pattern 1: List → Select → Use

```
User: "Show me all agents, then I'll pick one"

You:
1. skill: "listing-agents"
2. Display all agents
3. User selects from list
4. Task("{selected-agent}", "...")
```

### Pattern 2: List Category → Use

```
User: "List testing agents"

You:
1. skill: "listing-agents"
   Filter to: testing category
2. Display testing agents
3. User: "Use frontend-browser-test-engineer"
4. Task("frontend-browser-test-engineer", "...")
```

### Pattern 3: List vs Search Decision

```
User: "Help me find an agent"

You decide:
- If user knows keyword → skill: "searching-agents"
- If user wants to browse → skill: "listing-agents"

Ask: "Do you want to:
      A. Search by keyword (faster if you know what you need)
      B. Browse all agents by category"
```

---

## Common Scenarios

### Scenario 1: Onboarding

```
User: "I'm new, show me what agents are available"

You:
1. skill: "listing-agents"
2. Display all with category explanations
3. Highlight key agents:
   - frontend-developer: For UI work
   - backend-developer: For API work
   - frontend-browser-test-engineer: For E2E tests
4. Explain: "Use searching-agents to find specific capabilities"
```

### Scenario 2: Planning Work

```
User: "I need to build a feature. What agents can help?"

You:
1. Ask: "What type of feature?"
2. User: "Frontend form with backend API"
3. List relevant categories:
   - skill: "listing-agents" (development category)
   - Highlight: frontend-developer, backend-developer
4. Recommend workflow
```

### Scenario 3: Documentation

```
User: "Create a list of all agents for documentation"

You:
1. skill: "listing-agents"
2. Format for documentation:
   - Include all categories
   - Full descriptions
   - Add category purpose explanations
3. Save to doc file if requested
```

---

## Comparison: List vs Search

| Aspect       | listing-agents                 | searching-agents             |
| ------------ | ------------------------------ | ---------------------------- |
| **Purpose**  | Browse all agents              | Find specific agents         |
| **Input**    | None or category               | Keyword query                |
| **Output**   | All agents grouped             | Scored matches               |
| **Sorting**  | By category, then alphabetical | By relevance score           |
| **Use when** | Don't know what exists         | Know what you're looking for |
| **Speed**    | Slower (reads all)             | Faster (filters early)       |

**Rule of thumb:**

- Know what you need → search
- Want to explore → list

---

## Tips

### Tip 1: Use Category Filtering

Instead of listing all 49 agents, filter to relevant category:

```
User: "Show testing agents"
→ List testing category only (8 agents vs 49)
```

### Tip 2: Description Length

Descriptions truncate at 80 chars. To see full description:

```
Read .claude/agents/{category}/{agent-name}.md
```

### Tip 3: Combine with Search

```
1. List category to see all options
2. Search within category if needed
3. Use for specific keyword within category
```

---

## See Also

- `searching-agents` - Find agents by keyword (complementary)
- `creating-agents` - Create new agents to add to list
- `agent-manager` - Routes list operations to this skill
