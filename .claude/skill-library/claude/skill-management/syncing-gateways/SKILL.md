---
name: syncing-gateways
description: Use when library skills are added, renamed, or deleted - synchronizes gateway routing tables with library skills, detects orphaned skills and broken paths using instruction-based workflows
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

> **Note:** This skill uses instruction-based workflows with native tools (Bash, Read, Edit). Follow the phases below.

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

1. **EXTREMELY-IMPORTANT block** - 1% Rule and Skill Announcement mandates
2. **Progressive Disclosure** - 3-tier loading explanation
3. **Intent Detection** - Task Intent → Route To mapping
4. **Skill Registry** - Tables with Skill | Path | Triggers
5. **Cross-Gateway Routing** - Domain handoff table
6. **Loading Skills** - Path convention and Read tool example

---

## Step 1: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any sync operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](.claude/skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

**Skill Registry format:**

```markdown
| Skill          | Path                                                                       | Triggers               |
| -------------- | -------------------------------------------------------------------------- | ---------------------- |
| TanStack Query | `.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md` | TanStack, cache, fetch |
```

### What Can Go Stale

**Orphaned skills**: Library skill exists but isn't in any gateway
**Broken paths**: Gateway references a skill that was deleted/moved
**Duplicate entries**: Same skill listed in multiple gateways

---

## Sync Operations

Follow these phases to manually sync gateway routing tables with library skills. This instruction-based approach uses native tools (Bash, Glob, Grep, Read, Edit).

### Phase 1: Discovery

**Purpose**: Find all library skills and determine which gateway each belongs to.

#### Step 1.1: Find All Library Skills

```bash
find .claude/skill-library -name "SKILL.md" -type f
```

This returns paths like:

```
.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
.claude/skill-library/testing/backend/implementing-golang-tests/SKILL.md
```

#### Step 1.2: Map Skills to Gateways

For each discovered skill path, determine the appropriate gateway using path patterns:

| Path Pattern                 | Gateway                |
| ---------------------------- | ---------------------- |
| `development/frontend/*`     | `gateway-frontend`     |
| `development/backend/*`      | `gateway-backend`      |
| `development/capabilities/*` | `gateway-capabilities` |
| `development/integrations/*` | `gateway-integrations` |
| `testing/*`                  | `gateway-testing`      |
| `security/*`                 | `gateway-security`     |
| `claude/skill-management/*`  | `gateway-claude`       |
| `claude/mcp-*/*`             | `gateway-mcp-tools`    |

**See:** [references/gateway-mapping.md](references/gateway-mapping.md) for complete mapping rules.

Extract skill name from directory name (parent of SKILL.md):

```bash
# Example: .claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
# Skill name: using-tanstack-query
# Gateway: gateway-frontend
```

### Phase 2: Comparison

**Purpose**: Compare discovered skills with current gateway routing tables to identify changes.

#### Step 2.1: For Each Gateway, Read Current State

Read the gateway's SKILL.md and extract the Skill Registry table:

```bash
# Example for gateway-frontend
grep -A 100 "## Skill Registry" .claude/skills/gateway-frontend/SKILL.md
```

Parse table rows to extract:

- Skill name (column 1)
- Path (column 2)
- Triggers (column 3)

#### Step 2.2: Identify Additions

**Additions** = Skills discovered in Phase 1 for this gateway that are NOT in the current routing table.

Algorithm:

```
FOR each skill mapped to this gateway (from Step 1.2):
  IF skill.path NOT IN current routing table paths:
    ADD to additions list
```

#### Step 2.3: Identify Removals

**Removals** = Routing table entries whose paths NO LONGER EXIST in filesystem.

Algorithm:

```bash
FOR each entry in current routing table:
  test -f "{entry.path}"  # Check if file exists
  IF exit code != 0:
    ADD to removals list
```

**IMPORTANT**: Only remove if path verification fails. Never remove based on "seems wrong".

### Phase 3: Application

**Purpose**: Apply changes to gateway routing tables.

#### Step 3.1: For Each Gateway with Changes

Build new routing table:

1. Start with current entries
2. Remove entries in removals list
3. Add entries in additions list
4. Sort alphabetically by skill name

#### Step 3.2: Format Table

Convert to markdown table format:

```markdown
| Skill      | Path                                 | Triggers           |
| ---------- | ------------------------------------ | ------------------ |
| Skill Name | `.claude/skill-library/.../SKILL.md` | keyword1, keyword2 |
```

**Critical formatting rules:**

- Full paths starting with `.claude/skill-library/`
- Paths ending with `/SKILL.md`
- Alphabetically sorted by skill name
- Triggers separated by commas

#### Step 3.3: Apply Edit

Use Edit tool to replace old table with new table:

```
Edit({
  file_path: ".claude/skills/{gateway-name}/SKILL.md",
  old_string: "{current_table_content}",
  new_string: "{new_table_content}"
})
```

**Preserve all content outside the Skill Registry table** - only modify table rows.

#### Step 3.4: Verify Changes

1. Read updated gateway file
2. Verify table format is correct
3. Verify all paths are valid
4. Verify alphabetical sorting

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
.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
```

**❌ Wrong:**

```plaintext
using-tanstack-query                             # Missing full path
skill-library/using-tanstack-query/SKILL.md      # Missing .claude prefix
.claude/skill-library/using-tanstack-query       # Missing /SKILL.md suffix
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

## Integration

### Called By

- **`managing-skills`** (CORE) - Routes sync operations when user invokes `/skill-manager sync`
- **`creating-skills`** (LIBRARY) - After creating new library skill, sync gateway routing tables - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")`
- **`deleting-skills`** (LIBRARY) - After deleting library skill, remove from routing tables - `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")`
- **`renaming-skills`** (LIBRARY) - After renaming library skill, update routing table references - `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")`
- **`migrating-skills`** (LIBRARY) - After migrating skill between locations, sync affected gateways - `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")`

### Requires (invoke before starting)

None - Entry point skill for gateway synchronization

### Calls (during execution)

None - Uses npm CLI commands (`npm run -w @chariot/auditing-skills gateway -- sync`), not skill invocations

### Pairs With (conditional)

| Skill                        | Trigger                         | Purpose                                                                                                                             |
| ---------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `creating-skills` (LIBRARY)  | After creating library skill    | Sync gateway routing tables to include new skill - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` |
| `deleting-skills` (LIBRARY)  | After deleting library skill    | Remove deleted skill from routing tables - `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")`         |
| `renaming-skills` (LIBRARY)  | After renaming library skill    | Update routing table path references - `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")`             |
| `migrating-skills` (LIBRARY) | After location migration        | Sync gateways affected by skill relocation - `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")`      |
| `auditing-skills` (LIBRARY)  | Gateway structure validation    | Validates gateway structure (phases 20-23) - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`       |
| `fixing-skills` (LIBRARY)    | Gateway compliance issues found | Fixes gateway phase violations - `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")`                     |

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
