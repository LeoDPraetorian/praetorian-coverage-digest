# Migration Workflow

Safe migration of skills between core and library locations.

## Overview

Skills can be moved between `.claude/skills/` (core) and `.claude/skill-library/` (library) while preserving all content and references.

## Migration Targets

### to-core

Move skill to `.claude/skills/`

**Use when:**

- Skill usage increases to 80%+ of conversations
- Becomes cross-cutting concern
- Should be in session-start hook

**Example:** Migrate my-skill to `.claude/skills/` core location.

### to-library:<category>

Move skill to `.claude/skill-library/<category>/`

**Use when:**

- Domain-specific skill
- Specialized use case
- Not needed in most conversations

**Example:** Migrate my-skill to `.claude/skill-library/development/frontend/`

### to-library:<domain>/<category>

Move to nested library location

**Example:** Migrate neo4j-patterns to `.claude/skill-library/databases/graph/`

## Migration Steps

### Step 1: Find Source Skill

Auto-detects current location (core or library).

### Step 2: Validate Target

Checks target directory doesn't already contain skill.

### Step 3: Copy Skill

Recursively copies entire skill directory:

- SKILL.md
- references/
- examples/
- templates/
- scripts/

### Step 4: Remove Source

Deletes original location after successful copy.

### Step 5: Update References

Updates references in:

- Other skills
- Commands
- Documentation

## Library Categories

### Development

- `development/frontend` - React, TypeScript, UI
- `development/backend` - Go, Python, APIs
- `development/infrastructure` - DevOps, deployment

### Testing

- `testing/unit` - Unit test patterns
- `testing/integration` - Integration testing
- `testing/e2e` - End-to-end testing

### Databases

- `databases/graph` - Neo4j, graph patterns
- `databases/relational` - PostgreSQL, SQL
- `databases/nosql` - DynamoDB, MongoDB

### Security

- `security/assessment` - Vulnerability scanning
- `security/compliance` - Audit, compliance

### Architecture

- `architecture/patterns` - Design patterns
- `architecture/decisions` - ADRs, tradeoffs

## Migration Confirmation

### Preview Migration Plan

```
📦 Migration plan:
  From: .claude/skills/my-skill
  To:   .claude/skill-library/development/frontend/my-skill

Proceed with migration? (y/n)
```

### Safety Checks

- Source skill exists
- Target location doesn't have conflict
- All files will be preserved

## Manual Steps After Migration

### 1. Update Session-Start Hook

If migrating FROM core:

```bash
# Remove from .claude/config/session-start-skills.json
```

If migrating TO core:

```bash
# Add to .claude/config/session-start-skills.json
```

### 2. Update using-skills Skill

Update available skills list if needed.

### 3. Search for References

```bash
grep -r "my-skill" .claude/
```

Update any hardcoded paths.

### 4. Re-audit

Audit the skill by invoking auditing-skills to verify compliance after migration.

## Common Migration Scenarios

### Scenario 1: Promote to Core

**From:** `.claude/skill-library/development/react-patterns`
**To:** `.claude/skills/react-patterns`

**Reason:** Usage increased to 85% of conversations

**Action:** Use migrating-skills to move react-patterns to core location.

### Scenario 2: Demote to Library

**From:** `.claude/skills/obscure-pattern`
**To:** `.claude/skill-library/archived/obscure-pattern`

**Reason:** Rarely used, specialized

**Action:** Use migrating-skills to move obscure-pattern to library archived category.

### Scenario 3: Reorganize Library

**From:** `.claude/skill-library/frontend/neo4j-queries`
**To:** `.claude/skill-library/databases/graph/neo4j-queries`

**Reason:** Better categorization

**Action:** Use migrating-skills to move neo4j-queries to databases/graph category.

## Safety Features

### Backup Before Migration

Recommendation:

```bash
git add -A
git commit -m "chore: backup before migration"
```

### Copy-Then-Delete

Migration copies first, then deletes source. If copy fails, source remains intact.

### Atomic Per-Skill

Each skill migration is independent. Batch migrations process individually.

## Related

- [Rename Protocol](rename-protocol.md)
- [Create Workflow](create-workflow.md)
- [File Organization](file-organization.md)
