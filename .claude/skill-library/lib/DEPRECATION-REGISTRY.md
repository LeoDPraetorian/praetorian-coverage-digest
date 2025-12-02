# Deprecation Registry

Central registry tracking deprecated commands, skills, agents, MCP tools, and patterns.

## Purpose

Provides a single source of truth for:
- **Detecting** outdated references (audit-references skills)
- **Fixing** outdated references (fix-references skills)
- **Tracking** renames automatically (rename skills)

## Files

| File | Purpose |
|------|---------|
| `deprecation-registry.json` | The registry data |
| `deprecation-registry.schema.json` | JSON Schema for validation |
| `DEPRECATION-REGISTRY.md` | This documentation |

## Structure

```json
{
  "commands": {
    "/old-command": {
      "replacedBy": "/new-command",
      "deprecatedDate": "2024-11-28",
      "reason": "Why it was renamed/removed"
    }
  },
  "skills": { /* same structure */ },
  "agents": { /* same structure */ },
  "mcpTools": { /* same structure */ },
  "patterns": {
    "old-pattern": {
      "replacedBy": "new-pattern",
      "context": "Where this applies",
      "reason": "Why it's deprecated"
    }
  }
}
```

## Entry Types

### Renamed (has replacedBy)
```json
"old-name": {
  "replacedBy": "new-name",
  "deprecatedDate": "2024-11-28",
  "reason": "Naming convention change"
}
```

### Removed (replacedBy is null)
```json
"removed-thing": {
  "replacedBy": null,
  "deprecatedDate": "2024-11-28",
  "reason": "Functionality moved elsewhere",
  "status": "removed"
}
```

### Invalid Pattern
```json
"BashOutput": {
  "replacedBy": null,
  "context": "In agent tools field",
  "reason": "Not a valid tool",
  "status": "invalid"
}
```

## How It's Updated

### Automatic (via rename skills)

When you run:
```bash
/skill-manager rename old-skill new-skill
/agent-manager rename old-agent new-agent
```

The rename skills automatically add entries to this registry.

### Manual

For bulk deprecations or pattern changes, edit `deprecation-registry.json` directly.

## How It's Consumed

### Audit Skills (detect issues)

```typescript
import registry from '../lib/deprecation-registry.json';

// Check if a skill reference is deprecated
function isDeprecated(skillName: string): boolean {
  return skillName in registry.skills;
}

// Get replacement
function getReplacement(skillName: string): string | null {
  return registry.skills[skillName]?.replacedBy ?? null;
}
```

### Fix Skills (remediate issues)

```typescript
import registry from '../lib/deprecation-registry.json';

// Replace deprecated references in content
function fixReferences(content: string): string {
  for (const [old, entry] of Object.entries(registry.skills)) {
    if (entry.replacedBy) {
      content = content.replaceAll(old, entry.replacedBy);
    }
  }
  return content;
}
```

## Consumers

| Skill | How It Uses Registry |
|-------|---------------------|
| `claude-skill-audit-references` | Detects deprecated skill/command refs |
| `claude-skill-fix-references` | Fixes deprecated skill/command refs |
| `claude-agent-audit-references` | Detects deprecated refs in agents |
| `claude-agent-fix-references` | Fixes deprecated refs in agents |
| `claude-skill-rename` | Adds entries when renaming |
| `claude-agent-rename` | Adds entries when renaming |

## Maintainers

| Skill | Role |
|-------|------|
| `claude-skill-rename` | Adds skill deprecation entries |
| `claude-agent-rename` | Adds agent deprecation entries |
| `claude-command-rename` | Adds command deprecation entries |

## Validation

Validate the registry against the schema:

```bash
npx ajv validate -s deprecation-registry.schema.json -d deprecation-registry.json
```

## Best Practices

1. **Always add entries when renaming** - Never rename without updating registry
2. **Include migration notes** - Help users understand how to update
3. **Date all deprecations** - Track when things changed
4. **Use status field** - Distinguish renamed vs removed vs invalid
5. **Keep patterns section updated** - Anti-patterns are as important as renames
