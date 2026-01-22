# Phase 3: Root Cause Investigation

**Purpose:** Systematically investigate bug candidates to identify the root cause with evidence.

## Agent Selection

**Agent:** `debugger`

This is a specialized agent optimized for debugging workflows. See `.claude/agents/analysis/debugger.md` for definition.

## Required Skills

The debugger agent MUST invoke these skills before completing:

1. `debugging-systematically` - Four-phase debugging framework
2. `tracing-root-causes` - Backward tracing from symptoms to source

## Inputs

From Phase 1-2:

- `candidate-locations.md` - Potential bug locations with confidence scores
- `bug-symptoms.md` - Original user report
- `bug-scoping-report.json` - Symptom analysis and grep results

**OR** if location known:

- Direct file:line from error stack trace
- Specific component/function name from symptoms

## Agent Prompt Pattern

```
You are investigating a bug for the orchestrating-bugfix workflow.

**Bug Description:**
[Paste bug-symptoms.md content]

**Candidate Locations:**
[Paste candidate-locations.md content OR specific location]

**Your Task:**
Use debugging-systematically and tracing-root-causes to:
1. Form hypotheses about why the bug occurs
2. Investigate code at candidate locations
3. Trace backward from symptom to root cause
4. Provide evidence (file:line references)
5. Recommend minimal fix

**OUTPUT_DIR:** [from Phase 0]

**MANDATORY SKILLS (invoke ALL before completing):**
- debugging-systematically: Four-phase debugging framework
- tracing-root-causes: Backward tracing methodology

**Output Format:**
Write root-cause-report.md with:
- Root cause description
- Evidence (file:line)
- Minimal fix recommendation
- Affected tests
- Verdict (confirmed/inconclusive)
```

## Investigation Method

The debugger agent follows this systematic approach:

### 1. Hypothesis Formation

Generate hypotheses ranked by likelihood:

**Example:**

```markdown
# Hypotheses (Ranked)

## H1: Missing null check before regex test

- Probability: High (80%)
- Evidence needed: Check validateEmail() implementation
- Test: Does email field accept empty strings?

## H2: Incorrect regex pattern

- Probability: Medium (40%)
- Evidence needed: Verify email regex
- Test: What strings does regex reject?

## H3: Server-side validation mismatch

- Probability: Low (20%)
- Evidence needed: Compare client/server validation
- Test: Does server have different validation rules?
```

### 2. Evidence Gathering

For each hypothesis (starting with highest probability):

**Read code at candidate locations:**

```
Read("src/components/LoginForm.tsx")
```

**Search for related patterns:**

```
Grep(pattern: "validateEmail", output_mode: "content")
```

**Trace data flow:**

- Where does email value come from?
- What transformations applied?
- Where is ValidationError thrown?

### 3. Root Cause Identification

When evidence confirms hypothesis:

**Document in root-cause-report.md:**

````markdown
# Root Cause Report

## Verdict: Confirmed

## Root Cause

The validateEmail() function in LoginForm.tsx:123 calls regex.test(email) without checking if email is null or undefined. When the form field is empty, email is undefined, and regex.test(undefined) throws "Cannot read property 'test' of undefined".

## Evidence

### Location: src/components/LoginForm.tsx:123-127

```typescript
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email); // ❌ No null check
}
```
````

**Stack trace confirms:**

- ValidationError thrown from LoginForm.tsx:125
- Triggered by onBlur event handler
- Occurs when field value is empty string or undefined

## Minimal Fix

Add null check before regex test:

```typescript
function validateEmail(email) {
  if (!email) return false; // ✅ Handle null/undefined/empty
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

## Affected Tests

Tests that should cover this fix:

- `LoginForm.test.tsx` - Add test for empty email validation
- `LoginForm.test.tsx` - Add test for undefined email validation

## Confidence: 95%

Evidence is strong:

- Error message matches code location
- Stack trace confirms call path
- Null check fix directly addresses symptom

````

### 4. Inconclusive Investigation

If hypothesis not confirmed:

**Document next steps:**
```markdown
# Root Cause Report

## Verdict: Inconclusive (Attempt 1/3)

## Investigation Summary

Tested H1 (missing null check) but evidence contradicts:
- validateEmail() DOES have null check (line 120)
- Error must be occurring elsewhere in call chain

## Next Hypothesis to Test

H2: Error thrown from upstream caller
- Check onBlur handler in LoginForm component
- Trace how email value passed to validateEmail()

## Next Step

Investigate LoginForm component line 85-90 (onBlur handler)
````

## Output Format

The debugger agent must write `root-cause-report.md` with these sections:

### Required Sections

1. **Verdict:** confirmed | inconclusive
2. **Root Cause:** (if confirmed) Clear description of WHY bug occurs
3. **Evidence:** file:line references with code snippets
4. **Minimal Fix:** Specific code change needed (if confirmed)
5. **Affected Tests:** Tests that should cover the fix (if confirmed)
6. **Next Step:** (if inconclusive) What to investigate next

### Example Report (Confirmed)

See example in "Root Cause Identification" section above.

### Example Report (Inconclusive)

See example in "Inconclusive Investigation" section above.

## Decision Logic

After debugger agent returns:

**IF verdict = confirmed:**

- ✅ Proceed to Phase 4 (Implementation)
- Pass root-cause-report.md to developer agent

**IF verdict = inconclusive:**

- Re-spawn debugger agent with next_step from report
- Maximum 3 attempts
- If still inconclusive after 3 attempts → Ask user for help

**IF 3 attempts inconclusive:**

- STOP workflow
- Ask user via AskUserQuestion:

  ```
  After 3 investigation attempts, root cause remains unclear.

  Options:
  - Provide more details about when bug occurs
  - Show full error message/stack trace
  - Identify suspected code area
  - Escalate to orchestrating-feature-development (for complex bugs)
  ```

## Re-investigation Pattern

When re-spawning debugger after inconclusive result:

```
You are continuing investigation (Attempt 2/3) of a bug.

**Previous Investigation:**
[Paste previous root-cause-report.md]

**Next Step:**
[Paste next_step from previous report]

Continue from where the previous attempt left off. DO NOT re-investigate already-tested hypotheses.

[Rest of prompt same as initial investigation]
```

## Common Patterns

### Pattern: Hypothesis Confirmed Quickly

**Scenario:** Error message points directly to bug location
**Result:** Single investigation attempt, high confidence
**Duration:** 5-10 minutes

### Pattern: Multiple Hypotheses

**Scenario:** Several plausible causes, need systematic elimination
**Result:** 2-3 investigation attempts, medium confidence
**Duration:** 15-25 minutes

### Pattern: Unclear Symptoms

**Scenario:** Generic error, no clear starting point
**Result:** 3 attempts, may need user clarification
**Duration:** 30-40 minutes

## Common Issues

### Issue: Debugger skips systematic approach

**Symptom:** Jumps to fix without forming hypotheses

**Prevention:** Prompt explicitly requires debugging-systematically skill invocation

**Detection:** Check root-cause-report.md for hypothesis section

### Issue: Insufficient evidence

**Symptom:** Root cause claimed without file:line references

**Prevention:** Prompt requires evidence section with code snippets

**Detection:** Verify evidence section has specific line numbers

### Issue: Premature confidence

**Symptom:** Verdict "confirmed" but fix is speculative

**Prevention:** Require stack trace or error message match

**Detection:** Challenge: "How do you know this is the root cause?"

## Next Phase

Proceed to [Phase 4: Implementation](phase-4-implementation.md) with root-cause-report.md

## Related Skills

- `debugging-systematically` - Four-phase debugging framework (root cause → pattern → hypothesis → implementation)
- `tracing-root-causes` - Backward tracing from symptoms to source
- `dispatching-parallel-agents` - Parallel investigation if multiple independent candidates
