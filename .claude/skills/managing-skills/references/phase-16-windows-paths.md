# Phase 16: Windows Path Detection

## What It Checks

- All paths use forward slashes (POSIX-style)
- No Windows-style backslash paths (`C:\path\to\file`)
- No relative backslash paths (`.\folder\file`)
- Cross-platform path compatibility

## Why It Matters

**Cross-platform compatibility**: Skills may be authored on Windows but executed on macOS/Linux.

**Path behavior:**

- Backslash paths (`\`) only work on Windows
- Forward slash paths (`/`) work on ALL platforms
- Forward slashes work on Windows too

**Without this check**: Skills work for the author but break for everyone else.

## Detection Patterns

### WARNING Issues

**1. Absolute Windows Paths**

```markdown
See the config at C:\Users\dev\project\.claude\skills\
```

**2. Relative Backslash Paths**

```markdown
Reference: .\references\patterns.md
```

**3. Mixed Backslash Paths**

```markdown
Path: .claude\skills\my-skill\SKILL.md
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - Converts backslashes to forward slashes

**Fix actions:**

1. Find all backslash path patterns
2. Replace `\` with `/`
3. Preserve path semantics

**CLI:**

```bash
npm run fix -- <skill-name> --phase 16
```

**Pattern detection:**

```typescript
// Matches: C:\path, .\path, \path
const backslashPathPattern = /(?:[a-zA-Z]:\\|\.\\|\\)[\w\\/.-]+/g;
```

## The Standard Pattern

**Use forward slashes everywhere:**

```markdown
# ❌ Wrong - Windows-only
See: .\references\patterns.md
Path: C:\Users\dev\.claude\skills\

# ✅ Correct - Cross-platform
See: ./references/patterns.md
Path: /Users/dev/.claude/skills/
```

## Examples

### Example 1: Fix Relative Paths

**Before:**

```markdown
**See:** [Patterns](.\references\patterns.md)
**Also:** [Examples](.\examples\basic.md)
```

**After:**

```markdown
**See:** [Patterns](./references/patterns.md)
**Also:** [Examples](./examples/basic.md)
```

### Example 2: Fix Code Block Paths

**Before:**

```bash
cd .claude\skills\my-skill\scripts
npm run build
```

**After:**

```bash
cd .claude/skills/my-skill/scripts
npm run build
```

### Example 3: Fix Description Paths

**Before:**

```yaml
---
description: Use when working with files in .\references\ directory
---
```

**After:**

```yaml
---
description: Use when working with files in ./references/ directory
---
```

## Edge Cases

**1. Escape Sequences (Not Paths)**

```markdown
Use `\n` for newlines and `\t` for tabs.
```

These are NOT converted - they're escape sequences, not paths.

**2. Regex Patterns**

```typescript
const pattern = /path\\to\\file/;
```

Backslashes in regex are intentional - review manually.

**3. Windows-Specific Documentation**

If a skill specifically documents Windows behavior, backslash paths may be intentional. Add a comment:

```markdown
<!-- Windows-specific example, backslashes intentional -->
```

## Manual Remediation

**Find all backslash paths:**

```bash
grep -rn '\\' --include="*.md" .claude/skills/
```

**Review each match:**

1. Is it a file path? → Convert to forward slashes
2. Is it an escape sequence (`\n`, `\t`)? → Leave as-is
3. Is it in a regex? → Review context
4. Is it Windows-specific docs? → Add comment

## Related Phases

- [Phase 4: Broken Links](phase-04-broken-links.md) - Paths must exist
- [Phase 5: File Organization](phase-05-file-organization.md) - Standard directory structure

## Quick Reference

| Pattern | Issue | Fix |
|---------|-------|-----|
| `C:\path\to\file` | Windows absolute path | `/path/to/file` or relative |
| `.\folder\file` | Backslash relative | `./folder/file` |
| `path\to\file` | Backslash separator | `path/to/file` |
| `\n`, `\t` | Escape sequence | Leave as-is |
