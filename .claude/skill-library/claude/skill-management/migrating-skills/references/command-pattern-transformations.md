# Command Pattern Transformations

**Complete examples for transforming command files during migration between Core ↔ Library.**

Commands that invoke migrated skills need **structural changes**, not just path updates. Core and Library commands have fundamentally different invocation patterns.

---

## When Demoting to Library (Core → Library)

Transform from Core pattern to Library pattern:

### Before (Core Pattern)

```markdown
---
allowed-tools: Skill, AskUserQuestion
skills: skill-name
---

Use the skill-name skill exactly as written.
```

### After (Library Pattern)

```markdown
---
allowed-tools: Read, Write, [other tools as needed]
---

Read and follow `.claude/skill-library/{category}/{skill-name}/SKILL.md` exactly as it is written.

**Context:** $ARGUMENTS
```

### Changes Required (ALL mandatory, no exceptions)

1. Remove `skills:` frontmatter field
2. In `allowed-tools:`, remove `Skill`, ensure `Read` is present
3. Replace body from "Use the X skill" to "Read and follow .claude/skill-library/{category}/{skill-name}/SKILL.md"
4. Add `**Context:** $ARGUMENTS` section if command accepts arguments

**Not acceptable:** "I'll just update the path" or "I'll do the structural changes later" - commands will be broken until ALL changes are applied.

---

## When Promoting to Core (Library → Core)

Transform from Library pattern to Core pattern:

### Before (Library Pattern)

```markdown
---
allowed-tools: Read, Write, [other tools]
---

Read and follow `.claude/skill-library/{category}/{skill-name}/SKILL.md` exactly as it is written.

**Context:** $ARGUMENTS
```

### After (Core Pattern)

```markdown
---
allowed-tools: Skill, AskUserQuestion
skills: skill-name
---

Use the skill-name skill exactly as written.

**Arguments:** $ARGUMENTS
```

### Changes Required (ALL mandatory, no exceptions)

1. Add `skills: {skill-name}` to frontmatter
2. In `allowed-tools:`, add `Skill`, can optionally remove `Read` if not otherwise needed
3. Replace body from "Read and follow" to "Use the {skill-name} skill exactly as written"
4. Change `**Context:**` to `**Arguments:**` if present

**Not acceptable:** "I'll just update the path" or "The command still works so I'll skip this" - commands must use correct pattern for their location.

---

## Why Structural Changes Matter

- **Core pattern**: Uses Skill tool invocation via `skills:` frontmatter
- **Library pattern**: Uses Read tool with full path
- **Mixed patterns fail**: Wrong pattern = skill not loaded/invoked correctly
- **All changes mandatory**: Partial updates leave commands broken
