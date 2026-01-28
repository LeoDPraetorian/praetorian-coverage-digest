# Phase 15: Test Quality

**Verify tests are high-quality, not just high-coverage.**

---

## Agent

Spawn `test-lead` to review test quality.

---

## Quality Criteria

1. **No low-value tests** - Tests verify behavior, not implementation
2. **Correct assertions** - Assert outcomes, not internals
3. **All tests pass** - No skipped tests (except integration)
4. **Table-driven** - Error classification uses table-driven tests
5. **Clear names** - Test names describe scenario

---

## Anti-Patterns to Flag

- Testing that Name() returns a string (too basic)
- Testing internal function calls (implementation detail)
- Duplicate test scenarios

---

## Scoring

Quality score >= 70 to proceed.

---

## Related

- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Previous phase
- [Phase 16: Completion](phase-16-completion.md) - Next phase
