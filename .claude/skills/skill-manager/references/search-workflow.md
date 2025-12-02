# Search Workflow

Enhanced dual-location keyword discovery for skills.

## Overview

Search operation finds skills by keyword across BOTH core and library locations, providing complete skill discovery.

## Enhanced Search (New Feature)

### Before Consolidation
- Searched only `.claude/skills/` (~18 core skills)
- Library skills invisible (~129 skills)
- Blind spots for specialized skills

### After Consolidation
- Searches `.claude/skills/` + `.claude/skill-library/` (~147 total)
- Location indicators: [CORE] vs [LIB]
- Complete skill discovery

## Basic Search

### Search All Locations
```bash
npm run search -- "react"
```

Output:
```
📋 Search Results:

1. react-patterns [CORE] (Score: 100)
   Location: core
   Path: .claude/skills/react-patterns/SKILL.md
   Matches: Name match, Description match
   Description: Use when developing React components...

2. react-tanstack-query [LIB] (Score: 87)
   Location: library
   Path: .claude/skill-library/frontend/react-tanstack-query/SKILL.md
   Matches: Name match, Description match
   Description: Use when fetching data with TanStack Query...
```

## Search Options

### Limit Results
```bash
npm run search -- "testing" --limit 5
```

Shows top 5 results by score.

### Filter by Location
```bash
# Core skills only
npm run search -- "backend" --location core

# Library skills only
npm run search -- "backend" --location library
```

### Empty Query (List All)
```bash
npm run search -- ""
```

Lists all skills from both locations.

## Scoring Algorithm

### Points Awarded

| Match Type | Points | Example |
|------------|--------|---------|
| Name exact match | 100 | "react" matches "react" |
| Name substring | 50 | "react" in "react-patterns" |
| Description match | 30 | "react" in description text |
| Allowed-tools match | 10 | "react" in allowed-tools |

### Score Calculation

**Example:**
```
Skill: react-component-patterns
Query: "react"

- Name substring: 50 points (contains "react")
- Description: 30 points (mentions "React development")
- Total: 80 points
```

### Result Sorting
Results sorted by score (descending), highest relevance first.

## Location Indicators

### [CORE] Badge
Indicates core skill in `.claude/skills/`
- High-frequency usage
- Cross-cutting concerns
- Universal methodologies

### [LIB] Badge
Indicates library skill in `.claude/skill-library/`
- Domain-specific
- Specialized use cases
- Deep technical content

## Search Strategies

### Find Skill by Topic
```bash
npm run search -- "debugging"
```

Finds all debugging-related skills.

### Find Skills with Specific Tool
```bash
npm run search -- "playwright"
```

Finds skills that use Playwright tool.

### Find Skills by Domain
```bash
# Frontend skills
npm run search -- "react" --location library

# Backend skills
npm run search -- "golang" --location library
```

### Discover Related Skills
```bash
npm run search -- "testing"
```

Shows all testing-related skills across locations.

## Performance

### Search Time
- Core (18 skills): < 100ms
- Library (129 skills): < 500ms
- Total (147 skills): < 600ms

### Optimization
- Frontmatter-only parsing (no body scan)
- Cached file reads
- Parallel directory traversal

## Output Format

### Detailed Results
```
[Index]. [Skill Name] [Location Badge] (Score: [Points])
   Location: [core|library]
   Path: [Full path to SKILL.md]
   Matches: [List of match types]
   Description: [First 100 chars]...
```

### Summary Statistics
```
Loaded 147 skills
  Core: 18 skills
  Library: 129 skills

Found 12 matching skills
```

## Integration with using-skills

The search operation is used by `using-skills` skill:

```bash
# Called automatically by using-skills
npm run search -- "query"
```

Results inform skill selection during conversations.

## Common Search Patterns

### Pattern 1: Find Skill for Current Task
```bash
npm run search -- "react component"
# Returns react-patterns, react-modernization, etc.
```

### Pattern 2: Discover Domain Skills
```bash
npm run search -- "security" --location library
# Returns all library security skills
```

### Pattern 3: Find Tool-Specific Skills
```bash
npm run search -- "tanstack"
# Returns TanStack Query, Table, Router skills
```

### Pattern 4: Explore Category
```bash
npm run search -- "testing"
# Returns unit, integration, e2e, playwright skills
```

## Related

- [List Workflow](list-workflow.md)
- Using-skills skill (for skill discovery protocol)
