# Checkpoint Configuration

**Purpose**: Define human checkpoint gates and their configuration throughout the integration development workflow.

## Overview

Human checkpoints are mandatory gates where workflow pauses for user approval before proceeding. They prevent wasted effort on wrong approaches and ensure alignment at critical decision points.

## Checkpoint Summary

| Phase | Checkpoint | Trigger | Gate Criteria |
|-------|------------|---------|---------------|
| 1 | Design approval | Always | design.md complete |
| 2 | Skill creation approval | Skill missing | Confirm creating new skill |
| 3 | Architecture approval | Always | architecture.md complete |
| 4.5 | P0 violations | Any P0 fails | All P0 requirements pass |
| 5 | Retry exhausted | Max retries hit | Need user direction |
| 6 | Retry exhausted | Max retries hit | Need user direction |
| 8 | Final verification | Always | All verification passes |

## Checkpoint Details

### Phase 1: Design Approval

**Trigger**: Always (mandatory checkpoint)

**Purpose**: Ensure integration scope and requirements are understood before discovery work.

**Gate Criteria**:
- design.md created with all sections
- Vendor name confirmed
- Integration type decided
- Authentication method identified
- Data mapping outlined

**Checkpoint Format**:

```markdown
Phase 1 Design Review:

Vendor: {vendor}
Type: {asset_discovery | vuln_sync | bidirectional_sync}
Auth: {API Key | OAuth2 | Service Account}

Key decisions:
1. {decision 1}
2. {decision 2}
3. {decision 3}

Proceed to Phase 2 (Skill Check + Discovery)?
```

**AskUserQuestion Options**:
- **Approve** - Proceed to Phase 2
- **Revise** - Return to brainstorming with feedback
- **Cancel** - Stop workflow

**Failure Handling**: If user selects "Revise", orchestrator returns to Phase 1 brainstorming with user's feedback context.

### Phase 2: Skill Creation Approval

**Trigger**: Only when `integrating-with-{vendor}` skill does NOT exist

**Purpose**: Confirm before creating new vendor-specific skill (takes time and resources).

**Gate Criteria**:
- Skill search confirmed no existing skill
- User agrees to skill creation

**Checkpoint Format**:

```markdown
No existing skill found for {vendor}.

Creating `integrating-with-{vendor}` skill will:
- Document vendor API patterns
- Capture auth, rate limiting, pagination details
- Be reusable for future integrations

Create new skill?
```

**AskUserQuestion Options**:
- **Yes, create skill** (Recommended) - Invoke skill-manager
- **No, proceed without** - Continue with discovery only

**Failure Handling**: If user declines, proceed to Phase 2 Step 2 (discovery) without skill summary.

### Phase 3: Architecture Approval

**Trigger**: Always (mandatory checkpoint)

**Purpose**: Ensure implementation plan is correct before writing code.

**Gate Criteria**:
- architecture.md created with all sections
- P0 Compliance Checklist pre-filled
- Frontend Requirements section completed
- Auth flow documented
- Pagination strategy documented

**Checkpoint Format**:

```markdown
Phase 3 Architecture Review:

Integration: {vendor}
Type: {integration_type}
Files to create: {count}

P0 Requirements Addressed:
✅ VMFilter: {approach}
✅ CheckAffiliation: {approach}
✅ ValidateCredentials: First in Invoke()
✅ errgroup: SetLimit({n}) with capture
✅ Pagination: maxPages={n} constant
✅ Error handling: All errors checked
✅ File size: {estimate} lines

Frontend: {YES (enum, logos, hook) | NO (reason)}

Proceed to Phase 4 (Implementation)?
```

**AskUserQuestion Options**:
- **Approve** - Proceed to Phase 4
- **Revise** - Return to architect with feedback
- **Cancel** - Stop workflow

**Failure Handling**: If user selects "Revise", respawn integration-lead with feedback.

### Phase 4.5: P0 Violations

**Trigger**: Only when ANY P0 requirement fails validation

**Purpose**: Prevent non-compliant code from entering review.

**Gate Criteria**:
- All 7 P0 requirements pass
- OR user explicitly approves exception

**Checkpoint Format**:

```markdown
P0 Compliance Verification found {count} violations.

**Critical**: {violation description}
**Error**: {violation description}
**Warning**: {violation description}

Options:
1. Fix violations now (Recommended)
2. Proceed anyway with violations documented
3. Review violations and decide
```

**AskUserQuestion Options**:
- **Fix violations now** (Recommended) - Return to integration-developer
- **Proceed anyway** - Continue with documented violations
- **Review violations** - Show detailed violation report

**Failure Handling**: If user chooses to fix, respawn integration-developer with violation context.

### Phase 5/6: Retry Exhausted

**Trigger**: When review/test retry limit reached

**Purpose**: Get user direction when automated fixes aren't resolving issues.

**Gate Criteria**:
- Max retries exhausted (2 for Stage 1, 1 for Stage 2/Phase 6)
- Issues still present after retries

**Checkpoint Format**:

```markdown
{Stage/Phase} Review: Max retries exceeded

After {N} attempts, issues remain:
- {issue 1}
- {issue 2}

Options:
1. Continue anyway (not recommended)
2. Manual intervention - explain issues for manual fix
3. Architecture revision - return to Phase 3
```

**AskUserQuestion Options**:
- **Continue anyway** - Proceed with known issues
- **Manual intervention** - Explain issues for user to fix
- **Architecture revision** - Return to Phase 3

**Failure Handling**: Based on selection, either proceed, explain issues, or return to earlier phase.

### Phase 8: Final Verification

**Trigger**: Always (mandatory checkpoint)

**Purpose**: Confirm workflow completion and choose merge/PR action.

**Gate Criteria**:
- All verification commands pass
- All quality metrics met
- User selects completion action

**Checkpoint Format**:

```markdown
Integration Development Complete: {vendor}

All verification passed:
✅ P0 Compliance: 7/7 requirements
✅ Spec Compliance: SPEC_COMPLIANT
✅ Code Quality: APPROVED
✅ Security: APPROVED
✅ Test Coverage: {percent}%
✅ Build/Vet/Lint: All pass

How would you like to proceed?
```

**AskUserQuestion Options**:
- **Merge to main** - Merge branch directly
- **Create PR** - Create pull request
- **Keep branch** - Keep for further work

## Checkpoint Configuration Matrix

| Checkpoint | Skippable | Override Allowed | Retry Before Escalate |
|------------|-----------|------------------|----------------------|
| Phase 1 Design | No | No | N/A |
| Phase 2 Skill Creation | N/A (conditional) | Yes (skip skill) | N/A |
| Phase 3 Architecture | No | No | N/A |
| Phase 5 P0 Violations | No | Yes (with docs) | N/A |
| Phase 6 Stage 1 | No | Yes (with docs) | 2 |
| Phase 6 Stage 2 | No | Yes (with docs) | 1 |
| Phase 7 Testing | No | Yes (with docs) | 1 |
| Phase 9 Final | No | No | N/A |

## Implementing Checkpoints

### Standard Checkpoint Pattern

```markdown
# In orchestrator flow:

1. Complete phase work
2. Verify gate criteria
3. Format checkpoint message
4. Use AskUserQuestion with options
5. Based on response:
   - Approve: Proceed to next phase
   - Revise: Return to current/earlier phase with feedback
   - Cancel: Stop workflow, update metadata to "cancelled"
```

### AskUserQuestion Template

```javascript
AskUserQuestion({
  questions: [{
    header: "Phase {N}",
    question: "{checkpoint question}",
    multiSelect: false,
    options: [
      { label: "Approve", description: "Proceed to next phase" },
      { label: "Revise", description: "Return with feedback" },
      { label: "Cancel", description: "Stop workflow" }
    ]
  }]
})
```

### Handling Override Approvals

When user approves despite violations:

1. Document in metadata.json:
```json
{
  "phases": {
    "phase-4.5": {
      "status": "approved_with_exceptions",
      "exceptions": [
        {
          "requirement": "CheckAffiliation",
          "violation": "Stub implementation",
          "approved_by": "user",
          "approved_at": "2026-01-14T16:00:00Z",
          "reason": "API doesn't support individual lookup"
        }
      ]
    }
  }
}
```

2. Include in final PR/commit message:
```markdown
## Known Exceptions
- CheckAffiliation: Stub implementation (API limitation, user approved)
```

## Checkpoint Metrics

Track checkpoint usage for workflow optimization:

| Metric | Description | Target |
|--------|-------------|--------|
| Approval rate | % of checkpoints approved on first try | >80% |
| Revision rate | % requiring revision | <15% |
| Cancel rate | % workflows cancelled | <5% |
| Avg revisions per checkpoint | Mean revisions before approval | <1.5 |

## Related References

- [Human Checkpoints](../SKILL.md#human-checkpoints) - Main SKILL.md section
- [Agent Handoffs](agent-handoffs.md) - Checkpoint integration with handoffs
- [Error Recovery](error-recovery.md) - Recovery after checkpoint failures
