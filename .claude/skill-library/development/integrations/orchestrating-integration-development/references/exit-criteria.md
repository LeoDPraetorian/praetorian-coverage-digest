# Exit Criteria (Integration Development)

**Completion requirements for integration development workflows.**

---

## Standard Exit Criteria

Integration orchestration is complete when:

- [ ] All 16 phases marked complete in MANIFEST.yaml
- [ ] All spawned agents returned status: complete
- [ ] All P0 compliance requirements verified (MANDATORY)
- [ ] Test coverage meets 80% threshold
- [ ] Final verification command executed with passing result
- [ ] User approves final result

---

## P0 Compliance Exit Criteria (MANDATORY)

**These are NON-NEGOTIABLE. Integration cannot be marked complete without ALL of these:**

| Requirement         | Verification                                                                    | Status |
| ------------------- | ------------------------------------------------------------------------------- | ------ |
| VMFilter            | `grep -r "VMFilter" backend/pkg/integrations/{vendor}/` returns matches         | [ ]    |
| CheckAffiliation    | `grep -r "CheckAffiliation" backend/pkg/integrations/{vendor}/` returns matches | [ ]    |
| errgroup            | `grep -r "errgroup" backend/pkg/integrations/{vendor}/` returns matches         | [ ]    |
| ValidateCredentials | Function exists and has tests                                                   | [ ]    |

---

## Exit Criteria Format

**Use COUNT + UNIT** - Be specific and measurable.

### Good Examples

- "5 tests passing for VMFilter"
- "3 endpoints implemented (GET /assets, POST /scans, GET /vulns)"
- "Coverage at 82% (threshold: 80%)"
- "All 4 P0 requirements verified"

### Bad Examples

- "Tests work" ❌ (no count)
- "Implementation done" ❌ (vague)
- "P0 looks good" ❌ (no verification)

---

## Phase-Specific Exit Criteria

### Phase 8: Implementation

- [ ] client.go created at `backend/pkg/integrations/{vendor}/`
- [ ] collector.go created at `backend/pkg/integrations/{vendor}/collector/`
- [ ] Unit tests created
- [ ] Code compiles: `go build ./...`

### Phase 10: Domain Compliance

- [ ] VMFilter: Present and correctly applied
- [ ] CheckAffiliation: Present and correctly applied
- [ ] errgroup: Used for concurrent operations
- [ ] ValidateCredentials: Implemented

### Phase 14: Coverage Verification

- [ ] `go test -cover ./...` shows ≥80% coverage
- [ ] P0 functions specifically tested
- [ ] Edge cases covered

### Phase 16: Completion

- [ ] All prior phase exit criteria met
- [ ] PR created with description
- [ ] P0 compliance table in PR description
- [ ] User approval received

---

## Workflow Completion

After completing all phases and meeting exit criteria:

1. **Verify all checkboxes above are checked**
2. **Generate completion report** with P0 compliance status
3. **Invoke completion skill**: `finishing-a-development-branch` (LIBRARY) for:
   - Branch cleanup
   - PR creation
   - Worktree cleanup

---

## Final Verification Command

Run this to verify integration is complete:

```bash
ROOT=$(git rev-parse --show-toplevel)
VENDOR="{vendor}"
DIR="$ROOT/modules/chariot/backend/pkg/integrations/$VENDOR"

echo "=== P0 Compliance Check ==="
echo "VMFilter: $(grep -r 'VMFilter' $DIR | wc -l) occurrences"
echo "CheckAffiliation: $(grep -r 'CheckAffiliation' $DIR | wc -l) occurrences"
echo "errgroup: $(grep -r 'errgroup' $DIR | wc -l) occurrences"

echo ""
echo "=== Test Coverage ==="
go test -cover $DIR/...

echo ""
echo "=== Build Check ==="
go build $DIR/...
```

**All checks must pass before marking complete.**

---

## Related References

- [p0-compliance.md](p0-compliance.md) - P0 requirements detail
- [phase-16-completion.md](phase-16-completion.md) - Final phase details
- [error-recovery.md](error-recovery.md) - If exit criteria not met
