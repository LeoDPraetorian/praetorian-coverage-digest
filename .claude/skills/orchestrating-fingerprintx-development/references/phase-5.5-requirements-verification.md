# Phase 5.5: Requirements Verification

**Verify all protocol research requirements were implemented BEFORE testing.**

## Purpose

Catch missing protocol requirements before Phase 6 (Testing), where they're harder to identify among test failures.

**Problem**: Testers focus on "does it work?" Missing detection strategies ("did we implement all protocol behaviors?") get lost in the noise.

**Solution**: Dedicated verification step that asks ONLY "did we implement everything from protocol research?"

## When to Run

**Mandatory checkpoint** between Phase 5 (Implementation) and Phase 6 (Testing):

```
Phase 5: Implementation
        ↓
Phase 5.5: Requirements Verification ← YOU ARE HERE
        ↓
Phase 6: Testing
```

## Workflow

### Step 1: Generate Requirements Checklist

Read protocol-research.md and extract ALL detection requirements:

```markdown
# Requirements Checklist for {protocol}-fingerprintx

| # | Requirement | Implemented | Evidence | Notes |
|---|-------------|-------------|----------|-------|
| 1 | Primary detection probe | ? | ? | |
| 2 | Secondary detection fallback | ? | ? | |
| 3 | Response validation | ? | ? | |
| 4 | Version marker extraction | ? | ? | |
| 5 | CPE generation logic | ? | ? | |
```

**IMPORTANT**: Extract requirements from protocol-research.md at DETECTION STRATEGY level, not just section headers.

### Step 2: Cross-Reference Implementation

For EACH requirement:

#### 2a. Search Codebase

Use Grep to find implementation:

```bash
# Example for requirement "Primary detection probe"
grep -r "func.*Run" modules/fingerprintx/pkg/plugins/services/{protocol} --include="*.go"
grep -r "probeBytes" modules/fingerprintx/pkg/plugins/services/{protocol} --include="*.go"
```

#### 2b. Verify Test Exists

Search test files:

```bash
# Example
grep -r "TestRun" modules/fingerprintx/pkg/plugins/services/{protocol} --include="*_test.go"
grep -r "probe" modules/fingerprintx/pkg/plugins/services/{protocol} --include="*_test.go"
```

#### 2c. Mark Status

Update checklist:

```markdown
| # | Requirement | Implemented | Evidence | Notes |
|---|-------------|-------------|----------|-------|
| 1 | Primary detection probe | ✓ | mysql.go:45-67 | TCP probe implemented |
| 2 | Secondary fallback | ✓ | mysql.go:70-85 | Banner parsing |
| 3 | Response validation | ✗ | N/A | NOT FOUND |
| 4 | Version marker extraction | ✓ | mysql.go:90-120 | Regex-based |
| 5 | CPE generation | ✓ | mysql.go:125-140 | cpe:2.3 format |
```

### Step 3: Handle Missing Requirements

For ANY requirement marked ✗:

#### Option A: Implement Missing Items

**When to use**: Critical protocol behavior, must be implemented.

1. Return to Phase 5 (Implementation)
2. Dispatch developer with SPECIFIC missing requirement:

```
Task(
  subagent_type: "capability-developer",
  description: "Implement missing protocol requirement",
  prompt: `
    Protocol research verification found missing requirement:

    REQUIREMENT: {specific detection strategy from protocol-research.md}

    This was supposed to be implemented in Phase 5 but was missed.

    Your job:
    1. Implement this specific detection logic
    2. Write tests for this behavior
    3. Verify tests pass
    4. Return with evidence (file:line references)

    Do NOT implement anything else. Only this missing requirement.

    MANDATORY SKILLS:
    - writing-fingerprintx-modules
    - developing-with-tdd
    - verifying-before-completion
    - persisting-agent-outputs

    OUTPUT_DIRECTORY: {FEATURE_DIR}
  `
)
```

3. After implementation, re-run Phase 5.5 (this step)

#### Option B: Defer to Later

**When to use**: Nice-to-have detection strategy, not blocking basic functionality.

1. Document in tech debt registry:

```markdown
# .claude/tech-debt-registry.md

## Deferred from {protocol}-fingerprintx

- **Requirement**: {detection strategy description}
- **Reason**: {why deferred}
- **Impact**: {reduced detection accuracy or edge case coverage}
- **Estimated effort**: {time to implement}
- **Priority**: {low/medium/high}
- **Tracked in**: {link to issue if applicable}
```

2. Get user approval:

```typescript
AskUserQuestion({
  questions: [{
    question: `Protocol requirement "${requirement}" was not implemented. Defer to tech debt?`,
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
| 3 | Response validation | DEFERRED | tech-debt-registry.md | User approved deferral |
```

#### Option C: Remove Requirement

**When to use**: Requirement was invalid, unnecessary, or superseded by better approach.

1. Get user approval:

```typescript
AskUserQuestion({
  questions: [{
    question: `Protocol requirement "${requirement}" was not implemented. Remove from protocol research?`,
    header: "Invalid Requirement",
    multiSelect: false,
    options: [
      {
        label: "Yes, remove from protocol research",
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

2. Update protocol-research.md to remove requirement:

```markdown
## ~~Detection Strategy 3: Response validation~~

**REMOVED**: Decided that banner parsing is sufficient. See architecture.md decision log.
```

3. Update checklist:

```markdown
| 3 | Response validation | REMOVED | N/A | Superseded by banner parsing approach |
```

### Step 4: Verify Completion

Only proceed to Phase 6 when ALL requirements have:

- ✓ Implementation evidence (file:line), OR
- ✓ User-approved deferral, OR
- ✓ User-approved removal

**Gate check**:

```python
all_requirements = extract_requirements(protocol_research.md)
status = verify_each_requirement()

missing = [r for r in all_requirements if r.status == "✗"]
deferred = [r for r in all_requirements if r.status == "DEFERRED" and r.user_approved]
removed = [r for r in all_requirements if r.status == "REMOVED" and r.user_approved]
implemented = [r for r in all_requirements if r.status == "✓"]

ready = len(missing) == 0

if ready:
    proceed_to_phase_6()
else:
    raise BlockedError("Cannot proceed to testing with missing protocol requirements")
```

## Output Format

Save checklist to capability directory:

```
.claude/.output/capabilities/{protocol}-fingerprintx/requirements-verification.md
```

Save metadata:

```json
{
  "phase": "requirements_verification",
  "total_requirements": 8,
  "implemented": 6,
  "deferred": 1,
  "removed": 1,
  "missing": 0,
  "deferred_items": [
    {
      "requirement": "Advanced version detection via capability flags",
      "reason": "Nice-to-have, banner parsing sufficient for MVP",
      "tracked_in": ".claude/tech-debt-registry.md",
      "user_approved": true
    }
  ],
  "removed_items": [
    {
      "requirement": "UDP probe fallback",
      "reason": "Protocol is TCP-only",
      "updated_protocol_research": true,
      "user_approved": true
    }
  ],
  "ready_for_testing": true,
  "completed_at": "2026-01-09T00:40:00Z"
}
```

## Integration with Workflow

### Update MANIFEST.yaml

```yaml
phases:
  implementation:
    status: complete
  requirements_verification:
    status: complete
    total_requirements: 8
    implemented: 6
    deferred: 1
    removed: 1
  testing:
    status: in_progress
current_phase: testing
```

### Update TodoWrite

```
TodoWrite: Mark "Phase 5.5: Requirements Verification" as completed
TodoWrite: Mark "Phase 6: Testing" as in_progress
```

## Why This Matters

**Without Phase 5.5:**
- Missing protocol detection strategies discovered in Phase 6 (testing) mixed with test failures
- Tester focusing on "does it work?" misses "are all detection strategies implemented?"
- Missing strategies found in Phase 7 (validation) - very expensive

**With Phase 5.5:**
- Dedicated "completeness check" separate from "functionality check"
- Missing strategies caught early, before cascading into testing
- Clear audit trail of what was deferred/removed with user approval

## Common Issues

### "This feels like extra bureaucracy"

**Reality**: Finding missing protocol requirements in Phase 6 is MORE expensive (mixed with test failures) or Phase 7 (Shodan validation). This saves time.

**Statistical evidence**: Fingerprintx plugins without completeness check have ~25% missing detection strategy rate at PR time.

### "Can't the tester check this?"

**Answer**: Testers focus on functionality ("does it work?"). Asking them to also check completeness ("are all strategies implemented?") dilutes focus and misses items.

### "Protocol requirement was implemented but I can't find it"

**Solution**: Search by behavior, not by name. If requirement says "banner parsing", search for:
- "banner" in implementation contexts
- The actual parsing logic
- Tests that verify banner detection

## Related References

- [Phase 5: Implementation](../orchestrating-fingerprintx-development/SKILL.md#phase-5-implementation) - Previous phase
- [Phase 6: Testing](../orchestrating-fingerprintx-development/SKILL.md#phase-6-testing) - Next phase (functionality focus)
- [Tech Debt Registry](../../tech-debt-registry.md) - Where deferred items go
