---
name: verifying-before-completion
description: Use when claiming completion before commits/PRs - run verification commands first; evidence before assertions always
allowed-tools: Read, Write, Bash
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim                 | Requires                        | Not Sufficient                 |
| --------------------- | ------------------------------- | ------------------------------ |
| Tests pass            | Test command output: 0 failures | Previous run, "should pass"    |
| Linter clean          | Linter output: 0 errors         | Partial check, extrapolation   |
| Build succeeds        | Build command: exit 0           | Linter passing, logs look good |
| Bug fixed             | Test original symptom: passes   | Code changed, assumed fixed    |
| Regression test works | Red-green cycle verified        | Test passes once               |
| Agent completed       | VCS diff shows changes          | Agent reports "success"        |
| Requirements met      | Line-by-line checklist          | Tests passing                  |

## Exit Criteria Interpretation (LITERAL RULE)

When verifying against a plan's exit criteria, interpret the metric LITERALLY:

| Exit Criteria Says       | You Must Count              | NOT This                     |
| ------------------------ | --------------------------- | ---------------------------- |
| '118 files updated'      | 118 FILES with changes      | Function calls, import stmts |
| '45 tests passing'       | 45 TEST FUNCTIONS passing   | Assertions within tests      |
| '12 components migrated' | 12 COMPONENT FILES migrated | JSX elements                 |
| 'All endpoints updated'  | Each ENDPOINT (route)       | Handler functions            |

**The Ambiguity Trap:**

Real failure: Agent claimed '118 navigation calls updated' when exit criteria said '118 files'. Agent counted useNavigate() calls, not files. Only 47 files were actually updated.

**Verification Protocol for Exit Criteria:**

1. **Quote** the exit criteria EXACTLY as written in the plan
2. **Identify** the unit of measurement (files? tests? components? endpoints?)
3. **Count** actual completions of THAT unit
4. **Compare** count against criteria number
5. **Report** with evidence: 'Exit criteria: 118 files. Verified: 118 files updated (see file list below)'

**If Ambiguous:**

If exit criteria doesn't specify the unit clearly (e.g., 'update navigation'), ASK before claiming completion:

- 'Exit criteria says update navigation. Does this mean files with navigation imports, or individual useNavigate calls?'

**Never assume the favorable interpretation.**

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse                                  | Reality                |
| --------------------------------------- | ---------------------- |
| "Should work now"                       | RUN the verification   |
| "I'm confident"                         | Confidence ≠ evidence  |
| "Just this once"                        | No exceptions          |
| "Linter passed"                         | Linter ≠ compiler      |
| "Agent said success"                    | Verify independently   |
| "I'm tired"                             | Exhaustion ≠ excuse    |
| "Partial check is enough"               | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter     |

## Key Patterns

**Tests:**

```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**

```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**

```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**

```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**

```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Why This Matters

From 24 failure memories:

- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**ALWAYS before:**

- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**

- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## Integration

### Called By

- `orchestrating-feature-development` (LIBRARY) - `Read(".claude/skill-library/development/orchestrating-feature-development/SKILL.md")` (Phase 8 - before completion)
- `orchestrating-capability-development` (Phase 8 - before completion)
- `orchestrating-integration-development` (Phase 8 - before completion)
- `orchestrating-fingerprintx-development` (Phase 8 - before completion)
- `developing-with-subagents` (after batch completion, before moving to next batch)
- All developer agents: `frontend-developer`, `backend-developer`, `capability-developer`, `integration-developer`, `tool-developer`, `python-developer` (Step 1 mandatory skill, before returning from Task)
- All tester agents: `frontend-tester`, `backend-tester`, `capability-tester`, `tool-tester` (Step 1 mandatory skill, before claiming tests pass)
- All reviewer agents: `frontend-reviewer`, `backend-reviewer`, `capability-reviewer`, `tool-reviewer` (before completion claims)
- All security agents: `frontend-security`, `backend-security` (before security assessment completion)
- Analysis agents: `codebase-mapper`, `codebase-sizer`, `security-controls-mapper`, `security-test-planner`, `debugger`, `threat-modeler` (before analysis completion)
- User manually when about to make completion claims

### Requires (invoke before starting)

None - standalone verification skill with no prerequisites

### Calls (during execution)

None - terminal verification skill (runs verification commands directly via Bash, doesn't delegate to other skills)

### Pairs With (conditional)

None - This skill is invoked as a mandatory gate, not conditionally paired

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
