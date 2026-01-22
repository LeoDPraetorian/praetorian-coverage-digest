# Phase 13: Completion

This phase merges pre-completion verification and branch finalization into a single completion phase.

## Pre-Completion Verification

# Phase 13: Pre-Completion Verification

Verify all deliverables ready for commit.

**Gate**: All phases 0-10 complete, all wrappers passing tests/audit

**Output**: Verification checklist passed

## Verification Checklist

Before proceeding to Phase 13 (Branch Finalization), confirm:

- [ ] All tools wrapped (100% coverage from tools-manifest.json)
- [ ] Service skill generated in .claude/skill-library/claude/mcp-tools/
- [ ] All tests passing with >=80% coverage per wrapper
- [ ] All audits passing >=10/11 phases per wrapper
- [ ] All P0 compliance checks passed
- [ ] Build succeeds (npm run build)
- [ ] package.json description validated

## Verification Commands

```bash
# Check test coverage
cd .claude/tools
npm test -- --coverage

# Verify build
npm run build

# Confirm service skill exists
ls -la .claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md

# Check MANIFEST.yaml status
grep "status:" $OUTPUT_DIR/MANIFEST.yaml
```

**Cannot proceed to Phase 13 until all checklist items pass.**

## Branch Finalization

# Phase 13: Branch Finalization

**Purpose:** Commit wrappers, create PR, cleanup worktree

**Execution:** Sequential - Uses finishing-a-development-branch skill

**REQUIRED SUB-SKILL:** finishing-a-development-branch (LIBRARY) - `Read('.claude/skill-library/workflow/finishing-a-development-branch/SKILL.md')`

## Step 12.1: Invoke Branch Finalization Skill

```
Read('.claude/skill-library/workflow/finishing-a-development-branch/SKILL.md')
```

Follow skill guidance for:

1. Test verification (already passed in Phase 9)
2. Stage files (.claude/tools/{service}/_.ts, _.test.ts, skill file)
3. Generate commit message with context
4. Create PR with summary (or offer commit-only option)
5. Cleanup worktree after merge/user decision

## Commit Message Template

```
feat(mcp): add {service} MCP wrappers

- Wrapped {N} tools: {tool1}, {tool2}, ...
- All tests passing (>=80% coverage per wrapper)
- All P0 compliance checks passed (token optimization, Zod schemas, Result pattern, etc.)
- Service skill: .claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md

Coverage:
- {tool1}: {X}% coverage
- {tool2}: {Y}% coverage
...

Audit: {M}/{N} wrappers passed >=10/11 phases
```

## PR Format

**Title:** `feat(mcp): add {service} MCP wrappers`

**Body:**

```markdown
## Summary

- Wrapped {N} tools from {service} MCP server
- All P0 compliance requirements met
- Test coverage: {avg}% average across wrappers
- Audit compliance: {M}/{N} wrappers passed >=10/11 phases

## Tool Coverage

| Tool    | Test Coverage | Audit Score |
| ------- | ------------- | ----------- |
| {tool1} | {X}%          | {score}/11  |
| {tool2} | {Y}%          | {score}/11  |

...

## Test Plan

- [x] All unit tests passing
- [x] All integration tests passing
- [x] Build succeeds
- [x] Service skill generated
```

**Output:** PR URL or commit SHA + cleanup confirmation
