# Phase 2: Allowed-Tools Field

## What It Checks

- `allowed-tools` field exists in frontmatter
- Field is properly formatted (comma-separated string)
- Tools are valid Claude Code tools

## Why It Matters

The `allowed-tools` field is **REQUIRED** for all skills. It defines which tools the skill can use when activated, enforcing least-privilege access control.

**Without this field**: Skill cannot be properly loaded or used by Claude Code.

## Detection Patterns

### CRITICAL Issues

**1. Missing Field**
```yaml
---
name: my-skill
description: Use when doing something
# Missing: allowed-tools field
---
```

**2. Empty Field**
```yaml
allowed-tools:   # Empty
```

### WARNING Issues

**1. Invalid Tool Names**
```yaml
allowed-tools: Read, Write, InvalidTool, Bash
# InvalidTool is not a recognized Claude Code tool
```

**2. Inconsistent Formatting**
```yaml
allowed-tools: [Read, Write]  # Array format (should be comma-separated string)
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can add default field based on skill purpose

**Fix strategy:**
1. Analyze skill content to infer tool needs
2. Add appropriate `allowed-tools` field
3. Default to: `Read, Write, Bash` if cannot infer

**Implementation:**
```typescript
// Detects skill purpose and adds appropriate tools
if (hasScripts) tools.push('Bash');
if (mentionsEditing) tools.push('Edit', 'Write');
if (mentionsSearch) tools.push('Grep', 'Glob');
```

## Examples

### Example 1: Missing Field (Auto-Fixed)

**Before:**
```yaml
---
name: react-testing-patterns
description: Use when testing React components
---
```

**After:**
```yaml
---
name: react-testing-patterns
description: Use when testing React components
allowed-tools: Read, Write, Bash
---
```

### Example 2: Inferred from Content

**Before:**
```yaml
---
name: debugging-guide
description: Use when debugging complex issues
---

# Content mentions: searching logs, reading files, running commands
```

**After:**
```yaml
---
name: debugging-guide
description: Use when debugging complex issues
allowed-tools: Read, Bash, Grep, Glob
---
```

## Valid Tools

```
Read, Write, Edit, MultiEdit, Bash, Grep, Glob, WebFetch, WebSearch,
TodoWrite, TodoRead, NotebookEdit, NotebookRead, LS
```

## Tool Selection Guidelines

| Skill Purpose | Suggested Tools |
|---------------|-----------------|
| Documentation/Reference | Read |
| Code modification | Read, Write, Edit, Bash |
| Testing/Validation | Read, Bash, Grep, Glob |
| Web research | Read, WebFetch, WebSearch |
| Task management | TodoWrite, TodoRead |
| Search/Analysis | Read, Grep, Glob |
| MCP integration | Read, Bash, WebFetch |

## Manual Remediation

If auto-fix produces wrong tools:

1. Review skill content and purpose
2. Identify which operations the skill performs
3. Add minimum required tools
4. Test skill with limited toolset
5. Add tools only as needed

## Related Phases

- [Phase 8: TypeScript Structure](phase-08-typescript-structure.md) - Scripts require Bash
- All phases - Every skill needs this field

## Quick Reference

| Issue | Severity | Auto-Fix | Default Tools |
|-------|----------|----------|---------------|
| Missing field | CRITICAL | ✅ Yes | Read, Write, Bash |
| Empty field | CRITICAL | ✅ Yes | Read, Write, Bash |
| Invalid tools | WARNING | ✅ Yes | Remove invalid |
