# Gateway Update Workflows

**When target skill name starts with `gateway-`, apply gateway-specific logic.**

---

## Overview

Gateway skills require special handling because they route agents to library skills. Updates fall into three categories:

1. **Adding Skills** - Add new library skill to gateway routing table
2. **Removing Skills** - Remove stale/deprecated skills from gateway
3. **Reorganizing** - Move skills between gateway sections

---

## Adding a Skill to Gateway

**User says:** "add frontend-new-skill to gateway-frontend"

### Workflow

**Step 1: Verify Skill Exists**

```bash
# Find skill in library
find .claude/skill-library -type d -name "frontend-new-skill"
```

If not found, skill must be created first (`Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")`).

**Step 2: Get Full Path to SKILL.md**

```bash
# Get absolute path
find .claude/skill-library -type f -path "*/frontend-new-skill/SKILL.md"
```

Expected output: `.claude/skill-library/{domain}/{category}/frontend-new-skill/SKILL.md`

**Step 3: Determine Category Section**

**Option A: Auto-detect from path**

- Path contains `frontend/state/` → State Management section
- Path contains `frontend/testing/` → Testing section
- Path contains `frontend/components/` → Components section

**Option B: Ask user which section**

```
Question: Which category section should this skill belong to?
Header: Category
Options:
  - State Management
  - Testing Patterns
  - Component Patterns
  - Hooks & Utilities
  - Performance Optimization
```

**Step 4: Add Table Row in Proper Format**

```markdown
| Skill Display Name | `.claude/skill-library/{domain}/{category}/{skill-name}/SKILL.md` |
```

**Example:**

```markdown
| TanStack Query Patterns | `.claude/skill-library/frontend/state/frontend-tanstack-query/SKILL.md` |
```

**CRITICAL RULES:**

- ❌ NEVER add skill names without full paths
- ✅ ALWAYS use table format with backtick-wrapped path
- ✅ Path must be relative to repo root (start with `.claude/skill-library/`)
- ✅ Path must end with `/SKILL.md`

**Step 5: Run Gateway Audit**

```bash
cd .claude/skill-library/claude/skill-management/auditing-skills/scripts
npm run audit -- gateway-frontend --phase 18
npm run audit -- gateway-frontend --phase 19
```

**Phase 18** - Routing table format (checks table syntax)
**Phase 19** - Path resolution (verifies all paths exist)

---

## Removing a Skill from Gateway

**User says:** "remove frontend-old-skill from gateway-frontend"

### Workflow

**Step 1: Find Table Row**

```bash
# Search for skill reference in gateway
grep -n "frontend-old-skill" .claude/skills/gateway-frontend/SKILL.md
```

**Step 2: Remove Entire Row with Edit Tool**

```
Edit {
  file_path: ".claude/skills/gateway-frontend/SKILL.md",
  old_string: "| Old Skill Name | `.claude/skill-library/path/to/frontend-old-skill/SKILL.md` |\n",
  new_string: ""
}
```

**CRITICAL:** Include the newline (`\n`) in old_string to remove entire row cleanly.

**Step 3: Verify No Broken References**

```bash
# Check for any remaining references
grep -r "frontend-old-skill" .claude/skills/gateway-*/SKILL.md
```

Should return no results. If found, remove those references too.

**Step 4: Run Gateway Audit**

```bash
npm run audit -- gateway-frontend --phase 19
```

Verifies no broken references remain.

---

## Reorganizing Gateway Categories

**User says:** "move frontend-tanstack to State Management section"

### Workflow

**Step 1: Find Current Location**

```bash
grep -B2 -A2 "frontend-tanstack" .claude/skills/gateway-frontend/SKILL.md
```

Note which section header it's under.

**Step 2: Remove from Current Section**

```
Edit {
  file_path: ".claude/skills/gateway-frontend/SKILL.md",
  old_string: "| TanStack Query | `.claude/skill-library/frontend/state/frontend-tanstack-query/SKILL.md` |\n",
  new_string: ""
}
```

**Step 3: Add to Target Section**

Find the State Management section and add row:

```
Edit {
  file_path: ".claude/skills/gateway-frontend/SKILL.md",
  old_string: "## State Management\n\n| Skill Name | Path |\n|-----------|------|",
  new_string: "## State Management\n\n| Skill Name | Path |\n|-----------|------|\n| TanStack Query | `.claude/skill-library/frontend/state/frontend-tanstack-query/SKILL.md` |"
}
```

**Step 4: Preserve Table Format**

Ensure table formatting remains consistent:

- Proper markdown table syntax
- Full path in backticks
- Newline after each row

**Step 5: Run Gateway Audit**

```bash
npm run audit -- gateway-frontend --phase 18
npm run audit -- gateway-frontend --phase 19
```

---

## Key Rules Summary

### Path Format Rules

✅ **CORRECT:**

```markdown
| Skill Name | `.claude/skill-library/frontend/state/frontend-tanstack/SKILL.md` |
```

❌ **WRONG - Skill name instead of path:**

```markdown
| Skill Name | frontend-tanstack |
```

❌ **WRONG - Relative path without repo root:**

```markdown
| Skill Name | `skill-library/frontend/state/frontend-tanstack/SKILL.md` |
```

❌ **WRONG - Missing /SKILL.md:**

```markdown
| Skill Name | `.claude/skill-library/frontend/state/frontend-tanstack` |
```

### Verification Rules

After ANY gateway update:

1. **Run audit phases 18-19** to verify structure and paths
2. **Test skill access** by trying to read the path
3. **Check for duplicates** - same skill shouldn't appear twice
4. **Validate section** - skill in appropriate category

### Reference Documents

- **Gateway template:** `.claude/skills/managing-skills/templates/gateway-template.md`
- **Gateway structure:** `docs/GATEWAY-PATTERNS.md`
- **Audit phases:** `.claude/skill-library/claude/skill-management/auditing-skills/references/audit-phases.md`

---

## Related Workflows

### If Skill Doesn't Exist Yet

1. Create skill first: `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")`
2. Audit new skill: `npm run audit -- new-skill-name`
3. Then add to gateway using workflows above

### If Gateway Doesn't Exist Yet

1. Create gateway: `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` with `--type gateway`
2. Populate routing table with existing library skills
3. Run full gateway audit

### If Unsure Which Gateway

**Mapping:**
| Skill Category | Gateway |
|---------------|---------|
| `development/frontend/*` | `gateway-frontend` |
| `development/backend/*` | `gateway-backend` |
| `testing/*` | `gateway-testing` |
| `security/*` | `gateway-security` |
| `claude/mcp-tools/*` | `gateway-mcp-tools` |
| `development/integrations/*` | `gateway-integrations` |

---

## Troubleshooting

### "Skill not found" Error

**Symptom:** Phase 19 fails with "Path does not exist"

**Fix:**

1. Verify skill exists: `find .claude/skill-library -name "{skill-name}"`
2. Check path spelling in gateway table
3. Ensure path ends with `/SKILL.md`
4. Use absolute path from repo root

### "Table format invalid" Error

**Symptom:** Phase 18 fails with format error

**Fix:**

1. Check markdown table syntax (pipes aligned)
2. Verify path wrapped in backticks
3. Ensure newline after each row
4. Check for extra/missing columns

### Duplicate Entry Error

**Symptom:** Same skill appears twice in gateway

**Fix:**

1. Search for all occurrences: `grep -n "{skill-name}" gateway-*/SKILL.md`
2. Remove duplicate entries (keep most appropriate section)
3. Re-run audit

---

## Advanced: Bulk Gateway Operations

### Adding Multiple Skills

For bulk additions, iterate through each skill:

```bash
# Get list of skills in category
find .claude/skill-library/frontend -type f -name "SKILL.md"

# For each skill, add to gateway
# (Use workflows above for each)
```

### Gateway Migration

Moving all skills from one gateway to another:

1. Export routing table from source gateway
2. Update paths if category changed
3. Import to target gateway
4. Run audit on both gateways
5. Remove entries from source gateway

### Gateway Sync Check

Verify all library skills are in a gateway:

```bash
# List all library skills
find .claude/skill-library -type f -name "SKILL.md" | grep -v "/references/"

# Check each against all gateways
for skill in $(cat skill-list); do
  grep -l "$skill" .claude/skills/gateway-*/SKILL.md || echo "Missing: $skill"
done
```

---

## Related Skills

- `creating-skills` - Create new skills or gateways
- `auditing-skills` - Run gateway-specific audit phases
- `fixing-skills` - Fix gateway structure issues
- `syncing-gateways` - Automated gateway synchronization
