# OMAW Refactor Progress

**Date:** 2026-01-20
**Skill:** orchestrating-multi-agent-workflows (OMAW)
**Goal:** Clean separation of general principles vs domain-specific details

---

## Key Architectural Decisions

### 1. Separation of Concerns

**OMAW provides:** General orchestration patterns (the HOW)
**Domain orchestrations provide:** Domain-specific details (the WHAT)

Domain-specific content should be MOVED OUT of OMAW to specific orchestrations:

- `orchestrating-feature-development`
- `orchestrating-integration-development`
- `orchestrating-capability-development`
- `orchestrating-fingerprintx-development`

### 2. The 16-Phase Structure

| Phase | Name                  | Purpose                                        | Conditional |
| ----- | --------------------- | ---------------------------------------------- | ----------- |
| 1     | Setup                 | Worktree, MANIFEST, TodoWrite                  | Always      |
| 2     | Triage                | Classify work type, select phases              | Always      |
| 3     | Codebase Discovery    | Explore codebase patterns, detect technologies | Always      |
| 4     | Skill Discovery       | Map technologies to skills, write manifest     | Always      |
| 5     | Complexity            | Technical complexity assessment                | Always      |
| 6     | Brainstorming         | Design refinement                              | LARGE only  |
| 7     | Architecture Plan     | Technical design AND task decomposition        | MEDIUM+     |
| 8     | Implementation        | Code development                               | Always      |
| 9     | Design Verification   | Verify implementation matches plan             | MEDIUM+     |
| 10    | Domain Compliance     | Domain-specific mandatory patterns             | Always      |
| 11    | Code Quality          | Code review                                    | Always      |
| 12    | Test Planning         | Test strategy                                  | MEDIUM+     |
| 13    | Testing               | Test execution                                 | Always      |
| 14    | Coverage Verification | Coverage threshold                             | Always      |
| 15    | Test Quality          | No low-value tests, all pass                   | Always      |
| 16    | Completion            | PR, cleanup                                    | Always      |

**Work Types:** BUGFIX, SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases               |
| --------- | ---------------------------- |
| BUGFIX    | 6, 7, 9, 12                  |
| SMALL     | 6, 7, 9                      |
| MEDIUM    | 6                            |
| LARGE     | None (all 16 phases execute) |

**Key Design Decision:** Phase 7 (Planning) and Phase 8 (Architecture) were merged into "Architecture Plan" because:

1. Technical decisions inform task decomposition - you can't plan tasks without knowing HOW to implement
2. Architects already do both in practice
3. Eliminates handoff overhead between planner and architect agents
4. SMALL work doesn't need formal planning - just implement directly

### 3. Phase 3 → 4 Flow: Evidence-Based Skill Selection

**Why Codebase Discovery (Phase 3) comes BEFORE Skill Discovery (Phase 4):**

The old ordering loaded skills based on the user's task description alone. This was imprecise - agents would guess which skills they might need. The new ordering enables **evidence-based skill selection**:

```
Phase 3 (Codebase Discovery):
  → Spawn Explore agents
  → Output: technologies_detected (React, TanStack Query, Go, Lambda, etc.)
  → Output: affected_files with their technologies

Phase 4 (Skill Discovery):
  → Input: technologies_detected from Phase 3
  → Discover available gateways dynamically via Glob(".claude/skills/gateway-*/SKILL.md")
  → Map technologies to relevant gateways
  → Extract library skills from gateway routing tables
  → Output: skill-manifest.yaml

Later Phases (8, 9, 12, 14):
  → Read skill-manifest.yaml
  → Inject relevant skills into agent prompts
  → Agents MUST read these skills - no rationalization possible
```

**The key insight:** By discovering what technologies/files we're touching FIRST, we can select skills that are actually relevant. Then we INJECT those skills into agent prompts so agents can't skip them.

### 4. Dynamic Gateway Discovery

**Problem:** Hardcoded gateway lists go stale when gateways are added/renamed/removed.

**Solution:** Phase 4 discovers gateways dynamically:

```bash
Glob(".claude/skills/gateway-*/SKILL.md")
```

This returns all available gateways automatically. No hardcoded lists to maintain.

**Current gateways (discovered dynamically):**

- gateway-backend
- gateway-capabilities
- gateway-claude
- gateway-frontend
- gateway-integrations
- gateway-mcp-tools
- gateway-security
- gateway-testing
- gateway-typescript

### 5. Skill Manifest for Prompt Injection

Phase 4 outputs `skill-manifest.yaml` which later phases consume:

```yaml
skills_by_domain:
  frontend:
    library_skills:
      - path: ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md"
        trigger: "TanStack Query detected in useUser.ts"
  backend:
    library_skills:
      - path: ".claude/skill-library/development/backend/go-best-practices/SKILL.md"
        trigger: "Go files detected"
```

**How later phases use this:**

| Phase                      | Reads From Manifest         | Injects Into           |
| -------------------------- | --------------------------- | ---------------------- |
| Phase 7: Architecture Plan | `skills_by_domain.{domain}` | Architect agent prompt |
| Phase 8: Implementation    | `skills_by_domain.{domain}` | Developer agent prompt |
| Phase 11: Code Quality     | `skills_by_domain.{domain}` | Reviewer agent prompt  |
| Phase 13: Testing          | `skills_by_domain.testing`  | Tester agent prompt    |

The injection logic lives in delegation templates, not in Phase 4. Phase 4 just discovers and documents; later phases inject.

### 6. Phase File Rules

- Each phase gets its own reference file: `phase-{N}-{name}.md`
- Each file must stay under 400 lines (or Claude won't read it all)
- Single responsibility per phase (no combined concerns)
- Domain-specific orchestrations add SUB-PHASES, not new phases

### 7. Anti-Patterns to Avoid

**DO NOT:**

- ❌ Mix domain-specific examples in OMAW (belongs in specific orchestrations)
- ❌ Use fractional phase numbers (1.1, 1.2) - use full integers only
- ❌ Hardcode gateway lists - discover dynamically via Glob
- ❌ Combine multiple concerns in one phase file (keep single responsibility)
- ❌ Duplicate content between OMAW and domain orchestrations

**DO:**

- ✅ Discover gateways dynamically: `Glob(".claude/skills/gateway-*/SKILL.md")`
- ✅ Keep phase files under 400 lines
- ✅ Use sub-phases in domain orchestrations (6a, 6b, not Phase 6.1)
- ✅ Update progress file as work completes

---

## Current Status

### Phase Files (16 of 16 complete)

| Phase | File                                | Status                                  |
| ----- | ----------------------------------- | --------------------------------------- |
| 1     | `phase-1-setup.md`                  | ✅ COMPLETE                             |
| 2     | `phase-2-triage.md`                 | ✅ COMPLETE                             |
| 3     | `phase-3-codebase-discovery.md`     | ✅ COMPLETE                             |
| 4     | `phase-4-skill-discovery.md`        | ✅ COMPLETE                             |
| 5     | `phase-5-complexity.md`             | ✅ COMPLETE                             |
| 6     | `phase-6-brainstorming.md`          | ✅ COMPLETE                             |
| 7     | `phase-7-architecture-plan.md`      | ✅ COMPLETE (NEW - merged from old 7+8) |
| 8     | `phase-8-implementation.md`         | ✅ COMPLETE (renamed from old 9)        |
| 9     | `phase-9-design-verification.md`    | ✅ COMPLETE (renamed from old 10)       |
| 10    | `phase-10-domain-compliance.md`     | ✅ COMPLETE                             |
| 11    | `phase-11-code-quality.md`          | ✅ COMPLETE                             |
| 12    | `phase-12-test-planning.md`         | ✅ COMPLETE                             |
| 13    | `phase-13-testing.md`               | ✅ COMPLETE                             |
| 14    | `phase-14-coverage-verification.md` | ✅ COMPLETE                             |
| 15    | `phase-15-test-quality.md`          | ✅ COMPLETE                             |
| 16    | `phase-16-completion.md`            | ✅ COMPLETE                             |

### Completed Work

- [x] `SKILL.md` - 16-phase table with skip matrix
- [x] Phase consolidation (17 → 16 phases)
- [x] Phase file renumbering and cross-reference updates
- [x] `phase-1-setup.md` - MANIFEST template, TodoWrite template, output table
- [x] All phase files 1-9 - cross-references updated
- [x] `phase-10-domain-compliance.md` - P0/compliance validation
- [x] `phase-11-code-quality.md` - Two-stage gated review
- [x] `phase-12-test-planning.md` - Test strategy with test-lead
- [x] `phase-13-testing.md` - Parallel test agent execution
- [x] `phase-14-coverage-verification.md` - Coverage threshold validation
- [x] `phase-15-test-quality.md` - Test quality with anti-pattern detection
- [x] `phase-16-completion.md` - PR, cleanup, finalization

### Reference File Dependencies (per phase)

| Phase | Required Sub-Skills/References                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| 1     | `using-git-worktrees`, `persisting-agent-outputs`, `emergency-abort.md`, `progress-file-format.md`, `workflow-handoff.md` |
| 2     | `checkpoint-configuration.md`                                                                                             |
| 3     | `discovering-codebases-for-planning`                                                                                      |
| 4     | `using-skills`, `delegation-templates.md`                                                                                 |
| 5     | `developing-with-subagents`, `persisting-progress-across-sessions`                                                        |
| 6     | `brainstorming`, `checkpoint-configuration.md`                                                                            |
| 7     | `writing-plans`, `brainstorming`                                                                                          |
| 8     | `developing-with-subagents`, `file-conflict-protocol.md`, `agent-output-validation.md`                                    |
| 9     | `gated-verification.md`                                                                                                   |

---

## Identified Gaps

### ~~1. Context Monitoring Not Integrated~~ ✅ RESOLVED

Created `compaction-gates.md` foundational pattern (2026-01-20). Provides:

- Blocking gates at Phase 3, 8, 13
- Token thresholds: 70% (140k) / 90% (180k)
- 5-step compaction procedure with verification template
- "What to Compact / What to Keep" TABLE format
- CAN vs MUST stay in context lists
- Common rationalizations table

### ~~2. Missing Phase Files (10-16)~~ ✅ RESOLVED

All 7 phase files created (Priority 1).

### ~~3. Domain-Specific Leakage in Phases 10-16~~ ✅ RESOLVED

All domain-specific content removed (Priority 1.5).

### 4. Domain Orchestrations Out of Sync

These still have old phase structures and need rebuilding:

- `orchestrating-feature-development`
- `orchestrating-integration-development`
- `orchestrating-capability-development`
- `orchestrating-fingerprintx-development`

---

## Remaining Work

### ~~Priority 1: Create Phase Files 10-16~~ ✅ COMPLETE

All 7 phase files created (2026-01-20).

### Priority 1.5: Audit Phase Files for Domain-Specific Leakage ✅ COMPLETE

**Completed:** 2026-01-20

**Problem identified:** Phase files 10-16 accidentally include OFD-specific content (specific agent names, coverage targets, file paths, commands) instead of general patterns with placeholders.

**Audit Status:**

| Phase | Audited | Leakage Level                    | Fixed |
| ----- | ------- | -------------------------------- | ----- |
| 10    | ✅      | YES - Integration examples       | ✅    |
| 11    | ✅      | MINIMAL - MANIFEST example       | ✅    |
| 12    | ✅      | SIGNIFICANT - targets/counts     | ✅    |
| 13    | ✅      | HEAVY - Frontend Pattern section | ✅    |
| 14    | ✅      | SIGNIFICANT - paths/commands     | ✅    |
| 15    | ✅      | Minimal - counts/scores          | ✅    |
| 16    | ✅      | Minimal - commands/counts        | ✅    |

**Fix Principle:** OMAW provides general patterns (the HOW), domain orchestrations provide specifics (the WHAT).

**Changes Made:**

| Pattern          | Before                                          | After                                                                 |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Agent names      | `frontend-tester`, `backend-tester`             | `{domain}-tester`                                                     |
| Coverage targets | `95%`, `80%`, `90%`                             | `{security_target}%`, `{business_target}%`, `{integration_target}%`   |
| Test counts      | `12`, `8`, `5`, `28`                            | `{unit_count}`, `{integration_count}`, `{e2e_count}`, `{total_count}` |
| Paths            | `modules/chariot/ui`, `modules/chariot/backend` | "See domain orchestration"                                            |
| Commands         | `npm test`, `go test`, `npm run build`          | `{test_command}`, `{build_command}`, `{coverage_command}`             |
| Quality scores   | `85`, `96%`                                     | `{score}`, `{coverage}%`                                              |
| File names       | `auth.service.ts`, `wiz.go`                     | `{file}`, `{file_1}`                                                  |

**Verification:** Grep across phases 10-16 found only 3 matches in instructional "Good vs Bad" example tables (acceptable - teaching specificity pattern, not prescribing values).

### Priority 2: Integrate Context Monitoring ✅ COMPLETE

**Completed:** 2026-01-20

**Decision:** Created `compaction-gates.md` foundational pattern that combines:

- OID's compaction gates concept (blocking enforcement, token thresholds)
- OFD's "What to Compact / What to Keep" TABLE format
- Fingerprintx's 5-step procedure and verification template
- `persisting-progress-across-sessions` mandatory invocation

**Changes Made:**

1. Created `references/compaction-gates.md` (new file, ~300 lines)
2. Updated `references/context-monitoring.md` (thresholds: 70%/90%, added compaction-gates reference)
3. Updated `SKILL.md` (added compaction-gates to References, updated threshold text)
4. Updated `phase-4-skill-discovery.md` (added Gate 1 entry criteria)
5. Updated `phase-9-design-verification.md` (added Gate 2 entry criteria)
6. Updated `phase-14-coverage-verification.md` (added Gate 3 entry criteria)

**Key Design Decisions:**

- Token thresholds: 70% (140k) = mandatory at next gate, 90% (180k) = immediate
- Gate locations: After Phase 3, Phase 8, Phase 13 (heavy context phases)
- Domain orchestrations provide: specific content lists, rationalization tables
- OMAW provides: generic pattern with placeholders

### Priority 3: Rebuild Domain Orchestrations ✅ OFD2 COMPLETE

Built `orchestrating-feature-development` as the new pattern (preserving old OFD for reference).

**orchestrating-feature-development Progress:**

| File                                           | Status                   |
| ---------------------------------------------- | ------------------------ |
| `SKILL.md`                                     | ✅ Complete              |
| `references/compaction-gates.md`               | ✅ Complete              |
| `references/checkpoint-configuration.md`       | ✅ Complete              |
| `references/rationalization-table.md`          | ✅ Complete              |
| `references/phase-1-setup.md`                  | ✅ Complete              |
| `references/phase-2-triage.md`                 | ✅ Complete              |
| `references/phase-3-codebase-discovery.md`     | ✅ Complete              |
| `references/phase-4-skill-discovery.md`        | ✅ Complete              |
| `references/phase-5-complexity.md`             | ✅ Complete              |
| `references/phase-6-brainstorming.md`          | ✅ Complete              |
| `references/phase-7-architecture-plan.md`      | ✅ Complete              |
| `references/phase-8-implementation.md`         | ✅ Complete              |
| `references/phase-9-design-verification.md`    | ✅ Complete              |
| `references/phase-10-domain-compliance.md`     | ✅ Complete              |
| `references/phase-11-code-quality.md`          | ✅ Complete (2026-01-21) |
| `references/phase-12-test-planning.md`         | ✅ Complete (2026-01-21) |
| `references/phase-13-testing.md`               | ✅ Complete (2026-01-21) |
| `references/phase-14-coverage-verification.md` | ✅ Complete (2026-01-21) |
| `references/phase-15-test-quality.md`          | ✅ Complete (2026-01-21) |
| `references/phase-16-completion.md`            | ✅ Complete (2026-01-21) |
| `references/agent-matrix.md`                   | ✅ Complete (2026-01-21) |
| `references/prompts/architect-prompt.md`       | ✅ Complete (2026-01-21) |
| `references/prompts/developer-prompt.md`       | ✅ Complete (2026-01-21) |
| `references/prompts/reviewer-prompt.md`        | ✅ Complete (2026-01-21) |
| `references/prompts/tester-prompt.md`          | ✅ Complete (2026-01-21) |

**Key Design Decisions for OFD2:**

1. **16-phase structure** matching OMAW exactly
2. **Feature type detection** (frontend/backend/full-stack) in Phase 3
3. **Generic placeholders** (`{domain}` instead of hardcoded `frontend`/`backend`)
4. **Compaction gates** at phases 3→4, 8→9, 13→14
5. **Checkpoint matrix** varies by work type (BUGFIX, SMALL, MEDIUM, LARGE)
6. **Output directory**: `.feature-development/` (feature-specific)
7. **Agent matrix**: Based on `feature_type` from Phase 3

**OFD2 COMPLETE:** All 16 phase files + agent-matrix + 4 prompt templates created.

**orchestrating-capability-development2 Progress:**

| File                                           | Status                    |
| ---------------------------------------------- | ------------------------- |
| `SKILL.md`                                     | ✅ Complete (426 lines)   |
| `references/compaction-gates.md`               | ✅ Complete (176 lines)   |
| `references/checkpoint-configuration.md`       | ✅ Complete (251 lines)   |
| `references/rationalization-table.md`          | ✅ Complete (221 lines)   |
| `references/phase-1-setup.md`                  | ✅ Complete (304 lines)   |
| `references/phase-2-triage.md`                 | ✅ Complete (297 lines)   |
| `references/phase-3-codebase-discovery.md`     | ✅ Complete (370 lines)   |
| `references/phase-4-skill-discovery.md`        | ✅ Complete (322 lines)   |
| `references/phase-5-complexity.md`             | ✅ Complete (343 lines)   |
| `references/phase-6-brainstorming.md`          | ✅ Complete (360 lines)   |
| `references/phase-7-architecture-plan.md`      | ✅ Complete (377 lines)   |
| `references/phase-8-implementation.md`         | ✅ Complete (364 lines)   |
| `references/phase-9-design-verification.md`    | ✅ Complete (359 lines)   |
| `references/phase-10-domain-compliance.md`     | ✅ Complete (309 lines)   |
| `references/phase-11-code-quality.md`          | ✅ Complete (288 lines)   |
| `references/phase-12-test-planning.md`         | ✅ Complete (301 lines)   |
| `references/phase-13-testing.md`               | ✅ Complete (315 lines)   |
| `references/phase-14-coverage-verification.md` | ✅ Complete (272 lines)   |
| `references/phase-15-test-quality.md`          | ✅ Complete (256 lines)   |
| `references/phase-16-completion.md`            | ✅ Complete (320 lines)   |
| `references/agent-matrix.md`                   | ⏳ Pending                |
| `references/capability-types.md`               | ⏳ Pending (from old OCD) |
| `references/quality-standards.md`              | ⏳ Pending (from old OCD) |
| `references/prompts/architect-prompt.md`       | ⏳ Pending                |
| `references/prompts/developer-prompt.md`       | ⏳ Pending                |
| `references/prompts/reviewer-prompt.md`        | ⏳ Pending                |
| `references/prompts/tester-prompt.md`          | ⏳ Pending                |

**OCD2 Progress:** 20/27 files complete (SKILL.md + 3 foundation files + 16 phase files).

**Key Design Decisions for OCD2:**

1. **16-phase structure** matching OMAW exactly
2. **Capability type detection** (VQL/Nuclei/Janus/Fingerprintx/Scanner) in Phase 3
3. **Capability-specific quality metrics** (detection accuracy, FP rate, protocol correctness)
4. **Compaction gates** at phases 3→4, 8→9, 13→14
5. **Checkpoint matrix** varies by work type (BUGFIX, SMALL, MEDIUM, LARGE)
6. **Output directory**: `.capability-development/` (capability-specific)
7. **Agent matrix**: capability-lead, capability-developer, capability-reviewer, capability-tester

**Next:** OCD2 agent-matrix, capability-types, quality-standards, prompts (7 remaining files).

---

## Resume Instructions

### Resume Prompt (Copy This)

```
read .claude/skills/orchestrating-multi-agent-workflows/.progress/OMAW-refactor-2026-01-20.md. don't worry about the status of other integrations. continue building orchestrating-capability-development2, reference orchestrating-multi-agent-workflows for the structure and orchestrating-feature-development as the template, pull in domain specifics from orchestrating-capability-development where it makes sense. create a todo list and go section by section. for each item in your todo list verify before completion.

Current OCD2 Status:
- ✅ Complete: SKILL.md, compaction-gates, checkpoint-configuration, rationalization-table, phases 1-16
- ⏳ Remaining: agent-matrix, capability-types, quality-standards, prompts (7 files)
- ⏳ Remaining: phases 13-16, agent-matrix, capability-types, quality-standards, prompts
```

### Quick Start

```bash
cd /Users/nathansportsman/chariot-development-platform3/.claude/skills/orchestrating-multi-agent-workflows
```

1. Read this progress file
2. Read `SKILL.md` for the 16-phase table
3. ~~Create phase files 10-16~~ ✅ DONE
4. ~~Fix domain-specific leakage in phases 10-16~~ ✅ DONE
5. ~~Integrate context monitoring~~ ✅ DONE (compaction-gates.md created)
6. ~~Rebuild OFD2~~ ✅ DONE (2026-01-21)
7. **Continue OCD2** ← IN PROGRESS (12/27 files, phases 9-16 remaining)
8. Rebuild OID, Fingerprintx using same pattern

### Phase File Structure

Each phase file follows this structure:

1. Title and purpose
2. Overview with entry/exit criteria
3. Steps 1-N (the actual work)
4. MANIFEST.yaml update section
5. TodoWrite update section
6. User report section
7. Edge cases
8. Related references

### Key Context

- **16 phases** (was 17 - Planning merged into Architecture Plan)
- **Phase 7** = Architecture Plan (technical design AND task decomposition)
- **BUGFIX/SMALL** skip phases 6, 7, 9 (no planning needed)
- **MEDIUM** skips only phase 6 (Brainstorming)
- **Gateways** are discovered dynamically via Glob, not hardcoded
- **Domain-specific content** belongs in domain orchestrations, not OMAW
- **Compaction gates** integrated into phases 3→4, 8→9, 13→14 (see compaction-gates.md)

### Files Completed This Session

#### Priority 1: Phase File Creation

| Action  | File                                                                     |
| ------- | ------------------------------------------------------------------------ |
| Updated | `SKILL.md` (16-phase table, skip matrix)                                 |
| Created | `phase-7-architecture-plan.md` (merged from old 7+8)                     |
| Renamed | `phase-9-implementation.md` → `phase-8-implementation.md`                |
| Renamed | `phase-10-design-verification.md` → `phase-9-design-verification.md`     |
| Deleted | `phase-7-planning.md`                                                    |
| Deleted | `phase-8-architecture.md`                                                |
| Updated | `phase-1-setup.md` (MANIFEST, TodoWrite, output table)                   |
| Updated | `phase-2-triage.md` (checkpoint references)                              |
| Updated | `phase-4-skill-discovery.md` (phase keys, manifest table)                |
| Updated | `phase-5-complexity.md` (next phase reference)                           |
| Updated | `phase-6-brainstorming.md` (next phase references)                       |
| Created | `phase-10-domain-compliance.md` (from p0-compliance.md + OFD phase-8)    |
| Created | `phase-11-code-quality.md` (from gated-verification.md + OFD phase-9)    |
| Created | `phase-12-test-planning.md` (from OFD phase-10-test-planning.md)         |
| Created | `phase-13-testing.md` (from OFD phase-11-testing.md)                     |
| Created | `phase-14-coverage-verification.md` (from OFD phase-12 coverage section) |
| Created | `phase-15-test-quality.md` (from OFD phase-12 quality section)           |
| Created | `phase-16-completion.md` (from exit-criteria.md)                         |

#### Priority 1.5: Domain-Specific Leakage Removal

| Action | File                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| Fixed  | `phase-10-domain-compliance.md` (P0 table → generic placeholders)                     |
| Fixed  | `phase-11-code-quality.md` (MANIFEST agent names/scores → placeholders)               |
| Fixed  | `phase-12-test-planning.md` (coverage targets/counts/commands → placeholders)         |
| Fixed  | `phase-13-testing.md` (Frontend Pattern → Generic Pattern, all counts → placeholders) |
| Fixed  | `phase-14-coverage-verification.md` (paths/commands/targets → placeholders)           |
| Fixed  | `phase-15-test-quality.md` (counts/scores/agent names → placeholders)                 |
| Fixed  | `phase-16-completion.md` (verification commands/counts → placeholders)                |

#### Priority 2: Compaction Gates Integration

| Action  | File                                                                           |
| ------- | ------------------------------------------------------------------------------ |
| Created | `references/compaction-gates.md` (296 lines, foundational pattern)             |
| Updated | `references/context-monitoring.md` (thresholds 70%/90%, compaction-gates link) |
| Updated | `SKILL.md` (references, threshold text, Gate column in 16-phase table)         |
| Updated | `phase-3-codebase-discovery.md` (exit: Gate 1 follows)                         |
| Updated | `phase-4-skill-discovery.md` (entry: Gate 1 required)                          |
| Updated | `phase-8-implementation.md` (exit: Gate 2 follows)                             |
| Updated | `phase-9-design-verification.md` (entry: Gate 2 required)                      |
| Updated | `phase-13-testing.md` (exit: Gate 3 follows)                                   |
| Updated | `phase-14-coverage-verification.md` (entry: Gate 3 required)                   |
| Updated | `references/delegation-templates.md` (token awareness section)                 |
| Updated | `references/compaction-gates.md` (Intra-Phase Compaction section)              |
| Updated | `phase-7-architecture-plan.md` (pre-spawn check at Step 2)                     |
| Updated | `phase-8-implementation.md` (pre-spawn check at Step 5)                        |
| Updated | `phase-13-testing.md` (pre-spawn check at Step 2)                              |
