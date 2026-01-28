# Phase 14: Coverage Verification

**Verify test coverage meets threshold.**

---

## Coverage Check

```bash
go test -coverprofile=coverage.out ./internal/plugins/{protocol}/...
go tool cover -func=coverage.out | grep total
```

---

## Threshold

**Minimum: 80%** for new plugin code.

---

## If Below Threshold

1. Identify uncovered code paths
2. Add tests for missing coverage
3. Re-run coverage check

---

## Related

- [Phase 13: Testing](phase-13-testing.md) - Previous phase
- [Phase 15: Test Quality](phase-15-test-quality.md) - Next phase
