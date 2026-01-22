# Workflow Handoff Protocol

**Integrating child skills (brainstorming, writing-plans) with feature development workflow.**

## Overview

Feature development invokes other skills at specific phases:

- Phase 6: `brainstorming` skill (LARGE features only)
- Phase 7: `writing-plans` skill
- Phase 16: `finishing-a-development-branch` skill

These child workflows must integrate smoothly without creating orphaned sub-workflows.

## Detection Protocol

**Step 1: Check for Parent Workflow**

```javascript
// Check if TodoWrite has active feature development items
if (TodoWrite.exists() && TodoWrite.hasPhaseItems("orchestrating-feature-development")) {
  // Parent workflow exists - integrate
  parent_workflow = true;
} else {
  // No parent - standalone invocation
  parent_workflow = false;
}
```

**Step 2: Integrate or Initialize**

| Scenario      | Action                                                |
| ------------- | ----------------------------------------------------- |
| Parent exists | Update parent's todo status, return structured output |
| No parent     | Create own TodoWrite tracking                         |

## Structured Output Format

When child workflow completes, return:

```json
{
  "status": "complete",
  "workflow_type": "brainstorming",
  "outputs": [".feature-development/brainstorm-notes.md"],
  "next_steps": ["Continue to Phase 7 (Architecture Plan)"],
  "signal": "WORKFLOW_CONTINUATION_REQUIRED"
}
```

**Critical:** Include `WORKFLOW_CONTINUATION_REQUIRED` signal so orchestrator knows to resume.

## Parent Workflow Continuation

Feature orchestrator must:

1. **Receive** structured output with continuation signal
2. **Check TodoWrite** for remaining pending phases
3. **Resume** at next pending phase (don't stop or ask permission)

### Anti-Pattern (WRONG)

```
brainstorming skill completes
→ "Design refined! Key decisions: ..."
→ STOPS and waits for user ❌
```

### Correct Pattern

```
brainstorming completes with WORKFLOW_CONTINUATION_REQUIRED
→ Check TodoWrite
→ See "Phase 7: Architecture Plan" is pending
→ Automatically proceed to Phase 7
→ ... continue through remaining phases
→ "Feature complete" ✅
```

## Feature Development Handoff Points

| Phase | Child Skill                      | Returns                  | Next Phase |
| ----- | -------------------------------- | ------------------------ | ---------- |
| 6     | `brainstorming`                  | Refined design spec      | Phase 7    |
| 7     | `writing-plans`                  | Implementation tasks     | Phase 8    |
| 16    | `finishing-a-development-branch` | PR URL or cleanup status | Done       |

## State Preservation

**Parent (orchestrator) preserves:**

- MANIFEST.yaml with phase status
- TodoWrite items for all phases
- Progress file (.feature-development/progress.md)

**Child skill preserves:**

- Output artifacts in .feature-development/
- Metadata for traceability

## Example: Brainstorming Integration

```
Phase 5: Complexity ✅
Phase 6: Brainstorming (invoke brainstorming skill)
  → brainstorming refines design with user
  → saves refined spec to .feature-development/
  → returns {signal: "WORKFLOW_CONTINUATION_REQUIRED"}
Phase 7: Architecture Plan (parent resumes HERE) ← automatic
Phase 8: Implementation
...
Phase 16: Completion
```

## Example: Plan Writing Integration

```
Phase 6: Brainstorming ✅
Phase 7: Architecture Plan (invoke writing-plans skill)
  → writing-plans creates detailed implementation tasks
  → saves to .feature-development/plan.md
  → returns {signal: "WORKFLOW_CONTINUATION_REQUIRED"}
Phase 8: Implementation (parent resumes HERE) ← automatic
```

## Related References

- [Phase 6: Brainstorming](phase-6-brainstorming.md) - Design refinement
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Planning phase
- [Phase 16: Completion](phase-16-completion.md) - Branch finalization
- [Progress Persistence](progress-persistence.md) - State tracking
