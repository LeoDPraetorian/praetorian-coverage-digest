# Tool Tester Requirements

Self-review checklist, report format, and blocked format for MCP wrapper test implementation.

**Parent document**: [tool-tester-prompt.md](tool-tester-prompt.md)

---

## Self-Review Checklist

Before reporting back, verify:

**Coverage Requirements:**

- [ ] Did I implement ≥3 input validation tests?
- [ ] Did I implement ≥2 MCP integration tests?
- [ ] Did I implement ≥2 response filtering tests?
- [ ] Did I implement ≥4 security tests?
- [ ] Did I implement ≥4 edge case tests?
- [ ] Did I implement ≥3 error handling tests?
- [ ] Total: Did I implement ≥18 tests?

**Quality:**

- [ ] Do tests verify behavior, not implementation details?
- [ ] Are mocks used correctly (mock dependencies, not the wrapper itself)?
- [ ] Do security tests cover all attack vectors from security-assessment.md?
- [ ] Do token reduction tests use actual values from architecture.md?

**Technical:**

- [ ] Did I run tests and verify they all pass?
- [ ] Did I check coverage (≥80% line/branch/function)?
- [ ] Are there any gaps in coverage? If so, add tests.
- [ ] Do all assertions use proper Result<T, E> pattern checks?

**Documentation:**

- [ ] Did I create test-plan.md with all test scenarios?
- [ ] Does test-plan.md map tests to architecture requirements?
- [ ] Are test descriptions clear and specific?

If you find issues during self-review, fix them now before reporting.

---

## Report Format

When done, include in your response:

1. **Test plan summary** - Categories and test counts
2. **Coverage results** - Line/branch/function percentages
3. **Test execution results** - All tests passing
4. **Files created** - test-plan.md and test file
5. **Self-review findings** - Issues found and fixed
6. **Any concerns** - Edge cases that may need attention

---

## Blocked Format Template

If you cannot complete this task, return:

```json
{
  "agent": "tool-tester",
  "status": "blocked",
  "blocked_reason": "missing_requirements|architecture_ambiguity|coverage_gaps|unclear_security_requirements",
  "attempted": [
    "Created test-plan.md with 18 test scenarios",
    "Implemented input validation tests (3/3)",
    "Implemented MCP integration tests (2/2)",
    "Stuck on response filtering tests - unclear which fields should be filtered"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Architecture.md mentions filtering 'verbose fields' but doesn't specify which fields. Should I filter: history, metadata, _internal?",
      "options": [
        "Filter all three: history, metadata, _internal",
        "Filter only what's in discovery doc",
        "Filter based on token impact (fields >100 tokens)"
      ],
      "impact": "Cannot write accurate token reduction test without knowing expected output structure"
    }
  ],
  "handoff": {
    "next_agent": null,
    "context": "Test implementation 40% complete. Need clarification on response filtering fields before proceeding."
  }
}
```
