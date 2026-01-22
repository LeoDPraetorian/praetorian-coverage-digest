**Parent document**: [phase-7-code-review.md](phase-7-code-review.md)

# Phase 9: Review Checklists

Comprehensive checklists for spec compliance, quality, and security review.

## Stage 1: Spec Compliance Checklist

Use this checklist to verify implementation matches approved architecture:

- [ ] Error handling pattern matches architecture-shared.md
- [ ] Zod schema matches tools/{tool}/architecture.md
- [ ] Response filtering achieves 80-99% token reduction
- [ ] Uses response-utils (not manual string manipulation)
- [ ] Uses sanitize.ts validators in Zod schema
- [ ] Uses mcp-client.ts for MCP calls
- [ ] FilteredResult interface matches architecture
- [ ] No `any` types
- [ ] Security sanitization per security-assessment.md

**If ANY item unchecked → SPEC_VIOLATION verdict**

## Stage 2: Quality Checklist

Use this checklist for code quality and maintainability assessment:

### Code Structure

- [ ] No barrel file anti-patterns
- [ ] Follows existing wrapper patterns
- [ ] No hardcoded values (use config)
- [ ] Proper separation of concerns

### Documentation

- [ ] TSDoc documentation present and complete
- [ ] Public API methods documented
- [ ] Complex logic has explanatory comments
- [ ] Type annotations are clear

### Error Handling

- [ ] Error handling covers all failure modes
- [ ] Edge cases handled (null, empty, malformed)
- [ ] Error messages are descriptive
- [ ] No silent failures

### Type Safety

- [ ] TypeScript strict mode compliant
- [ ] Proper type inference (no redundant type annotations)
- [ ] No type assertions without justification
- [ ] Generic types properly constrained

### Testing

- [ ] Test coverage adequate (≥80%)
- [ ] Edge cases tested
- [ ] Error conditions tested
- [ ] Mocks properly configured

**If ANY critical item unchecked → CHANGES_REQUESTED or BLOCKED verdict**

## Stage 2: Security Checklist

Use this checklist for security threat analysis:

### Input Validation

- [ ] All input fields sanitized
- [ ] Control characters blocked via Zod refinements
- [ ] Input length limits enforced
- [ ] Special characters handled safely

### Injection Prevention

- [ ] No injection vulnerabilities (SQL, NoSQL, command)
- [ ] User input never directly interpolated
- [ ] Parameterized queries used (if applicable)
- [ ] Template literals use safe escaping

### Path Security

- [ ] No path traversal risks
- [ ] File paths validated and sanitized
- [ ] Directory traversal patterns blocked
- [ ] Absolute paths used where required

### XSS Prevention

- [ ] No XSS vectors
- [ ] HTML output sanitized/escaped
- [ ] User-generated content properly escaped
- [ ] Content-Type headers appropriate

### Data Protection

- [ ] Sensitive data not logged
- [ ] PII handling follows privacy policy
- [ ] Credentials never exposed in responses
- [ ] Error messages don't leak sensitive info

### Authentication & Authorization

- [ ] Rate limiting considered
- [ ] Authentication/authorization validated
- [ ] Token/session handling secure
- [ ] Privilege escalation prevented

**If ANY critical security item unchecked → BLOCKED verdict**

## Pass 1 vs Pass 2 (Quality Review)

### Pass 1: Maintainability Focus

Review from maintainability perspective:

- Can a new developer understand this code?
- Are naming conventions clear?
- Is the code DRY?
- Are dependencies minimal?
- Is the logic complex or simple?

### Pass 2: Performance & Extensibility Focus

Review from different angle:

- Are there performance bottlenecks?
- Is the code extensible for future changes?
- Are edge cases handled efficiently?
- Could this be simplified further?
- Are there better TypeScript patterns?

### Consensus Issues

**Include in final report only if:**

- Pass 1 identified AND Pass 2 confirmed
- Pass 2 found new issue Pass 1 missed

**Discard if:**

- Pass 1 found but Pass 2 contradicts
- Issue is subjective preference, not objective problem

## Threat Analysis Questions (Security Review)

### SQL/NoSQL Injection

- Q: Can user input reach database queries?
- Q: Are inputs parameterized/sanitized?
- Q: Are ORM/query builder protections in place?

### Path Traversal

- Q: Does tool accept file paths?
- Q: Are paths validated against traversal?
- Q: Are `../` patterns blocked?
- Q: Are symlinks handled safely?

### XSS (Cross-Site Scripting)

- Q: Is output HTML-rendered anywhere?
- Q: Are outputs sanitized/escaped?
- Q: Are user inputs reflected in responses?
- Q: Is Content-Security-Policy appropriate?

### Control Character Injection

- Q: Are control characters blocked?
- Q: Are ANSI escape codes sanitized?
- Q: Are null bytes rejected?
- Q: Are Unicode control characters filtered?

### Command Injection

- Q: Does tool execute system commands?
- Q: Are command arguments sanitized?
- Q: Are shell metacharacters escaped?
- Q: Is command execution necessary?

### Data Exposure

- Q: Are API keys/tokens in responses?
- Q: Are PII fields filtered?
- Q: Are internal paths exposed?
- Q: Are stack traces sanitized?

### Rate Limiting & DoS

- Q: Are rate limits enforced?
- Q: Is pagination implemented?
- Q: Are timeouts configured?
- Q: Can the tool be abused for DoS?

## Verdict Decision Matrix

### Stage 1: Spec Compliance

| Condition                        | Verdict        |
| -------------------------------- | -------------- |
| All checklist items pass         | SPEC_COMPLIANT |
| Any checklist item fails         | SPEC_VIOLATION |
| Architecture pattern not matched | SPEC_VIOLATION |
| Token budget exceeded            | SPEC_VIOLATION |
| Infrastructure not used          | SPEC_VIOLATION |

### Stage 2: Quality

| Condition                       | Verdict           |
| ------------------------------- | ----------------- |
| All items pass, no issues       | APPROVED          |
| Minor issues, easy fixes        | CHANGES_REQUESTED |
| Major architectural flaws       | BLOCKED           |
| >5 unresolved issues after Pass | CHANGES_REQUESTED |
| Critical maintainability issues | BLOCKED           |

### Stage 2: Security

| Condition                                 | Verdict           |
| ----------------------------------------- | ----------------- |
| No vulnerabilities, all mitigations       | APPROVED          |
| Low/medium risk, fixable                  | CHANGES_REQUESTED |
| Critical vulnerabilities (injection, XSS) | BLOCKED           |
| Missing essential security controls       | BLOCKED           |
| Data exposure risks                       | BLOCKED           |

### Overall Verdict (Stage 2 Consolidation)

| Quality           | Security          | Overall           |
| ----------------- | ----------------- | ----------------- |
| APPROVED          | APPROVED          | APPROVED          |
| APPROVED          | CHANGES_REQUESTED | CHANGES_REQUESTED |
| APPROVED          | BLOCKED           | BLOCKED           |
| CHANGES_REQUESTED | APPROVED          | CHANGES_REQUESTED |
| CHANGES_REQUESTED | CHANGES_REQUESTED | CHANGES_REQUESTED |
| CHANGES_REQUESTED | BLOCKED           | BLOCKED           |
| BLOCKED           | \*                | BLOCKED           |

**Rule:** BLOCKED in either review = BLOCKED overall

## Checklist Usage Examples

### Example: Spec Compliance Pass

```markdown
## Spec Compliance Checklist: get-issue

- [x] Error handling pattern matches architecture-shared.md (Result<T, E> used)
- [x] Zod schema matches tools/get-issue/architecture.md (all fields present)
- [x] Response filtering achieves 90% reduction (5000 → 500 tokens)
- [x] Uses response-utils.filterResponse() (line 45)
- [x] Uses sanitize.ts validators in Zod schema (lines 12-20)
- [x] Uses mcp-client.callMCPTool() (line 38)
- [x] FilteredResult interface matches architecture (exact match)
- [x] No `any` types (checked with tsc --noImplicitAny)
- [x] Security sanitization per security-assessment.md (all inputs sanitized)

**Verdict: SPEC_COMPLIANT** ✅
```

### Example: Security Fail

```markdown
## Security Checklist: list-issues

### Input Validation

- [x] All input fields sanitized
- [x] Control characters blocked via Zod refinements
- [x] Input length limits enforced
- [x] Special characters handled safely

### XSS Prevention

- [ ] ❌ No XSS vectors - **FAILED**
  - Issue: `issue.description` field contains HTML, not sanitized before returning
  - Risk: HIGH - User-generated HTML returned to Claude without escaping
  - Fix: Apply sanitizeHTML() to description field

### Data Protection

- [x] Sensitive data not logged
- [x] PII handling follows privacy policy
- [x] Credentials never exposed in responses
- [x] Error messages don't leak sensitive info

**Verdict: CHANGES_REQUESTED** ⚠️

**Critical issue:** XSS vulnerability in description field (HIGH risk)
```

## Related References

- [Phase 9: Code Review](phase-7-code-review.md) - Review process overview
- [Phase 9: Review Examples](phase-7-examples.md) - Example review feedback
