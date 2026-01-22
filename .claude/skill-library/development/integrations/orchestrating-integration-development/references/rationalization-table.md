# Rationalization Prevention for Integration Development

**Agents rationalize skipping steps. Watch for warning phrases and use evidence-based gates.**

**This file provides:** Integration-specific rationalization patterns and P0 evidence-based gates.

---

## Integration Development Rationalizations

### P0 Compliance Rationalizations

| Rationalization                               | Why It Fails                                      | Counter                                                |
| --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| "CheckAffiliation can be a stub for now"      | 98% of stubs never get fixed                      | Implement real API query or use CheckAffiliationSimple |
| "I'll add ValidateCredentials later"          | Fail-fast pattern prevents wasted compute         | Add before any enumeration code                        |
| "VMFilter isn't needed for this integration"  | VMFilter prevents duplicate ingestion             | Verify integration type; add if any IP/host assets     |
| "Error handling is overkill for json.Marshal" | JSON marshaling can fail; silent corruption       | Always check error, wrap with context                  |
| "No time for maxPages, API will return empty" | APIs have bugs; infinite loops crash workers      | Add defensive maxPages constant (1000)                 |
| "File is only 450 lines, close enough"        | Maintainability degrades with size                | Split now; technical debt compounds                    |
| "P0 validation is redundant"                  | 98% CheckAffiliation violation rate proves needed | Run validating-integrations every time                 |

### Phase Skip Rationalizations

| Rationalization                          | Why It Fails                                        | Counter                                              |
| ---------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| "Tests can come later"                   | Tests never come later; coverage targets block      | Write tests in Phase 13, not 'later'                 |
| "Skill check is unnecessary, I know API" | Skills capture rate limits, auth quirks, pagination | Always check/create integrating-with-{vendor} skill  |
| "This is a simple integration"           | Complexity is unpredictable; all need full workflow | Follow all phases regardless of perceived simplicity |
| "Discovery is overkill for one file"     | Discovery finds existing patterns to reuse          | Run discovery; saves time vs reinventing             |

### Compaction Rationalizations

| Rationalization                          | Why It Fails                                       | Counter                                                 |
| ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| "Outputs are already written to files"   | Writing ≠ compaction; must replace inline context  | Invoke persisting-progress-across-sessions at gate      |
| "Context seems fine, no need to compact" | Cannot assess context bloat; discovery adds 10-30K | Compaction is preventive, not reactive                  |
| "I'll compact later if needed"           | Later = too late; context rot degrades agents      | Compact at EVERY scheduled gate                         |
| "Already loaded skills at start"         | Gate requires fresh invocation each time           | Invoke persisting-progress-across-sessions at EACH gate |

---

## Detection Patterns

Watch for these phrases in agent thinking or responses:

| Phrase               | Meaning                    | Response                   |
| -------------------- | -------------------------- | -------------------------- |
| "close enough"       | Precision matters          | Exact compliance required  |
| "just this once"     | Exceptions become patterns | No exceptions              |
| "I'll fix it later"  | 95% never fixed            | Fix it now                 |
| "it's obvious"       | Document it anyway         | Write it down              |
| "this is different"  | Patterns exist for reason  | Follow the pattern         |
| "users won't notice" | They will, eventually      | Do it right                |
| "we can refactor"    | Later never comes          | Refactor now or not at all |

---

## Key Principle

**If you detect rationalization phrases in your thinking, STOP.**

1. Return to the phase checklist
2. Complete all items before proceeding
3. Never self-approve exceptions

---

## Override Protocol

If a P0 requirement genuinely doesn't apply:

1. **Use AskUserQuestion** to confirm with user
2. **Document exception** in p0-compliance-review.md with rationale
3. **User must explicitly approve** the exception

Example rationale: "SCM integration with no IP assets - VMFilter not applicable"

**Never self-approve exceptions to P0 requirements.**

---

## Evidence-Based Gates

Use these gates to remove subjectivity:

| Gate                       | Phase | Enforcement                          |
| -------------------------- | ----- | ------------------------------------ |
| P0 Validation              | 10    | Automated check, no human judgment   |
| Review Retry Limit         | 11    | Max 3 retries, then human escalation |
| Test Coverage              | 14    | ≥80% coverage or block               |
| Exit Criteria Verification | 16    | All checkboxes must be verified      |

Gates enforce standards mechanically - no rationalization possible.

---

## Related References

- [orchestration-guards.md](orchestration-guards.md) - Anti-rationalization protocols
- [checkpoint-configuration.md](checkpoint-configuration.md) - Human approval points
- [compaction-gates.md](compaction-gates.md) - Compaction skip prevention
