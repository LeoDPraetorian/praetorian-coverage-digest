# List Workflow

Display all skills from both core and library locations.

## Overview

List operation shows all available skills with location, type, and compliance status.

## Basic List

### List All Skills
```bash
npm run list
```

Output:
```
📋 Skills:

┌─────────────────────────────────┬──────────┬─────────────────────────┐
│ Skill Name                      │ Location │ Path                    │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│ skill-manager                   │ CORE     │ .claude/skills/...      │
│ mcp-manager                     │ CORE     │ .claude/skills/...      │
│ react-patterns                  │ LIB      │ .claude/skill-library...│
│ neo4j-schema                    │ LIB      │ .claude/skill-library...│
└─────────────────────────────────┴──────────┴─────────────────────────┘

Total: 147 skills

Location Distribution:
  Core: 18
  Library: 129
```

## Filter Options

### Filter by Location
```bash
# Core skills only
npm run list --location core

# Library skills only
npm run list --location library
```

### Filter by Type
```bash
# Tool-wrapper skills
npm run list --type tool-wrapper

# Reasoning skills
npm run list --type reasoning

# Hybrid skills
npm run list --type hybrid
```

## Output Details

### Location Badge
- **CORE** - `.claude/skills/` (green)
- **LIBRARY** - `.claude/skill-library/` (cyan)

### Skill Type
Auto-detected from:
- Frontmatter `allowed-tools`
- Content structure
- Script organization

**Types:**
- `tool-wrapper` - Wraps single tool/CLI
- `reasoning` - Teaches patterns/methodologies
- `hybrid` - Mix of both

### Compliance Status (Future)
- ✅ PASS - All phases pass
- ⚠️ WARN - Non-critical issues
- ❌ FAIL - Critical issues

## Use Cases

### Use Case 1: Discover Available Skills
```bash
npm run list
```

See complete skill inventory.

### Use Case 2: Review Core Skills
```bash
npm run list --location core
```

Audit high-frequency skills.

### Use Case 3: Find Tool-Wrapper Skills
```bash
npm run list --type tool-wrapper
```

Identify CLIs and integrations.

### Use Case 4: Library Organization
```bash
npm run list --location library
```

Review library categorization.

## Performance

- Fast iteration (< 1 second for 147 skills)
- Frontmatter-only parsing
- Parallel directory traversal

## Integration

### With Search
List provides overview, search finds specific:
```bash
# See all skills
npm run list

# Find specific pattern
npm run search -- "testing"
```

### With Audit
List identifies skills, audit validates:
```bash
# List all
npm run list

# Audit specific
npm run audit -- skill-name
```

## Related

- [Search Workflow](search-workflow.md)
- [Audit Phases](audit-phases.md)
