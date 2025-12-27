---
name: syncing-gateways
description: Synchronizes gateway routing tables with library skills in the two-tier system. Use when library skills are added, renamed, or deleted.
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

| Workflow Mode    | Purpose                          | Time     |
| ---------------- | -------------------------------- | -------- |
| **Dry Run**      | Preview changes without applying | 2-5 min  |
| **Full Sync**    | Sync all gateways with library   | 5-10 min |
| **Single Gateway** | Sync specific gateway only     | 2-3 min  |

> **Note:** This is an instruction-based skill (no CLI). Follow the workflows below.

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

**See:** [Repository Root Navigation](references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

**Routing table format:**

```markdown
| Skill          | Path                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
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

**Steps:**

1. **Create TodoWrite todos** for all discovery phases
2. **Discover library skills** using Glob pattern
3. **Map to gateways** based on path patterns
4. **Read current gateway routing tables** for all 8 gateways
5. **Compare** discovered vs current state
6. **Report** what would be added/removed (DO NOT modify files)

**Output format:**

```
Gateway: gateway-frontend
  Would ADD:
    - optimizing-react-performance (.claude/skill-library/development/frontend/performance/...)
    - frontend-accessibility (.claude/skill-library/development/frontend/accessibility/...)

  Would REMOVE (broken paths):
    - old-skill-name (path no longer exists)

Gateway: gateway-backend
  No changes needed
```

### 2. Full Sync (Apply Changes)

**Purpose**: Synchronize all gateways with current library structure

**Steps:**

1. **Create TodoWrite todos** for all sync phases
2. **Discover all library skills** (Glob pattern)
3. **Map each skill to gateway** using path patterns (see references/gateway-mapping.md)
4. **For each gateway:**
   - Read current routing table
   - Identify additions (skills in library, not in gateway)
   - Identify removals (skills in gateway, path doesn't exist)
   - Update routing table using Edit tool
   - Verify changes applied correctly
5. **Report summary** of changes made

**Critical rules:**

- ALWAYS preserve gateway header and explanation sections
- ONLY modify the routing table rows
- ALWAYS use full paths (`.claude/skill-library/...`) not skill names
- ALWAYS sort routing table alphabetically by skill name
- NEVER remove skills if path exists (even if seems wrong)

### 3. Gateway-Specific Sync

**Purpose**: Sync only one gateway (faster, more targeted)

**Steps:**

1. Validate gateway name exists
2. Run discovery for that gateway's category only
3. Apply same comparison/update logic as full sync
4. Report changes for single gateway

---

## Workflow

### Phase 1: Discovery

**Discover all library skills:**

```bash
# Find all SKILL.md files in library
find .claude/skill-library -name "SKILL.md" -type f
```

**For each skill path, extract:**

- Skill name (directory name)
- Full path (for routing table)
- Category (for gateway mapping)

### Phase 2: Gateway Mapping

**Map each library skill to its gateway based on path prefix:**

See [references/gateway-mapping.md](references/gateway-mapping.md) for complete mapping rules.

**Quick mapping:**

- `development/frontend/*` → `gateway-frontend`
- `development/backend/*` → `gateway-backend`
- `testing/*` → `gateway-testing`
- `security/*` → `gateway-security`
- `claude/mcp-tools/*` → `gateway-mcp-tools`
- `development/integrations/*` → `gateway-integrations`
- `capabilities/*` → `gateway-capabilities`
- `claude/*` (non-mcp) → `gateway-claude`

### Phase 3: Read Current State

**For each gateway, extract current routing table:**

1. Read gateway SKILL.md file
2. Find the routing table section (starts with `| Skill | Path |`)
3. Parse table rows to extract current entries
4. Build data structure: `{ skillName: path }`

### Phase 4: Compare & Identify Changes

**For each gateway:**

**Additions** = Skills in library (from discovery) NOT in gateway routing table
**Removals** = Skills in gateway routing table whose paths DON'T exist in filesystem

**IMPORTANT**: Never remove a skill just because it seems misplaced. Only remove if path verification fails.

### Phase 5: Apply Changes (Full Sync Only)

**For each gateway with changes:**

1. Build new routing table rows
2. Sort alphabetically by skill name
3. Use Edit tool to replace old table with new table
4. Preserve all non-table content (header, explanation, instructions)
5. Verify edit succeeded

**Table format (MUST match exactly):**

```markdown
| Skill      | Path                                                 |
| ---------- | ---------------------------------------------------- |
| Skill Name | `.claude/skill-library/category/skill-name/SKILL.md` |
```

### Phase 6: Report

**Output summary:**

```
Sync completed for 8 gateways

gateway-frontend: 3 added, 1 removed
gateway-backend: 0 changes
gateway-testing: 2 added, 0 removed
gateway-security: 0 changes
gateway-mcp-tools: 0 changes
gateway-integrations: 1 added, 0 removed
gateway-capabilities: 0 changes
gateway-claude: 4 added, 2 removed

Total: 10 skills added, 3 broken paths removed
```

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

```
.claude/skill-library/development/frontend/state/frontend-tanstack-query/SKILL.md
```

**❌ Wrong:**

```
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
