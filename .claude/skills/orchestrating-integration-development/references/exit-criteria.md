# Exit Criteria

**Integration development is complete when ALL of the following are verified.**

## Phase Completion

- [ ] All 8 phases marked 'complete' in metadata.json
- [ ] All gate checklists passed (not 'close enough')
- [ ] No phases skipped without explicit user approval

## Skill Artifacts

- [ ] `integrating-with-{vendor}` skill exists (created or pre-existing)
- [ ] skill-summary.md documents API patterns extracted from skill

## P0 Compliance (ALL REQUIRED)

- [ ] VMFilter: Initialized AND called before every Job.Send()
- [ ] CheckAffiliation: Uses approved Pattern A/B/C (not stub)
- [ ] ValidateCredentials: Called first in Invoke()
- [ ] errgroup: SetLimit() called AND loop variables captured
- [ ] Pagination: Termination guarantee (maxPages OR API signal) documented
- [ ] Error handling: Zero `_, _ =` patterns in codebase
- [ ] File size: All files under 400 lines (or properly split)

## Review Status

- [ ] spec-compliance-review.md verdict: SPEC_COMPLIANT
- [ ] code-quality-review.md verdict: APPROVED
- [ ] security-review.md verdict: APPROVED (no critical/high issues)

## Test Status

- [ ] All tests pass: `go test ./...` exits 0
- [ ] Coverage ≥80%: Verified in test-validation.md
- [ ] Mock servers implemented for external API calls

## Quality Metrics (in metadata.json)

```json
{
  "quality_metrics": {
    "p0_compliance": "7/7 requirements passed",
    "test_coverage": ">=80%",
    "review_verdict": "APPROVED",
    "security_verdict": "APPROVED",
    "file_sizes": "all <400 lines"
  }
}
```

## Final Verification Commands

```bash
# All must pass before completion
cd modules/chariot/backend
go build ./...          # Build succeeds
go test ./...           # Tests pass
go vet ./...            # No vet warnings
golangci-lint run       # Lint passes
```

## Human Approval

- [ ] Human reviewed final result via AskUserQuestion
- [ ] Human selected action: Merge to main | Create PR | Keep branch

## Rationalization Check

- [ ] No rationalization phrases detected during workflow
- [ ] Any P0 exceptions explicitly approved by user
- [ ] Override protocol followed for any skipped requirements

## Incomplete Exit Criteria

If any exit criterion is not met:

1. **Identify gap** - Which criterion failed?
2. **Route to phase** - Return to appropriate phase to fix
3. **Do NOT mark complete** - Status remains 'in_progress'
4. **Document blocker** - Update metadata.json with blocking issue

```json
{
  "status": "blocked",
  "blocked_reason": "p0_compliance_failed",
  "blocking_requirement": "CheckAffiliation is stub implementation",
  "remediation": "Return to Phase 4, implement real API query"
}
```

## Verification Protocol

**Statistical evidence**: 30% of workflows claim completion with unmet criteria. Explicit verification prevents premature completion.

Use the `verifying-before-completion` skill to systematically check all criteria before marking Phase 8 complete.
