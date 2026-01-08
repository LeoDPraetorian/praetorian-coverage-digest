# Gold Standard Agents

**Purpose**: Analysis of exemplar agents to understand what makes them excellent.

**Key insight**: The gold standard pattern emerged from testing, not theory. Agents with `<EXTREMELY-IMPORTANT>` blocks achieve 100% skill invocation. Polite alternatives fail.

---

## Gold Standard Criteria

An agent is gold standard when it has:

1. **EXTREMELY-IMPORTANT block** - Immediately after frontmatter, contains Step 1/2/3
2. **7 universal skills** - All present in frontmatter
3. **Step 1/2/3 structure** - NOT "Tier 1/2/3"
4. **Detailed anti-rationalization** - 5-10 traps with counters
5. **Two skill tracking arrays** - `skills_invoked` + `library_skills_read`
6. **Type-appropriate line count** - 130-280 depending on type
7. **Compliant frontmatter** - All fields, correct order

---

## Reference Agents

| Agent                    | Type         | Lines | Location                                             |
| ------------------------ | ------------ | ----- | ---------------------------------------------------- |
| **frontend-lead**        | architecture | ~136  | `.claude/agents/architecture/frontend-lead.md`       |
| **frontend-developer**   | development  | ~139  | `.claude/agents/development/frontend-developer.md`   |
| **backend-developer**    | development  | ~139  | `.claude/agents/development/backend-developer.md`    |
| **capability-developer** | development  | ~158  | `.claude/agents/development/capability-developer.md` |
| **test-lead**            | testing      | ~131  | `.claude/agents/testing/test-lead.md`                |

**Use these as templates.** They represent the actual working pattern.

---

## The Critical Pattern: EXTREMELY-IMPORTANT Block

### Why It Works

Testing revealed:

- **With aggressive `<EXTREMELY-IMPORTANT>` block** → 100% skill invocation
- **With polite table-based instructions** → Failed to invoke Step 1 skills

The aggressive language is intentional:

- "STOP. READ THIS FIRST. DO NOT SKIP."
- "Your VERY FIRST ACTION must be invoking skills."
- "IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL."

### Block Structure

```markdown
<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

Your VERY FIRST ACTION must be invoking skills.

### Step 1: Always Invoke First

| Skill                               | Why Always Invoke         |
| ----------------------------------- | ------------------------- |
| `using-skills`                      | Non-negotiable first read |
| `semantic-code-operations`          | Core code tool            |
| `calibrating-time-estimates`        | Prevents rationalization  |
| `gateway-[domain]`                  | Routes to library skills  |
| `enforcing-evidence-based-analysis` | Prevents hallucinations   |
| `persisting-agent-outputs`          | WHERE to write output     |
| `[domain-specific]`                 | [reason]                  |
| `verifying-before-completion`       | Final verification        |

DO THIS NOW. BEFORE ANYTHING ELSE.

### Step 2: Invoke Core Skills Based on Task Context

| Trigger   | Skill   | When to Invoke |
| --------- | ------- | -------------- |
| [pattern] | `skill` | [when]         |

### Step 3: Load Library Skills from Gateway

[Gateway instructions]

## WHY THIS IS NON-NEGOTIABLE

[Explanation]

## IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL

- "Time pressure" → WRONG. [counter]
- "Simple task" → WRONG. [counter]
- [5-10 traps total]
  </EXTREMELY-IMPORTANT>
```

---

## 7 Universal Skills

**Every agent MUST have these in frontmatter:**

| Skill                               | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `using-skills`                      | Skill discovery and invocation protocol     |
| `calibrating-time-estimates`        | Prevents "no time" rationalization          |
| `enforcing-evidence-based-analysis` | Prevents hallucination - read before acting |
| `persisting-agent-outputs`          | Output file location and format             |
| `semantic-code-operations`          | Code search and editing via Serena          |
| `using-todowrite`                   | Progress tracking for multi-step tasks      |
| `verifying-before-completion`       | Final verification before claiming done     |

**Plus at least one gateway skill.**

---

## Type-Specific Standards

### Architecture (plan mode, opus)

| Metric             | Target                                |
| ------------------ | ------------------------------------- |
| **Lines**          | 130-200                               |
| **permissionMode** | plan                                  |
| **Model**          | opus                                  |
| **Tools**          | Read-focused (no Edit/Write for most) |

**Step 1 additions**: `brainstorming`, `writing-plans`

### Development (default mode, sonnet)

| Metric             | Target            |
| ------------------ | ----------------- |
| **Lines**          | 130-180           |
| **permissionMode** | default           |
| **Model**          | sonnet            |
| **Tools**          | Edit, Write, Bash |

**Step 1 additions**: `developing-with-tdd`, `adhering-to-yagni`

### Testing (default mode, sonnet)

| Metric             | Target            |
| ------------------ | ----------------- |
| **Lines**          | 130-280           |
| **permissionMode** | default           |
| **Model**          | sonnet            |
| **Tools**          | Bash, Edit, Write |

**Note**: Higher line count due to mode-specific sections (Unit/Integration/E2E)

**Step 1 additions**: `developing-with-tdd`, `gateway-testing`

### Analysis (plan mode, opus)

| Metric             | Target                    |
| ------------------ | ------------------------- |
| **Lines**          | 130-210                   |
| **permissionMode** | plan                      |
| **Model**          | opus                      |
| **Tools**          | Read-only (NO Edit/Write) |

### Quality (plan mode, sonnet)

| Metric             | Target                    |
| ------------------ | ------------------------- |
| **Lines**          | 120-160                   |
| **permissionMode** | plan                      |
| **Model**          | sonnet                    |
| **Tools**          | Read-only (NO Edit/Write) |

---

## Output Format Standard

**Two separate arrays** (NOT a single `skills_read`):

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "What was done",
  "skills_invoked": ["core-skill-1", "gateway-domain"],
  "library_skills_read": [".claude/skill-library/path/SKILL.md"],
  "files_modified": ["paths"],
  "verification": {
    "tests_passed": true,
    "build_success": true
  },
  "handoff": {
    "recommended_agent": "next-agent",
    "context": "What next"
  }
}
```

---

## Anti-Patterns

### ❌ Using "Tier 1/2/3" terminology

**Wrong**: "### Tier 1: Always Read"
**Correct**: "### Step 1: Always Invoke First"

### ❌ Polite instructions

**Wrong**: "Please invoke these skills when appropriate"
**Correct**: "STOP. READ THIS FIRST. DO NOT SKIP."

### ❌ Skill Loading Protocol as separate section

**Wrong**:

```
# Agent Title
## Core Responsibilities
## Skill Loading Protocol  ← Separate section
```

**Correct**:

```
<EXTREMELY-IMPORTANT>
### Step 1: Always Invoke First  ← Inside block
</EXTREMELY-IMPORTANT>

# Agent Title
## Core Responsibilities
```

### ❌ Single skills_read array

**Wrong**: `"skills_read": ["all", "together"]`
**Correct**: Separate `skills_invoked` + `library_skills_read`

### ❌ Brief anti-bypass points

**Wrong**: `- Simple task → applies`
**Correct**: `- "Simple task" → WRONG. That's what every failed agent thought.`

---

## Gold Standard Checklist

Use this to validate any agent:

### Structure (MANDATORY)

- [ ] `<EXTREMELY-IMPORTANT>` block exists immediately after frontmatter
- [ ] Block contains Step 1/2/3 structure (NOT Tier 1/2/3)
- [ ] Block contains "WHY THIS IS NON-NEGOTIABLE" section
- [ ] Block contains rationalization traps (5-10 items)
- [ ] `# Agent Title` comes AFTER `</EXTREMELY-IMPORTANT>`
- [ ] `## Core Responsibilities` with 2-4 subsections
- [ ] `## Output Format` with both skill arrays

### Frontmatter (MANDATORY)

- [ ] All 7 universal skills present
- [ ] At least one gateway skill
- [ ] `Skill` tool in tools list
- [ ] Fields in canonical order
- [ ] Description single-line with `\n` escapes

### Content Quality

- [ ] 2-3 examples in description
- [ ] Detailed rationalization counters (not brief)
- [ ] Domain-specific Step 1 skills where appropriate
- [ ] Line count in type-appropriate range

---

## Related

- **[agent-templates.md](agent-templates.md)** - Copy-paste template
- **[../SKILL.md](../SKILL.md)** - Full creation workflow
