# Sync Gateways Workflow

## Overview

The `syncing-gateways` skill validates that gateway skills are synchronized with library skills, detecting broken entries (gateway references non-existent skills) and missing entries (library skills not in any gateway).

> **Note:** Gateway syncing is **instruction-based** (no CLI). Use the `syncing-gateways` library skill.

## Invoking the Skill

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
```

Follow the workflow mode appropriate for your situation:

| Workflow Mode      | Purpose                          | When to Use                  |
| ------------------ | -------------------------------- | ---------------------------- |
| **Dry Run**        | Preview changes without applying | Before making actual changes |
| **Full Sync**      | Sync all gateways with library   | After bulk operations        |
| **Single Gateway** | Sync specific gateway only       | Targeted fix after migration |

## What It Checks

### 1. Broken Gateway Entries

**Detection**: Gateway SKILL.md references a path that doesn't exist

**Example**:

```
Gateway: gateway-integrations
Title: Jira Integration
Path: .claude/skill-library/development/integrations/jira-integration/SKILL.md (does not exist)
```

**Resolution**: Remove the broken entry from the gateway routing table

### 2. Missing Gateway Entries

**Detection**: Library skill exists but is not referenced in any gateway

**Example**:

```
.claude/skill-library/development/frontend/state/my-skill/SKILL.md
```

**Resolution**: Add the skill to the appropriate gateway based on category mapping

## Category-to-Gateway Mapping

| Category                     | Gateway                |
| ---------------------------- | ---------------------- |
| `development/frontend/*`     | `gateway-frontend`     |
| `development/backend/*`      | `gateway-backend`      |
| `testing/*`                  | `gateway-testing`      |
| `security/*`                 | `gateway-security`     |
| `claude/mcp-tools/*`         | `gateway-mcp-tools`    |
| `development/integrations/*` | `gateway-integrations` |
| `capabilities/*`             | `gateway-capabilities` |
| `claude/*` (non-mcp)         | `gateway-claude`       |

Skills in other categories will show as "missing" but this is expected - they don't have dedicated gateway skills yet and are accessible via skill-search CLI.

## When to Run Gateway Sync

### Required After

- **Manual skill deletions** - Detect broken references
- **Skill migrations** - Verify paths updated correctly
- **Bulk operations** - Ensure all gateways synchronized
- **Merge conflicts** - Gateway files may have stale entries

### Automatic (No Manual Sync Needed)

When using the proper workflows through creating-skills or migrating-skills, gateway updates are handled as part of those workflows.

## Workflow Integration

### After Creating a Library Skill

When you create a library skill using `creating-skills`, the workflow prompts you to update the appropriate gateway as part of the creation process.

### After Migrating a Skill

When you migrate a skill using `migrating-skills`, the workflow includes gateway updates:

- **Same gateway**: Updates path in gateway
- **Different gateways**: Removes from old gateway, adds to new gateway
- **To/from core**: Adds or removes gateway entry as needed

### Manual Sync

Run the syncing-gateways skill directly when:

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
```

## Troubleshooting

### "No gateway found" warnings

```
⚠  No gateway found for .claude/skill-library/workflow/code-review-checklist/SKILL.md (category: workflow)
```

**Not an error** - This skill is in a category without a dedicated gateway. It's still accessible via:

- searching-skills: Search for "code review"
- Direct path in skill invocation

### Section Detection

Skills are automatically placed in appropriate sections within gateways based on path keywords:

| Keyword     | Section                 |
| ----------- | ----------------------- |
| `ui/`       | UI Components & Styling |
| `state/`    | State Management        |
| `testing/`  | Testing                 |
| `patterns/` | Patterns & Architecture |
| `forms/`    | Forms & Validation      |

If auto-detection fails, skills are placed in a default section.

## Related Documentation

- [Create Workflow](create-workflow.md) - Gateway integration in skill creation
- [Migrate Workflow](migrate-workflow.md) - Gateway updates during migration
- [File Organization](file-organization.md) - Gateway file structure
