# Agent Rename Protocol

> **⚠️ DEPRECATION NOTICE (December 2024)**
>
> **This protocol documents ARCHIVED CLI commands.**
>
> **For agent renaming, use the instruction-based skill instead:**
> ```
> skill: "renaming-agents"
> ```
>
> **Why the change?** Pure Router Pattern migration completed December 7, 2024. All agent operations now use instruction-based skills.
>
> **See:** `.claude/skills/renaming-agents/SKILL.md` for the current 7-step safe rename workflow
>
> ---
>
> **The content below is kept for historical reference only.**

## Overview (ARCHIVED)

Renaming an agent involves a 7-step protocol to ensure all references are updated correctly.

## Quick Start

```bash
# Preview rename
npm run --silent rename -- old-agent new-agent --dry-run

# Rename with reference updates
npm run --silent rename -- old-agent new-agent

# Archive old version
npm run --silent rename -- old-agent new-agent --archive
```

## Command Reference

```bash
npm run --silent rename -- <old-name> <new-name>
npm run --silent rename -- <old-name> <new-name> --dry-run
npm run --silent rename -- <old-name> <new-name> --archive
npm run --silent rename -- <old-name> <new-name> --no-refs
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `old-name` | Current agent name |
| `new-name` | New agent name |
| `--dry-run` | Preview without writing |
| `--archive` | Keep copy in .archived/ |
| `--no-refs` | Skip reference updates |

## 7-Step Protocol

### Step 1: Validate Old Name Exists

```bash
# Checks that the agent exists
# Shows: ✓ Found: .claude/agents/development/old-agent.md
```

### Step 2: Validate New Name Available

```bash
# Ensures new name doesn't conflict
# Validates kebab-case format
```

### Step 3: Find References

Searches for references in:
- `.claude/agents/` - Cross-agent references
- `.claude/skills/` - Skill escalation recommendations
- `.claude/commands/` - Command delegations

Reference patterns detected:
- `"old-agent"` or `'old-agent'`
- `→ Recommend \`old-agent\``
- `subagent_type.*old-agent`
- `recommended_agent.*old-agent`

### Step 4: Update Frontmatter

```yaml
# Before:
name: old-agent

# After:
name: new-agent
```

### Step 5: Rename File

```
.claude/agents/development/old-agent.md
→ .claude/agents/development/new-agent.md
```

### Step 6: Update Cross-References

All reference files are updated:
- Escalation protocols
- Agent recommendations
- Task tool calls

### Step 7: Execute Rename

Files are written and renamed atomically.

## Example Workflow

```bash
# 1. Preview the rename
npm run --silent rename -- golang-expert-developer go-developer --dry-run

# Output:
# ═══ Step 1: Validate Old Name ═══
# ✓ Found: .claude/agents/development/golang-expert-developer.md
#
# ═══ Step 2: Validate New Name ═══
# ✓ Name available: go-developer
#
# ═══ Step 3: Find References ═══
# Found 5 references to "golang-expert-developer"
#   .claude/agents/development/api-developer.md:145
#   .claude/agents/architecture/go-architect.md:89
#   ...
#
# [DRY RUN] Would perform:
# 1. Update frontmatter name to "go-developer"
# 2. Rename file to go-developer.md
# 3. Update 5 reference files

# 2. Execute the rename
npm run --silent rename -- golang-expert-developer go-developer

# 3. Verify
npm run --silent audit -- go-developer
npm run --silent test -- go-developer
```

## Archive Option

When consolidating agents, use `--archive` to keep the old version:

```bash
npm run --silent rename -- old-agent new-agent --archive

# Creates: .claude/agents/.archived/old-agent.md
```

Archived agents:
- Are not included in `npm run list`
- Are preserved for reference
- Can be restored manually if needed

## Skip Reference Updates

For quick renames without updating references:

```bash
npm run --silent rename -- old-agent new-agent --no-refs
```

**Warning**: This may leave broken references. Use only when you'll update references manually.

## Name Validation

New names must:
- Be kebab-case (`my-agent`, not `myAgent`)
- Start with a letter
- End with a letter or number
- Not already exist

```bash
# ❌ Invalid:
npm run --silent rename -- old myAgent      # No camelCase
npm run --silent rename -- old 123-agent    # Can't start with number
npm run --silent rename -- old -agent       # Can't start with dash

# ✅ Valid:
npm run --silent rename -- old my-agent
npm run --silent rename -- old agent-v2
npm run --silent rename -- old go-developer
```

## Post-Rename Verification

After renaming:

```bash
# 1. Audit the renamed agent
npm run --silent audit -- new-agent

# 2. Test discovery
npm run --silent test -- new-agent

# 3. Search for any remaining old references
git grep "old-agent" .claude/

# 4. Test in new Claude Code session
```

## Common Rename Scenarios

### Consolidating Agents

When merging two agents:

```bash
# 1. Update the target agent with combined functionality
npm run --silent update -- target-agent "Consolidate old-agent functionality"

# 2. Rename source to match (archived)
npm run --silent rename -- old-agent target-agent --archive
# Error: target already exists

# Better approach:
# 1. Archive the old agent manually
mv .claude/agents/development/old-agent.md .claude/agents/.archived/

# 2. Update references to point to target-agent
```

### Fixing Naming Conventions

```bash
# Rename to follow conventions
npm run --silent rename -- GoLangDeveloper go-developer
npm run --silent rename -- react_developer react-developer
```

### Category Change

To move an agent to a different category:

```bash
# 1. Rename file manually
mv .claude/agents/development/my-agent.md .claude/agents/architecture/my-agent.md

# 2. Update frontmatter type
# type: architecture

# 3. Re-audit
npm run --silent audit -- my-agent
```

## Troubleshooting

### "Agent already exists"

```bash
npm run --silent rename -- old-agent existing-agent
# Error: Agent already exists

# Solution: Choose different name or delete/archive existing
```

### References Not Updated

If `--no-refs` was used or references were missed:

```bash
# Find remaining references
git grep "old-agent" .claude/

# Update manually
```

### Invalid Name Format

```bash
npm run --silent rename -- old MyNewAgent
# Error: Invalid name format

# Use kebab-case:
npm run --silent rename -- old my-new-agent
```

## References

- [Update Workflow](./update-workflow.md)
- [Audit Phases](./audit-phases.md)
- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)
