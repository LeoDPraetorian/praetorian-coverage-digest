# Sync Gateways Workflow

## Overview

The `sync-gateways` command validates that gateway skills are synchronized with library skills, detecting broken entries (gateway references non-existent skills) and missing entries (library skills not in any gateway).

## Command Usage

```bash
# Check for discrepancies (report only)
npm run sync-gateways

# Preview fixes without applying
npm run sync-gateways -- --dry-run

# Apply fixes automatically
npm run sync-gateways -- --fix
```

## What It Checks

### 1. Broken Gateway Entries

**Detection**: Gateway SKILL.md references a path that doesn't exist

**Example**:
```
Gateway: gateway-integrations
Title: Jira Integration
Path: .claude/skill-library/development/integrations/jira-integration/SKILL.md (does not exist)
```

**Fix**: `--fix` removes the broken entry from the gateway

### 2. Missing Gateway Entries

**Detection**: Library skill exists but is not referenced in any gateway

**Example**:
```
.claude/skill-library/development/frontend/state/my-skill/SKILL.md
```

**Fix**: `--fix` adds the skill to the appropriate gateway based on category mapping

## Category-to-Gateway Mapping

| Category | Gateway |
|----------|---------|
| `development/frontend/*` | `gateway-frontend` |
| `development/backend/*` | `gateway-backend` |
| `testing/*` | `gateway-testing` |
| `security/*` | `gateway-security` |
| `claude/mcp-tools/*` | `gateway-mcp-tools` |
| `development/integrations/*` | `gateway-integrations` |

Skills in other categories (e.g., `workflow/`, `documents/`, `ai/`) will show as "missing" but this is expected - they don't have dedicated gateway skills yet and are accessible via skill-search CLI.

## Automatic Updates

Gateway skills are automatically updated in three scenarios:

### 1. Skill Creation (`npm run create`)

When creating a library skill:
```bash
npm run create -- my-skill "Use when doing X" --location library:development/frontend
```

**Automatic action**: Adds entry to `gateway-frontend`

### 2. Skill Migration (`npm run migrate`)

When migrating between locations:
```bash
npm run migrate -- my-skill to-library:testing
```

**Automatic actions**:
- **Same gateway**: Updates path in gateway
- **Different gateways**: Removes from old gateway, adds to new gateway
- **To/from core**: Adds or removes gateway entry as needed

### 3. Manual Sync

Run sync command to repair discrepancies:
```bash
npm run sync-gateways -- --fix
```

## Output Format

### Report Mode (no flags)

```
🔍 Scanning gateway skills...

📊 Validation Results:

❌ Found 1 broken gateway entry(ies):
  Gateway: gateway-integrations
  Title: Jira Integration
  Path: .claude/skill-library/development/integrations/jira-integration/SKILL.md (does not exist)

⚠️  Found 21 library skill(s) not in any gateway:
  .claude/skill-library/ai/llm-evaluation/SKILL.md
  .claude/skill-library/workflow/code-review-checklist/SKILL.md
  ...

💡 To fix these issues, run:
   npm run sync-gateways -- --dry-run  (preview fixes)
   npm run sync-gateways -- --fix      (apply fixes)
```

### Dry-Run Mode (`--dry-run`)

Shows what would be fixed without making changes:

```
🔧 DRY RUN Mode:

Removing broken gateway entries:
  [DRY RUN] Would remove from gateway-integrations: jira-integration

Adding missing gateway entries:
  [DRY RUN] Would add to gateway-frontend: my-skill
```

### Fix Mode (`--fix`)

Applies fixes and reports results:

```
🔧 FIX Mode:

Removing broken gateway entries:
  ✓ Removed from gateway-integrations: jira-integration

Adding missing gateway entries:
  ✓ Added to gateway-frontend: my-skill

✅ Fixed 2 issue(s)!
```

## When to Run

### Recommended Schedule

- **After manual skill deletions**: Run `npm run sync-gateways` to detect broken references
- **After bulk migrations**: Verify all paths updated correctly
- **Before releases**: Ensure all gateways are synchronized
- **After merge conflicts**: Gateway files may have stale entries

### Not Required

- After `npm run create` (automatic)
- After `npm run migrate` (automatic)
- During normal workflow (automatic updates handle most cases)

## Troubleshooting

### "No gateway found" warnings

```
⚠  No gateway found for .claude/skill-library/workflow/code-review-checklist/SKILL.md (category: workflow)
```

**Not an error** - This skill is in a category without a dedicated gateway. It's still accessible via:
- skill-search CLI: `npm run -w @chariot/skill-search search -- "code review"`
- Direct path in skill body

### Section Detection

Skills are automatically placed in appropriate sections within gateways based on path keywords:

| Keyword | Section |
|---------|---------|
| `ui/` | UI Components & Styling |
| `state/` | State Management |
| `testing/` | Testing |
| `patterns/` | Patterns & Architecture |
| `forms/` | Forms & Validation |

If auto-detection fails, skills are placed in a default section.

## Related Documentation

- [Create Workflow](create-workflow.md) - Gateway integration in skill creation
- [Migrate Workflow](migrate-workflow.md) - Gateway updates during migration
- [File Organization](file-organization.md) - Gateway file structure
