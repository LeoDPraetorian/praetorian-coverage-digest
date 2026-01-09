# Phase 5.5: Plan Completion Review

**Verify all plan requirements were implemented BEFORE code review.**

## Purpose

Catch missing requirements before Phase 6 (Code Review), where they're harder to identify among quality issues.

**Problem**: Code reviewers focus on "how well is it built?" Missing requirements ("was everything built?") get lost in the noise.

**Solution**: Dedicated verification step that asks ONLY "did we implement everything?"

## When to Run

**Mandatory checkpoint** between Phase 5 (Implementation) and Phase 6 (Code Review):

```
Phase 5: Implementation
        ↓
Phase 5.5: Plan Completion Review ← YOU ARE HERE
        ↓
Phase 6: Code Review
```

## Workflow

### Step 1: Generate Requirements Checklist

Read plan.md and extract ALL requirements into a checklist:

```markdown
# Requirements Checklist for {feature-name}

| # | Requirement | Implemented | Evidence | Notes |
|---|-------------|-------------|----------|-------|
| 1 | Add filter dropdown to AssetList | ? | ? | |
| 2 | Implement filter state with Zustand | ? | ? | |
| 3 | Add filter API endpoint | ? | ? | |
| 4 | Write unit tests for filter logic | ? | ? | |
| 5 | Write E2E test for filter workflow | ? | ? | |
```

**IMPORTANT**: Extract requirements from plan.md at TASK level, not just section headers.

### Step 2: Cross-Reference Implementation

For EACH requirement:

#### 2a. Search Codebase

Use Grep to find implementation:

```bash
# Example for requirement "Add filter dropdown"
grep -r "filter.*dropdown" modules/chariot/ui/src --include="*.tsx"
grep -r "FilterDropdown" modules/chariot/ui/src --include="*.tsx"
```

#### 2b. Verify Test Exists

Search test files:

```bash
# Example
grep -r "filter.*dropdown" modules/chariot/ui/src --include="*.test.tsx"
grep -r "FilterDropdown" modules/chariot/ui/src --include="*.test.tsx"
```

#### 2c. Mark Status

Update checklist:

```markdown
| # | Requirement | Implemented | Evidence | Notes |
|---|-------------|-------------|----------|-------|
| 1 | Add filter dropdown | ✓ | AssetList.tsx:45-67 | Component created |
| 2 | Implement filter state | ✓ | filterStore.ts:12-34 | Zustand store |
| 3 | Add filter API endpoint | ✗ | N/A | NOT FOUND |
| 4 | Write unit tests | ✓ | filterStore.test.ts | 8 tests |
| 5 | Write E2E test | ✓ | assets.spec.ts:120-145 | Full workflow |
```

### Step 3: Handle Missing Requirements

For ANY requirement marked ✗:

#### Option A: Implement Missing Items

**When to use**: Critical requirement, must be implemented.

1. Return to Phase 5 (Implementation)
2. Dispatch developer with SPECIFIC missing requirement:

```
Task(
  subagent_type: "frontend-developer",
  description: "Implement missing requirement from plan",
  prompt: `
    Plan completion review found missing requirement:

    REQUIREMENT: {specific requirement text from plan.md}

    This was supposed to be implemented in Phase 5 but was missed.

    Your job:
    1. Implement this specific requirement
    2. Write tests
    3. Verify tests pass
    4. Return with evidence (file:line references)

    Do NOT implement anything else. Only this missing requirement.
  `
)
```

3. After implementation, re-run Phase 6 (this step)

#### Option B: Defer to Later

**When to use**: Nice-to-have, not blocking current feature.

1. Document in tech debt registry:

```markdown
# .claude/tech-debt-registry.md

## Deferred from {feature-name}

- **Requirement**: {description}
- **Reason**: {why deferred}
- **Impact**: {what's the cost of not having it}
- **Estimated effort**: {time to implement}
- **Priority**: {low/medium/high}
- **Tracked in**: {link to issue if applicable}
```

2. Get user approval:

```typescript
AskUserQuestion({
  questions: [{
    question: `Requirement "${requirement}" was not implemented. Defer to tech debt?`,
    header: "Missing Requirement",
    multiSelect: false,
    options: [
      {
        label: "Yes, defer to tech debt",
        description: "Document and proceed without it"
      },
      {
        label: "No, implement it now",
        description: "Return to Phase 5 to implement"
      }
    ]
  }]
})
```

3. Update checklist:

```markdown
| 3 | Add filter API endpoint | DEFERRED | tech-debt-registry.md | User approved deferral |
```

#### Option C: Remove Requirement

**When to use**: Requirement was invalid, unnecessary, or superseded.

1. Get user approval:

```typescript
AskUserQuestion({
  questions: [{
    question: `Requirement "${requirement}" was not implemented. Remove from plan?`,
    header: "Invalid Requirement",
    multiSelect: false,
    options: [
      {
        label: "Yes, remove from plan",
        description: "Requirement is no longer needed"
      },
      {
        label: "No, keep and implement",
        description: "Still needed, return to Phase 5"
      }
    ]
  }]
})
```

2. Update plan.md to remove requirement:

```markdown
## ~~Task 3: Add filter API endpoint~~

**REMOVED**: Decided to use client-side filtering instead. See architecture.md decision log.
```

3. Update checklist:

```markdown
| 3 | Add filter API endpoint | REMOVED | N/A | Superseded by client-side approach |
```

### Step 4: Verify Completion

Only proceed to Phase 6 when ALL requirements have:

- ✓ Implementation evidence (file:line), OR
- ✓ User-approved deferral, OR
- ✓ User-approved removal

**Gate check**:

```python
all_requirements = extract_requirements(plan.md)
status = verify_each_requirement()

missing = [r for r in all_requirements if r.status == "✗"]
deferred = [r for r in all_requirements if r.status == "DEFERRED" and r.user_approved]
removed = [r for r in all_requirements if r.status == "REMOVED" and r.user_approved]
implemented = [r for r in all_requirements if r.status == "✓"]

ready = len(missing) == 0

if ready:
    proceed_to_phase_6()
else:
    raise BlockedError("Cannot proceed to code review with missing requirements")
```

## Output Format

Save checklist to feature directory:

```
.claude/.output/features/{feature-id}/plan-completion-review.md
```

Save metadata:

```json
{
  "phase": "plan_completion_review",
  "total_requirements": 12,
  "implemented": 10,
  "deferred": 1,
  "removed": 1,
  "missing": 0,
  "deferred_items": [
    {
      "requirement": "Add export to CSV button",
      "reason": "Nice-to-have, not critical for MVP",
      "tracked_in": ".claude/tech-debt-registry.md",
      "user_approved": true
    }
  ],
  "removed_items": [
    {
      "requirement": "Add filter API endpoint",
      "reason": "Using client-side filtering instead",
      "updated_plan": true,
      "user_approved": true
    }
  ],
  "ready_for_code_review": true,
  "completed_at": "2025-12-28T14:30:00Z"
}
```

## Integration with Workflow

### Update metadata.json

```json
{
  "phases": {
    "implementation": {
      "status": "complete"
    },
    "plan_completion_review": {
      "status": "complete",
      "total_requirements": 12,
      "implemented": 10,
      "deferred": 1,
      "removed": 1
    },
    "review": {
      "status": "in_progress"
    }
  },
  "current_phase": "review"
}
```

### Update TodoWrite

```
TodoWrite: Mark "Phase 5.5: Plan Completion Review" as completed
TodoWrite: Mark "Phase 6: Code Review" as in_progress
```

## Why This Matters

**Without Phase 5.5:**
- Missing requirements discovered in Phase 6 (code review) mixed with quality issues
- Reviewer focusing on "is this well-built?" misses "is everything built?"
- Missing requirements found in Phase 9 (test validation) - very expensive

**With Phase 5.5:**
- Dedicated "completeness check" separate from "quality check"
- Missing requirements caught early, before cascading into testing
- Clear audit trail of what was deferred/removed with user approval

## Common Issues

### "This feels like extra bureaucracy"

**Reality**: Finding missing requirements in Phase 6 is MORE expensive (mixed with quality issues) or Phase 9 (after testing). This saves time.

**Statistical evidence**: Projects without completeness check have ~18% missing requirement rate at launch.

### "Can't the code reviewer check this?"

**Answer**: Code reviewers focus on quality ("is this well-built?"). Asking them to also check completeness ("is everything built?") dilutes focus and misses items.

### "Requirement was implemented but I can't find it"

**Solution**: Search by behavior, not by name. If requirement says "filter by status", search for:
- "status" in filter contexts
- The actual filtering logic
- Tests that verify status filtering

## Related References

- [Phase 5: Implementation](phase-5-implementation.md) - Previous phase
- [Phase 7: Code Review](phase-7-code-review.md) - Next phase (quality focus)
- [Tech Debt Registry](../../tech-debt-registry.md) - Where deferred items go
- [Agent Handoffs](agent-handoffs.md) - Handoff format
