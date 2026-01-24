# Compaction Gate Counters

**Anti-rationalization counters for compaction gate compliance in feature development workflows.**

<EXTREMELY-IMPORTANT>
These counters address observed failures where agents bypassed compaction gates despite explicit BLOCKING requirements.

You MUST read this file BEFORE proceeding past ANY phase transition, especially gates at Phase 3→4, 8→9, and 13→14.
</EXTREMELY-IMPORTANT>

---

## Phase Transition Momentum Bias Counter

**If you think:** "Phase N complete. Let me create Phase N+1 tasks and spawn developers."

**Reality:** Phase completion does NOT mean immediate progression. Every phase transition MUST include a gate check. Compaction gates at Phase 3→4, 8→9, and 13→14 are BLOCKING - you cannot proceed without executing the 5-step compaction protocol.

**Required action:**
1. STOP after completing any phase
2. CHECK: Is this transition a compaction gate? (3→4, 8→9, 13→14)
3. If YES: Execute 5-step compaction protocol BEFORE any other action
4. If NO: Check token usage anyway (>75% = should compact, >80% = must compact)
5. ONLY THEN create next phase tasks

**Not even when:**
- "User said proceed" → Gate check comes first
- "Tasks are completing smoothly" → Momentum bias is the trap
- "Context seems manageable" → You cannot assess token usage subjectively
- "I'll compact later if needed" → "Later" has ~5% completion rate

---

## Outputs Already Persisted Counter

**If you think:** "I wrote output files, so the compaction gate is satisfied."

**Reality:** Writing phase output files (discovery.md, architecture.md, etc.) is NOT the same as completing compaction protocol. Compaction requires:
1. Invoke `persisting-progress-across-sessions` skill
2. Write to MANIFEST.yaml phases section (separate from output files)
3. Replace INLINE context with file references (<200 tokens per phase)
4. Verify compaction succeeded

**Required action:** Execute ALL steps of compaction protocol, not just file creation.

**Not even when:**
- "Files exist in output directory" → That's phase output, not compaction
- "MANIFEST.yaml is updated" → MANIFEST updates ≠ context compaction

---

## Context Seems Fine Counter

**If you think:** "Context seems fine, no need to compact."

**Reality:** You cannot subjectively assess context health. Token usage is not visible to you. Compaction gates are MANDATORY at defined transitions regardless of perceived context state.

**Required action:** Follow gate protocol. No subjective assessments.

**Not even when:**
- "Responses are still coherent" → Context rot is invisible until catastrophic
- "I can still recall earlier details" → Recall ≠ context health

---

## Quick Phase Transition Counter

**If you think:** "This is a quick transition, no need for full gate check."

**Reality:** There is no such thing as a "quick" phase transition at gate boundaries. Gates 1, 2, and 3 are BLOCKING checkpoints. The 5-step protocol takes ~2 minutes. Skipping saves 2 minutes but risks workflow failure.

**Required action:** Complete full 5-step compaction protocol at all gates.

---

## Resume Workflow Counter

**If you think:** "Resuming feature workflow. Let me continue from where we left off."

**Reality:** Resuming a workflow requires the SAME gate checks as starting fresh. If you're resuming at a phase transition, check if it's a gate. Phase 3→4, 8→9, 13→14 are gates REGARDLESS of whether this is a new session or continuation.

**Required action:**
1. Read MANIFEST.yaml to determine current phase
2. Determine if current transition is a compaction gate
3. If at gate: Execute compaction protocol BEFORE proceeding
4. THEN continue with next phase

---

## Verification Checklist

Before proceeding past Phase 3, 8, or 13, verify:

- [ ] I have identified this is a compaction gate
- [ ] I have read `persisting-progress-across-sessions` skill
- [ ] I have written full phase output to MANIFEST.yaml
- [ ] I have verified the write succeeded
- [ ] I have replaced inline context with summary (<200 tokens)
- [ ] I have completed the verification checklist

**If ANY item is unchecked, compaction is INCOMPLETE. Do not proceed.**

---

## Counter Registry

| Date | Pattern | Incident | Verified |
|------|---------|----------|----------|
| 2026-01-23 | Phase Transition Momentum Bias | Resumed /feature, completed Phase 3b, immediately created Phase 4 tasks without gate check | ❌ |
| 2026-01-19 | Outputs Already Persisted | /integration extrahop - wrote output files, skipped compaction protocol | ❌ |
| 2026-01-19 | Momentum Bias + Context Seems Fine | /feature integrations-refactor - completed PR 1, spawned PR 2 without compaction | ❌ |
