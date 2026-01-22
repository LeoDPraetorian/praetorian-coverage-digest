# Common Fix Scenarios

Common skill compliance issues and recommended fix order.

## Scenario 1: New Skill Cleanup

**Typical issues:** Phase 1 (description), Phase 5 (directories), Phase 4 (broken links)

**Fix order:** Deterministic (5) → Claude-Auto (1) → Hybrid (4)

**Rationale:** Create structure first, then fix description, then resolve links (may depend on structure).

## Scenario 2: Over-Long Skill

**Typical issues:** Phase 3 (>500 lines)

**Fix:** Claude-Auto (3) - Extract sections to references/

**Extraction priority:**

1. Detailed workflow steps → `references/workflow.md`
2. API references → `references/api-reference.md`
3. Advanced patterns → `references/patterns.md`
4. Troubleshooting → `references/troubleshooting.md`
5. Complete examples → `examples/example-1.md`

## Scenario 3: Over-Long Reference File

**Typical issues:** Phase 3b (reference file >400 lines)

**Fix:** Claude-Auto (3b) - Split by H2 headers into sub-files

**Split decision guide:**

| File Lines | Action                               |
| ---------- | ------------------------------------ |
| 400-500    | Split into 2 files by major sections |
| 500-800    | Split into 2-3 files by H2 headers   |
| >800       | Split into index + category files    |

**Naming convention:** `{parent}-{category}.md`

Example: `phase-details.md` → `phase-details-deterministic.md`, `phase-details-hybrid.md`

## Scenario 4: Legacy Skill Migration

**Typical issues:** Phase 9 (bash), Phase 11 (cd paths), Phase 13 (no TodoWrite)

**Fix order:** Claude-Auto (11, 13) → Human (9)

**Rationale:** Fix command patterns and add TodoWrite first (automated). Bash migration requires human judgment on migration value.

## Scenario 5: Visual/Style Cleanup

**Typical issues:** Phase 14 (tables), Phase 15 (code blocks), Phase 16 (headers)

**Fix order:** Deterministic (14) → Manual review (15-16) → Semantic review (readability)

**Rationale:** Prettier formatting is automated. Code blocks and headers require semantic understanding (validation-only).

## Scenario 6: Orphan Library Skill

**Typical issues:** Phase 18 (no gateway or agent reference)

**Fix:** Claude-Auto (18) - Add to appropriate gateway or agent

**Gateway mapping:**

- Frontend skills → `gateway-frontend`
- Backend skills → `gateway-backend`
- Testing skills → `gateway-testing`
- Security skills → `gateway-security`
- MCP tools → `gateway-mcp-tools`
- Integrations → `gateway-integrations`

## Scenario 7: Missing Integration Section

**Typical issues:** Phase 28 (no Integration section, has Related Skills)

**Fix:** Claude-Auto (28) - Generate Integration section from skill analysis

**Steps:**

1. Analyze skill content for references
2. Search codebase for what calls this skill
3. Generate Integration section
4. Insert before Related Skills or at end
5. Optionally consolidate Related Skills

## Scenario 8: Stub Reference Files

**Typical issues:** Phase 26 (empty or placeholder content in references/)

**Fix:** Claude-Auto (26) - Invoke orchestrating-research to populate stubs

**Critical:** Never populate from training data. Always use research for verified content.

## Scenario 9: Broken Integration References

**Typical issues:** Phase 10 (references to renamed/deleted skills)

**Fix:** Hybrid (10) - Check deprecation registry, fuzzy match if needed

**Steps:**

1. Check `.claude/skill-library/lib/deprecation-registry.json`
2. If registered: Auto-replace with new name
3. If not registered: Fuzzy match, confirm with user
