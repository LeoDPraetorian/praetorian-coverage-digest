# Lean Agent Pattern

**Target: <150 lines for Claude 4.5+** (complex agents <300 lines max)

## Philosophy

Agents should be **lean and focused**, delegating detailed patterns, code examples, and workflows to skills. This keeps agents discoverable, maintainable, and within context limits.

---

## Claude 4.5+ Template (RECOMMENDED)

```markdown
---
name: agent-name
description: Use when [trigger] - [capabilities].\n\n<example>...</example>
type: development
permissionMode: default
tools: Bash, Edit, Glob, Grep, Read, TodoWrite, Write
skills: gateway-frontend, adhering-to-yagni, developing-with-tdd
model: sonnet
---

# Agent Name

[Role statement - 1-2 sentences]

## Skill Loading Protocol

Use Read() for ALL skills. Do NOT use Skill tool. Do NOT rely on training data.

### Tier 1: Always Read (Every Task)
```

Read('.claude/skills/gateway-{domain}/SKILL.md')
Read('.claude/skills/developing-with-tdd/SKILL.md')

```

### Tier 2: Multi-Step Tasks
If task has ≥3 steps:
```

Read('.claude/skills/using-todowrite/SKILL.md')

```

### Tier 3: Triggered by Task Type
| Trigger | Read Path |
|---------|-----------|
| [task] | `.claude/skill-library/.../SKILL.md` |

## Anti-Bypass

Do NOT rationalize skipping skill reads:
- 'Simple task' → Tier 1 skills always apply
- 'I already know this' → Training data is stale
- 'No time' → Reading skills prevents bugs

## [Platform] Rules
[Brief platform-specific constraints]

## Output Format

\`\`\`json
{
  'status': 'complete|blocked|needs_review',
  'summary': '...',
  'skills_read': ['...'],
  'files_modified': ['...'],
  'verification': {...}
}
\`\`\`

## Escalation

| Situation | Recommend |
|-----------|-----------|
| [Condition] | `agent-name` |
```

---

## What Lives WHERE

This table defines content boundaries between agents and skills:

| Content Type      | Lives In | Why                        |
| ----------------- | -------- | -------------------------- |
| Role definition   | Agent    | Identity is per-agent      |
| Critical rules    | Agent    | Non-negotiable constraints |
| Output format     | Agent    | Coordination requirement   |
| Escalation        | Agent    | Agent-specific boundaries  |
| Detailed patterns | Skill    | Reusable across agents     |
| Code examples     | Skill    | Progressive loading        |
| Workflows         | Skill    | On-demand retrieval        |

### Agent Content (Keep Brief)

**Role definition** - Who the agent is and what it does (1-2 sentences)
**Critical rules** - Non-negotiable constraints specific to this agent
**Output format** - Standardized JSON for coordination
**Escalation** - When to handoff to another agent

### Skill Content (Full Details)

**Detailed patterns** - Step-by-step how-to guides
**Code examples** - Complete, copy-paste examples
**Workflows** - Multi-step processes and decision trees

---

## Gold Standard

**Reference when creating/auditing agents:**

### frontend-developer (129 lines)

**Location:** `.claude/agents/development/frontend-developer.md`

**Key features:**

- Tiered Skill Loading Protocol (Tier 1/2/3)
- Uses `Read()` for ALL skills (not Skill tool)
- `skills_read` array in JSON output
- 3-point Anti-Bypass section
- Size: <150 lines

**Why it's exemplary:**

- Delegates ALL React/TypeScript patterns to `gateway-frontend`
- Delegates TDD workflow to `developing-with-tdd`
- Delegates project constraints to `adhering-to-yagni`
- Contains ONLY role definition, skill loading protocol, and output format

---

## Line Count Guidelines

| Agent Type                           | Max Lines | Rationale                                    |
| ------------------------------------ | --------- | -------------------------------------------- |
| Standard (4.5+)                      | 150       | New lean template with Tiered Skill Loading  |
| Complex (orchestrator, architecture) | 300       | Multi-phase workflows require more structure |
| Legacy (pre-4.5)                     | 400       | Older agents being migrated to lean pattern  |

**Rule:** If agent exceeds line count, extract content to skills, don't increase limit.

---

## Skill Delegation Strategy

### When to Delegate

If content fits these criteria, it belongs in a skill:

- ✅ **Reusable** across multiple agents
- ✅ **Detailed** patterns or workflows (>20 lines)
- ✅ **Examples** or code snippets
- ✅ **Reference** information (checklists, tables)

### When to Keep in Agent

If content is **agent-specific** and brief:

- ✅ **Role identity** (who the agent is)
- ✅ **Critical constraints** unique to this agent
- ✅ **Output contract** (JSON format for coordination)
- ✅ **Escalation boundaries** (when to hand off)

---

## Tiered Skill Loading Protocol

The cornerstone of the lean agent pattern - ensures agents ALWAYS load skills, not rely on stale training data.

### Structure

```markdown
## Skill Loading Protocol

Use Read() for ALL skills. Do NOT use Skill tool. Do NOT rely on training data.

### Tier 1: Always Read (Every Task)

[Gateway + core methodology skills]

### Tier 2: Multi-Step Tasks

[TodoWrite for ≥3 steps]

### Tier 3: Triggered by Task Type

[Conditional skills based on specific triggers]

## Anti-Bypass

[3 common rationalizations + counters]
```

### Why This Works

- **Tier 1** - Loads essential skills FIRST, before agent even starts thinking about the task
- **Tier 2** - Conditional loading for complexity (prevents overkill on simple tasks)
- **Tier 3** - On-demand loading for specialized patterns
- **Anti-Bypass** - Preemptively counters common excuses agents make to skip skill reads

**Result:** Agents consistently follow current patterns instead of outdated training.

---

## Migration Path

### From Legacy Agents (>300 lines)

1. **Identify embedded patterns** - Look for detailed how-to sections
2. **Extract to skills** - Move patterns to appropriate skill files
3. **Add Skill Loading Protocol** - Tiered structure with Read() calls
4. **Add Anti-Bypass** - 3-point rationalization counters
5. **Verify line count** - Should be <150 lines for standard agents

### Example

**Before (450 lines):**

```markdown
## React Component Best Practices

[150 lines of patterns]

## Testing Patterns

[100 lines of examples]

## State Management

[80 lines of workflows]
```

**After (120 lines):**

```markdown
## Skill Loading Protocol

### Tier 1: Always Read

Read('gateway-frontend') ← Contains all those patterns

### Tier 3: Testing

If writing tests:
Read('frontend-testing-patterns')
```

**Savings:** 330 lines removed, delegated to skills for progressive loading.

---

## Common Mistakes

### ❌ Embedding Detailed Patterns

```markdown
## Component Structure

Always structure components like this:
[30 lines of detailed patterns]
```

**Fix:** Delegate to skill, add to Tier 1 or Tier 3.

### ❌ Code Examples in Agent

```markdown
## Example Implementation

\`\`\`typescript
// 50 lines of example code
\`\`\`
```

**Fix:** Move examples to skill, reference in Tier 3.

### ❌ Missing Anti-Bypass

```markdown
## Skill Loading Protocol

[Tiers defined]

[No Anti-Bypass section]
```

**Fix:** Add 3-point rationalization counters.

### ❌ Using Skill Tool

```markdown
skill: "frontend-testing-patterns" ← Library skill, won't work
```

**Fix:** Use Read() with full path for library skills.

---

## Benefits of Lean Pattern

1. **Discoverability** - Short descriptions load faster, easier to scan
2. **Maintainability** - Patterns live in skills, update once
3. **Context Efficiency** - Only load what's needed for current task
4. **Consistency** - Agents share same skill references
5. **Testability** - Easier to verify agent follows protocol
6. **Evolvability** - Update skills without touching agents

**Bottom line:** Lean agents + rich skills = scalable, maintainable agent ecosystem.
