# Repository Root Navigation (MANDATORY Step 0)

**Every skill operation MUST start by navigating to super-repo root.**

Referenced by: All skill-management skills (`updating-skills`, `creating-skills`, `auditing-skills`, `fixing-skills`, `deleting-skills`, `renaming-skills`, `migrating-skills`, `searching-skills`, `listing-skills`, `syncing-gateways`)

---

## MANDATORY Step 0: Navigate to Repository Root

**Before ANY skill operation, execute this command:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**Why this is mandatory:**

- Core skills live at `.claude/skills/` in super-repo root
- Library skills live at `.claude/skill-library/` in super-repo root
- Claude Code sessions often start in submodules or subdirectories
- Operating from wrong directory causes "file not found" errors

**Verification:**

```bash
pwd                        # Should show super-repo root
ls .claude/skills/         # Should list core skills
ls .claude/skill-library/  # Should list library categories
```

**Cannot proceed with skill operations without this step** ✅

---

## How the Pattern Works

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

**Breakdown:**

1. `--show-superproject-working-tree` - Returns super-repo root if in submodule (empty if not)
2. `--show-toplevel` - Returns current repo root
3. Both flags together - Git outputs both values (super-repo first, then toplevel)
4. `| head -1` - Takes the first non-empty line (super-repo root when in submodule, repo root otherwise)

**Why this pattern is best:**

- Single git command with both flags
- No stderr redirect (`2>/dev/null`) needed
- No conditional `test -z` check needed
- Works reliably in Claude Code's Bash tool
- Avoids parsing issues with complex bash operators

---

## ⚠️ CRITICAL: Anti-Rationalization for File Not Found

**Common failure mode:**

1. Agent runs from submodule directory
2. Searches for skill file: `find .claude/skills -name "foo"`
3. File not found (looking in wrong location)
4. Agent invents explanation: "This skill doesn't exist" or "This must be a built-in skill"
5. Agent gives up or provides wrong guidance

**If you cannot find a skill file, the answer is NEVER:**

- ❌ "This skill doesn't exist in this repository"
- ❌ "This must be a built-in Claude Code skill"
- ❌ "This is part of the core skill registry I can't access"
- ❌ "The skill was deleted or never created"
- ❌ "This requires special permissions to view"

**The answer is ALWAYS:**

1. ✅ Check: What directory am I in? (`pwd`)
2. ✅ Navigate: Execute Step 0 above to go to super-repo root
3. ✅ Retry: Try finding/reading the file again from correct location

**Why this matters:**

- This is a LOCATION problem, not a FILE problem
- The file exists, you're just looking in the wrong place
- Inventing explanations wastes time and gives wrong conclusions
- Simply navigating to repo root fixes 99% of "file not found" issues

---

## The Problem

In a super-repository (chariot-development-platform), standard git commands can fail:

```bash
# FAILS in submodule context
git rev-parse --show-toplevel  # Returns submodule root, not super-repo root
```

## The Solution

**Standard Pattern** (use this exact snippet):

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

This works from:

- Super-repo root → returns super-repo root
- Any submodule → returns super-repo root
- Any subdirectory → returns appropriate root

---

## Usage in Skills

### Navigate to Repo Root

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

### Navigate to .claude Directory

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude"
```

### Example: Audit Skill

Audit the skill by invoking auditing-skills to verify compliance with all phase requirements.

### Example: Search Skills

Search for skills by invoking searching-skills with your keyword query.

---

## Absolute Paths with Read Tool

**CRITICAL**: The Read tool requires **absolute paths**. NEVER use relative paths like:

```
# WRONG - Read tool will fail
Read: .claude/skill-library/path/to/SKILL.md
```

Instead, instruct Claude to construct absolute paths:

```markdown
Use Read tool with the **absolute path** shown in search output.

Example: `/Users/username/chariot-development-platform/.claude/skill-library/path/to/SKILL.md`
```

---

## Old Patterns (DEPRECATED)

These patterns are deprecated. Update to the new simplified pattern above.

### ❌ DEPRECATED: 3-Line Pattern

```bash
# OLD - verbose and can cause parsing issues
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

### ❌ DEPRECATED: || Fallback Pattern

```bash
# OLD - doesn't work reliably in Claude Code bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
```

### ❌ DEPRECATED: Parameter Expansion Fallback

```bash
# OLD - complex and error-prone
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
```

### ✅ NEW: Simplified Pattern

```bash
# NEW - simple, reliable, works everywhere
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

---

## Related Patterns

- [Backup Strategy](./backup-strategy.md) - Uses ROOT for backup paths
