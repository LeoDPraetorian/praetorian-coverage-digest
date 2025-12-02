# Self-Review Checklist Template

Copy this template for use in commit messages or review documentation.

## Pre-Commit Self-Review

**Date:** [YYYY-MM-DD]
**Change:** [Brief description]
**Files:** [List of modified files]

### Security Review ✓

- [ ] Input validation: All user inputs validated and sanitized
- [ ] Authentication: Auth checks in right places, no bypasses
- [ ] Authorization: RBAC/permissions checked correctly
- [ ] Injection: No SQL injection, XSS, command injection vectors
- [ ] Sensitive data: No secrets, credentials, PII in logs/errors
- [ ] Error messages: No information leakage in errors

**Security notes:** [Any specific security considerations]

### Code Quality Review ✓

- [ ] Duplication: No copy-pasted code
- [ ] Naming: Variables/functions clearly named
- [ ] Complexity: Functions under 50 lines, reasonable complexity
- [ ] Error handling: All errors caught and handled
- [ ] Logging: Errors logged with sufficient context
- [ ] Comments: Complex logic explained, no commented-out code

**Quality notes:** [Any technical debt or refactoring needs]

### Edge Cases & Testing ✓

- [ ] Nil/null checks: All pointer dereferences safe
- [ ] Boundary conditions: Zero, negative, max values handled
- [ ] Concurrency: No race conditions, lock ordering correct
- [ ] Error paths: Failure modes tested
- [ ] Resource cleanup: Defer/cleanup calls present

**Edge cases tested:** [List specific scenarios tested]

### Domain-Specific Checks ✓

**[Go/React/Database/etc]:**
- [ ] [Domain-specific check 1]
- [ ] [Domain-specific check 2]
- [ ] [Domain-specific check 3]

**Domain notes:** [Any domain-specific considerations]

---

## Review Outcome

**Issues Found:** [Count and severity]
**Issues Fixed:** [List what was addressed]
**Follow-up Items:** [Any TODOs or future work]

**Ready for commit:** [ ] YES / [ ] NO (if no, address issues first)

---

## For Emergency Reviews (5-min focused)

**Emergency Context:** [Why emergency review vs. full review]

**Focused Checks (5 minutes):**
- Security implications: [What was checked]
- Breaking changes: [What else could break]
- Side effects: [What could go wrong]

**Follow-up Plan:**
- [ ] Comprehensive review scheduled for: [When]
- [ ] Follow-up ticket created: [Ticket ID]
- [ ] Specific areas needing deeper review: [List]

---

## Example Usage in Commit Message

```
feat: implement JWT token validation with RBAC

Self-review completed:
- Security: Input validation verified, auth bypass attempts tested,
  JWT secret handling validated, no PII in error messages
- Edge cases: Token expiration, invalid signatures, missing claims,
  role validation bypass attempts all tested
- Code quality: No duplication, error handling comprehensive,
  logging includes request context
- Follow-up: TODO added for rate limiting on auth endpoints

Ready for external review.
```
