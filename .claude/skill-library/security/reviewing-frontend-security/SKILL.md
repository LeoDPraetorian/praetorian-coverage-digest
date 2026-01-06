---
name: reviewing-frontend-security
description: Use when reviewing React/TypeScript frontend code for security vulnerabilities - provides authentication patterns, XSS prevention framework, severity classification, and security findings template
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite
---

# Reviewing Frontend Security

**Security review framework and process for React/TypeScript frontend implementations - extracted from frontend-security agent.**

## When to Use

Use this skill when:

- Performing security reviews of React/TypeScript frontend code
- Classifying frontend security vulnerability severity
- Writing structured security findings reports for UI components
- Need authentication & authorization review guidance for React apps
- Reviewing XSS vulnerabilities and input validation in frontend code

## Quick Reference

| Component                   | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| Authentication & Auth Check | JWT handling, Cognito, RBAC patterns         |
| XSS Prevention Framework    | Input validation, sanitization, React safety |
| Severity Table              | Classify findings (CRITICAL/HIGH/MEDIUM/LOW) |
| Findings Template           | Structured markdown for security reports     |

## Security Review Process

### Step 1: Locate Security Architecture Plan (if exists)

```bash
# Check feature directory first (from persisting-agent-outputs discovery)
ls .claude/features/*/security-*.md

# Check standard location
ls docs/plans/*-security-*.md
```

**If security architecture plan exists**: Review implementation against the plan's security requirements.

**If no plan exists**: Review against general security standards (note this limitation in output).

### Step 2: Read All Code Before Reviewing

**You MUST read source code before claiming vulnerabilities exist.**

```bash
# Find authentication components
find modules/chariot/ui/src -name "*auth*" -o -name "*login*"

# Find input handling components
find modules/chariot/ui/src -name "*form*" -o -name "*input*"

# Read each relevant file
Read("modules/chariot/ui/src/components/Login.tsx")
```

### Step 3: Review Against Security Framework

**Authentication & Authorization:**

- JWT token handling and storage patterns
- Cognito integration and session management
- RBAC implementation
- Secure logout and token refresh

**Input Validation & XSS Prevention:**

- XSS vulnerabilities in user input handling
- Data sanitization and validation patterns
- React's built-in XSS protections
- Safe handling of dynamic content and HTML rendering

**Severity Classification:**

| Severity | Impact Description                                           | Examples                                                      |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| CRITICAL | Authentication bypass, XSS, sensitive data exposure          | Auth bypass, stored XSS, credentials in localStorage          |
| HIGH     | Authorization flaws, input validation gaps, insecure storage | Missing auth checks, reflected XSS, insecure session handling |
| MEDIUM   | Information disclosure, weak error handling                  | Stack traces in UI, verbose errors, missing security headers  |
| LOW      | Security headers, minor information leakage                  | Version disclosure, missing CSP headers, verbose logs         |

### Step 4: Write Security Findings to File

Follow `persisting-agent-outputs` skill to write findings to:

- `.claude/features/{slug}/security-review.md` (preferred), OR
- `docs/reviews/YYYY-MM-DD-{feature}-security-review.md`

**Required structure:**

```markdown
# Security Review: [Feature Name]

## Summary

[Brief overview of what was reviewed]

## Security Findings

### Critical Issues

[List with file:line, vulnerability type, remediation]

### High Severity Issues

[List with details]

### Medium/Low Severity Issues

[List with details]

## Verification

- Static analysis: [Pass/Fail with command output]
- Security tests: [Pass/Fail with command output]

## Verdict

**APPROVED** / **CHANGES REQUESTED** / **BLOCKED**

## Recommendations

[Actionable next steps for developer]
```

### Step 5: Verify Findings Before Completion

**Before claiming vulnerabilities exist:**

- Run static analysis tools (eslint security rules)
- Show command output in findings document
- Verify each finding with evidence (file:line references)
- Never say "might be vulnerable" - either IS vulnerable with evidence, or NOT

## Authentication & Authorization Review Checklist

When reviewing auth implementations:

- [ ] JWT tokens validated with proper signature verification
- [ ] Cognito integration follows secure session management
- [ ] RBAC implementation enforces least privilege
- [ ] Token refresh flows prevent session fixation
- [ ] Logout invalidates tokens and clears client state
- [ ] Authorization checks on all protected routes
- [ ] No sensitive data in localStorage/sessionStorage without encryption

## Input Validation & XSS Prevention Checklist

When reviewing input handling:

- [ ] User input sanitized before rendering
- [ ] No `dangerouslySetInnerHTML` without DOMPurify sanitization
- [ ] Form validation applied at field level
- [ ] Data validation before API submission
- [ ] No inline event handlers from user input
- [ ] React's automatic XSS protections not bypassed
- [ ] URL parameters validated before use

## Related Skills

- `enforcing-evidence-based-analysis` - Verify code state before making security claims
- `debugging-systematically` - Root cause analysis for security vulnerabilities
- `persisting-agent-outputs` - Where to write security review files
- `verifying-before-completion` - Final validation before completing review
- `adhering-to-yagni` - Flag unnecessary security complexity
