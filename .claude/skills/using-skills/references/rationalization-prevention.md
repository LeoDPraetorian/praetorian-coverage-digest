# Rationalization Prevention

Shared reference for preventing agent rationalizations across all orchestration workflows.

## Why This Exists

Agents rationalize skipping steps. They generate plausible-sounding reasons to bypass gates, skip research, or shortcut workflows. This document provides:

1. **Statistical evidence** - Hard numbers that counter "it'll be fine" thinking
2. **Phrase detection** - Warning signs that rationalization is occurring
3. **Override protocol** - The ONLY valid way to bypass a gate
4. **Cross-workflow rationalizations** - Common bypasses that apply everywhere

---

## Statistical Evidence

These numbers come from observed failure patterns. Use them to counter rationalization.

| Metric                            | Value | Implication                                    |
| --------------------------------- | ----- | ---------------------------------------------- |
| Technical debt fix rate           | ~10%  | "I'll fix it later" means it won't get fixed   |
| "Later" completion rate           | ~5%   | Deferred work has 95% abandonment rate         |
| "Simple" tasks that were complex  | ~40%  | Simplicity estimates are wrong 40% of the time |
| Post-merge refactoring completion | ~8%   | "Refactor after merging" = never refactored    |
| Skipped test follow-up rate       | ~12%  | "Add tests later" = no tests                   |
| Override follow-up completion     | ~10%  | Overridden gates stay overridden               |
| "Emergency" requests that weren't | ~70%  | Most urgency is artificial                     |

**Key insight**: Anything deferred has ~10% completion rate. Complete it now or accept it won't happen.

---

## Phrase Detection Patterns

**When you see these phrases in your thinking, STOP. You are rationalizing.**

### Deferral Phrases

- "I'll fix it later"
- "Let's come back to this"
- "We can add that after"
- "TODO for next iteration"
- "Post-merge cleanup"

### Minimization Phrases

- "This is probably optional"
- "Close enough"
- "Good enough for now"
- "Minor detail"
- "Edge case we can ignore"

### False Confidence Phrases

- "I'm confident about..."
- "I know this well"
- "This is straightforward"
- "Simple case"
- "Obviously..."

### Exception Phrases

- "Just this once"
- "This is a special case"
- "Unique situation"
- "Doesn't apply here"
- "Exception to the rule"

### Pressure Phrases

- "The user wants it fast"
- "No time for..."
- "Ship now, iterate later"
- "MVP first"
- "Time pressure"

### Blame Shift Phrases

- "User said to skip"
- "Reviewer will catch it"
- "Tests will find issues"
- "Someone else can..."

**Response when detected**: Return to the gate checklist. Complete all items. Do not proceed until done.

---

## Override Protocol

The ONLY valid gate override requires ALL of the following:

### Step 1: Use AskUserQuestion with Risk Disclosure

**Template**:

```
{Gate name} has not passed. This gate prevents:
- {Risk 1}
- {Risk 2}
- {Risk 3}

Proceeding without completing this gate will likely result in:
- {Consequence 1}
- {Consequence 2}

{Alternative approach if available, or "No alternative available."}

Do you want to proceed anyway?

Options:
- No, let me complete the requirements (RECOMMENDED)
- Yes, I accept the risks and will address issues later
```

### Step 2: Document User Response Verbatim

Record exactly what the user selected, not a paraphrase.

### Step 3: Update Four Artifacts

1. **PR Description** - "Gate Override" section with reason and risks
2. **CHANGELOG** - Entry documenting the override
3. **metadata.json / MANIFEST.yaml** - `status: overridden` with details
4. **Code comments** (if applicable) - Note in the implementation

### Step 4: Mark Todo as OVERRIDDEN

```
Phase X: {description} - OVERRIDDEN (user acknowledged risks)
```

NOT "completed" (it's not complete) or "blocked" (it's not blocked).

### Invalid Override Scenarios

These are NOT valid reasons to override:

| Scenario                          | Why Invalid                                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| Time pressure alone               | All work has time pressure. Gates prevent costly rework.               |
| Agent confidence                  | Gates apply regardless of experience. Edge cases exist.                |
| Partial completion (4/5 items)    | Gates are all-or-nothing. Missing items cause failures.                |
| Implied permission ("just do it") | Must use formal AskUserQuestion with explicit risk disclosure.         |
| User unavailable                  | Block until user is available. Cannot override without acknowledgment. |

---

## Cross-Workflow Rationalizations

These rationalizations apply to ALL orchestration workflows:

| Rationalization                           | Why It's Wrong                                                      | Response                                       |
| ----------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| "The gate is too strict"                  | Gate exists because past work failed without it                     | DENIED. Gates encode lessons from failures.    |
| "Just this once"                          | "Just this once" is how every bad pattern starts                    | DENIED. No exceptions.                         |
| "User said to skip"                       | Casual instruction doesn't override workflow                        | DENIED. Use formal override protocol.          |
| "Experienced developer, don't need gates" | Gates catch errors regardless of experience                         | DENIED. Gates apply to everyone.               |
| "Time pressure, ship now iterate later"   | Technical debt has ~10% fix rate                                    | DENIED. Complete now or it won't be completed. |
| "This is a special case"                  | All cases feel special. Gates exist because "special" cases failed. | DENIED. No exceptions.                         |
| "4 out of 5 is close enough"              | Gates are all-or-nothing                                            | DENIED. Complete all items.                    |
| "I'll just use individual skills"         | You'll skip gates. Orchestrator enforces them.                      | DENIED. Use orchestrator as entry point.       |
| "Orchestrator is overhead"                | Overhead prevents 10x rework                                        | DENIED. Overhead is intentional.               |
| "I know the workflow"                     | Knowing != Following. Orchestrator ensures adherence.               | DENIED. Use orchestrator.                      |

---

## Domain-Specific Extensions

Each orchestration skill should have its own `references/rationalization-table.md` with domain-specific rationalizations. This shared file provides the foundation; domain files add specifics.

**Pattern for domain-specific tables**:

```markdown
# {Domain} Rationalization Table

Extends [shared rationalization prevention](../../using-skills/references/rationalization-prevention.md).

## Phase-Specific Rationalizations

### Phase N: {Phase Name}

| Rationalization            | Why It's Wrong    | Response                           |
| -------------------------- | ----------------- | ---------------------------------- |
| "{domain-specific excuse}" | {factual counter} | DENIED/NOT ACCEPTED/ACCEPTED IF... |
```

---

## Applying This Reference

### For Orchestrators

1. Include "Rationalization Prevention" section in SKILL.md
2. Reference this shared file
3. Create domain-specific `references/rationalization-table.md`
4. Add gate checklists with explicit pass/fail criteria

### For Agents

1. Check for phrase patterns before claiming completion
2. Use gate checklists, not intuition
3. Follow override protocol if legitimately needed
4. Document evidence for each gate item

### For Reviews

When reviewing agent output, check:

- Did agent complete ALL gate items (not 4/5)?
- Any rationalization phrases in reasoning?
- If overridden, was protocol followed?
- Are follow-up items documented?

---

## Summary

**Gates prevent known failure modes.**

**Rationalizations sound reasonable but lead to failures.**

**Statistical reality**: Deferred work has ~10% completion rate.

**When in doubt**: Complete the gate. Don't rationalize.

**If override truly needed**: Follow the full protocol with user acknowledgment.
