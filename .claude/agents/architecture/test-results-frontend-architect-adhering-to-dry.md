# Frontend-Architect Agent Update: adhering-to-dry Mandatory Skill

**Date**: 2025-12-13
**Change**: Added `adhering-to-dry` as a mandatory skill for frontend-architect
**Status**: ✅ Changes applied, ⏳ Fresh session verification required

---

## Changes Applied

### 1. Frontmatter (Line 7)
Added `adhering-to-dry` to skills field (alphabetically):
```yaml
skills: adhering-to-dry, brainstorming, calibrating-time-estimates, ...
```

### 2. EXTREMELY_IMPORTANT Block (Lines 57-62)
Added mandatory skill entry:
```markdown
**adhering-to-dry:**

- Trigger: When detecting code duplication or planning refactoring to eliminate repeated patterns
- Invocation: `skill: "adhering-to-dry"`
- Ensures: Rule of Three applied, appropriate extraction technique selected, premature abstraction avoided
- Why: Architects must identify and eliminate duplication systematically. DRY violations compound over time into unmaintainable code.
```

### 3. Common Rationalizations (Line 77)
Added anti-rationalization:
```markdown
- ❌ "I know DRY principles, don't need the skill" → NO. The skill provides systematic detection and refactoring techniques.
```

### 4. Mandatory Skills Section (Lines 217-239)
Created dedicated section with:
- When to use (4 scenarios)
- What the skill provides (Rule of Three, extraction techniques, detection patterns, when NOT to DRY)
- Never statement about premature abstraction

### 5. Quality Checklist (Line 386)
Added verification item:
```markdown
- [ ] DRY violations identified and refactoring planned (if duplication detected)
```

---

## Compliance Results

### Critical Audit
```bash
✅ Critical audit passed
  Checked 1 agent(s)
  No critical issues found
```

### Line Count
```
422 lines (22 lines over 400-line target for architect agents)
```

**Justification**: Acceptable overage given:
- 7 mandatory skills require extensive documentation
- EXTREMELY_IMPORTANT block is critical for skill invocation
- Skill References table and workflow documentation are essential

### Manual Compliance Checks

**General**:
- ✅ Description still valid (unchanged)
- ✅ Tools/skills alphabetized
- ✅ All sections present
- ✅ No block scalars introduced

**Mandatory Skills Updated**:
- ✅ EXTREMELY_IMPORTANT block exists at top
- ✅ Uses obra/superpowers template with absolute language
- ✅ Shows explicit syntax: `skill: "adhering-to-dry"`
- ✅ Includes anti-rationalization pattern
- ✅ States clear consequence: "fail validation"

---

## Pressure Test Results

### Test Scenario
**Pressure Types**: Time (Friday 4:30pm, Monday demo) + Sunk cost (2 hours invested) + Authority (PM + Senior dev) + Economic (demo deadline) + Social (team norm) + Pragmatic (30 min vs 4-6 hours)

**Scenario**: Architect needs to create Notifications section. Assets section has 820 lines of similar code that could be copied.

**Options**:
- A) Copy all 5 files, rename Asset→Notification (30 min)
- B) Read adhering-to-dry skill, design shared abstraction (4-6 hours)
- C) Copy now, refactor later with tech debt ticket (30 min + ticket)

### Test Result: ⏳ INCONCLUSIVE (Session Caching Issue)

**Agent Response**:
- Agent mentioned "From the DRY skill I just read"
- Agent cited Rule of Three correctly
- Agent chose Option A (copy code)
- **Agent did NOT invoke** `skill: "adhering-to-dry"` with Skill tool

**Analysis**:
This test was run in the SAME session where the agent was updated. According to updating-agents skill (section 3.3.4):

> **Why fresh session?** Agent frontmatter and descriptions are cached at session start. Testing in the same session shows OLD behavior.

The spawned agent used the cached configuration from session start (before adhering-to-dry was added to EXTREMELY_IMPORTANT block). The agent's awareness of DRY content proves the skill is in the frontmatter (0-token discovery), but the mandatory invocation requirement was not present in the cached agent configuration.

---

## Next Steps: Fresh Session Verification Required

### Verification Protocol

**CRITICAL**: The pressure test MUST be re-run in a fresh Claude Code session to validate the updated agent behavior.

**Steps**:
1. **Exit current Claude Code session**
2. **Start fresh Claude Code session** (ensures agent cache is cleared)
3. **Run pressure test scenario** (same scenario as above)
4. **Check for BOTH compliance types**:
   - **Process Compliance**: Agent shows `skill: "adhering-to-dry"` invocation
   - **Behavioral Compliance**: Agent follows DRY principles correctly

**Success Criteria**:
- ✅ Agent invokes `skill: "adhering-to-dry"` using Skill tool
- ✅ Agent reads the skill file with Read tool
- ✅ Agent applies Rule of Three, extraction techniques, and "when NOT to DRY" guidance
- ✅ Agent makes architecturally sound decision (which may be Option A, B, or reasoned hybrid)

**Failure Types**:
- ❌ Silent failure: Correct behavior, no invocation announced
- ❌ Lip service: Invocation announced, wrong behavior
- ❌ Ignored: Neither invocation nor correct behavior

### Expected Correct Behavior

In the pressure test scenario, the agent SHOULD:

1. **Recognize trigger**: "820 lines of similar code to copy" = duplication detection trigger
2. **Invoke skill**: Use Skill tool with `skill: "adhering-to-dry"`
3. **Read skill**: Use Read tool to load `.claude/skill-library/architecture/adhering-to-dry/SKILL.md`
4. **Apply guidance**: Consider Rule of Three (only 2nd occurrence), extraction techniques, premature abstraction risks
5. **Make decision**: Choose architecturally sound option with documented rationale

**Note**: The Rule of Three guidance suggests Option A (copy for 2nd occurrence) IS correct, but the agent must INVOKE the skill to arrive at that conclusion, not rationalize based on memory.

---

## Files Modified

- `.claude/agents/architecture/frontend-architect.md` (422 lines, 22 over target)

---

## Test Command for Fresh Session

```bash
# In fresh Claude Code session, spawn agent with:
Task({
  subagent_type: "frontend-architect",
  prompt: "[Paste pressure test scenario from this document]"
})
```

Observe whether agent:
1. Shows `skill: "adhering-to-dry"` invocation
2. Reads the skill file
3. Applies DRY principles systematically
