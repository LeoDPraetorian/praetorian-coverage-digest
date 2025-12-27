# Gateway-Specific Fixes (Phases 17-20)

**Gateway skills** (names starting with `gateway-`) have additional validation phases for routing table integrity and two-tier system documentation.

## Phase 17: Gateway Structure (Manual)

**What it validates:**

- Presence of "Understanding This Gateway" section
- `<IMPORTANT>` warning block about Skill tool vs Read tool
- Correct invocation example: `skill: "gateway-X"`
- Explanation of Read tool usage for library skills
- Two-tier system explanation
- Anti-pattern examples (❌ WRONG / ✅ RIGHT)

**How to fix:**

1. Read the gateway template:

   ```bash
   Read .claude/skills/managing-skills/templates/gateway-template.md
   ```

2. Copy missing sections to your gateway SKILL.md:
   - Understanding This Gateway
   - IMPORTANT block about library skill invocation
   - Anti-pattern examples

3. Ensure two-tier explanation is clear

**Template location:** `.claude/skills/managing-skills/templates/gateway-template.md`

## Phase 18: Routing Table Format (Auto)

**What it validates:**

- Routing tables show full paths, not just skill names
- Format: `.claude/skill-library/{category}/{skill-name}/SKILL.md`

**How to fix (automatic):**

```bash
# Auto-fix will:
# 1. Search filesystem for each skill name
# 2. Convert "frontend-tanstack" → ".claude/skill-library/frontend/frontend-tanstack/SKILL.md"
# 3. Update routing table with full paths
```

**Manual alternative:**

1. For each skill name in routing table
2. Find full path: `find .claude/skill-library -name "{skill-name}" -type d`
3. Update table entry to show full path

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

This requires cross-gateway coordination. Use the `syncing-gateways` skill:

```bash
skill-manager sync-gateways --full-sync
```

**Manual workflow:**

1. List all library skills: `find .claude/skill-library -name SKILL.md`
2. Check each gateway routing table
3. Add missing skills to appropriate gateways
4. Use category mapping:
   - `development/frontend/*` → `gateway-frontend`
   - `development/backend/*` → `gateway-backend`
   - `testing/*` → `gateway-testing`
   - `security/*` → `gateway-security`
   - `claude/mcp-tools/*` → `gateway-mcp-tools`
   - `development/integrations/*` → `gateway-integrations`

**Why defer to syncing-gateways:** Phase 20 requires checking ALL gateways and ALL library skills - beyond the scope of single-skill fixing.

## Related

- Main skill: [fixing-skills](../SKILL.md)
- Gateway template: `.claude/skills/managing-skills/templates/gateway-template.md`
- Gateway documentation: `.claude/skills/managing-skills/references/gateway-management.md`
- Audit implementations: `.claude/skill-library/claude/skill-management/auditing-skills/scripts/src/lib/phases/phase17-20*.ts`
