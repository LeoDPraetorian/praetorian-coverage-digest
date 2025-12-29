---
name: syncing-gateways
description: Use when library skills are added, renamed, or deleted - synchronizes gateway routing tables with library skills using automated CLI tools
allowed-tools: Glob, Read, Edit, Bash, TodoWrite
---

# Syncing Gateways

**Automated synchronization of gateway routing tables with library skill structure.**

## When to Use

Use this skill when:

- Library skills have been added, renamed, or deleted
- Gateway routing tables appear stale or incomplete
- You suspect orphaned skills (in library but not in any gateway)
- You suspect broken paths (gateway references non-existent skills)
- You suspect duplicate entries (same skill in multiple gateways)
- Running routine maintenance on the two-tier skill system

**You MUST use TodoWrite** to track progress through all sync phases.

## Quick Reference

| Workflow Mode      | Purpose                          | Time     |
| ------------------ | -------------------------------- | -------- |
| **Dry Run**        | Preview changes without applying | 2-5 min  |
| **Full Sync**      | Sync all gateways with library   | 5-10 min |
| **Single Gateway** | Sync specific gateway only       | 2-3 min  |

> **Note:** This skill uses the gateway CLI (`npm run gateway`). Follow the workflows below.

---

## Core Concepts

### Two-Tier Skill System

**Core skills** (`.claude/skills/`) → High-frequency, always loaded, ~25 skills
**Library skills** (`.claude/skill-library/`) → Specialized, on-demand, ~120+ skills

**Gateway skills** route agents from core to library:

- `gateway-frontend` → Frontend development patterns
- `gateway-backend` → Backend/Go patterns
- `gateway-testing` → Testing patterns
- `gateway-security` → Security patterns
- `gateway-mcp-tools` → MCP tool wrappers
- `gateway-integrations` → Integration patterns
- `gateway-capabilities` → VQL capabilities
- `gateway-claude` → Claude Code management

### Gateway Structure

Each gateway contains:

1. **Two-tier explanation** - How core/library routing works
2. **Routing table** - Maps skill names to full paths
3. **Usage instructions** - How agents access library skills

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any sync operation:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

**Routing table format:**

```markdown
| Skill          | Path                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack-query/SKILL.md` |
```

### What Can Go Stale

**Orphaned skills**: Library skill exists but isn't in any gateway
**Broken paths**: Gateway references a skill that was deleted/moved
**Duplicate entries**: Same skill listed in multiple gateways

---

## Sync Operations

### 1. Dry Run (Preview Changes)

**Purpose**: See what changes would be made without applying them

**Use the gateway CLI with --dry-run flag:**

```bash
# Navigate to repository root
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude"

# Preview changes without applying
npm run -w @chariot/auditing-skills gateway -- sync --dry-run
```

**What the CLI does:**

1. Discovers all library skills
2. Maps to gateways based on path patterns
3. Reads current gateway routing tables for all 8 gateways
4. Compares discovered vs current state
5. Reports what would be added/removed (does NOT modify files)

**Output format:**

```plaintext
Gateway: gateway-frontend
  Would ADD 2 skills:
    - Optimizing React Performance
    - Frontend Accessibility

  Would REMOVE 1 broken paths:
    - old-skill-name

Gateway: gateway-backend
  No changes needed
```

### 2. Full Sync (Apply Changes)

**Purpose**: Synchronize all gateways with current library structure

**Use the gateway CLI:**

```bash
# Navigate to repository root
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude"

# Apply changes
npm run -w @chariot/auditing-skills gateway -- sync
```

**What the CLI does automatically:**

1. Discovers all library skills
2. Maps each skill to gateway using path patterns
3. For each gateway:
   - Reads current routing table
   - Identifies additions (skills in library, not in gateway)
   - Identifies removals (skills in gateway, path doesn't exist)
   - Updates routing table with proper formatting
   - Verifies changes applied correctly
4. Reports summary of changes made

**Critical rules enforced by CLI:**

- Preserves gateway header and explanation sections
- Only modifies routing table rows
- Uses full paths (`.claude/skill-library/...`) not skill names
- Sorts routing table alphabetically by skill name
- Never removes skills if path exists (only removes broken paths)

### 3. Gateway-Specific Sync

**Purpose**: Sync only one gateway (faster, more targeted)

**Use the validate command to check a specific gateway:**

```bash
# Navigate to repository root
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude"

# Validate specific gateway
npm run -w @chariot/auditing-skills gateway -- validate --gateway gateway-frontend
```

**Then run full sync to fix any issues found.**

Note: The CLI currently syncs all gateways at once for consistency. Gateway-specific operations are primarily for validation.

---

## Critical Rules

### When You MUST Run Sync

**ALWAYS run sync when:**

- Creating a new library skill (via creating-skills)
- Deleting a library skill (via deleting-skills)
- Renaming a library skill (via renaming-skills)
- Migrating a skill between locations (via migrating-skills)
- After any bulk skill operation

**Common Rationalizations (Don't Accept These)**:

❌ "I'll manually update the gateway later"
→ WRONG: Manual updates are error-prone and often forgotten

❌ "It's just one skill, I can skip sync"
→ WRONG: One orphaned skill means agents can't discover it

❌ "The gateway looks fine, no need to check"
→ WRONG: Broken paths are silent failures until agents try to use them

❌ "I'll wait until I create more skills, then sync all at once"
→ WRONG: Sync takes 2-5 minutes, there's no benefit to batching

❌ "I only changed a library skill, gateways are unaffected"
→ WRONG: If you renamed or moved it, the gateway path is now broken

### Path Format Requirements

**Routing table paths MUST:**

- Start with `.claude/skill-library/`
- End with `/SKILL.md`
- Use forward slashes (even on Windows)
- Be relative to repository root
- NOT use `~` or `$HOME`

**✅ Correct:**

```plaintext
.claude/skill-library/development/frontend/state/frontend-tanstack-query/SKILL.md
```

**❌ Wrong:**

```plaintext
frontend-tanstack-query                          # Missing full path
skill-library/frontend-tanstack-query/SKILL.md   # Missing .claude prefix
.claude/skill-library/frontend-tanstack-query    # Missing /SKILL.md suffix
```

### Edit Preservation

When updating gateway routing tables:

- **PRESERVE** all content before the routing table
- **PRESERVE** all content after the routing table
- **ONLY MODIFY** the table rows (between header and next section)

### Verification

After any changes:

1. Read the modified gateway file
2. Verify table format is correct
3. Verify all paths start with `.claude/skill-library/`
4. Verify paths are sorted alphabetically

---

## Error Handling

**If discovery finds no library skills:**

- Error: Library appears empty, verify `.claude/skill-library/` exists
- STOP - do not proceed with sync

**If gateway file doesn't exist:**

- Error: Gateway `{name}` not found in `.claude/skills/`
- STOP - user may have typo in gateway name

**If routing table not found in gateway:**

- Error: Gateway `{name}` missing routing table section
- STOP - gateway may be malformed, needs manual fix

**If path verification fails during comparison:**

- Include in "removals" list for dry-run
- Remove from routing table during full-sync

---

## Related Skills

- **managing-skills** - Unified skill lifecycle manager (routes to this skill)
- **auditing-skills** - Validates gateway structure (phases 17-20 for gateways)
- **fixing-skills** - Fixes gateway compliance issues
- **creating-skills** - Creates new skills (triggers need for sync)
- **deleting-skills** - Deletes skills (triggers need for sync)
- **renaming-skills** - Renames skills (triggers need for sync)

---

## References

For detailed documentation:

- [Gateway Mapping Rules](references/gateway-mapping.md) - Complete path-to-gateway mapping
- [Sync Algorithm](references/sync-algorithm.md) - Detailed comparison logic
- [Routing Table Format](references/routing-table-format.md) - Exact formatting requirements
- [Error Recovery](references/error-recovery.md) - Handling edge cases

---

## Examples

See [examples/](examples/) directory for:

- `dry-run-output.md` - Sample dry-run report
- `full-sync-output.md` - Sample full-sync report
- `gateway-sync-output.md` - Sample single-gateway sync

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
