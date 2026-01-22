# Compaction Gate Rationalization Counters

**Prevents orchestrators from skipping compaction gate procedures.**

---

## Counter 1: "File Persistence = Gate Completion"

**If you think:**
> "I wrote the discovery.md/implementation.md file, so the content is persisted. The MANIFEST.yaml is updated. That satisfies the compaction requirement."

**Reality:**
- Writing the file is **Step 2 of 5** in the compaction procedure
- You MUST also complete Steps 3-5:
  - Step 3: Replace inline context with <200 token summary
  - Step 4: Verify write succeeded
  - Step 5: Complete verification checklist
- Compaction gates are **BLOCKING** - cannot proceed without all 5 steps

**Required action:**
1. Stop at the gate (Phase 3→4, Phase 8→9, or Phase 13→14)
2. Invoke `persisting-progress-across-sessions` skill
3. Execute ALL 5 steps from compaction-gates.md
4. Verify checklist complete before proceeding to next phase

**Not even when:**
- "The files are already written" - Inline context replacement is mandatory
- "Token usage is low" - Gates enforce discipline regardless of current usage
- "This is slowing down the workflow" - Token rot prevention is non-negotiable
- "The MANIFEST has everything" - Summary replacement prevents context bloat

---

## Counter 2: "Gates Are Optional When Token Usage Is Low"

**If you think:**
> "We're only at 190k/1M tokens (19%), so I don't need to compact yet. The 75%/80% thresholds haven't been reached."

**Reality:**
- Compaction gates are **phase-based**, not token-based
- They trigger at specific phase transitions (3→4, 8→9, 13→14)
- Token thresholds (75%, 80%, 85%) determine **urgency**, not **requirement**
- Gates execute regardless of current token usage

**Required action:**
Execute compaction at the designated phase transitions, even if tokens are low.

**Not even when:**
- "We have plenty of context left" - Gates are about discipline, not just capacity
- "We can compact later if needed" - Retroactive compaction loses prior context
- "The hook will stop us at 85%" - Hook is safety net, not primary enforcement

---

## Counter 3: "Skip Protocol is Available"

**If you think:**
> "The skill says I can skip with user approval, so I'll just ask permission."

**Reality:**
- Skip protocol is for **RARE** emergencies, not routine workflow
- Line 171 says: "**If considering skip**, use AskUserQuestion with **risk disclosure**"
- You must present the risks BEFORE asking for skip approval
- Default assumption is: **execute the gate**

**Required action:**
1. ALWAYS attempt to execute the gate first
2. ONLY use skip protocol if gate execution FAILS (technical issue, missing dependencies)
3. If asking to skip, include full risk disclosure from compaction-gates.md line 177-185

**Not even when:**
- "This will save time" - Compaction takes 2 minutes, prevents hours of context loss
- "User is waiting" - Quality gates protect the user from broken workflows
- "I've done most of the work" - Partial completion isn't completion

---

## Verification Commands

After compaction, verify all 5 steps completed:

```bash
# Step 2: File exists
test -f .claude/.output/integrations/{workflow-id}/discovery.md && echo "✅ File written"

# Step 3: Context replaced (manual check - inline content should be <200 tokens)
# Verify conversation shows summary, not full content

# Step 4: Write verification
cat .claude/.output/integrations/{workflow-id}/MANIFEST.yaml | grep -A 5 "3_codebase_discovery:" && echo "✅ MANIFEST updated"

# Step 5: Checklist (from compaction-gates.md lines 123-129)
# - [ ] Progress file updated with FULL phase output
# - [ ] Inline context contains ONLY summary (<200 tokens)
# - [ ] File references point to files that EXIST
# - [ ] Key decisions preserved in summary
# - [ ] No code blocks or agent outputs remain inline
```

---

## Escalation: When Counter Doesn't Work

If orchestrator still skips gates after counter is added:

1. **Strengthen trigger** - Make "If you think" more specific to actual rationalization
2. **Add explicit checklist** - Gate checklist in main SKILL.md before phase transition
3. **Move to EXTREMELY-IMPORTANT block** - Elevate counter visibility
4. **Consider hook update** - Lower hook threshold to catch earlier

**Ultimate enforcement:** Hook blocks at 85% tokens, but skill discipline should prevent reaching that point.
