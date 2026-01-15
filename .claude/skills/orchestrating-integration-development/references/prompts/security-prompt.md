# Security Review Agent Prompt Template (Phase 5 Stage 2)

**Agent**: backend-security
**Phase**: 5 Stage 2 (Security Review)
**Purpose**: Identify security vulnerabilities and data handling risks

## Prompt Template

```markdown
Task: Security Review for {vendor} integration

You are in Phase 5 Stage 2 of integration development. Your goal is to identify security vulnerabilities, assess risk, and ensure secure coding practices.

## Input Files

1. **Implementation files**: {list from Phase 4}
2. **architecture.md**: Reference for intended design
3. **spec-compliance-review.md**: Spec compliance status

## Security Review Checklist

### Credential Handling
- [ ] Secrets retrieved from Job.Secret (not hardcoded)
- [ ] API keys never logged
- [ ] Credentials never in error messages
- [ ] No credentials in comments or debug statements

**Verification**:
```bash
# Check for hardcoded secrets
grep -iE "api[_-]?key|secret|password|token" {file}.go | grep -v "Job.Secret"

# Check logging for sensitive data
grep -n "slog\|log\|fmt.Print" {file}.go
```

### Input Validation
- [ ] External API responses validated before use
- [ ] Nil checks on optional fields
- [ ] Array bounds checked
- [ ] Type assertions checked

**Example vulnerability**:
```go
// ❌ VULNERABLE - no validation
asset := resp.Items[0]  // May panic if empty

// ✅ SECURE - validated
if len(resp.Items) == 0 {
    return fmt.Errorf("no items in response")
}
asset := resp.Items[0]
```

### Injection Prevention
- [ ] No SQL injection (use parameterized queries)
- [ ] No command injection (avoid os.Exec with user input)
- [ ] No path traversal (validate file paths)
- [ ] No template injection

**Note**: Most integrations don't have SQL/shell commands, but verify if present.

### TLS/HTTPS Enforcement
- [ ] All API calls use HTTPS
- [ ] No InsecureSkipVerify (unless explicitly required and documented)
- [ ] Certificate validation enabled

**Verification**:
```bash
# Check for HTTP usage
grep -n "http://" {file}.go | grep -v "localhost\|127.0.0.1"

# Check for InsecureSkipVerify
grep -n "InsecureSkipVerify.*true" {file}.go
```

### Rate Limit Compliance
- [ ] Respects vendor rate limits
- [ ] Implements backoff on rate limit errors
- [ ] Doesn't overwhelm external API
- [ ] SetLimit value appropriate for vendor API

### Error Disclosure
- [ ] Error messages don't leak sensitive data
- [ ] Stack traces don't expose internal paths in production
- [ ] Error details appropriate for logging level

**Example vulnerability**:
```go
// ❌ LEAKS - exposes API key
return fmt.Errorf("auth failed with key %s", apiKey)

// ✅ SAFE - no sensitive data
return fmt.Errorf("auth failed: invalid credentials")
```

### Data Handling
- [ ] PII handled appropriately (if any)
- [ ] Data sanitized before storage
- [ ] No excessive data retention

## Security Finding Template

For each issue found, document:

```markdown
### {Severity}: {Title}

**Location**: {file}:{method or line reference}

**Issue**: {description of vulnerability}

**Risk**: {what could go wrong}

**Recommendation**: {how to fix}

**Example Fix**:
```go
{code example showing the fix}
```
```

## Severity Classification

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Direct security vulnerability, easily exploitable | Hardcoded secrets, SQL injection, authentication bypass |
| **High** | Security weakness requiring specific conditions | Insufficient input validation, insecure defaults |
| **Medium** | Defense-in-depth issues | Missing rate limiting, no error context sanitization |
| **Low** | Best practice deviations | Overly detailed error messages, no logging |

## MANDATORY SKILLS

- using-skills: Skill discovery workflow
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: security-review.md

COMPLIANCE: Document invoked skills in output metadata.

## Output Format: security-review.md

```markdown
# Security Review: {vendor}

## Verdict: {APPROVED | SECURITY_ISSUES}

## Executive Summary

{1-2 paragraph overview of security posture}

## Findings by Severity

### Critical
{None found | List with required fixes}

### High
{None found | List with required fixes}

### Medium
{None found | List with recommendations}

### Low
{None found | List with suggestions}

## Security Checklist

| Control | Status | Evidence |
|---------|--------|----------|
| Secrets via Job.Secret | {✅|❌} | {verification} |
| No secrets in logs | {✅|❌} | {verification} |
| HTTPS enforced | {✅|❌} | {verification} |
| Input validation | {✅|❌} | {verification} |
| Error messages safe | {✅|❌} | {verification} |
| Rate limit compliance | {✅|❌} | {verification} |

## Required Fixes

{For Critical/High only - these BLOCK approval}

## Recommendations

{For Medium/Low - suggested improvements}

{Include JSON metadata block at end}
```

## Success Criteria

Security review is complete when:
- [ ] All security dimensions assessed
- [ ] Findings categorized by severity
- [ ] Critical/High issues have required fixes
- [ ] Clear verdict (APPROVED or SECURITY_ISSUES)
- [ ] Evidence provided for all findings
```
