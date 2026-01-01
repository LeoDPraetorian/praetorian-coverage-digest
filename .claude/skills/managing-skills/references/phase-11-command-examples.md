# Phase 11: Command Example Portability

## What It Checks

- Bash command examples use ROOT detection pattern
- No hardcoded `cd .claude/skills/` without $ROOT
- npm --prefix commands include /scripts suffix
- Commands work from any directory (root, submodules, nested)

## Why It Matters

**Portability**: Command examples users copy should work regardless of their current directory.

**Submodules**: Commands break when run from git submodules if they assume repo root.

**Common failure**: `cd .claude/skills/my-skill` only works from repo root, fails everywhere else.

## Detection Patterns

### CRITICAL Issues

**1. npm --prefix Without /scripts**

```bash
npm run --prefix .claude/skills/my-skill audit
# ❌ Missing /scripts - package.json not found
```

**2. Hardcoded Paths**

```bash
cd /Users/name/project/.claude/skills/...
# ❌ Absolute paths break on other machines
```

### WARNING Issues

**1. cd Without ROOT**

```bash
cd .claude/skills/my-skill && npm run dev
# ❌ Assumes current directory is repo root
```

**2. Relative Paths**

```bash
./scripts/helper.sh
# ❌ Assumes running from skill directory
```

## Auto-Fix Capability

⚠️ **PARTIALLY auto-fixable** - uses specialized CLI

**Delegates to**: claude-skill-audit-commands CLI

**What it fixes:**

- ✅ Adds ROOT detection to cd commands
- ✅ Fixes npm --prefix to use cd pattern instead
- ✅ Wraps commands with repo-root detection
- ❌ Cannot fix all context-dependent patterns

## The Required Pattern

**Standard pattern for all bash examples:**

```bash
ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); ROOT="${ROOT:-$(git rev-parse --show-toplevel)}"
cd "$ROOT/.claude/skills/skill-name/scripts" && npm run command
```

**Why this works:**

- `--show-superproject-working-tree`: Returns super-repo root when in submodule
- Returns empty string (not error) when not in submodule
- `${ROOT:-$(fallback)}`: Uses fallback if empty
- `--show-toplevel`: Gets repo root for non-submodule case
- Works from ANY directory

## Examples

### Example 1: Fix cd Command

**Before:**

```bash
cd .claude/skills/my-skill/scripts && npm run audit
```

**After:**

```bash
ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); ROOT="${ROOT:-$(git rev-parse --show-toplevel)}"
cd "$ROOT/.claude/skills/my-skill/scripts" && npm run audit
```

### Example 2: Fix npm --prefix

**Before:**

```bash
npm run --prefix .claude/skills/my-skill search
# Missing /scripts - package.json not in my-skill root
```

**After:**

```bash
ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); ROOT="${ROOT:-$(git rev-parse --show-toplevel)}"
cd "$ROOT/.claude/skills/my-skill/scripts" && npm run search
```

### Example 3: Claude Code Execution

**Before:**

```bash
!cd .claude/skills/my-skill/scripts && npm run command
```

**After:**

```bash
!ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); ROOT="${ROOT:-$(git rev-parse --show-toplevel)}" && cd "$ROOT/.claude/skills/my-skill/scripts" && npm run command
```

## Edge Cases

**1. Multi-Line Commands**

```bash
# Before
cd .claude/skills/my-skill
npm install
npm run dev
```

**After:**

```bash
ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); ROOT="${ROOT:-$(git rev-parse --show-toplevel)}"
cd "$ROOT/.claude/skills/my-skill"
npm install
npm run dev
```

**2. Teaching Examples (Don't Fix)**

Examples showing WRONG patterns intentionally:

````markdown
**❌ WRONG:**

```bash
cd .claude/skills/...  # This is intentionally wrong for teaching
```
````

````

Don't auto-fix teaching examples.

## Manual Remediation

**Using audit/fix CLI from .claude/ root:**

```bash
# From .claude/ root (using workspace shortcuts)
cd .claude

# Audit for Phase 11 issues
npm run audit -- my-skill --phase 11

# Fix with guidance
npm run fix -- my-skill --phase 11
````

**Manual pattern application:**

1. Prefix all cd commands with ROOT detection
2. Use `"$ROOT/..."` for all .claude/ paths
3. Test from different directories:
   - Repo root
   - Submodule (if applicable)
   - Nested directory

## Related Phases

- [Phase 8: TypeScript Structure](phase-08-typescript-structure.md) - TypeScript uses same pattern internally
- npm-workspace-pattern (claude-skill-write) - Complete pattern reference

## Quick Reference

| Pattern        | Fix                      | Specialized CLI |
| -------------- | ------------------------ | --------------- |
| cd .claude/... | ✅ Add ROOT         | audit-commands  |
| npm --prefix   | ✅ Convert to cd pattern | audit-commands  |
| Relative paths | ✅ Make absolute         | audit-commands  |
