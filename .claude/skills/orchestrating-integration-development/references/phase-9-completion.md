# Phase 9: Completion

**Purpose**: Final verification and workflow completion with merge/PR options.

## Overview

Phase 9 performs final verification of all requirements, updates metadata to complete status, and presents options for merging or creating a PR. This phase uses the `finishing-a-development-branch` skill for the final workflow.

**REQUIRED SUB-SKILL**: `finishing-a-development-branch`

## Prerequisites

Before Phase 9 can begin:

- [ ] All prior phases complete (1-7 or 1-6 if Phase 8 skipped)
- [ ] P0 compliance verified (Phase 5)
- [ ] All reviews passed (Phase 6)
- [ ] All tests passing with ≥80% coverage (Phase 7)
- [ ] Frontend integration complete (Phase 8) OR documented skip

## Final Verification Commands

**All commands must pass before completion:**

```bash
# Navigate to backend directory
cd modules/chariot/backend

# Build verification - must exit 0
go build ./...

# Test verification - must exit 0
go test ./...

# Static analysis - must exit 0
go vet ./...

# Linting - must exit 0
golangci-lint run

# Frontend verification (if Phase 8 ran)
cd modules/chariot/ui
npm run build
npm run lint
npm test
```

## Verification Checklist

### P0 Compliance Re-verification

Ensure all P0 requirements are still satisfied after any review/test fixes:

| Requirement | Verification Command | Expected |
|-------------|---------------------|----------|
| VMFilter init | `grep -n "Filter.*New.*Filter" {vendor}.go` | Match found |
| VMFilter usage | `grep -B5 "Job.Send" {vendor}.go \| grep Filter` | Filter check before Send |
| CheckAffiliation | `grep -A30 "func.*CheckAffiliation" {vendor}.go \| grep -E "http\|api"` | API call present |
| ValidateCredentials | `grep -A5 "func.*Invoke" {vendor}.go \| head -6` | ValidateCredentials first |
| errgroup SetLimit | `grep -A3 "errgroup.Group" {vendor}.go \| grep SetLimit` | SetLimit called |
| Loop capture | `grep "item := item\|asset := asset" {vendor}.go` | Capture present |
| Error handling | `grep -c "_, _.*=" {vendor}.go` | Returns 0 (none found) |

### Review Status Verification

| Review | File | Required Verdict |
|--------|------|-----------------|
| Spec Compliance | spec-compliance-review.md | SPEC_COMPLIANT |
| Code Quality | code-quality-review.md | APPROVED |
| Security | security-review.md | APPROVED (no Critical/High) |

### Test Status Verification

| Metric | File | Required |
|--------|------|----------|
| Tests Pass | test-validation.md | All PASS |
| Coverage | test-validation.md | ≥80% |

## Update metadata.json

Update to complete status with quality metrics:

```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "complete",
  "created_at": "2026-01-14T14:30:22Z",
  "completed_at": "2026-01-14T18:45:00Z",
  "phases": {
    "phase-0": { "status": "complete", "timestamp": "..." },
    "phase-1": { "status": "complete", "timestamp": "..." },
    "phase-2": { "status": "complete", "timestamp": "..." },
    "phase-3": { "status": "complete", "timestamp": "..." },
    "phase-4": { "status": "complete", "timestamp": "..." },
    "phase-4.5": { "status": "complete", "timestamp": "..." },
    "phase-5": { "status": "complete", "timestamp": "..." },
    "phase-6": { "status": "complete", "timestamp": "..." },
    "phase-7": { "status": "skipped", "skip_reason": "service account only" },
    "phase-8": { "status": "complete", "timestamp": "2026-01-14T18:45:00Z" }
  },
  "quality_metrics": {
    "p0_compliance": "7/7 requirements passed",
    "test_coverage": "85.2%",
    "spec_compliance_verdict": "SPEC_COMPLIANT",
    "code_quality_verdict": "APPROVED",
    "security_verdict": "APPROVED",
    "file_count": 4,
    "total_lines": 520
  },
  "files_created": [
    "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go",
    "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_types.go",
    "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_test.go",
    "modules/chariot/backend/pkg/tasks/integrations/integrations.go (modified)"
  ]
}
```

## Completion Options

Present options to user via AskUserQuestion:

```markdown
Integration Development Complete: {vendor}

All verification passed:
✅ P0 Compliance: 7/7 requirements
✅ Spec Compliance: SPEC_COMPLIANT
✅ Code Quality: APPROVED
✅ Security: APPROVED (no Critical/High)
✅ Test Coverage: 85.2%
✅ Build/Vet/Lint: All pass

Files created:
- {vendor}.go (285 lines)
- {vendor}_types.go (120 lines)
- {vendor}_test.go (340 lines)
- integrations.go (modified, +1 import, +1 registration)

How would you like to proceed?
```

**Options:**

| Option | Description | Action |
|--------|-------------|--------|
| Merge to main | Merge branch directly to main | `git checkout main && git merge {branch}` |
| Create PR | Create pull request for review | `gh pr create ...` |
| Keep branch | Keep working branch for further changes | No git action |

### Merge to Main

```bash
# Ensure we're up to date
git fetch origin main
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/{vendor}-integration --no-ff -m "feat(integrations): add {vendor} integration"

# Push to remote
git push origin main
```

### Create PR

```bash
# Push branch to remote
git push -u origin feature/{vendor}-integration

# Create PR with summary
gh pr create \
  --title "feat(integrations): add {vendor} integration" \
  --body "$(cat <<'EOF'
## Summary
- Add {vendor} integration for {asset_discovery | vuln_sync | bidirectional_sync}
- Implements P0 requirements: VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination

## Test Plan
- [x] Unit tests pass with 85% coverage
- [x] Integration tests with mock server
- [x] Manual testing with sandbox API (if applicable)

## P0 Compliance
- [x] VMFilter initialized and used before Job.Send()
- [x] CheckAffiliation queries external API
- [x] ValidateCredentials first in Invoke()
- [x] errgroup SetLimit() with loop capture
- [x] Pagination with maxPages constant
- [x] All errors checked and wrapped

## Files Changed
- `pkg/tasks/integrations/{vendor}/{vendor}.go` (new)
- `pkg/tasks/integrations/{vendor}/{vendor}_types.go` (new)
- `pkg/tasks/integrations/{vendor}/{vendor}_test.go` (new)
- `pkg/tasks/integrations/integrations.go` (modified)
EOF
)"
```

### Keep Branch

```markdown
Branch kept: feature/{vendor}-integration

To resume later:
1. Check out branch: `git checkout feature/{vendor}-integration`
2. Review changes: `git diff main`
3. Continue work or create PR when ready

Output directory: .claude/.output/integrations/{timestamp}-{vendor}/
```

## MANIFEST.yaml Final Update

Update MANIFEST with completion summary:

```yaml
integration: {vendor}
created: 2026-01-14T14:30:22Z
completed: 2026-01-14T18:45:00Z
output_directory: .claude/.output/integrations/{timestamp}-{vendor}/

summary:
  phases_completed: 8
  p0_compliance: 7/7
  test_coverage: 85.2%
  review_verdicts:
    spec_compliance: SPEC_COMPLIANT
    code_quality: APPROVED
    security: APPROVED

files:
  # Phase 0-1
  - path: metadata.json
    description: Workflow status and phase tracking
    phase: "0"

  - path: design.md
    description: Integration requirements and scope
    phase: "1"

  # Phase 2
  - path: skill-summary.md
    description: Vendor API patterns from skill
    phase: "2"

  - path: discovery.md
    description: Codebase pattern analysis
    phase: "2"

  # Phase 3
  - path: architecture.md
    description: Implementation blueprint with P0 checklist
    phase: "3"

  # Phase 4
  - path: implementation-log.md
    description: Developer activity log
    phase: "4"

  # Phase 5
  - path: p0-compliance-review.md
    description: P0 verification results
    phase: "4.5"

  # Phase 6
  - path: spec-compliance-review.md
    description: Spec compliance review
    phase: "5"

  - path: code-quality-review.md
    description: Quality review
    phase: "5"

  - path: security-review.md
    description: Security review
    phase: "5"

  # Phase 7
  - path: test-plan.md
    description: Test strategy
    phase: "6"

  - path: test-validation.md
    description: Test validation results
    phase: "6"

  # Phase 8 (if applicable)
  - path: frontend-integration-log.md
    description: Frontend changes
    phase: "7"
    skipped: true
    skip_reason: service account only

  # Final
  - path: MANIFEST.yaml
    description: This file inventory
    phase: "8"
```

## Gate Checklist

Phase 9 is complete when:

- [ ] `finishing-a-development-branch` skill invoked
- [ ] `go build ./...` passed
- [ ] `go test ./...` passed
- [ ] `go vet ./...` passed
- [ ] `golangci-lint run` passed
- [ ] Frontend verification passed (if Phase 8 ran)
- [ ] P0 compliance re-verified
- [ ] Review verdicts confirmed (APPROVED/SPEC_COMPLIANT)
- [ ] Test coverage confirmed (≥80%)
- [ ] `metadata.json` updated to status: `complete`
- [ ] `quality_metrics` section added to metadata.json
- [ ] MANIFEST.yaml updated with completion summary
- [ ] Human presented with options (merge | PR | keep branch)
- [ ] User's choice executed

## Common Issues

### Issue: Build Fails on Final Check

**Symptom**: `go build ./...` fails after previous phases passed

**Cause**: Usually a merge conflict or uncommitted change

**Solution**:
1. Check `git status` for uncommitted files
2. Resolve any conflicts
3. Re-run build

### Issue: Lint Fails

**Symptom**: `golangci-lint run` reports issues

**Solution**:
- Fix lint issues (usually minor)
- Re-run lint to verify
- Do NOT disable lint rules without good reason

### Issue: Test Flakiness

**Symptom**: Tests pass sometimes, fail on final run

**Solution**:
- Run tests multiple times to confirm flakiness
- Fix timing-dependent tests
- Remove external dependencies from tests

## Related Phases

- **Phase 7 (Testing)**: Provides test baseline
- **Phase 8 (Frontend)**: Determines if frontend verification needed

## Related Skills

- `finishing-a-development-branch` - Branch completion workflow
- `verifying-before-completion` - Exit criteria verification
