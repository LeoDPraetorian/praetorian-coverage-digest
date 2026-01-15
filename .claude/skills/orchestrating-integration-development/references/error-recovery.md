# Error Recovery Protocol

## Detecting Partial Completion

Before re-running a phase, check what was completed:

### Phase 4 (Implementation) Partial Completion

```bash
# Check what files were created
ls -la modules/chariot/backend/pkg/tasks/integrations/{vendor}/

# Check if files compile
cd modules/chariot/backend && go build ./pkg/tasks/integrations/{vendor}/...

# Check implementation-log.md for last completed task
cat .claude/.output/integrations/{timestamp}-{vendor}/implementation-log.md
```

### Phase 5 (Review) Partial Completion

```bash
# Check which review files exist
ls .claude/.output/integrations/{timestamp}-{vendor}/*-review.md
```

### Phase 6 (Testing) Partial Completion

```bash
# Check for test files
ls modules/chariot/backend/pkg/tasks/integrations/{vendor}/*_test.go

# Check test-plan.md completion status
cat .claude/.output/integrations/{timestamp}-{vendor}/test-plan.md
```

## Recovery Strategies

### Strategy A: Resume from Failure Point

**When**: Partial work is valid and can be continued

1. Read the phase output file (implementation-log.md, etc.)
2. Identify last completed task
3. Update metadata.json to reflect actual state
4. Re-spawn agent with 'Continue from task N' context

### Strategy B: Rollback and Restart Phase

**When**: Partial work is corrupted or invalid

1. Delete incomplete phase artifacts:
   ```bash
   rm -rf modules/chariot/backend/pkg/tasks/integrations/{vendor}/*.go
   rm .claude/.output/integrations/{timestamp}-{vendor}/implementation-log.md
   ```
2. Update metadata.json to mark phase as 'pending'
3. Re-run phase from beginning

### Strategy C: Restart from Earlier Phase

**When**: Phase failure reveals architecture issues

1. Document the issue in current phase output
2. Update metadata.json to mark current AND earlier phase as 'needs_revision'
3. Present options to user:
   - Revise architecture (return to Phase 3)
   - Adjust requirements (return to Phase 1)
   - Proceed with known limitations

## Phase-Specific Recovery

| Phase               | Common Failures            | Recovery                                            |
| ------------------- | -------------------------- | --------------------------------------------------- |
| Phase 2 (Discovery) | Skill creation timeout     | Retry skill creation OR proceed without vendor skill |
| Phase 3 (Architecture) | Missing API info        | Return to Phase 1 for more research                 |
| Phase 4 (Implementation) | Compile errors        | Strategy A (fix errors) or B (restart)              |
| Phase 4.5 (P0 Validation) | P0 violations        | Fix violations, re-run validation                   |
| Phase 5 (Review)    | Max retries exceeded       | User decision required                              |
| Phase 6 (Testing)   | Coverage below 80%         | Add more tests, re-validate                         |

## Metadata Tracking for Recovery

Always update metadata.json when recovery occurs:

```json
{
  "phases": {
    "phase-4": {
      "status": "recovered",
      "recovery_strategy": "A",
      "recovery_reason": "Compile error in vendor.go:234",
      "original_attempt": "2026-01-14T10:00:00Z",
      "recovery_timestamp": "2026-01-14T10:30:00Z"
    }
  }
}
```

## Decision Flowchart

When a phase fails:

```
Phase failed
├── Is partial work valid?
│   ├── YES → Can we continue from failure point?
│   │   ├── YES → Strategy A (Resume)
│   │   └── NO → Strategy B (Rollback phase)
│   └── NO → Is failure due to earlier phase issues?
│       ├── YES → Strategy C (Restart earlier phase)
│       └── NO → Strategy B (Rollback phase)
└── Present recovery options to user via AskUserQuestion
```
