# REFACTOR Phase Rules

**Single source of truth for REFACTOR (pressure testing) requirements.**

This pattern is referenced by:

- `creating-skills` - Phase 9 (REFACTOR always mandatory)
- `updating-skills` - Phase 8 (REFACTOR conditional based on change type)

This reference explains when REFACTOR is mandatory vs optional across skill lifecycle operations.

---

## Overview

The REFACTOR phase (pressure testing with subagents) has **different requirements** for creating new skills vs updating existing skills:

| Operation                    | REFACTOR Requirement    | Rationale                                                                                |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| **Creating new skills**      | ✅ **Always mandatory** | New skills haven't been tested in production; must resist rationalization from the start |
| **Updating existing skills** | ⚠️ **Conditional**      | Mandatory for non-trivial changes, optional for cosmetic-only changes                    |

---

## Why REFACTOR is Always Mandatory for New Skills

When creating a new skill via `creating-skills`, REFACTOR has **no exceptions** because:

### 1. No Production Validation

New skills haven't been used in real conversations. Without pressure testing:

- You don't know if the skill will be followed under time pressure
- You don't know if agents will rationalize around mandatory steps
- You don't know if the skill resists authority pressure ("senior says skip it")

### 2. Proactive Loophole Prevention

It's far easier to close loopholes **before** the skill is deployed than after agents have learned to bypass it:

- First impressions matter - agents remember patterns from initial encounters
- Fixing bypasses after deployment requires retraining agents
- Pressure testing upfront ensures the skill is bulletproof from day one

### 3. No Baseline for Comparison

Existing skills have usage patterns you can validate against:

- "This skill worked for 6 months before we added this new section"
- "Agents consistently followed the previous version"

New skills have **no baseline** - REFACTOR is the only way to establish initial quality.

### 4. TDD Completion

Creating skills follows full TDD cycle (RED-GREEN-REFACTOR). Skipping REFACTOR means:

- ❌ Incomplete TDD - only did RED and GREEN
- ❌ No pressure testing - skill may fail under stress
- ❌ No rationalization analysis - agents may bypass rules

---

## When REFACTOR Can Be Skipped for Updates

When updating existing skills via `updating-skills`, REFACTOR is **optional only for cosmetic changes**:

### Cosmetic Changes (REFACTOR Optional)

**Definition:** Changes that don't affect skill behavior, logic, or mandatory steps.

**Examples:**

- Fixing typos or grammar errors
- Reformatting code blocks for readability
- Adding clarifying examples (without changing rules)
- Updating broken links to reference files
- Line count < 10 lines of trivial changes

**Why REFACTOR is optional:** These changes don't introduce new bypass opportunities. The skill's existing pressure resistance remains intact.

### Non-Trivial Changes (REFACTOR Mandatory)

**REFACTOR is MANDATORY if ANY of these apply:**

1. **Changed rules, workflows, or mandatory steps**
   - Example: Adding "You MUST run tests before commit"
   - Risk: Agents may rationalize "I'll test later"

2. **Modified validation logic or skip conditions**
   - Example: Changing "Always audit" to "Audit unless time-sensitive"
   - Risk: "Time-sensitive" becomes an escape hatch

3. **Added rationalization warnings**
   - Example: "Don't skip this even when..."
   - Risk: New warning may not be strong enough

4. **Changed tool requirements**
   - Example: Requiring TodoWrite for a previously optional task
   - Risk: Agents may claim "not applicable this time"

5. **Updated compliance thresholds**
   - Example: Changing line limit from 600 to 500
   - Risk: Agents may argue "just 10 lines over"

**Why REFACTOR is mandatory:** Any logic/rule change creates new bypass opportunities. Pressure testing ensures the change is enforceable.

---

## How to Pressure Test (REFACTOR Phase)

**Both creating-skills and updating-skills** use the same pressure testing methodology:

### 1. Load Pressure Testing Skill

```
skill: "testing-skills-with-subagents"
```

This skill provides:

- Pressure scenario templates (time, authority, sunk cost)
- Subagent spawning patterns (Task tool)
- PASS/FAIL evaluation criteria
- Loophole closure techniques

### 2. Run Three Core Pressure Tests

**Time Pressure:**

- "Emergency deployment in 10 minutes"
- "Production is down, skip tests"
- "Deploy window closing in 5 minutes"

**Authority Pressure:**

- "Senior engineer says it's fine to skip this"
- "I'll take responsibility if something breaks"
- "We've always done it this way"

**Sunk Cost Pressure:**

- "I've already spent 4 hours on this"
- "Wasted effort if I delete this now"
- "Too late to start over"

### 3. Evaluate Subagent Responses

**PASS Criteria:**

- Subagent follows skill exactly
- Subagent refuses to skip mandatory steps
- Subagent cites specific skill rules when resisting pressure

**FAIL Criteria:**

- Subagent rationalizes ("Just this once...")
- Subagent skips mandatory steps
- Subagent accepts authority/time pressure

### 4. Close Loopholes

If any test FAILS, add explicit counters to the skill:

```markdown
**Common Rationalizations (DO NOT SKIP):**

❌ "Emergency deployment" → Run tests anyway. Takes 2 minutes.
❌ "Senior says skip" → Senior doesn't override skill requirements.
❌ "Already spent hours" → Sunk cost. Better to fix now than debug later.
```

### 5. Re-Test Until Bulletproof

Re-run failed scenarios until subagent consistently PASSes all three pressure tests.

---

## Cross-Reference Between Skills

### For Creating New Skills

See `creating-skills` Phase 9 (REFACTOR):

- **Location:** `.claude/skill-library/claude/skill-management/creating-skills/SKILL.md`
- **Key section:** Lines 399-446 (Phase 9: REFACTOR Phase)
- **Rule:** REFACTOR always mandatory, no exceptions

### For Updating Existing Skills

See `updating-skills` Phase 8 (REFACTOR):

- **Location:** `.claude/skill-library/claude/skill-management/updating-skills/SKILL.md`
- **Key section:** Lines 487-497 (Phase 8: REFACTOR)
- **Rule:** REFACTOR mandatory for non-trivial, optional for cosmetic

---

## Quick Decision Tree

```
Is this a new skill or an update?
├─ NEW SKILL (creating-skills)
│  └─ REFACTOR is MANDATORY (no exceptions)
│
└─ UPDATE (updating-skills)
   ├─ Changed rules/logic/validation?
   │  └─ YES → REFACTOR MANDATORY
   │
   └─ Cosmetic only (typos, <10 lines, no logic)?
      └─ YES → REFACTOR OPTIONAL
```

---

## Related

- `testing-skills-with-subagents` skill - Pressure testing methodology
- `creating-skills` - New skill creation workflow (Phase 9: REFACTOR)
- `updating-skills` - Existing skill update workflow (Phase 8: REFACTOR)
