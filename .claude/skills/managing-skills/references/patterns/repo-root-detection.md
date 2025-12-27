# Repository Root Navigation (MANDATORY Step 0)

**Every skill operation MUST start by navigating to super-repo root.**

Referenced by: All skill-management skills (`updating-skills`, `creating-skills`, `auditing-skills`, `fixing-skills`, `deleting-skills`, `renaming-skills`, `migrating-skills`, `searching-skills`, `listing-skills`, `syncing-gateways`)

---

## MANDATORY Step 0: Navigate to Repository Root

**Before ANY skill operation, execute this command:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
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
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
```

**CRITICAL for Claude Code Bash Tool:**

Claude Code's Bash tool has issues with `$()` command substitution in certain contexts. When you need to use REPO_ROOT:

```bash
# ✅ BEST: Use absolute paths directly (no REPO_ROOT needed)
cd /Users/nathansportsman/chariot-development-platform/.claude

# ✅ ALTERNATIVE: Get REPO_ROOT once, then use in subsequent commands
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude"

# ❌ AVOID: Nested $() in same line with Bash tool
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
```

**For skill documentation** (where developers use terminal):

```bash
# Developers can use the concise version
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
```

## Why This Pattern

1. **`--show-superproject-working-tree`** - Returns super-repo root if in submodule
2. **`2>/dev/null`** - Suppresses error when not in submodule
3. **`${VAR:-default}`** - Falls back to regular toplevel if not in super-repo

## Usage in Skills

### For Bash Code Blocks

```bash
# At the start of any multi-line bash block
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"

cd "$REPO_ROOT/.claude" && npm run audit -- skill-name
```

### For Single Commands (Inline)

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}" && cd "$REPO_ROOT/.claude" && npm run audit -- skill-name
```

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

## Common Mistakes

### Mistake 1: Using `test -z`

```bash
# OLD (verbose)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)

# NEW (concise with same behavior)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
```

### Mistake 2: Missing Error Suppression

```bash
# WRONG - prints error to stderr
REPO_ROOT=$(git rev-parse --show-superproject-working-tree)

# CORRECT - silent fallback
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
```

### Mistake 3: cd Without Path Validation

```bash
# WRONG - may fail silently
cd "$REPO_ROOT/.claude"

# CORRECT - fail fast if path doesn't exist
cd "$REPO_ROOT/.claude" || { echo "Error: .claude directory not found"; exit 1; }
```

## Integration with npm Workspaces

The `.claude` directory uses npm workspaces. Always run commands from `.claude`:

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"

# Run workspace command
cd "$REPO_ROOT/.claude" && npm run -w @chariot/auditing-skills search -- "query"
```

## Related Patterns

- [Backup Strategy](./backup-strategy.md) - Uses REPO_ROOT for backup paths
- [CLI Usage](../cli-usage.md) - Full CLI reference with REPO_ROOT usage
