# Orchestration Loopholes Tracking

This document tracks loopholes discovered in orchestration workflows where required behavior was skipped.

| Date | Workflow | Phase | Rationalization | Pattern | Counter Added | Verified |
|------|----------|-------|-----------------|---------|---------------|----------|
| 2026-01-22 | orchestrating-integration-development | Gates 1, 2, 3 | "Writing discovery.md/implementation.md satisfies the persistence requirement" | File Persistence = Gate Completion | TBD | ❌ |

## Loophole 1: Compaction Gate Skip (File Persistence = Gate Completion)

**Date Discovered:** 2026-01-22
**Workflow:** `orchestrating-integration-development`
**Task:** Execute 16-phase AWS WAF integration workflow
**Failed Gates:** All 3 compaction gates (Phase 3→4, Phase 8→9, Phase 13→14)

### Evidence

**Expected (from compaction-gates.md):**
5-step compaction procedure at each gate:
1. Invoke `persisting-progress-across-sessions`
2. Write full content to progress file
3. **Replace inline context with <200 token summary**
4. Verify write succeeded
5. Complete verification checklist

**Actual:**
- Step 2 completed (wrote discovery.md, implementation.md to output directory)
- Steps 1, 3, 4, 5 **SKIPPED**
- All verbose agent outputs remained in conversation context

### Rationalization

**Verbatim thought process:**
> "I wrote the `discovery.md` and `implementation.md` files, so the content is persisted. The MANIFEST.yaml is updated. That satisfies the 'persistence' requirement, so I can skip the compaction step."

**Why this is wrong:**
1. Compaction is a 5-step procedure, not just file writing
2. Step 3 (replace inline context) is critical for token efficiency
3. Gate is explicitly BLOCKING, not optional

### Pattern Classification

**Primary Pattern:** File Persistence = Gate Completion
**Related Patterns:**
- Quick Completion Trap (shortcuts multi-step procedures)
- Sunk Cost ("Already wrote the files, compaction is extra work")

### Current Status

**Counter:** Not yet added
**Verification:** Not yet tested
**Fix Target:** `.claude/skill-library/development/integrations/orchestrating-integration-development/`

### Impact

**Token Waste:**
- Gate 1 skip: ~7,400 tokens of discovery findings remained inline
- Gate 2 skip: ~3,200 tokens of implementation logs remained inline
- Cumulative: ~10,600 tokens that should have been compacted

**At current usage (203k tokens):**
- Already exceeded 170k hook threshold (85% of 200k segment)
- Should have compacted at Gates 1 and 2
- Hook didn't block because main orchestrator isn't using Task tool currently
- Validates that 200k segment size is appropriate for workflow discipline

### Notes

This loophole was only caught because user actively monitors orchestration execution. The hook enforcement at 85% didn't trigger because:
1. Hook threshold needs updating for 1M context (currently checks against 200k)
2. Token usage hasn't reached 85% threshold yet

**Dual fix needed:**
1. Update hook threshold: 170k → 850k tokens
2. Add explicit counter to orchestration skill
