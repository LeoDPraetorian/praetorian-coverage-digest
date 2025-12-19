# Phase 10: Reference Audit (Deprecation Registry)

## What It Checks

- Skills/agents/commands referenced in skill body still exist
- No references to deprecated/renamed skills
- No references to removed commands
- Compliance with deprecation registry

## Why It Matters

**Broken references**: Skills referencing non-existent skills/commands fail when Claude tries to use them.

**Deprecation registry**: Central source of truth for renamed/removed skills, agents, and commands.

**Location**: `.claude/skill-library/lib/deprecation-registry.json`

## Detection Patterns

### WARNING Issues

**1. Deprecated Skill Reference**
```markdown
Use skill: "old-skill-name"
# old-skill-name was renamed to new-skill-name
```

**2. Removed Command Reference**
```markdown
Run /old-command to fix this
# /old-command was removed or renamed
```

**3. Deprecated Agent Reference**
```markdown
Use Task tool with agent "old-agent-name"
# Agent was renamed or removed
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can replace references using registry mappings

**Fix logic:**
```typescript
// Load deprecation registry
const registry = {
  "skills": {
    "old-name": { "new": "new-name", "reason": "Renamed for clarity" }
  },
  "commands": {
    "/old-cmd": { "new": "/new-cmd", "reason": "Consolidated" }
  }
};

// Replace in skill body
content = content.replace('skill: "old-name"', 'skill: "new-name"');
```

## Examples

### Example 1: Renamed Skill

**Before:**
```markdown
For testing, use skill: "test-runner"
```

**Registry:**
```json
{
  "skills": {
    "test-runner": {
      "new": "developing-with-tdd",
      "reason": "Renamed for clarity"
    }
  }
}
```

**After:**
```markdown
For testing, use skill: "developing-with-tdd"
```

### Example 2: Removed Command

**Before:**
```markdown
Run /feature-complete to implement this
```

**Registry:**
```json
{
  "commands": {
    "/feature-complete": {
      "removed": true,
      "reason": "Deprecated in favor of manual workflow"
    }
  }
}
```

**After:**
```markdown
To implement this feature, follow the TDD workflow manually
```

## Deprecation Registry Structure

**Location**: `.claude/skill-library/lib/deprecation-registry.json`

**Schema:**
```json
{
  "skills": {
    "old-skill-name": {
      "new": "new-skill-name",
      "reason": "Why it changed"
    }
  },
  "agents": {
    "old-agent-name": {
      "new": "new-agent-name",
      "reason": "Renamed for consistency"
    }
  },
  "commands": {
    "/old-command": {
      "new": "/new-command",
      "reason": "Consolidated functionality"
    }
  },
  "antipatterns": [
    {
      "pattern": "skill: \"problematic-pattern\"",
      "replacement": "Better approach",
      "reason": "Why to avoid"
    }
  ]
}
```

## Edge Cases

**1. Partial Matches**

```markdown
# Skill name in prose (not invocation)
"The test-runner skill was useful..."
# Don't auto-replace prose, only invocations
```

**2. Multiple Renames**

```
old-name → intermediate-name → final-name
```

Registry should map old → final directly.

**3. Conditional Deprecation**

Some references valid in certain contexts:
```markdown
# Legacy mode (still supported)
skill: "old-name"  # OK if in migration guide
```

## Manual Remediation

**If auto-fix fails or registry incomplete:**

1. Search for deprecated references:
   ```bash
   grep -r "skill: \"old-name\"" .
   ```

2. Check registry for mapping:
   ```bash
   cat .claude/skill-library/lib/deprecation-registry.json | jq '.skills["old-name"]'
   ```

3. Update manually if not in registry:
   - Find current equivalent
   - Update reference
   - Consider adding to registry

## Related Phases

- [Phase 11: Command Examples](phase-11-command-examples.md) - Command references
- Deprecation Registry Schema - Complete schema documentation

## Quick Reference

| Deprecated Item | Auto-Fix | Source |
|-----------------|----------|--------|
| Skill names | ✅ | deprecation-registry.json |
| Agent names | ✅ | deprecation-registry.json |
| Command names | ✅ | deprecation-registry.json |
| Anti-patterns | ✅ | deprecation-registry.json |
