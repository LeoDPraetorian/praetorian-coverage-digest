# Compaction Gates (Feature Development)

**BLOCKING checkpoints that enforce context compaction at phase transitions to prevent context rot.**

## Overview

A **compaction gate** is a BLOCKING phase transition that requires:

1. Writing full phase outputs to progress file
2. Verifying write succeeded
3. Replacing inline context with summary (<200 tokens)
4. Completing verification checklist

**Cannot proceed past a compaction gate without completing all steps.**

Compaction gates combine two patterns:

- **Context monitoring** (token awareness)
- **Blocking checkpoint** (must complete before proceeding)

---

## Token Thresholds

| Threshold      | Tokens  | Layer           | Action Required                                            |
| -------------- | ------- | --------------- | ---------------------------------------------------------- |
| 60% (120k)     | 120,000 | Awareness       | Log warning, plan compaction at next gate                  |
| **75% (150k)** | 150,000 | **Guidance**    | **SHOULD compact - proactive compaction recommended**      |
| **80% (160k)** | 160,000 | **Guidance**    | **MUST compact - compact NOW before proceeding**           |
| **85% (170k)** | 170,000 | **Enforcement** | **BLOCKED - Hook prevents agent spawn until /compact**     |
| 95% (190k)     | 190,000 | Emergency       | Summarize everything, checkpoint, consider session handoff |

**Layered enforcement model:**

- **Guidance (75%, 80%)**: Skill tells orchestrator to compact; can be rationalized but shouldn't be
- **Enforcement (85%)**: Hook blocks Task tool; cannot be bypassed

**Token thresholds SUPPLEMENT scheduled gates, not replace them:**

- Scheduled gates: ALWAYS compact at defined phase transitions
- Token thresholds: ADDITIONALLY compact if approaching limits

If both trigger, compact ONCE with combined content.

---

## Gate Locations (Feature Development)

Compaction gates are placed after phases that generate heavy context:

| Gate       | After Phase                  | Before Phase                     | Rationale                                           |
| ---------- | ---------------------------- | -------------------------------- | --------------------------------------------------- |
| **Gate 1** | Phase 3 (Codebase Discovery) | Phase 4 (Skill Discovery)        | Discovery agents generate 10-20K tokens of findings |
| **Gate 2** | Phase 8 (Implementation)     | Phase 9 (Design Verification)    | Implementation logs, code changes accumulate        |
| **Gate 3** | Phase 13 (Testing)           | Phase 14 (Coverage Verification) | Test execution logs, multiple tester outputs        |

**These three gates are MANDATORY for all feature workflows.**

---

## Token Checks at ALL Phase Transitions

While compaction gates (1, 2, 3) are MANDATORY checkpoints, token usage should be monitored at EVERY phase transition:

### Quick Token Check (Every Transition)

At each phase boundary (1→2, 2→3, ..., 15→16), run token check:

| Result | Action                                                             |
| ------ | ------------------------------------------------------------------ |
| <75%   | Proceed to next phase                                              |
| 75-80% | SHOULD compact - proactive compaction at next boundary recommended |
| 80-85% | MUST compact - compact NOW before proceeding to next phase         |
| >85%   | BLOCKED by hook - cannot spawn agents until /compact run           |

### Token-Triggered Compaction (Non-Gate Phases)

If 75%+ at a non-gate transition (e.g., Phase 5→6, Phase 10→11):

1. Run abbreviated compaction (summarize only completed phases, keep current phase full)
2. Note in MANIFEST.yaml: `token_triggered_compaction: true`
3. Proceed to next phase

If 80%+: Use full compaction protocol even at non-gate phases.

This is LIGHTER than full gate compaction - no blocking checklist required.

---

## Intra-Phase Compaction (Heavy Phases)

Heavy phases spawn multiple agents. Without intra-phase checks, context accumulates with each spawn—especially on retries.

### Heavy Phases Requiring Pre-Spawn Checks

| Phase                           | Agents Spawned                                  | Risk                                           |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| **Phase 7** (Architecture Plan) | frontend-lead + security-lead (or backend-lead) | Design iterations accumulate                   |
| **Phase 8** (Implementation)    | Multiple developer agents in batches            | Failed agents + retries = rapid context growth |
| **Phase 13** (Testing)          | 3× tester agents in parallel                    | Test output verbosity                          |

### Pre-Spawn Enforcement Protocol

**Before EACH agent spawn in phases 7, 8, or 13:**

```
1. Check current token usage

2. Apply enforcement:

   if tokens > 85%:
     → BLOCKED by hook - cannot spawn until /compact run
     → Hook enforces this automatically

   if tokens > 80%:
     → MUST compact before spawning (full 5-step protocol)
     → Compact NOW - do not proceed without compaction

   if tokens > 75%:
     → SHOULD compact before spawning (abbreviated protocol)
     → Summarize completed work, keep current task context

   else:
     → Proceed with spawn
```

### Abbreviated Compaction (Intra-Phase)

For 75-80% within a phase, use abbreviated protocol:

1. Write current phase progress to MANIFEST.yaml
2. Summarize completed agent outputs (keep only key results)
3. Preserve current task context (what agent is about to do)
4. Do NOT run full 5-step checklist (that's for gates)

**Target:** Reduce context by 30-50% while preserving active work.

### Retry Compaction

When an agent FAILS and you're about to retry:

```
Before retry:
  1. Check tokens (may have grown from failed attempt)
  2. Summarize failed attempt: "Agent failed with: {error}. Retrying."
  3. Do NOT include full failed output in retry prompt
  4. Spawn fresh agent with clean context
```

**Why:** Failed agents often produce verbose error output. Compacting before retry prevents context pollution.

---

## Compaction Procedure (5 Steps)

### Step 1: Invoke persisting-progress-across-sessions

```
Read('.claude/skills/persisting-progress-across-sessions/SKILL.md')
```

This skill provides the Context Compaction Protocol. **You MUST read it before proceeding.**

### Step 2: Write Full Content to Progress File

**Target:** `.claude/.output/features/{id}/MANIFEST.yaml` (phases section)

Write ALL phase details including:

- Agent outputs (full content, not summaries)
- Decision logs
- File changes
- Any artifacts generated

### Step 3: Verify Write Succeeded

```bash
# Verify content was written
cat .claude/.output/features/{id}/MANIFEST.yaml | grep -A 5 "phase_{N}:"
```

**If verification fails, return to Step 2.**

### Step 4: Replace Inline Content with Summary

**Before compaction:**

```
Phase 3 (Discovery) complete. Findings:

[15,000 tokens of detailed discovery output including:
- File structure analysis
- Pattern detection across 47 files
- Technology stack identification
- Dependency mapping
- Code quality observations
- etc.]
```

**After compaction:**

```
Phase 3 (Discovery): COMPLETE
- Key patterns: {pattern_1}, {pattern_2}
- Technologies: {tech_1}, {tech_2}, {tech_3}
- Affected files: {count} files in {directory}
- Full details: .claude/.output/features/{id}/MANIFEST.yaml (phases.discovery)
```

**Target: <200 tokens per completed phase.**

### Step 5: Verification Checklist

All must be TRUE before proceeding:

- [ ] Progress file updated with FULL phase output (not summary)
- [ ] Inline context contains ONLY summary (<200 tokens)
- [ ] File references point to files that EXIST
- [ ] Key decisions preserved in summary (not just file paths)
- [ ] No detailed logs, code blocks, or agent outputs remain inline

**If ANY item unchecked, compaction is INCOMPLETE. Return to Step 2.**

---

## Feature-Specific "What to Compact" Tables

### Gate 1: After Codebase Discovery (Phase 3 → 4)

| What to Compact                             | What to Keep                                  |
| ------------------------------------------- | --------------------------------------------- |
| Full discovery findings from Explore agents | Key patterns summary (2-3 bullets)            |
| File lists with 50+ items                   | Affected directories (paths only)             |
| Pattern analysis across all files           | Technologies detected (React, TanStack, etc.) |
| Detailed code snippets from exploration     | File count and line count statistics          |
| Agent conversation history                  | Discovery file path reference                 |

**Summary template (target <200 tokens):**

```
Phase 3 (Discovery): COMPLETE
- Technologies: React 19, TanStack Query, Tailwind CSS, Vitest
- Patterns: Feature-based structure, hooks pattern, shared components
- Affected files: 12 files in src/sections/assets/, src/hooks/
- Full details: .feature-development/discovery.md
```

### Gate 2: After Implementation (Phase 8 → 9)

| What to Compact                          | What to Keep                     |
| ---------------------------------------- | -------------------------------- |
| Full implementation logs from developers | Files modified list (paths only) |
| Intermediate code states                 | Key implementation decisions     |
| Agent retry outputs                      | Deviation notes from plan        |
| Verbose error messages                   | Final status per task            |
| Build/lint output logs                   | Total tasks completed count      |

**Summary template (target <200 tokens):**

```
Phase 8 (Implementation): COMPLETE
- Files modified: 8 files (4 components, 2 hooks, 2 tests)
- Tasks completed: 6/6 (2 retries total)
- Key decisions: Used composition pattern for filters, added error boundary
- Deviations: None (all per plan)
- Full details: .feature-development/agents/frontend-developer.md
```

### Gate 3: After Testing (Phase 13 → 14)

| What to Compact               | What to Keep                    |
| ----------------------------- | ------------------------------- |
| Full test execution logs      | Pass/fail summary per test type |
| Verbose test output           | Coverage percentage             |
| Multiple tester agent outputs | Failure list (if any)           |
| Intermediate test runs        | Test count by type              |
| Debug traces from test runs   | Test file paths                 |

**Summary template (target <200 tokens):**

```
Phase 13 (Testing): COMPLETE
- Unit tests: 24/24 passed (src/components/*.test.tsx)
- Integration tests: 8/8 passed (src/hooks/*.test.ts)
- E2E tests: 5/5 passed (e2e/assets.spec.ts)
- Coverage: 87% (target: 80%)
- Full details: .feature-development/agents/frontend-tester.md
```

---

## Content Classification (Generic Guidance)

**CAN be compacted (move to progress file):**

- Completed phase outputs (keep 2-3 line summary)
- Old agent handoff details (keep key decisions only)
- Discovery findings (reference file path instead)
- Architecture rationale (keep decision, not reasoning)
- Test execution logs (keep pass/fail counts)
- Code review discussions (keep action items only)

**MUST stay in context:**

- Current phase details (full content)
- Immediate prior phase decisions (key points)
- Active blockers and their status
- Key file paths being modified
- User preferences and constraints
- Critical invariants (e.g., "must use TDD")

---

## Verification Output Template

At each compaction gate, output verification in this format:

```
Compaction Verification (Phase {N} → Phase {N+1}):

✅ Progress file updated: .claude/.output/features/{id}/MANIFEST.yaml
   - Phase {N} section: {line_count} lines
   - Last write: {timestamp}

✅ Context compacted:
   - Before: {before_tokens} tokens (full {phase_name} output)
   - After: {after_tokens} tokens (summary + file references)
   - Reduction: {percentage}%

✅ File references valid:
   - {artifact_1}.md exists ({line_count} lines)
   - MANIFEST.yaml phases.{phase} section confirmed

Gate status: PASSED. Proceeding to Phase {N+1}.
```

**Example:**

```
Compaction Verification (Phase 3 → Phase 4):

✅ Progress file updated: .claude/.output/features/2026-01-20-user-dashboard/MANIFEST.yaml
   - Phase 3 section: 487 lines
   - Last write: 2026-01-20T14:32:15Z

✅ Context compacted:
   - Before: 14,832 tokens (full discovery output)
   - After: 187 tokens (summary + file references)
   - Reduction: 98.7%

✅ File references valid:
   - discovery.md exists (324 lines)
   - MANIFEST.yaml phases.discovery section confirmed

Gate status: PASSED. Proceeding to Phase 4.
```

---

## Skip Protocol (RARE)

Compaction should almost NEVER be skipped. The ONLY valid skip is explicit user acknowledgment.

**If considering skip**, you MUST:

1. Use AskUserQuestion with risk disclosure:

```
Skipping compaction checkpoint at Phase {N} → Phase {N+1} transition.

Risks:
- Context window exhaustion in later phases
- Degraded agent performance (context rot)
- Potential workflow failure requiring restart

Alternative: Complete compaction now (~2 minutes)

Proceed without compaction?
```

2. Document skip decision in MANIFEST.yaml:

```yaml
phases:
  { phase_name }:
    status: "complete"
    compaction_skipped: true
    skip_reason: "user override"
    skip_timestamp: "2026-01-20T14:32:15Z"
```

**Cannot skip silently** - user must explicitly approve the risk.

---

## Common Rationalizations (Generic)

Agents WILL try to skip compaction. These phrases indicate rationalization:

| Rationalization                           | Reality                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| "Context is still manageable"             | You cannot see token count. Compaction is preventive, not reactive.       |
| "I'll compact later if needed"            | Later = too late. Gates prevent emergency compaction.                     |
| "The next phase won't need prior details" | False. Verification phases reference ALL prior phases.                    |
| "This is a small task, not complex"       | Size is unpredictable. Simple tasks have generated 18K+ tokens.           |
| "I'll keep it brief in summaries"         | Summaries grow. Gates enforce mechanical compaction to prevent drift.     |
| "User wants speed, not process"           | Context rot = workflow failure = slower than compaction. Gates save time. |
| "Outputs are already persisted"           | Persisted ≠ compacted from context. Both are required.                    |
| "Context seems fine"                      | Subjective assessment. Follow the gate protocol.                          |

**Response to all:** Follow the gate. No exceptions.

---

## Feature-Specific Rationalizations

| Rationalization                                      | Reality                                                             | Response                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| "Feature is small, compaction overhead not worth it" | Small features have generated 25K+ tokens from discovery alone      | DENIED. Follow gate protocol.            |
| "I'm in flow, don't want to break momentum"          | Momentum bias causes skipped steps. Gates save time via prevention. | DENIED. Compaction takes 2 minutes.      |
| "UI changes don't generate much context"             | UI components + hooks + tests + reviews = heavy context             | DENIED. All feature types require gates. |
| "Tests passed quickly, less output to compact"       | Quick tests still accumulate. Gates are mandatory, not conditional. | DENIED. Follow gate protocol.            |
| "MANIFEST is tracking everything"                    | MANIFEST persistence ≠ context compaction. Both required.           | DENIED. Compact from context to file.    |

---

## Pre-Rot Warning Signs

Monitor for these indicators that compaction is overdue:

| Warning Sign          | Indicator                                 | Action                           |
| --------------------- | ----------------------------------------- | -------------------------------- |
| Response quality drop | Vague or repetitive responses             | Immediate compaction             |
| Missed context        | Agent asks about already-discussed topics | Compaction + re-inject key facts |
| Instruction drift     | Not following established patterns        | Re-inject critical instructions  |
| Slow responses        | Noticeably longer response times          | Compaction                       |
| Hallucinated details  | Agent invents facts not in context        | Emergency compaction             |

---

## Integration

**Required Skill**: `persisting-progress-across-sessions` - MUST invoke at every compaction gate

**Progress File Location**: `.claude/.output/features/{id}/MANIFEST.yaml`

**Skip Protocol**: ONLY via explicit user approval with risk disclosure. Document in MANIFEST.yaml.
