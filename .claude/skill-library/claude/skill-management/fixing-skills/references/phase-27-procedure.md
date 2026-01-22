# Phase 27 Fix Procedure: Relative Path Depth

**Parent:** [fixing-skills SKILL.md](../SKILL.md)

**Category:** Hybrid (deterministic path conversion + Claude verification)

## What Phase 27 Detects

Cross-skill links using relative paths (`../`) instead of full `.claude/` paths.

**Violation examples:**

```markdown
# ❌ FAILS Phase 27 - relative path to another skill

[brainstorming](../../brainstorming/SKILL.md)
[orchestrating-research](../../research/orchestrating-research/SKILL.md)
[managing-skills](../../../../../skills/managing-skills/SKILL.md)

# ✅ PASSES Phase 27 - full .claude/ path

[brainstorming](.claude/skills/brainstorming/SKILL.md)
[orchestrating-research](.claude/skill-library/research/orchestrating-research/SKILL.md)
[managing-skills](.claude/skills/managing-skills/SKILL.md)
```

**Allowed (NOT violations):**

```markdown
# Within same skill - relative paths allowed

[Details](references/phase-details.md)
[Examples](../examples/example-1.md)
```

## Fix Procedure

### Step 1: Extract All Cross-Skill Links

```bash
# Find all relative paths that leave the skill directory
grep -n '\.\./.*SKILL\.md' {skill-path}/SKILL.md {skill-path}/references/*.md 2>/dev/null
grep -n '\.\./.*\.md' {skill-path}/SKILL.md {skill-path}/references/*.md 2>/dev/null | grep -v 'references/' | grep -v 'examples/'
```

### Step 2: Determine Target Skill Location

For each violating path, determine if target is CORE or LIBRARY:

```bash
SKILL_NAME="target-skill-name"

# Check CORE first
if [ -f ".claude/skills/$SKILL_NAME/SKILL.md" ]; then
  echo "CORE: .claude/skills/$SKILL_NAME/SKILL.md"
# Check LIBRARY
elif find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" 2>/dev/null | grep -q .; then
  FULL_PATH=$(find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" | head -1)
  echo "LIBRARY: $FULL_PATH"
else
  echo "NOT FOUND: Skill does not exist - remove or fix link"
fi
```

### Step 3: Convert Path

| Target Type          | Old Path                                                   | New Path                                                                          |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| CORE skill           | `../../brainstorming/SKILL.md`                             | `.claude/skills/brainstorming/SKILL.md`                                           |
| LIBRARY skill        | `../../research/orchestrating-research/SKILL.md`           | `.claude/skill-library/research/orchestrating-research/SKILL.md`                  |
| Reference in CORE    | `../../../../skills/managing-skills/references/foo.md`     | `.claude/skills/managing-skills/references/foo.md`                                |
| Reference in LIBRARY | `../../skill-management/auditing-skills/references/bar.md` | `.claude/skill-library/claude/skill-management/auditing-skills/references/bar.md` |

### Step 4: Apply Fix

Use Edit tool to replace each violating path:

```
Edit(
  file_path: "{skill-path}/SKILL.md",
  old_string: "[brainstorming](../../brainstorming/SKILL.md)",
  new_string: "[brainstorming](.claude/skills/brainstorming/SKILL.md)"
)
```

### Step 5: Verify Fix

```bash
# Confirm no relative paths to other skills remain
grep -n '\.\./.*SKILL\.md' {skill-path}/SKILL.md {skill-path}/references/*.md 2>/dev/null
# Should return empty

# Verify new paths resolve from repo root
[ -f ".claude/skills/brainstorming/SKILL.md" ] && echo "✅ Path valid" || echo "❌ Path broken"
```

## Common Patterns

| From Location | To Skill                           | Correct Path                                                             |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Any skill     | `brainstorming` (CORE)             | `.claude/skills/brainstorming/SKILL.md`                                  |
| Any skill     | `managing-skills` (CORE)           | `.claude/skills/managing-skills/SKILL.md`                                |
| Any skill     | `using-skills` (CORE)              | `.claude/skills/using-skills/SKILL.md`                                   |
| Any skill     | `auditing-skills` (LIBRARY)        | `.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md` |
| Any skill     | `creating-skills` (LIBRARY)        | `.claude/skill-library/claude/skill-management/creating-skills/SKILL.md` |
| Any skill     | `orchestrating-research` (LIBRARY) | `.claude/skill-library/research/orchestrating-research/SKILL.md`         |

## Rationale

Full `.claude/` paths are:

- **Explicit**: No runtime path resolution needed
- **Resolvable**: Always work from repo root
- **Maintainable**: Don't break when files move within a skill

Relative paths like `../../` are:

- **Fragile**: Break when directory structure changes
- **Ambiguous**: Require counting levels to understand
- **Error-prone**: Easy to get wrong depth

## Related

- [Phase 27 in auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details-human-gateway.md) - Detection rules
- [Phase 4 (Broken Links)](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details-deterministic.md) - Existence validation
