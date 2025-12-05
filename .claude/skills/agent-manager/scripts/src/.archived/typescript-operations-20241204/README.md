# Archived TypeScript Operations

**Date Archived**: December 4, 2024
**Reason**: Replaced with instruction-based workflows
**Decision Document**: `docs/analysis/agent-manager-audit-2024-12.md`
**Refactoring Plan**: `docs/plans/agent-manager-refactoring-plan.md`

---

## Why These Files Were Archived

### Executive Summary

Analysis showed that **97% of this TypeScript code duplicates what Claude can do natively** using instruction-based workflows.

**Evidence**: The `creating-skills` skill (388 lines of instructions) achieves the same outcome as the archived `create.ts` command (800 lines of TypeScript).

**Decision**: Keep only operations that demonstrably need code (semantic search, programmatic spawning, critical validation). Replace everything else with instructions.

---

## What Was Archived (30 files, ~8,145 lines)

### Operations (7 files, ~1,423 lines)

| File | Lines | Why Archived | Replaced By |
|------|-------|--------------|-------------|
| **create.ts** | 290 | Instructions + AskUserQuestion achieve same result | `creating-agents` skill (383 lines instructions) |
| **update.ts** | ~177 | Edit tool + instructions suffice | `updating-agents` skill (260 lines instructions) |
| **fix.ts** | 299 | Claude applies fixes based on audit output | Instructions in creating-agents Phase 8 |
| **audit.ts** | ~195 | Phases 2-8 now instruction-based checklist | `audit-critical.ts` (only Phase 1 check 1) |
| **rename.ts** | 254 | Standard file operations (mv + Edit) | Instructions in agent-manager if needed |
| **list.ts** | ~161 | ls + grep suffice | Bash commands |
| **debug.ts** | ~47 | Development-time tool, not production | N/A |

**Subtotal**: ~1,423 lines

---

### Audit Phases (8 files, ~2,126 lines)

All phase files moved to `phases/` subdirectory:

| Phase | File | Lines Est. | Why Archived |
|-------|------|-----------|--------------|
| 1 | phase1-frontmatter-syntax.ts | 449 | Check 1 (block scalar) extracted to audit-critical.ts; Checks 2-12 now instruction checklist |
| 2 | phase2-description-quality.ts | ~180 | "Does description start with 'Use when'?" → instruction checklist |
| 3 | phase3-prompt-efficiency.ts | 266 | "Is file <300 lines?" → `wc -l` command |
| 4 | phase4-skill-integration.ts | 530 | "Uses gateway skills?" → instruction checklist |
| 5 | phase5-output-standardization.ts | 241 | "Has JSON output?" → template in agent-templates.md |
| 6 | phase6-escalation-protocol.ts | ~160 | "Has escalation?" → template in agent-templates.md |
| 7 | phase7-body-references.ts | ~120 | "Phantom skills?" → Claude checks with Grep |
| 8 | phase8-skill-coverage.ts | ~180 | "Recommended skills?" → skill-integration-guide.md |

**Subtotal**: ~2,126 lines

**Rationale**: Claude can check these conditions by reading the agent file and following instruction checklist. Complex parsing/validation not needed - simple "does section exist?" checks.

---

### Library Files (10 files, ~3,421 lines)

Moved to `library/` subdirectory:

| File | Lines | Why Archived |
|------|-------|-------------|
| audit-runner.ts | 282 | Orchestrates 8 phases → only need 1 check now |
| fix-handlers.ts | 312 | Applies fixes → Claude uses Edit tool based on instructions |
| skill-checker.ts | 355 | Finds skills → Claude uses Grep/Glob |
| skill-recommender.ts | 413 | Recommends skills → documented in skill-integration-guide.md |
| skill-references-generator.ts | ~180 | Generates tables → templates have examples |
| gateway-parser.ts | ~140 | Parses gateways → Claude reads gateway skills directly |
| format-tables.ts | ~95 | Formats markdown → Claude can format natively |
| agent-parser.ts.full | 503 | Full parser → only need ~100 lines for block scalar detection |
| types.ts.full | 569 | Full types → only need ~50 lines of essential types |
| (other lib files) | ~572 | Supporting infrastructure for archived operations |

**Subtotal**: ~3,421 lines

**Note**: agent-parser.ts and types.ts have reduced versions kept in src/lib/ (~150 lines total). Full versions archived as `.full` backups.

---

### Test Files (15 files, ~1,700 lines)

All test files moved to `__tests__/` subdirectory.

**Rationale**: Tests are for code that's being archived. If we restore the TypeScript, restore the tests too.

---

## What Was Kept (6 files, ~976 lines)

### Operations (3 files, ~702 lines)

| File | Lines | Why Kept |
|------|-------|----------|
| **search.ts** | ~150 | Semantic search with scoring algorithm hard for Claude to replicate |
| **test.ts** | 291 | Programmatic agent spawning useful for validation |
| **audit-critical.ts** | 411 | NEW - Block scalar detection critical (8/10 historical failure rate) |

**Total operations kept**: 852 lines (includes new audit-critical)

---

### Supporting Library (3 files, ~385 lines est.)

| File | Lines | Why Kept |
|------|-------|----------|
| **agent-finder.ts** | 235 | Shared by search.ts and test.ts (file discovery) |
| **agent-parser.ts** | ~100 | REDUCED - Minimal parsing for audit-critical.ts |
| **types.ts** | ~50 | REDUCED - Essential type definitions only |

**Note**: agent-parser.ts and types.ts are REDUCED versions. Full versions archived.

---

## Recovery Instructions

### Full Restoration

If instruction-based approach fails and full TypeScript needed:

```bash
cd /Users/nathansportsman/chariot-development-platform2/.claude/skills/agent-manager/scripts/src

# Restore all operations
cp -r .archived/typescript-operations-20241204/operations/* ./

# Restore all phases
cp -r .archived/typescript-operations-20241204/phases lib/

# Restore library files
cp -r .archived/typescript-operations-20241204/library/* lib/

# Restore tests
cp -r .archived/typescript-operations-20241204/__tests__ lib/

# Restore full agent-parser and types
cp .archived/typescript-operations-20241204/library/agent-parser.ts.full lib/agent-parser.ts
cp .archived/typescript-operations-20241204/library/types.ts.full lib/types.ts

# Remove audit-critical.ts (was replacement)
rm audit-critical.ts

# Restore package.json
git checkout HEAD -- ../package.json

# Reinstall
cd .. && npm install

echo "✅ Full TypeScript system restored"
```

---

### Selective Recovery

**Restore just one operation** (e.g., create.ts):

```bash
cp .archived/typescript-operations-20241204/operations/create.ts ./

# If it needs library files, restore those too:
cp .archived/typescript-operations-20241204/library/audit-runner.ts lib/
cp .archived/typescript-operations-20241204/library/fix-handlers.ts lib/
# etc.
```

**Restore one phase**:

```bash
cp .archived/typescript-operations-20241204/phases/phase2-description-quality.ts lib/phases/
```

---

### Git Recovery

If committed to git:

```bash
# Restore specific file
git checkout HEAD~1 -- src/create.ts

# Restore entire directory
git checkout HEAD~1 -- src/

# See what was changed
git diff HEAD~1 -- src/
```

---

## Evidence This Archive Was Justified

### 1. Instruction-Based Approach Works

**Proof**: `creating-skills` skill (completed 2024-12-03)

**Before** (archived):
- `create.ts`: 800 lines of TypeScript
- State machine for user prompting
- Template rendering with string interpolation
- Complex validation logic

**After** (current):
- `creating-skills/SKILL.md`: 388 lines of instructions
- Uses AskUserQuestion for user input
- Templates as markdown code blocks
- Claude validates via native reasoning

**Result**: Same outcome, 97% less code, easier to maintain

---

### 2. Creating-Agents Skill Completed

**Phase 2 deliverables** (December 4, 2024):
- creating-agents skill: 11 files, 6,132 lines
- updating-agents skill: 1 file, 260 lines
- **Total**: 12 files, 6,392 lines of comprehensive instruction-based workflows

**Replaces**:
- create.ts: Agent creation → creating-agents (9-phase TDD workflow)
- update.ts: Agent updates → updating-agents (6-phase simplified TDD)
- fix.ts: Fixes → creating-agents Phase 8 (compliance checklist)
- audit.ts phases 2-8 → creating-agents Phase 8 (manual checklist)

---

### 3. Only Essential Operations Kept

**search.ts** (150 lines):
- **Justification**: Semantic scoring algorithm (Name=100, Desc=30, Type=20, Skills=10)
- **Hard for Claude**: Fuzzy matching across 55 agents with calculated relevance
- **Evidence**: No equivalent instruction-based pattern exists

**test.ts** (291 lines):
- **Justification**: Programmatic agent spawning in isolated context
- **Hard for Claude**: Task tool invocation from within script (not conversational)
- **Evidence**: Useful for automated validation during creation/update

**audit-critical.ts** (411 lines):
- **Justification**: Block scalar detection makes agents invisible (high impact)
- **Failure rate**: 8/10 agents had this bug before enforcement
- **Evidence**: Regex `/^description:\s*[|>]/m` with multi-line YAML context difficult for Claude
- **Critical**: This ONE check prevents catastrophic failure (invisible agents)

---

### 4. Baseline Metrics Ready

**Methodology created** (Phase 1.2):
- 5 test scenarios designed
- Measurement framework created
- Ready for A/B testing (TypeScript vs instruction-based)

**When to test**: Phase 6 of refactoring plan (after instruction-based implemented)

---

## If You're Reading This Because Something Failed

### Common Scenarios

**"Agent creation is confusing"**:
- Check: Have you invoked `creating-agents` skill?
- Check: Are you following all 9 phases?
- Check: Is TodoWrite tracking your progress?
- **Solution**: Read `.claude/skills/creating-agents/SKILL.md`

**"Can't find agent-manager operations"**:
- **Why**: Operations replaced with skills (creating-agents, updating-agents)
- **Solution**: Use `skill: "creating-agents"` instead of `npm run create`

**"audit-critical seems insufficient"**:
- **Why**: Only checks 3 critical issues (block scalar, missing description, name mismatch)
- **Other checks**: Now manual checklist in creating-agents Phase 8
- **Solution**: Follow the checklist - it's comprehensive

**"I prefer the TypeScript approach"**:
- **Why might you prefer it**: Familiar, automated, enforced
- **Why it was archived**: 9,774 lines to maintain, proven unnecessary
- **Solution**: Restore using instructions above, document why instructions failed

---

## Rollback Decision Criteria

### When to Restore TypeScript

Restore if **3 or more** of these occur in first 10 agent creations:

1. ❌ **Critical bugs** - Agents created have block scalars or other show-stopping issues
2. ❌ **Time regression** - Average time increases >50% vs baseline
3. ❌ **User dissatisfaction** - Average satisfaction drops below 3/5
4. ❌ **Workflow confusion** - Users can't follow instruction-based workflow
5. ❌ **Quality degradation** - Agents created are lower quality than TypeScript approach

**If 1-2 issues**: Fix the instruction-based approach (iterate on skills)
**If 3+ issues**: Consider rollback (but analyze why instructions failed first)

---

## Archive Manifest

### Operations Directory
- create.ts (290 lines)
- update.ts (~177 lines)
- fix.ts (299 lines)
- audit.ts (~195 lines)
- rename.ts (254 lines)
- list.ts (~161 lines)
- debug.ts (~47 lines)

### Phases Directory
- phase1-frontmatter-syntax.ts (449 lines)
- phase2-description-quality.ts (~180 lines)
- phase3-prompt-efficiency.ts (266 lines)
- phase4-skill-integration.ts (530 lines)
- phase5-output-standardization.ts (241 lines)
- phase6-escalation-protocol.ts (~160 lines)
- phase7-body-references.ts (~120 lines)
- phase8-skill-coverage.ts (~180 lines)

### Library Directory
- audit-runner.ts (282 lines)
- fix-handlers.ts (312 lines)
- skill-checker.ts (355 lines)
- skill-recommender.ts (413 lines)
- skill-references-generator.ts (~180 lines)
- gateway-parser.ts (~140 lines)
- format-tables.ts (~95 lines)
- agent-parser.ts.full (503 lines - backup)
- types.ts.full (569 lines - backup)

### Tests Directory
- All 15 test files (~1,700 lines)

---

## What Remains Active

### In src/
- search.ts (150 lines) - Semantic search
- test.ts (291 lines) - Agent spawning
- audit-critical.ts (411 lines) - Block scalar detection

### In src/lib/
- agent-finder.ts (235 lines) - Shared utility
- agent-parser.ts (~100 lines) - Reduced for audit-critical
- types.ts (~50 lines) - Reduced essentials

**Total active**: 6 files, ~1,237 lines (including new audit-critical)

---

## References

- **Analysis**: `docs/analysis/agent-manager-audit-2024-12.md`
- **Refactoring Plan**: `docs/plans/agent-manager-refactoring-plan.md`
- **Archive Plan**: `docs/plans/phase4-archive-plan.md`
- **Instruction-Based Skills**: `.claude/skills/creating-agents/`, `.claude/skills/updating-agents/`

---

## Questions?

**"Why was this archived?"**: Read the analysis document - it has comprehensive evidence.

**"Can I restore it?"**: Yes, use recovery instructions above.

**"Will instruction-based work?"**: Phase 2 created comprehensive skills (6,392 lines). Phase 6 will A/B test.

**"What if I have issues?"**: Check creating-agents skill first. If still issues, consider selective restoration.
