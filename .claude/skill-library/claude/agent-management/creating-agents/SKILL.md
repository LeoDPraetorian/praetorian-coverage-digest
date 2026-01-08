---
name: creating-agents
description: Use when creating new agents - TDD workflow (RED-GREEN-REFACTOR) enforcing gold standard structure with EXTREMELY-IMPORTANT block, Step 1/2/3, and 7 universal skills.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Skill, AskUserQuestion
---

# Creating Agents

**TDD-driven agent creation enforcing the gold standard pattern.**

> **MANDATORY**: You MUST use TodoWrite to track all 10 phases. Cannot skip TDD cycle.

---

## Quick Reference

| Phase               | Purpose                        | Time     | Reference                        |
| ------------------- | ------------------------------ | -------- | -------------------------------- |
| **0. Navigate**     | Repo root                      | 1 min    | -                                |
| **1. 🔴 RED**       | Prove gap exists               | 5 min    | tdd-workflow.md                  |
| **2. Define**       | Type, tools, skills            | 5 min    | frontmatter-reference.md         |
| **3. Template**     | Use gold standard              | 2 min    | agent-templates.md               |
| **4. Content**      | EXTREMELY-IMPORTANT + sections | 10 min   | gold-standards.md                |
| **5. Skills**       | 7 universal + gateway          | 5 min    | skill-integration-guide.md       |
| **6. Examples**     | 2-3 in description             | 5 min    | gold-standards.md                |
| **7. 🟢 GREEN**     | Verify works                   | 5 min    | tdd-workflow.md                  |
| **8. Audit**        | 9-phase compliance             | 5 min    | auditing-agents                  |
| **9. Fix**          | Issues found                   | 5-10 min | fixing-agents                    |
| **10. 🔵 REFACTOR** | Pressure test                  | 15 min   | verifying-agent-skill-invocation |

**Total**: 60-75 minutes

---

## When to Use

- Creating new agent from scratch
- User says "create an agent for X"
- Need agent for new domain/capability

**NOT for**: Updating existing agents (use `updating-agents`)

---

## The Gold Standard Structure

**ALL agents MUST have this exact structure:**

```markdown
---
[Frontmatter with 7 universal skills + gateway]
---

<EXTREMELY-IMPORTANT>
### Step 1: Always Invoke First
[Table: Skill | Why Always Invoke]

### Step 2: Invoke Core Skills Based on Task Context

[Table: Trigger | Skill | When to Invoke]

### Step 3: Load Library Skills from Gateway

[Instructions]

## WHY THIS IS NON-NEGOTIABLE

## IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL

[Rationalization traps]
</EXTREMELY-IMPORTANT>

# [Agent Title]

## Core Responsibilities

## Escalation

## Output Format
```

**Why this structure?** Testing showed:

- With `<EXTREMELY-IMPORTANT>` block → **100% skill invocation**
- With polite alternatives → **Failed to invoke skills**

---

## TDD Cycle (Phases 1, 7, 10)

### Phase 1: 🔴 RED - Prove Gap Exists

**Before creating agent, document failure:**

1. Test scenario WITHOUT agent → **MUST FAIL**
2. Capture exact failure behavior
3. Confirm agent needed (not existing skill)

**Cannot proceed without failing test** ✅

### Phase 7: 🟢 GREEN - Verify Agent Works

**After creation, re-test scenario:**

1. Invoke new agent with same test case
2. **MUST PASS** - agent solves problem
3. Verify no regression

**Cannot proceed without passing test** ✅

### Phase 10: 🔵 REFACTOR - Pressure Test

**Test under pressure scenarios:**

1. Time pressure ("no time to read skills")
2. Authority pressure ("senior dev said skip")
3. Sunk cost ("already implemented")

**Document rationalizations, add counters** ✅

---

## Phase 0: Navigate to Repo Root

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

---

## Phase 2: Define Frontmatter

### Required Fields (in order)

```yaml
name: agent-name
description: Use when [trigger].\n\n<example>...\n</example>
type: architecture|development|testing|analysis|quality
permissionMode: plan|default
tools: [Alphabetized, include Skill if skills exist]
skills: [7 universal + gateway + domain-specific]
model: opus|sonnet
color: blue|green|cyan|pink|purple|orange|red
```

### 7 Universal Skills (REQUIRED)

Every agent MUST have these in `skills:` field:

1. `using-skills`
2. `calibrating-time-estimates`
3. `enforcing-evidence-based-analysis`
4. `persisting-agent-outputs`
5. `semantic-code-operations`
6. `using-todowrite`
7. `verifying-before-completion`

**Plus at least one gateway** (`gateway-frontend`, `gateway-backend`, etc.)

---

## Phase 3: Use Gold Standard Template

**CRITICAL**: Use [agent-templates.md](references/agent-templates.md) as the ONLY valid structure.

**Key elements**:

1. **EXTREMELY-IMPORTANT block** - Immediately after frontmatter
2. **Step 1/2/3 structure** - Inside the block (NOT "Tier 1/2/3")
3. **Anti-rationalization** - 5-10 traps with counters
4. **Core Responsibilities** - 2-4 subsections after block
5. **Output format** - `skills_invoked` + `library_skills_read` (two arrays)

**Line count targets by type**:

| Type         | Lines   |
| ------------ | ------- |
| architecture | 130-200 |
| development  | 130-180 |
| testing      | 130-280 |
| analysis     | 130-210 |
| quality      | 120-160 |

---

## Phase 4: Populate Content

### Inside EXTREMELY-IMPORTANT Block

1. **Step 1 table**: Universal skills + domain-specific
2. **Step 2 table**: Trigger-based skill invocation
3. **Step 3**: Gateway loading instructions
4. **WHY THIS IS NON-NEGOTIABLE**: Explanation
5. **Rationalization traps**: 5-10 detailed items with counters

### After the Block

1. **# Agent Title**: Role statement
2. **## Core Responsibilities**: 2-4 subsections
3. **## Escalation**: When to hand off
4. **## Output Format**: JSON with both skill arrays

---

## Phase 5: Skill Integration

1. Verify all 7 universal skills in frontmatter
2. Add appropriate gateway skill
3. Add domain-specific skills
4. Ensure `Skill` tool in tools list

---

## Phase 6: Add Examples

Add 2-3 examples in description:

```yaml
description: Use when [trigger].\n\n<example>\nContext: [scenario]\nuser: '[request]'\nassistant: 'I will use [agent-name]'\n</example>
```

---

## Phase 8: Run Audit

```
skill: "auditing-agents"
```

All 9 phases should PASS.

---

## Phase 9: Fix Issues

If audit fails, use fixing workflow:

```
Read(".claude/skill-library/claude/agent-management/fixing-agents/SKILL.md")
```

---

## Success Criteria

Agent complete when:

- [ ] 🔴 RED documented (failing test)
- [ ] `<EXTREMELY-IMPORTANT>` block present
- [ ] Step 1/2/3 structure (NOT Tier 1/2/3)
- [ ] 7 universal skills + gateway in frontmatter
- [ ] `Skill` tool in tools list
- [ ] Core Responsibilities with 2-4 subsections
- [ ] Output has `skills_invoked` + `library_skills_read`
- [ ] 2-3 examples in description
- [ ] Line count in type-appropriate range
- [ ] 🟢 GREEN passed
- [ ] Audit passed (9 phases)
- [ ] 🔵 REFACTOR passed (pressure tests)

---

## Related Skills

- `auditing-agents` - Phase 8 validation
- `fixing-agents` - Phase 9 fixes
- `verifying-agent-skill-invocation` - Phase 10 REFACTOR
- `updating-agents` - Modify existing agents
- `managing-agents` - Router

**References**:

- [agent-templates.md](references/agent-templates.md) - Gold standard template
- [gold-standards.md](references/gold-standards.md) - Exemplar analysis
- [tdd-workflow.md](references/tdd-workflow.md) - RED-GREEN-REFACTOR
- [frontmatter-reference.md](references/frontmatter-reference.md) - Field specs
