**Parent document**: [phase-7-code-review.md](phase-7-code-review.md)

# Phase 9: Review Examples

Real-world examples of review feedback and verdicts across all stages.

## Stage 1 Example: SPEC_VIOLATION

```markdown
## Spec Compliance Review: list-issues

### Verdict: SPEC_VIOLATION

### Issues

1. **Error handling pattern mismatch**
   - File: `.claude/tools/linear/list-issues.ts:45-50`
   - Expected: Result<T, E> pattern from architecture-shared.md
   - Actual: try-catch with throw
   - Fix: Wrap in Result.ok() / Result.err()

2. **Response filtering incomplete**
   - File: `.claude/tools/linear/list-issues.ts:72`
   - Expected: 95% token reduction (architecture: 2000 → 100 tokens)
   - Actual: 60% reduction (2000 → 800 tokens)
   - Fix: Apply field whitelist from architecture.md section 3.2

3. **Manual string truncation**
   - File: `.claude/tools/linear/list-issues.ts:68`
   - Expected: truncateForContext() from response-utils
   - Actual: .substring(0, 500)
   - Fix: Import and use response-utils.truncateForContext()
```

## Stage 1 Example: SPEC_COMPLIANT

```markdown
## Spec Compliance Review: get-issue

### Step 1: Architecture Pattern Match

Q: Does the implementation use the error handling pattern from architecture-shared.md?
A: YES - Uses Result<FilteredIssue, MCPError> at line 42

Q: Does the Zod schema match the design from tools/get-issue/architecture.md?
A: YES - All 8 fields present with correct types

Q: Does the response filtering match the token optimization strategy?
A: YES - Filters 18 fields → 5 fields as specified

### Step 2: Token Budget Compliance

Q: What token reduction was achieved?
A: Raw: 3200 tokens, Filtered: 480 tokens

Q: Does this meet the 80-99% reduction target?
A: YES - 85% reduction achieved

### Step 3: Infrastructure Usage

Q: Does the wrapper use response-utils for truncation/filtering?
A: YES - filterResponse() imported and used at line 56

Q: Does the wrapper use sanitize.ts for input validation?
A: YES - Zod schema uses sanitizeString() refinement

Q: Does the wrapper use mcp-client.ts for MCP calls?
A: YES - callMCPTool() used at line 48

### Step 4: Security Pattern Match

Q: Are all input fields sanitized per security-assessment.md?
A: YES - issueId field has Zod refinement blocking control chars

Q: Are control characters blocked?
A: YES - .refine(noControlChars) at line 15

### Step 5: Type Safety

Q: Are all types explicitly defined (no `any`)?
A: YES - All types explicit, tsc --noImplicitAny passes

Q: Does FilteredResult interface match architecture?
A: YES - Interface matches architecture.md exactly

### Verdict: SPEC_COMPLIANT ✅
```

## Stage 2 Example: Quality CHANGES_REQUESTED

```markdown
## Quality Review: list-issues

### Pass 1: Issue Identification

Issues found:

1. Missing TSDoc for FilteredIssue interface
2. Hardcoded page size (100) at line 52
3. No handling for pagination errors

### Pass 2: Validation

Confirmed issues:

1. TSDoc missing (confirmed) - public interface should be documented
2. Hardcoded page size (confirmed) - should use config.DEFAULT_PAGE_SIZE
3. Pagination errors (confirmed) - rate limiting not handled, throws generic error
4. NEW: Type assertion bypasses type safety (line 82) - uses `as FilteredIssue[]` without validation

Discarded issues:

- None from Pass 1 contradicted

### Consensus Issues

1. Add TSDoc to FilteredIssue interface explaining each field
2. Move page size to configuration constant
3. Handle rate limit errors from pagination with retry logic
4. Remove type assertion at line 82, use proper type guards

### Verdict: CHANGES_REQUESTED

**Rationale:** 4 issues, all fixable. No blocking problems, but should address before merge.
```

## Stage 2 Example: Security CHANGES_REQUESTED

````markdown
## Security Review: list-issues

### Threat 1: SQL/NoSQL Injection (SECURE)

Q: Can user input reach database queries?
A: NO - MCP handles all data access, no direct queries

Verdict: SECURE ✅

### Threat 2: Path Traversal (N/A)

Q: Does tool accept file paths?
A: NO - Tool operates on issue IDs only

Verdict: N/A

### Threat 3: XSS (VULNERABLE)

Q: Is output HTML-rendered anywhere?
A: YES - issue.description may contain HTML/Markdown

Q: Are outputs sanitized/escaped?
A: NO - Description field returned without sanitization (line 68)

**Risk:** HIGH
**Fix:** Sanitize HTML in description field before returning using sanitizeHTML() from sanitize.ts

Verdict: VULNERABLE ⚠️

### Threat 4: Control Character Injection (SECURE)

Q: Are control characters blocked?
A: YES - Zod schema blocks control characters via .refine(noControlChars) at line 15

Verdict: SECURE ✅

### Overall Assessment

Critical vulnerabilities: 0
High-risk issues: 1 (XSS in description field)
Medium-risk issues: 0

### Verdict: CHANGES_REQUESTED

**Critical Issue:** XSS risk in issue.description field (HIGH priority)

**Required Fix:**

```typescript
// Before
description: issue.description,

// After
description: sanitizeHTML(issue.description),
```
````

````

## Stage 2 Example: APPROVED (Both Quality + Security)

```markdown
## Quality Review: get-issue

### Pass 1: Issue Identification

Issues found: None

All quality standards met:
- TSDoc complete and clear
- No hardcoded values
- Error handling comprehensive
- Type safety strict

### Pass 2: Validation

Confirmed: No issues found in Pass 1
New issues: None

Code is clean, maintainable, and follows all TypeScript best practices.

### Verdict: APPROVED ✅
````

```markdown
## Security Review: get-issue

### Threat Analysis

All threats analyzed, all mitigations in place:

- Injection: N/A (no database access)
- Path Traversal: N/A (no file operations)
- XSS: SECURE (output sanitized with sanitizeHTML())
- Control Characters: SECURE (Zod refinement blocks)
- Data Exposure: SECURE (no sensitive fields in response)
- Rate Limiting: SECURE (MCP handles rate limits)

### Overall Assessment

Critical vulnerabilities: 0
High-risk issues: 0
Medium-risk issues: 0

### Verdict: APPROVED ✅
```

## Stage 2 Example: BLOCKED (Security)

```markdown
## Security Review: admin-delete-user

### Threat 1: Authorization Bypass (CRITICAL)

Q: Does tool validate user permissions?
A: NO - Tool accepts userId without verifying caller has admin privileges

Q: Can non-admin users call this endpoint?
A: YES - No authorization check before calling MCP

**Risk:** CRITICAL
**Impact:** Any user can delete any other user account

Verdict: VULNERABLE 🚨

### Threat 2: Data Loss Prevention (CRITICAL)

Q: Is deletion reversible?
A: NO - MCP permanently deletes user data

Q: Are there safeguards against accidental deletion?
A: NO - No confirmation, no soft-delete, no backup

**Risk:** CRITICAL
**Impact:** Permanent data loss without recovery option

Verdict: VULNERABLE 🚨

### Overall Assessment

Critical vulnerabilities: 2
High-risk issues: 0
Medium-risk issues: 0

### Verdict: BLOCKED 🚨

**Blocking Issues:**

1. Authorization bypass allows privilege escalation
2. No safeguards against accidental/malicious data loss

**Required Actions:**

1. Add admin role verification before allowing deletion
2. Implement soft-delete or require explicit confirmation
3. Consider audit logging for deletion events

**This tool CANNOT be approved until these critical security issues are addressed.**
```

## Consolidated Verdict Examples

### Example 1: Overall APPROVED

```markdown
## Review Final: get-issue

### Stage 1: Spec Compliance

Verdict: SPEC_COMPLIANT ✅

### Stage 2: Quality

Verdict: APPROVED ✅

### Stage 2: Security

Verdict: APPROVED ✅

### Overall Verdict: APPROVED ✅

**No issues found. Tool is ready for GREEN gate.**
```

### Example 2: Overall CHANGES_REQUESTED

```markdown
## Review Final: list-issues

### Stage 1: Spec Compliance

Verdict: SPEC_COMPLIANT ✅

### Stage 2: Quality

Verdict: CHANGES_REQUESTED ⚠️
Issues: 4 (TSDoc, hardcoded values, error handling, type assertion)

### Stage 2: Security

Verdict: CHANGES_REQUESTED ⚠️
Issues: 1 HIGH (XSS in description field)

### Overall Verdict: CHANGES_REQUESTED ⚠️

**Required fixes:**

1. Security: Sanitize description field (HIGH priority)
2. Quality: Add TSDoc, move constants to config, handle rate limits, remove type assertion

**Retry count:** 0 of 1
**Action:** Send back to tool-developer for fixes, then re-review Stage 2
```

### Example 3: Overall BLOCKED

```markdown
## Review Final: admin-delete-user

### Stage 1: Spec Compliance

Verdict: SPEC_COMPLIANT ✅

### Stage 2: Quality

Verdict: APPROVED ✅

### Stage 2: Security

Verdict: BLOCKED 🚨
Critical issues: 2 (authorization bypass, data loss prevention)

### Overall Verdict: BLOCKED 🚨

**Blocking reasons:**

1. CRITICAL: Authorization bypass allows any user to delete accounts
2. CRITICAL: No safeguards against permanent data loss

**This tool requires architectural changes to address critical security vulnerabilities.**

**Next steps:**

1. Escalate to user for decision
2. Options: Revise architecture, skip this tool, escalate to team
```

## Retry Workflow Example

```markdown
## Review History: update-issue

### Attempt 1

**Stage 1:** SPEC_COMPLIANT ✅
**Stage 2 Quality:** CHANGES_REQUESTED (3 issues)
**Stage 2 Security:** CHANGES_REQUESTED (1 XSS issue)
**Overall:** CHANGES_REQUESTED

### Fix Applied by tool-developer

- Fixed XSS: Added sanitizeHTML() to description field
- Fixed quality: Added TSDoc, moved constants to config
- Remaining: 1 issue (error handling for rate limits)

### Attempt 2 (Re-review Stage 2)

**Stage 1:** SPEC_COMPLIANT ✅ (no re-review needed)
**Stage 2 Quality:** APPROVED ✅ (all issues fixed)
**Stage 2 Security:** APPROVED ✅ (XSS fixed)
**Overall:** APPROVED ✅

**Retry count:** 1
**Tool approved after first retry.**
```

## Related References

- [Phase 9: Code Review](phase-7-code-review.md) - Review process overview
- [Phase 9: Checklists](phase-7-checklists.md) - Complete review checklists
