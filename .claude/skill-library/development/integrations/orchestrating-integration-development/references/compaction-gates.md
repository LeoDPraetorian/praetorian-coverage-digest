# Compaction Gates

**BLOCKING checkpoints that enforce context compaction at phase transitions to prevent context rot.**

**This file provides:** Complete compaction gate protocol for integration development workflows.

---

## Overview

A **compaction gate** is a BLOCKING phase transition that requires:

1. Writing full phase outputs to progress file
2. Verifying write succeeded
3. Replacing inline context with summary (<200 tokens)
4. Completing verification checklist

**Cannot proceed past a compaction gate without completing all steps.**

---

## Token Thresholds

| Threshold      | Tokens  | Action Required                                        |
| -------------- | ------- | ------------------------------------------------------ |
| 60% (120k)     | 120,000 | Log warning, plan compaction at next gate              |
| **75% (150k)** | 150,000 | **SHOULD compact - proactive compaction recommended**  |
| **80% (160k)** | 160,000 | **MUST compact - compact NOW before proceeding**       |
| **85% (170k)** | 170,000 | **BLOCKED - Hook prevents agent spawn until /compact** |
| 95% (190k)     | 190,000 | Emergency compaction, consider session handoff         |

---

## Gate Locations

Integration development has **3 compaction gates** at critical transitions:

| Gate       | After Phase                  | Before Phase                     | Rationale                                    |
| ---------- | ---------------------------- | -------------------------------- | -------------------------------------------- |
| **Gate 1** | Phase 3 (Codebase Discovery) | Phase 4 (Skill Discovery)        | Discovery outputs 10-20K tokens of findings  |
| **Gate 2** | Phase 8 (Implementation)     | Phase 9 (Design Verification)    | Implementation logs, code changes accumulate |
| **Gate 3** | Phase 13 (Testing)           | Phase 14 (Coverage Verification) | Test execution logs, multiple tester outputs |

---

## What to Compact vs What to Keep (Integration-Specific)

### Gate 1: After Phase 3 (Codebase Discovery)

| What to Compact               | What to Keep                              |
| ----------------------------- | ----------------------------------------- |
| Full discovery findings       | Key patterns summary (2-3 bullets)        |
| File lists from exploration   | Affected directories list                 |
| Pattern analysis details      | Technology list (Go, vendor API versions) |
| Existing integration analysis | Reference file paths                      |
| `discovery.md` full content   | "Discovery complete. See discovery.md"    |

**Integration-specific:** Compact vendor API documentation excerpts, existing integration code samples.

### Gate 2: After Phase 8 (Implementation)

| What to Compact                  | What to Keep                              |
| -------------------------------- | ----------------------------------------- |
| Full implementation logs         | Files modified list                       |
| Agent handoff details            | Key decisions (auth approach, pagination) |
| Code review discussions          | Deviation notes from architecture         |
| `implementation.md` full content | P0 compliance status summary              |

**Integration-specific:** Compact client/collector code snippets shown during implementation.

### Gate 3: After Phase 13 (Testing)

| What to Compact           | What to Keep                     |
| ------------------------- | -------------------------------- |
| Test execution logs       | Pass/fail summary (X/Y tests)    |
| Mock server setup details | Coverage percentage              |
| Verbose test output       | Failure list (if any)            |
| `testing.md` full content | "Tests complete. See testing.md" |

**Integration-specific:** Compact mock API response fixtures, test data setup.

---

## Compaction Procedure (5 Steps)

### Step 1: Invoke persisting-progress-across-sessions

```
Read('.claude/skills/persisting-progress-across-sessions/SKILL.md')
```

### Step 2: Write Full Content to Progress File

Target: `.claude/.output/integrations/{workflow-id}/MANIFEST.yaml`

### Step 3: Verify Write Succeeded

```bash
cat .claude/.output/integrations/{workflow-id}/MANIFEST.yaml | grep -A 5 "phase_{N}:"
```

### Step 4: Replace Inline Content with Summary

**Before:**

```
Phase 3 (Discovery) complete. Findings:
[15,000 tokens of detailed discovery output...]
```

**After:**

```
Phase 3 (Discovery): COMPLETE
- Key patterns: existing Wiz integration, standard collector pattern
- Technologies: Go 1.24, vendor API v2.3
- Affected files: 4 files in pkg/tasks/integrations/{vendor}/
- Full details: .claude/.output/integrations/{workflow-id}/discovery.md
```

### Step 5: Verification Checklist

All must be TRUE:

- [ ] Progress file updated with FULL phase output
- [ ] Inline context contains ONLY summary (<200 tokens)
- [ ] File references point to files that EXIST
- [ ] Key decisions preserved in summary
- [ ] No code blocks or agent outputs remain inline

---

## Integration-Specific Rationalizations

| Rationalization                       | Reality                                               |
| ------------------------------------- | ----------------------------------------------------- |
| "Integration patterns are simple"     | Vendor APIs have quirks. Compact to preserve clarity. |
| "I need the full API docs in context" | Keep 2-3 key endpoints. Reference docs file.          |
| "P0 check details need to stay"       | Keep pass/fail status only. Details in progress file. |
| "The client code is small"            | Implementation logs grow. Compact after each phase.   |
| "Mock setup details are useful"       | Keep mock existence note. Details in testing.md.      |

**Response to all:** Follow the gate. No exceptions.

---

## Verification Output Template

```
Compaction Verification (Phase {N} → Phase {N+1}):

✅ Progress file updated: .claude/.output/integrations/{workflow-id}/MANIFEST.yaml
   - Phase {N} section: {line_count} lines
   - Last write: {timestamp}

✅ Context compacted:
   - Before: {before_tokens} tokens
   - After: {after_tokens} tokens
   - Reduction: {percentage}%

✅ File references valid:
   - {artifact}.md exists ({line_count} lines)
   - MANIFEST.yaml phases.{phase} section confirmed

Gate status: PASSED. Proceeding to Phase {N+1}.
```

---

## Skip Protocol (RARE)

**If considering skip**, use AskUserQuestion with risk disclosure:

```
Skipping compaction checkpoint at Phase {N} → Phase {N+1} transition.

Risks:
- Context window exhaustion in later phases
- P0 validation may miss details
- Review agents lose implementation context

Alternative: Complete compaction now (~2 minutes)

Proceed without compaction?
```

Document in MANIFEST.yaml if user approves skip.

---

## Related References

- [context-monitoring.md](context-monitoring.md) - Token measurement
- [progress-persistence.md](progress-persistence.md) - State preservation
- [emergency-abort.md](emergency-abort.md) - Abort procedures
