# Tool Developer Requirements & Output

Self-review checklist, report format, and blocked format for MCP wrapper implementation.

**Parent document**: [tool-developer-prompt.md](tool-developer-prompt.md)

---

## Self-Review Checklist

Before reporting back, verify:

**Completeness:**

- [ ] Did I implement the wrapper at the correct path (`.claude/tools/{SERVICE}/{TOOL}.ts`)?
- [ ] Did I include all required fields in the input schema per architecture.md?
- [ ] Did I filter the response per architecture.md token optimization strategy?
- [ ] Did I handle all error cases mentioned in architecture.md?

**Quality:**

- [ ] Does the implementation follow the Result<T, E> pattern?
- [ ] Are Zod schemas properly defined for input and output?
- [ ] Is the code clean and well-documented with TSDoc?
- [ ] Are variable/function names clear and accurate?

**Security:**

- [ ] Did I sanitize all user inputs using sanitize.ts?
- [ ] Did I validate inputs with Zod before processing?
- [ ] Did I avoid exposing sensitive data in error messages?
- [ ] Did I check for injection attacks per security-assessment.md?

**Token Optimization:**

- [ ] Did I verify token count meets target (≥80% reduction)?
- [ ] Did I filter out all verbose fields (history, metadata, \_internal)?
- [ ] Did I extract scalar values from nested objects (e.g., state.name vs full state object)?
- [ ] Did I document the token reduction in TSDoc comment?

**Testing:**

- [ ] Did I follow TDD (test first)?
- [ ] Do tests cover all 6 categories (input validation, MCP integration, response filtering, security, edge cases, error handling)?
- [ ] Do tests actually verify behavior (not just mock behavior)?
- [ ] Does coverage meet ≥80% requirement?

**Discipline:**

- [ ] Did I avoid overbuilding (YAGNI)?
- [ ] Did I only build what was specified in architecture.md?
- [ ] Did I follow existing patterns in the codebase?

If you find issues during self-review, fix them now before reporting.

---

## Report Format

When done, include in your response:

1. **What you implemented** - Summary of wrapper functionality
2. **Token optimization achieved** - Original vs final token counts
3. **Test results** - Coverage percentage and test counts
4. **Files changed** - Implementation and test files
5. **Self-review findings** - Issues found and fixed
6. **Any concerns** - Things the reviewer should look at

---

## Clarification Question Example

When the agent has questions, it should return this structured format:

```json
{
  "status": "needs_clarification",
  "level": "behavior",
  "verified_so_far": [
    "Wrapper calls linear.get_issue MCP tool",
    "Input schema requires issue_id field",
    "Response filtering removes history array"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Should the wrapper retry on MCP timeout?",
      "options": [
        "Yes, retry up to 3 times with exponential backoff",
        "No, return Err immediately on timeout",
        "Retry once with 1s delay"
      ],
      "default_assumption": "No retry - return Err immediately",
      "impact": "Affects reliability for transient network errors"
    },
    {
      "category": "dependency",
      "question": "Does MCP response include `attachments` field that should be filtered?",
      "options": [
        "Yes, filter it out",
        "No, not in discovery doc",
        "Unknown - need to verify schema-discovery.md"
      ],
      "default_assumption": "Follow discovery doc exactly - only filter fields listed",
      "impact": "May miss token optimization if undocumented fields exist"
    }
  ]
}
```

---

## Blocked Format Template

If you cannot complete this task, return:

```json
{
  "agent": "tool-developer",
  "status": "blocked",
  "blocked_reason": "missing_requirements|architecture_ambiguity|test_failures|security_concern|out_of_scope",
  "attempted": [
    "Implemented basic wrapper structure",
    "Attempted token optimization but unclear which fields to filter",
    "Wrote 12 tests but 3 security tests failing due to unclear sanitization requirements"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Should the wrapper cache MCP responses to reduce repeated calls?",
      "options": [
        "Yes, cache for 5 minutes",
        "No, always fetch fresh",
        "Cache only for specific tools"
      ],
      "impact": "Affects performance and freshness of data"
    }
  ],
  "handoff": {
    "next_agent": null,
    "context": "Blocked on architecture decision about caching strategy. Implementation 70% complete, tests passing for implemented portions."
  }
}
```
