# Gateway-Specific Fixes (Phases 17-20)

**Gateway skills** (names starting with `gateway-`) have additional validation phases for routing table integrity and progressive disclosure documentation.

## Phase 17: Gateway Structure (Manual)

**What it validates:**

- Presence of `<EXTREMELY-IMPORTANT>` block with 1% Rule and Skill Announcement
- Presence of "Progressive Disclosure" section with 3-tier explanation
- Presence of "Intent Detection" table (Task Intent | Route To)
- Presence of "Routing Algorithm" (numbered steps)
- Presence of "Skill Registry" tables with Skill | Path | Triggers columns
- Presence of "Cross-Gateway Routing" table
- Presence of "Loading Skills" section

**How to fix:**

1. Read the gateway template:

   ```bash
   Read .claude/skills/managing-skills/templates/gateway-template.md
   ```

2. Copy missing sections to your gateway SKILL.md:
   - EXTREMELY-IMPORTANT block (1% Rule, Skill Announcement)
   - Progressive Disclosure (3-tier loading)
   - Intent Detection table
   - Routing Algorithm
   - Skill Registry tables
   - Cross-Gateway Routing table
   - Loading Skills section

3. Ensure intent-based routing is used (not role-based)

**Template location:** `.claude/skills/managing-skills/templates/gateway-template.md`

## Phase 18: Routing Table Format (Auto)

**What it validates:**

- Skill Registry tables show full paths, not just skill names
- Format: `.claude/skill-library/{category}/{skill-name}/SKILL.md`
- Presence of Triggers column with keywords
- Table format: `| Skill | Path | Triggers |`

**How to fix (automatic):**

```bash
# Auto-fix will:
# 1. Search filesystem for each skill name
# 2. Convert "frontend-tanstack" → ".claude/skill-library/frontend/frontend-tanstack/SKILL.md"
# 3. Add Triggers column if missing
# 4. Update Skill Registry with full paths and triggers
```

**Manual alternative:**

1. For each skill name in Skill Registry
2. Find full path: `find .claude/skill-library -name "{skill-name}" -type d`
3. Update table entry to show full path
4. Add Triggers column with keywords matching Intent Detection

## Phase 19: Broken Paths (Auto)

**What it validates:**

- All paths in routing tables point to existing files
- Test: `test -f {path}` passes for each entry

**How to fix (automatic):**

```bash
# Auto-fix will:
# 1. Test each path: test -f "{path}"
# 2. Remove table rows where path doesn't exist
# 3. Report removed entries
```

**Manual alternative:**

1. For each path in routing table
2. Test: `test -f "{path}"`
3. If fails, remove that table row
4. Document removed skills

## Phase 20: Coverage Gaps (Manual)

**What it validates:**

- All library skills are listed in at least one gateway
- No orphaned library skills

**How to fix:**

This requires cross-gateway coordination. Load and follow the `syncing-gateways` skill workflow:

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
```

The syncing-gateways workflow will guide you through:

1. **Discovery**: Find all library skills via `find .claude/skill-library -name SKILL.md`
2. **Mapping**: Determine gateway using path patterns:
   - `development/frontend/*` → `gateway-frontend`
   - `development/backend/*` → `gateway-backend`
   - `testing/*` → `gateway-testing`
   - `security/*` → `gateway-security`
   - `claude/mcp-tools/*` → `gateway-mcp-tools`
   - `development/integrations/*` → `gateway-integrations`
3. **Comparison**: Identify skills missing from gateway routing tables
4. **Application**: Add missing skills using Edit tool

**Why defer to syncing-gateways:** Phase 20 requires checking ALL gateways and ALL library skills - beyond the scope of single-skill fixing.

## Related

- Main skill: [fixing-skills](../SKILL.md)
- Gateway template: `.claude/skills/managing-skills/templates/gateway-template.md`
- Gateway documentation: `.claude/skills/managing-skills/references/gateway-management.md`
- Audit implementations: See Phases 20-23 in [phase-details.md](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md)
