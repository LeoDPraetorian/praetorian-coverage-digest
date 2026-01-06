---
name: reviewing-backend-security
description: Use when reviewing Go backend code for security vulnerabilities - provides OWASP Top 10 framework, Go-specific patterns, severity classification, and security findings template
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite
---

# Reviewing Backend Security

**Security review framework and process for Go backend implementations - extracted from backend-security agent.**

## When to Use

Use this skill when:

- Performing security reviews of Go backend code
- Classifying security vulnerability severity
- Writing structured security findings reports
- Need OWASP Top 10 guidance for Go applications
- Reviewing authentication, authorization, or injection vulnerabilities

## Quick Reference

| Component            | Purpose                                      |
| -------------------- | -------------------------------------------- |
| OWASP Top 10 Focus   | Core vulnerability categories to check       |
| Go-Specific Patterns | Language-specific security anti-patterns     |
| Severity Table       | Classify findings (CRITICAL/HIGH/MEDIUM/LOW) |
| Findings Template    | Structured markdown for security reports     |

## Security Review Framework

### OWASP Top 10 Focus

When reviewing code, prioritize these vulnerability categories:

1. **Injection** - SQL, command, LDAP injection vulnerabilities
2. **Broken Authentication** - JWT handling, session management, token validation
3. **Broken Authorization** - RBAC implementation, access control
4. **Sensitive Data Exposure** - Credentials, PII, API keys in logs/responses
5. **Security Misconfigurations** - Default configs, unnecessary features enabled
6. **Insecure Deserialization** - Untrusted data deserialization risks

### Go-Specific Security Patterns

Check for these Go language-specific issues:

| Pattern                                | Risk                                 | Detection                             |
| -------------------------------------- | ------------------------------------ | ------------------------------------- |
| **Race Conditions**                    | Concurrent access to shared state    | Unsynchronized goroutines/channels    |
| **Context.Context Missing**            | Request scoping, timeout propagation | Handlers without context parameter    |
| **SQL Without Prepared Statements**    | SQL injection vulnerability          | String concatenation in queries       |
| **TLS Configuration Errors**           | Man-in-the-middle attacks            | InsecureSkipVerify, weak cipher suite |
| **Error Handling Information Leakage** | Internal details exposed to clients  | Stack traces, database errors in API  |

### Severity Classification

Use this table to classify all security findings:

| Severity | Impact Description                                           | Examples                                                     |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| CRITICAL | Full system compromise, data breach, authentication bypass   | SQL injection, auth bypass, credential exposure              |
| HIGH     | Privilege escalation, unauthorized access, data manipulation | Authorization flaws, input validation gaps, insecure configs |
| MEDIUM   | Information disclosure, availability impact                  | Weak error handling, missing security headers                |
| LOW      | Minor information leakage, hardening opportunities           | Version disclosure, verbose logs, missing rate limiting      |

## Security Findings Template

Use this structure when writing security review outputs:

```markdown
# Security Review: [Feature Name]

## Summary

[Brief overview of what was reviewed - components, scope, methodology]

## Security Findings

### Critical Issues

| Severity | Issue                | Location  | Remediation  |
| -------- | -------------------- | --------- | ------------ |
| CRITICAL | [Vulnerability type] | file:line | [How to fix] |

### High Severity Issues

| Severity | Issue                | Location  | Remediation  |
| -------- | -------------------- | --------- | ------------ |
| HIGH     | [Vulnerability type] | file:line | [How to fix] |

### Medium/Low Severity Issues

| Severity | Issue                | Location  | Remediation  |
| -------- | -------------------- | --------- | ------------ |
| MEDIUM   | [Vulnerability type] | file:line | [How to fix] |
| LOW      | [Vulnerability type] | file:line | [How to fix] |

## Verification

Document any automated security checks performed:

- Static analysis (gosec): [Pass/Fail with details]
- Race detection (go test -race): [Pass/Fail with details]
- Dependency vulnerabilities (govulncheck): [Pass/Fail with details]

## Verdict

**APPROVED** / **CHANGES REQUESTED** / **BLOCKED**

[Justification for verdict based on findings severity]

## Recommendations

[Actionable next steps for developer to address findings]
```

## Authentication & Authorization Review Checklist

When reviewing auth implementations:

- [ ] JWT tokens validated with proper signature verification
- [ ] Cognito integration follows secure session management
- [ ] RBAC implementation enforces least privilege
- [ ] Token refresh flows prevent session fixation
- [ ] Logout invalidates tokens server-side
- [ ] Authorization checks on all protected endpoints

## Injection & Input Validation Checklist

When reviewing data handling:

- [ ] Parameterized queries/prepared statements used
- [ ] User input sanitized before use in commands
- [ ] Data validation applied at API boundaries
- [ ] No string concatenation in SQL/LDAP/command construction
- [ ] Output encoding prevents XSS (if rendering HTML)

## Related Skills

- `enforcing-evidence-based-analysis` - Verify code state before making security claims
- `debugging-systematically` - Root cause analysis for security vulnerabilities
- `persisting-agent-outputs` - Where to write security review files
- `verifying-before-completion` - Final validation before completing review
- `adhering-to-yagni` - Flag unnecessary security complexity
