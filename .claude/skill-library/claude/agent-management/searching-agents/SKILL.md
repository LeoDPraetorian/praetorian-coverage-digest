---
name: searching-agents
description: Use when finding agents by keyword - searches names, descriptions, types, skills with relevance scoring. Fast discovery in 30-60 seconds.
allowed-tools: Bash, Read
---

# Searching Agents

**Keyword discovery across all agents with relevance scoring.**

---

## What This Skill Does

Searches for agents by keyword across:
- **Agent names** (highest relevance: 100 points exact, 50 points substring)
- **Descriptions** (high relevance: 30 points)
- **Agent types/categories** (medium relevance: 20 points)
- **Skills referenced** (low relevance: 10 points)

Returns scored results sorted by relevance.

---

## When to Use

- Finding agents for specific tasks ("Which agent handles React?")
- Discovering available agents by capability
- Checking if an agent exists ("Do we have a Python agent?")
- Exploring agent capabilities by domain

**Common workflow:**
```
Search → Find relevant agents → Select best match → Use with Task tool
```

---

## Quick Reference

| Search Type | Command | Example |
|-------------|---------|---------|
| Basic search | `npm run search -- "query"` | Find React agents |
| Filter by type | `--type <category>` | Only testing agents |
| Limit results | `--limit N` | Show top 5 matches |

---

## How to Use

### Basic Search

**Setup:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skill-library/claude/agent-management/searching-agents/scripts"
```

**Execute:**
```bash
npm run search -- "react"
```

**Output:**
```
Search Results for "react":
────────────────────────────────────────────────────────────────────────────────
✓ frontend-developer (development) [Score: 35]
   Use when developing React frontend - components, UI bugs, performance...

✓ frontend-architect (architecture) [Score: 35]
   Use when making architectural decisions for React frontend applications...

✓ frontend-reviewer (quality) [Score: 35]
   Use when reviewing React/TypeScript code for quality...

Showing 3 of 8 results. Use --limit to see more.
```

### Filter by Category

**Search within specific agent type:**
```bash
npm run search -- "security" --type analysis
```

**Valid categories:**
- `architecture` - Design and architecture decisions
- `development` - Implementation and coding
- `testing` - Unit, integration, E2E testing
- `quality` - Code review and auditing
- `analysis` - Security and complexity assessment
- `research` - Web search and documentation
- `orchestrator` - Coordination and workflows
- `mcp-tools` - Specialized MCP access

### Limit Results

**Show only top N matches:**
```bash
npm run search -- "developer" --limit 5
```

**Default:** 10 results
**Use --limit when:** Many matches and you want top few

---

## Interpreting Results

### Score Ranges

| Score | Meaning | Example |
|-------|---------|---------|
| **100+** | Exact name + description match | Search "react-developer" finds react-developer (100) + desc (30) = 130 |
| **80-99** | Name substring + description | Search "react" finds "react-developer" (50) + desc (30) = 80 |
| **50-79** | Name match OR strong description | Search "frontend" finds "frontend-developer" (50) |
| **30-49** | Description match only | Search "ui" finds agents mentioning UI (30) |
| **10-29** | Type or skills match (weak) | Search "testing" finds test agents (20) |
| **5** | Valid description bonus | All well-formed agents get +5 |

### Scoring Algorithm

**How scores are calculated:**

```typescript
// Name exact match
if (name === query) score += 100;

// Name substring
else if (name.includes(query)) score += 50;

// Description match
if (description.includes(query)) score += 30;

// Type match
if (type.includes(query)) score += 20;

// Skills match
if (skills.includes(query)) score += 10;

// Valid description bonus
if (descriptionStatus === 'valid') score += 5;
```

**Additive:** Scores stack. An agent can match multiple categories.

### Result Format

**Each result shows:**

```
✓ agent-name (category) [Score: XX]
   Description (first 80 chars)...
```

**Icons:**
- ✓ (green) = Valid description
- ✗ (red) = Invalid/missing description

**Categories shown:** (architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools)

**Truncation:** Descriptions over 80 chars show "..."

---

## Common Searches

### Search 1: Find by Capability

```
User: "Which agents handle React development?"

You:
1. cd .claude/skill-library/claude/agent-management/searching-agents/scripts
2. npm run search -- "react"
3. Interpret results:

   ✓ frontend-developer (development) [Score: 35]
   ✓ frontend-architect (architecture) [Score: 35]
   ✓ frontend-reviewer (quality) [Score: 35]

4. Recommend:
   "Found 3 React agents:
    - frontend-developer: Implementation and coding
    - frontend-architect: Architecture decisions
    - frontend-reviewer: Code review

    For building components, use frontend-developer."
```

### Search 2: Find by Domain with Filter

```
User: "Find testing agents that handle frontend"

You:
1. npm run search -- "frontend" --type testing
2. Results:

   ✓ frontend-browser-test-engineer (testing) [Score: 55]
   ✓ frontend-unit-test-engineer (testing) [Score: 55]
   ✓ frontend-integration-test-engineer (testing) [Score: 55]

3. Explain:
   "Found 3 frontend testing agents:
    - frontend-browser-test-engineer: E2E tests with Playwright
    - frontend-unit-test-engineer: Unit tests with Vitest
    - frontend-integration-test-engineer: API integration tests

    Choose based on test type needed."
```

### Search 3: Check Existence

```
User: "Do we have a Python development agent?"

You:
1. npm run search -- "python"
2. Results:

   ✓ python-developer (development) [Score: 130]
      Use when developing Python applications...

3. Answer: "Yes, python-developer handles Python development."
```

### Search 4: Broad Discovery

```
User: "What development agents do we have?"

You:
1. npm run search -- "" --type development
   (Empty query matches all in category)

2. Results: List of all development agents

3. Present: "Found 16 development agents: [list names with brief purpose]"
```

---

## Examples with Scoring Explanation

### Example 1: High Score Match

```
User: "Find the react-developer agent"

You:
1. npm run search -- "react-developer"
2. Results:

   ✓ frontend-developer (development) [Score: 135]
      Use when developing React frontend - components...

3. Explain scoring:
   "Score 135 breakdown:
    - Name substring: 50 ('react-developer' not exact name match)
    - Description match: 30 (mentions 'React')
    - Skills match: 10 (uses gateway-frontend)
    - Valid description: 5 (well-formed)

    Best match: frontend-developer
    Note: No exact 'react-developer' agent exists."
```

### Example 2: Multiple Matches

```
User: "Find agents for Go development"

You:
1. npm run search -- "go"
2. Results:

   ✓ backend-developer (development) [Score: 35]
      Use when developing Go backend...

   ✓ integration-developer (development) [Score: 35]
      Use when integrating...mentions Go...

3. Interpret:
   "Found 2 agents mentioning Go:
    - backend-developer: Primary Go development
    - integration-developer: API integrations

    For Go backend development, use backend-developer."
```

### Example 3: No Matches

```
User: "Find Java agents"

You:
1. npm run search -- "java"
2. Results:

   No agents found matching: "java"
   Try searching for: react, go, test, security, architecture

3. Report:
   "No Java agents found. Try broader terms:
    - 'backend' for backend development
    - 'development' for all development agents"
```

---

## Advanced Usage

### Combine Query Terms

```bash
# Search for multiple terms (finds agents matching either)
npm run search -- "react testing"

# Results include agents matching "react" OR "testing"
```

### Use Specific Terms

```bash
# Be specific to get better matches
npm run search -- "playwright"    # Better than "testing"
npm run search -- "typescript"    # Better than "frontend"
npm run search -- "security"      # Better than "review"
```

### Understand Score Context

**High scores (80+):**
- Strong match, likely what you want
- Name contains query or description very relevant

**Medium scores (30-79):**
- Partial match, review description
- Might be tangential to what you need

**Low scores (5-29):**
- Weak match, probably not what you want
- Only type/skills match, not capability

---

## Integration with Workflow

### Pattern 1: Search → Use

```
User: "I need to create E2E tests for the frontend"

You:
1. Search: npm run search -- "frontend e2e"
2. Find: frontend-browser-test-engineer (high score)
3. Use: Task("frontend-browser-test-engineer", "Create E2E tests for...")
```

### Pattern 2: Search → Multiple Options

```
User: "Help me with Go code"

You:
1. Search: npm run search -- "go"
2. Find multiple: backend-developer, integration-developer, go-architect (if exists)
3. Ask user:
   "Found 3 Go-related agents:
    - backend-developer: Implementation
    - integration-developer: API integrations
    - go-architect: Architecture design

    Which type of help do you need?"
```

### Pattern 3: Search → Not Found → Broader Search

```
User: "Find Rust agents"

You:
1. Search: npm run search -- "rust"
2. No matches
3. Broader: npm run search -- "development"
4. Present development agents, explain none specialize in Rust
```

---

## Tips for Effective Searching

### Tip 1: Start Specific

```
❌ "testing" → 20+ matches
✅ "playwright" → 2 specific matches
✅ "e2e frontend" → Most relevant matches first
```

### Tip 2: Use Category Filtering

```bash
# If you know the category
npm run search -- "security" --type analysis

# Faster than reviewing all security matches
```

### Tip 3: Check Multiple Terms

```
# If first search doesn't find it
npm run search -- "typescript"  # Try tech stack
npm run search -- "frontend"    # Try domain
npm run search -- "react"       # Try framework
```

### Tip 4: Understand Score Meaning

- **Score 100+**: Almost certainly what you want
- **Score 50-99**: Likely relevant, check description
- **Score 30-49**: Possibly relevant, might be tangential
- **Score <30**: Probably not what you need

---

## Common Questions

### Q: How do I see ALL agents?

**A:** Use empty query with listing-agents skill instead:
```
skill: "listing-agents"
```

searching-agents is for finding specific agents, not listing all.

### Q: Why did search find agents I didn't expect?

**A:** Scoring is additive. An agent can match your query in multiple ways:
- Name contains term
- Description mentions term
- Type includes term
- Skills include term

Check the score to see match strength.

### Q: How do I find agents by exact name?

**A:** Search for the exact name:
```bash
npm run search -- "frontend-developer"
```

If exact match exists, it will have score 100+.

### Q: Can I search by multiple criteria?

**A:** Use type filtering:
```bash
npm run search -- "react" --type testing
```

Finds agents matching "react" within testing category only.

---

## Error Handling

### Error: Invalid Category

```
npm run search -- "test" --type invalid-category

Output:
⚠️  Tool Error - Invalid category: invalid-category
Valid categories: architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools

Exit code: 2
```

**Action:** Check spelling, use valid category from list.

### Error: No Matches

```
npm run search -- "cobol"

Output:
No agents found matching: "cobol"
Try searching for: react, go, test, security, architecture
```

**Action:** Try broader terms or different technology.

---

## See Also

- `listing-agents` - List ALL agents by category
- `creating-agents` - Create new agent if search finds nothing
- `agent-manager` - Routes search operations to this skill
