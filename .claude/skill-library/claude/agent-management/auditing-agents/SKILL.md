---
name: auditing-agents
description: Use when auditing agents for compliance - validates against the gold standard pattern (EXTREMELY-IMPORTANT block, Step 1/2/3 structure, 7 universal skills). 9 audit phases.
allowed-tools: Bash, Read, TodoWrite, AskUserQuestion
---

# Auditing Agents

**Validate agents against the gold standard pattern derived from actual working agents.**

> **MANDATORY**: Use TodoWrite to track audit progress for comprehensive audits.

---

## Quick Reference

| Phase | Check                          | Severity | Time   |
| ----- | ------------------------------ | -------- | ------ |
| **0** | Critical Syntax (CLI)          | BLOCKER  | 30 sec |
| **1** | Frontmatter Structure          | ERROR    | 1 min  |
| **2** | Universal Skills (7 required)  | ERROR    | 1 min  |
| **3** | EXTREMELY-IMPORTANT Block      | ERROR    | 2 min  |
| **4** | Step 1/2/3 Structure           | ERROR    | 3 min  |
| **5** | Anti-Rationalization Section   | WARNING  | 1 min  |
| **6** | Core Responsibilities          | WARNING  | 1 min  |
| **7** | Output Format                  | WARNING  | 1 min  |
| **8** | Line Count & Type Alignment    | INFO     | 30 sec |
| **9** | Library Skill Paths & Phantoms | ERROR    | 2 min  |

**Total**: ~13 minutes for full audit

---

## The Gold Standard Pattern

**Source of truth**: Actual working agents (frontend-lead, frontend-developer, backend-developer, etc.)

All compliant agents have this structure:

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

---

## When to Use

- After editing an agent file
- Before committing agent changes
- Debugging agent behavior issues
- As part of create/update workflows

---

## How to Use

### Step 0: Navigate to repo root (MANDATORY)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

### Step 1: Run Phase 0 CLI (if available)

```bash
cd .claude && npm run agent:audit -- {agent-name}
```

**Checks**: Block scalars, name mismatch, empty description

### Step 2: Run Manual Phases 1-9

See [workflow-manual-checks.md](references/workflow-manual-checks.md) for detailed procedures.

**Quick checklist**:

- [ ] Phase 1: Frontmatter has all required fields in correct order
- [ ] Phase 2: All 7 universal skills present in frontmatter
- [ ] Phase 3: `<EXTREMELY-IMPORTANT>` block present (NOT deprecated)
- [ ] Phase 4: Step 1/2/3 structure inside EXTREMELY-IMPORTANT block
- [ ] Phase 5: "WHY THIS IS NON-NEGOTIABLE" + rationalization traps present
- [ ] Phase 6: Core Responsibilities section with 2-4 subsections
- [ ] Phase 7: Output format has `skills_invoked` + `library_skills_read` arrays
- [ ] Phase 8: Line count within type-appropriate range
- [ ] Phase 9: All library skill paths valid, no phantom skills

---

## Phase Details

### Phase 0: Critical Syntax (CLI)

**Blockers** - agent won't load if these fail:

- Block scalar in description (`|` or `>`)
- Name mismatch (name field ≠ filename)
- Empty/missing description

### Phase 1: Frontmatter Structure

**Required fields in order**:

1. `name:` (matches filename)
2. `description:` (single-line with `\n` escapes, 2-3 examples)
3. `type:` (architecture|development|testing|analysis|quality|research|mcp-tools)
4. `permissionMode:` (plan|default)
5. `tools:` (alphabetized, includes `Skill` if skills exist)
6. `skills:` (7 universal + gateway + domain-specific)
7. `model:` (opus|sonnet|haiku)
8. `color:` (optional)

### Phase 2: Universal Skills (7 required)

**ALL agents MUST have these in frontmatter `skills:` field**:

1. `using-skills`
2. `calibrating-time-estimates`
3. `enforcing-evidence-based-analysis`
4. `persisting-agent-outputs`
5. `semantic-code-operations`
6. `using-todowrite`
7. `verifying-before-completion`

**Plus at least one gateway skill** (`gateway-frontend`, `gateway-backend`, etc.)

### Phase 3: EXTREMELY-IMPORTANT Block

**⚠️ CRITICAL**: This block is REQUIRED, not deprecated.

Testing showed agents with aggressive `<EXTREMELY-IMPORTANT>` blocks achieve **100% skill invocation** while polite alternatives fail.

**Check**: Block exists and opens immediately after frontmatter.

### Phase 4: Step 1/2/3 Structure

Inside `<EXTREMELY-IMPORTANT>`, verify:

- `### Step 1: Always Invoke First` with table
- `### Step 2: Invoke Core Skills Based on Task Context` with table
- `### Step 3: Load Library Skills from Gateway` with instructions

**NOT "Tier 1/2/3"** - that terminology is deprecated.

### Phase 5: Anti-Rationalization Section

Inside `<EXTREMELY-IMPORTANT>`, verify:

- `## WHY THIS IS NON-NEGOTIABLE` section
- `## IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL` section
- 5-10 rationalization traps with counters

### Phase 6: Core Responsibilities

After `</EXTREMELY-IMPORTANT>`, verify:

- `## Core Responsibilities` section exists
- 2-4 subsections (### headers) defining agent duties

### Phase 7: Output Format

Verify JSON output format includes:

```json
{
  "skills_invoked": ["core-skill-1", "gateway-domain"],
  "library_skills_read": [".claude/skill-library/path/SKILL.md"]
}
```

**Two separate arrays** - NOT a single `skills_read` array.

### Phase 8: Line Count & Type Alignment

| Type         | permissionMode | Model  | Lines   |
| ------------ | -------------- | ------ | ------- |
| architecture | plan           | opus   | 130-200 |
| development  | default        | sonnet | 130-180 |
| testing      | default        | sonnet | 130-280 |
| analysis     | plan           | opus   | 130-210 |
| quality      | plan           | sonnet | 120-160 |

### Phase 9: Library Skill Paths & Phantoms

- All `.claude/skill-library/` paths must exist
- All `skill: "name"` references must have corresponding skill files
- Gateway skills must exist in `.claude/skills/`

---

## Post-Audit Actions

**If issues found**, use AskUserQuestion:

```
Question: Audit found issues. How to proceed?
Header: Next steps
Options:
  - Run fixing workflow (Recommended)
  - Show detailed issue list
  - Skip - I'll fix manually
```

**Routing**:

- Fix workflow → `Read(".claude/skill-library/claude/agent-management/fixing-agents/SKILL.md")`

---

## Common Issues

| Issue                        | Phase | Fix                                             |
| ---------------------------- | ----- | ----------------------------------------------- |
| Block scalar in description  | 0     | Convert to single-line with `\n` escapes        |
| Missing universal skills     | 2     | Add all 7 to frontmatter skills field           |
| No EXTREMELY-IMPORTANT block | 3     | Add block after frontmatter (use template)      |
| Uses "Tier 1/2/3"            | 4     | Replace with "Step 1/2/3"                       |
| Single skills_read array     | 7     | Split into skills_invoked + library_skills_read |
| Line count too high          | 8     | Extract content to library skills via gateway   |

---

## Related Skills

- `fixing-agents` - Fix issues found during audit
- `creating-agents` - Creation workflow (includes audit)
- `updating-agents` - Update workflow (includes audit)
- `managing-agents` - Router

**References**:

- [workflow-manual-checks.md](references/workflow-manual-checks.md) - Detailed phase procedures
- [common-issues.md](references/common-issues.md) - Issue fixes
