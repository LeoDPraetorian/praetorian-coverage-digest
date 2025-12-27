# Fix Procedures

**Purpose**: Detailed procedures for applying each fix type

**When to read**: When applying fixes to agents with specific issues

---

## Deterministic Fixes

Mechanical transformations with one correct answer. Claude applies using Edit tool.

### Block Scalar Conversion

**Issue**: `description: |` or `description: >` breaks agent discovery

**Fix**:
```
Edit {
  old_string: "description: |\n  Use when...",
  new_string: "description: Use when...\\n\\n<example>...</example>"
}
```

**Pattern**: Single-line with `\n` escapes for newlines

### Name Mismatch

**Issue**: Frontmatter name ≠ filename

**Fix**:
```
Edit {
  old_string: "name: wrong-name",
  new_string: "name: correct-name"
}
```

**Pattern**: Use filename (without .md) as canonical name

### Frontmatter Field Order

**Issue**: Fields not in canonical order

**Fix**: Reorder to:
1. name
2. description
3. type
4. permissionMode
5. tools
6. skills
7. model
8. color

### Table Formatting

**Issue**: Tables not properly formatted

**Fix**:
```bash
npx prettier --write --parser markdown {agent-file}.md
```

---

## Semantic Fixes

Require Claude reasoning but have clear outcomes.

### PermissionMode Alignment

**Issue**: permissionMode doesn't match agent type

**Fix**:
- architecture → `permissionMode: plan`
- quality → `permissionMode: plan`
- analysis → `permissionMode: plan`
- all others → `permissionMode: default`

### Tool Validation

**Issue**: Missing required tools or has forbidden tools

**Fix**: Add/remove based on agent type requirements

**Required by type:**
- All: Read, TodoWrite
- development: Write, Edit, Bash
- testing: Bash

**Forbidden by type:**
- architecture: Write, Edit (read-only)
- quality: Write, Edit (review-only)

### Missing Skill Tool (Phase 3)

**Issue**: Agent has `skills:` field but missing `Skill` in `tools:` list

**Detection**: Phase 3 reports "Agent has skills but missing Skill tool"

**Category**: Deterministic (automated fix with Edit tool)

**Fix Steps**:
1. Read current `tools:` field value
2. Add `Skill` in correct alphabetical position
3. Use Edit tool with exact old_string → new_string pattern

**Alphabetical Order**:
AskUserQuestion, Bash, BashOutput, Edit, Glob, Grep, KillBash, MultiEdit, Read, Skill, TodoWrite, WebFetch, WebSearch, Write

**Example**:
```typescript
Edit({
  file_path: '.claude/agents/{type}/{name}.md',
  old_string: 'tools: Bash, Glob, Grep, Read, TodoWrite, Write',
  new_string: 'tools: Bash, Glob, Grep, Read, Skill, TodoWrite, Write'
})
```

**Why Critical**: Core skills in frontmatter require Skill tool to invoke via `skill: "name"` syntax. Without Skill tool, agent cannot execute skill invocations → broken at runtime.

**Currently Affects**: 4+ agents (backend-architect, security-architect, backend-developer, backend-reviewer)

**Reference**: agent-compliance-contract.md Section 12

**Gold Standard**: frontend-developer.md line 5

### Skill Loading Protocol

**Issue**: Agent with `skills:` frontmatter lacks Tiered Skill Loading Protocol

**Fix**: Add section with:
- Tier 1: Always Read (universal + gateway + core)
- Tier 2: Multi-Step Tasks (TodoWrite if ≥2 steps)
- Tier 3: Triggered by Task Type (domain-specific tables)
- Anti-Bypass (3 bullet points)

**Template**: See `agent-templates.md`

---

## Interactive Fixes

Require user confirmation for ambiguous cases.

### Gateway Selection

**Issue**: Agent needs gateway but unclear which one

**Solution**: Use AskUserQuestion to let user choose

### Library Skills in Frontmatter

**Issue**: Library skill path in `skills:` field

**Fix**: Move to Tier 3 trigger tables in body, keep only gateway in frontmatter

### Content Duplication

**Issue**: Agent body duplicates existing skill content

**Solution**: Extract to skill or reference existing skill

---

## Common Patterns

### Reading Agent File

```
Read('.claude/agents/{type}/{name}.md')
```

### Creating Backup

```bash
mkdir -p .claude/agents/{type}/.local
cp .claude/agents/{type}/{name}.md \\
   .claude/agents/{type}/.local/{name}.md.bak.$(date +%Y%m%d_%H%M%S)
```

### Re-Auditing

```
skill: "auditing-agents"
```

With agent name for verification.

---

## Troubleshooting

### Edit Fails

**Symptom**: "old_string not found"

**Causes**:
- File changed since last read
- Whitespace mismatch
- Line ending differences

**Fix**: Re-read file, verify exact string

### Multiple Issues Same Line

**Approach**: Fix one at a time, re-read between fixes

### Nested References

**Issue**: Reference file references another reference

**Limit**: Max 2 levels deep (SKILL.md → ref1.md → ref2.md)

---

## Related

- [phase-categorization.md](phase-categorization.md) - Phase mapping
- [claude-automated-fixes.md](claude-automated-fixes.md) - Semantic details
- [hybrid-human-fixes.md](hybrid-human-fixes.md) - Interactive details
- [complete-examples.md](complete-examples.md) - Full workflows
