---
name: orchestrating-bugfix
description: Use when fixing bugs - lightweight discovery, debugging, TDD fix, and verification without architecture phases.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, Skill
---

# Orchestrating Bug Fixes

**Lightweight bug-fixing orchestration that coordinates discovery, debugging, implementation, and verification without the full ceremony of feature development.**

## When to Use

Use this skill when:

- Fixing a reported bug
- Investigating unexpected behavior
- User says 'fix this bug' or 'why is X broken'

DO NOT use when (use orchestrating-feature-development instead):

- Bug requires architectural changes
- Bug is actually a feature request
- Fix spans multiple services
- Root cause needs major refactoring

## Quick Reference

| Phase             | Executor                    | Purpose                             | Checkpoint        |
| ----------------- | --------------------------- | ----------------------------------- | ----------------- |
| 0: Setup          | Orchestrator                | Create bug directory                | -                 |
| 1: Scoping        | discovering-bugs-for-fixing | Parse symptoms, find candidates     | -                 |
| 2: Discovery      | 0-5 Explore agents          | Find bug-related code (conditional) | -                 |
| 3: Investigation  | debugger agent              | Root cause analysis                 | -                 |
| 4: Implementation | Domain developer            | TDD fix                             | -                 |
| 5: Verification   | Orchestrator                | Regression check                    | 🛑 If regressions |

**Total time**: ~20-40 minutes (vs 2-4 hours for feature development)

## Core Workflow

### Phase 0: Setup

**Required skills:**

- `persisting-agent-outputs` - Establish output directory structure
- `using-todowrite` - Track workflow progress

Create bug directory:

```
.claude/.output/bugs/YYYYMMDD-HHMMSS-{bug-name}/
```

**See:** [Phase 0 Details](references/phase-0-setup.md)

### Phase 1-2: Bug Scoping + Discovery

**Required skill:** `discovering-bugs-for-fixing` (library skill)

Stage 1: Parse symptoms, grep for clues, calculate agent count
Stage 2: Spawn 0-5 Explore agents (if location unknown)

**Outputs:**

- `bug-scoping-report.json`
- `candidate-locations.md` (if discovery needed)

**Decision:**

- IF 0 candidates found → Ask user for more context
- IF candidates found → Proceed to Phase 3

**See:** [Phase 1-2 Details](references/phase-1-2-scoping-discovery.md)

### Phase 3: Root Cause Investigation

**Agent:** `debugger`

**Required skills:**

- `debugging-systematically`
- `tracing-root-causes`

**Input:** candidate-locations.md (or known location)
**Method:** Hypothesis-driven investigation
**Output:** root-cause-report.md (~2K tokens)

**Returns:**

- root_cause: Clear description of why bug occurs
- evidence: file:line references proving the cause
- minimal_fix: Specific change needed
- affected_tests: Tests that should cover this

**Decision:**

- IF verdict = confirmed → Proceed to Phase 4
- IF verdict = inconclusive → Re-run with next_step
- IF 3 attempts inconclusive → Ask user for help

**See:** [Phase 3 Details](references/phase-3-investigation.md)

### Phase 4: Fix Implementation

**Agent:** Domain developer (frontend-developer OR backend-developer OR capability-developer based on file type)

**Required skills:**

- `developing-with-tdd` - Write failing test FIRST
- `verifying-before-completion` - Prove fix works
- `adhering-to-yagni` - Minimal fix only, no extras

**Input:** root-cause-report.md

**Process:**

1. Write test that reproduces the bug (must fail)
2. Implement minimal fix
3. Verify test passes
4. Run existing tests

**Output:** Code changes + new/updated test file

**IMPORTANT:** Fix ONLY what's broken. Do not:

- Refactor surrounding code
- Add 'while we're here' improvements
- Change unrelated tests

**See:** [Phase 4 Details](references/phase-4-implementation.md)

### Phase 5: Verification

**Executor:** Orchestrator
**Required skill:** `verifying-before-completion`

**Steps:**

1. Run the new/updated test (must pass)
2. Run full test suite
3. Run build (npm run build OR go build)
4. Run lint (if configured)

**Output:** verification-report.md

**Decision:**

- IF all pass → Complete, ready for commit
- IF new test fails → Return to Phase 4
- IF regressions → 🛑 Human checkpoint

**Human Checkpoint (if regressions):**
Options:

- Show me the failures (display test output)
- Fix the regressions (return to Phase 4)
- Proceed anyway (user accepts risk)
- Abort fix (discard changes)

**See:** [Phase 5 Details](references/phase-5-verification.md)

## Key Differences from Feature Development

| Aspect            | Feature Development        | Bug Fix                   |
| ----------------- | -------------------------- | ------------------------- |
| Brainstorming     | Required                   | Skip (bug is defined)     |
| Discovery         | 1-10 agents, very thorough | 0-5 agents, quick mode    |
| Architecture      | Required + human approval  | Skip (minimal fix)        |
| Planning          | Detailed multi-task        | Skip (atomic fix)         |
| Implementation    | Batch or per-task          | Always single-shot        |
| Review            | 2-stage (spec + quality)   | Verification only         |
| Testing           | Full planning + 3 modes    | TDD + regression          |
| Human checkpoints | 3 (brainstorm, plan, arch) | 0-1 (only if regressions) |
| Duration          | 2-4 hours                  | 20-40 minutes             |

## Required Sub-Skills

| Phase | Required                                                            | Conditional                                    |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------- |
| 0     | persisting-agent-outputs, using-todowrite                           | -                                              |
| 1-2   | discovering-bugs-for-fixing                                         | dispatching-parallel-agents (if 3+ candidates) |
| 3     | debugging-systematically, tracing-root-causes                       | -                                              |
| 4     | developing-with-tdd, verifying-before-completion, adhering-to-yagni | -                                              |
| 5     | verifying-before-completion                                         | -                                              |

## Agent Selection for Phase 4

Select developer agent based on bug location:

| File Pattern         | Agent                                                |
| -------------------- | ---------------------------------------------------- |
| _.tsx, _.ts (ui/)    | frontend-developer                                   |
| \*.go                | backend-developer                                    |
| _.vql, nuclei/_.yaml | capability-developer                                 |
| \*.py                | backend-developer (or python-developer if available) |

## Output Artifacts

```
.claude/.output/bugs/YYYYMMDD-HHMMSS-{bug-name}/
├── metadata.json              # Status tracking
├── bug-scoping-report.json    # Phase 1
├── candidate-locations.md     # Phase 2 (if discovery needed)
├── root-cause-report.md       # Phase 3
└── verification-report.md     # Phase 5
```

## Integration

### Called By

- /bugfix command (primary entry point)
- Direct skill invocation

### Requires (invoke before starting)

| Skill                               | Purpose                  |
| ----------------------------------- | ------------------------ |
| persisting-agent-outputs            | Establish OUTPUT_DIR     |
| orchestrating-multi-agent-workflows | Agent routing if blocked |

### Calls (skill invocation)

| Skill                       | Phase | Purpose                   |
| --------------------------- | ----- | ------------------------- |
| discovering-bugs-for-fixing | 1-2   | Bug scoping and discovery |

### Spawns (agent dispatch)

| Agent              | Phase | Purpose                  |
| ------------------ | ----- | ------------------------ |
| Explore (0-5)      | 2     | Find bug-related code    |
| debugger           | 3     | Root cause investigation |
| {domain}-developer | 4     | Implement fix with TDD   |

## Rationalization Prevention

Watch for these bug-fix-specific rationalizations:

| Rationalization                  | Reality                                          |
| -------------------------------- | ------------------------------------------------ |
| 'I know what's wrong'            | Still need evidence. Run debugger agent.         |
| 'Quick fix, no test needed'      | TDD is non-negotiable. Write failing test first. |
| 'While I'm here, let me also...' | STOP. Fix only the bug. Nothing else.            |
| 'This test is flaky, ignore it'  | Flaky tests need fixing, not ignoring.           |
| 'Regression is unrelated'        | Prove it with evidence or fix it.                |

## Exit Criteria

Bug fix is complete when:

- [ ] Root cause identified with evidence
- [ ] Failing test written that reproduces bug
- [ ] Minimal fix implemented
- [ ] New test passes
- [ ] Full test suite passes (no regressions)
- [ ] Build succeeds
- [ ] Changes ready for commit/PR

## Escalation to Feature Development

If during ANY phase you discover:

- Architectural changes needed
- Multiple services affected
- Significant refactoring required
- Scope exceeds 'minimal fix'

STOP and escalate:

```
This bug requires more than a minimal fix. Escalating to orchestrating-feature-development because: [specific reason]
```

## Related Skills

| Skill                               | Access         | Purpose                                |
| ----------------------------------- | -------------- | -------------------------------------- |
| discovering-bugs-for-fixing         | Read (library) | Phase 1-2 scoping and discovery        |
| debugging-systematically            | Skill (core)   | Phase 3 systematic debugging framework |
| tracing-root-causes                 | Skill (core)   | Phase 3 root cause tracing             |
| developing-with-tdd                 | Skill (core)   | Phase 4 TDD workflow                   |
| verifying-before-completion         | Skill (core)   | Phase 4-5 verification                 |
| adhering-to-yagni                   | Skill (core)   | Phase 4 scope discipline               |
| orchestrating-feature-development   | Skill (core)   | Escalation path for complex fixes      |
| orchestrating-multi-agent-workflows | Skill (core)   | Agent coordination patterns            |
| persisting-agent-outputs            | Skill (core)   | Output directory management            |
