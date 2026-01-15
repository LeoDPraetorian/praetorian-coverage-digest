# Phase 6: Implementation Completion Review

**Verify all architecture requirements were implemented BEFORE code review.**

## Purpose

Catch missing requirements before Phase 7 (Code Review), where they're harder to identify among quality issues.

**Problem**: Code reviewers focus on "how well is it built?" Missing requirements ("was everything built?") get lost in the noise.

**Solution**: Dedicated verification step that asks ONLY "did we implement everything?"

## When to Run

**Mandatory checkpoint** between Phase 5 (Implementation) and Phase 7 (Review):

```
Phase 5: Implementation
        ↓
Phase 6: Implementation Completion Review ← YOU ARE HERE
        ↓
Phase 7: Code Review
```

## Workflow

### Step 1: Generate Requirements Checklist

Read architecture.md and extract ALL requirements into a checklist:

```markdown
# Requirements Checklist for {capability-name}

| # | Requirement | Implemented | Evidence | Notes |
|---|-------------|-------------|----------|-------|
| 1 | VQL query for artifact collection | ? | ? | |
| 2 | Detection logic for exposed buckets | ? | ? | |
| 3 | Error handling for permission denied | ? | ? | |
| 4 | Unit tests for query parsing | ? | ? | |
| 5 | Integration test with sample bucket | ? | ? | |
```

**IMPORTANT**: Extract requirements from architecture.md at TASK level, not just section headers.

### Step 2: Cross-Reference Implementation

For EACH requirement:

#### 2a. Search Codebase

Use Grep to find implementation:

```bash
# Example for requirement "VQL query for artifact collection"
grep -r "artifact.*collection" modules/chariot-aegis-capabilities --include="*.vql"
grep -r "S3BucketArtifact" modules/chariot-aegis-capabilities --include="*.vql"
```

#### 2b. Verify Test Exists

Search test files:

```bash
# Example
grep -r "test.*query" modules/chariot-aegis-capabilities --include="*.test.go"
grep -r "TestS3BucketDetection" modules/chariot-aegis-capabilities --include="*.test.go"
```

#### 2c. Mark Status

Update checklist:

```markdown
| # | Requirement | Implemented | Evidence | Notes |
|---|-------------|-------------|----------|-------|
| 1 | VQL query for artifact collection | ✓ | s3-bucket-exposure.vql:10-25 | Query created |
| 2 | Detection logic | ✓ | s3-bucket-exposure.vql:30-45 | Logic implemented |
| 3 | Error handling | ✗ | N/A | NOT FOUND |
| 4 | Unit tests | ✓ | query_test.go:50-80 | 5 tests |
| 5 | Integration test | ✓ | integration_test.go:100-150 | Full workflow |
```

### Step 3: Handle Missing Requirements

For ANY requirement marked ✗:

#### Option A: Implement Missing Items

**When to use**: Critical requirement, must be implemented.

1. Return to Phase 5 (Implementation)
2. Dispatch developer with SPECIFIC missing requirement:

```
Task(
  subagent_type: "capability-developer",
  description: "Implement missing requirement from architecture",
  prompt: `
    Implementation completion review found missing requirement:

    REQUIREMENT: {specific requirement text from architecture.md}

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

**When to use**: Nice-to-have, not blocking current capability.

1. Document in tech debt registry:

```markdown
# .claude/tech-debt-registry.md

## Deferred from {capability-name}

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
| 3 | Error handling for permission denied | DEFERRED | tech-debt-registry.md | User approved deferral |
```

#### Option C: Remove Requirement

**When to use**: Requirement was invalid, unnecessary, or superseded.

1. Get user approval:

```typescript
AskUserQuestion({
  questions: [{
    question: `Requirement "${requirement}" was not implemented. Remove from architecture?`,
    header: "Invalid Requirement",
    multiSelect: false,
    options: [
      {
        label: "Yes, remove from architecture",
        description: "Requirement is no longer needed"
      },
      {
        label: "No, keep and implement",
        description: "Still needed, return to Phase 4"
      }
    ]
  }]
})
```

2. Update architecture.md to remove requirement:

```markdown
## ~~Task 3: Error handling for permission denied~~

**REMOVED**: Decided Velociraptor handles this natively. See architecture.md decision log.
```

3. Update checklist:

```markdown
| 3 | Error handling for permission denied | REMOVED | N/A | Superseded by Velociraptor native handling |
```

### Step 4: Verify Completion

Only proceed to Phase 7 when ALL requirements have:

- ✓ Implementation evidence (file:line), OR
- ✓ User-approved deferral, OR
- ✓ User-approved removal

**Gate check**:

```python
all_requirements = extract_requirements(architecture.md)
status = verify_each_requirement()

missing = [r for r in all_requirements if r.status == "✗"]
deferred = [r for r in all_requirements if r.status == "DEFERRED" and r.user_approved]
removed = [r for r in all_requirements if r.status == "REMOVED" and r.user_approved]
implemented = [r for r in all_requirements if r.status == "✓"]

ready = len(missing) == 0

if ready:
    proceed_to_phase_5()
else:
    raise BlockedError("Cannot proceed to code review with missing requirements")
```

## Output Format

Save checklist to capability directory:

```
.claude/.output/capabilities/{capability-id}/implementation-completion-review.md
```

Save metadata:

```json
{
  "phase": "implementation_completion_review",
  "total_requirements": 10,
  "implemented": 8,
  "deferred": 1,
  "removed": 1,
  "missing": 0,
  "deferred_items": [
    {
      "requirement": "Add performance benchmarks",
      "reason": "Nice-to-have, not critical for MVP",
      "tracked_in": ".claude/tech-debt-registry.md",
      "user_approved": true
    }
  ],
  "removed_items": [
    {
      "requirement": "Error handling for permission denied",
      "reason": "Using Velociraptor native handling instead",
      "updated_architecture": true,
      "user_approved": true
    }
  ],
  "ready_for_code_review": true,
  "completed_at": "2026-01-08T14:30:00Z"
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
    "implementation_completion_review": {
      "status": "complete",
      "total_requirements": 10,
      "implemented": 8,
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
TodoWrite: Mark "Phase 6: Implementation Completion Review" as completed
TodoWrite: Mark "Phase 7: Code Review" as in_progress
```

## Why This Matters

**Without Phase 6:**
- Missing requirements discovered in Phase 7 (code review) mixed with quality issues
- Reviewer focusing on "is this well-built?" misses "is everything built?"
- Missing requirements found in Phase 8 (testing) - very expensive

**With Phase 6:**
- Dedicated "completeness check" separate from "quality check"
- Missing requirements caught early, before cascading into testing
- Clear audit trail of what was deferred/removed with user approval

## Common Issues

### "This feels like extra bureaucracy"

**Reality**: Finding missing requirements in Phase 7 is MORE expensive (mixed with quality issues) or Phase 8 (after testing). This saves time.

**Statistical evidence**: Projects without completeness check have ~18% missing requirement rate at launch.

### "Can't the code reviewer check this?"

**Answer**: Code reviewers focus on quality ("is this well-built?"). Asking them to also check completeness ("is everything built?") dilutes focus and misses items.

### "Requirement was implemented but I can't find it"

**Solution**: Search by behavior, not by name. If requirement says "detect exposed buckets", search for:
- "exposed" in detection contexts
- The actual detection logic
- Tests that verify bucket exposure detection

## Related References

- [Phase 5: Implementation](phase-5-implementation.md) - Previous phase
- [Phase 7: Review](phase-7-review.md) - Next phase (quality focus)
- [Tech Debt Registry](../../tech-debt-registry.md) - Where deferred items go
- [Agent Handoffs](agent-handoffs.md) - Handoff format
