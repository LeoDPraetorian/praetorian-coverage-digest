# Security Audit Checklist

**Automated and manual security audit patterns for React applications.**

---

## Automated Grep Patterns

Run these commands to find potential vulnerabilities.

### XSS Vectors

```bash
# Find dangerouslySetInnerHTML usage
grep -rn "dangerouslySetInnerHTML" src/

# Find innerHTML usage (including refs)
grep -rn "\.innerHTML" src/

# Find eval usage
grep -rn "eval(" src/

# Find Function constructor
grep -rn "new Function(" src/

# Find document.write
grep -rn "document.write" src/
```

### Sensitive Data Exposure

```bash
# Find potential API keys
grep -rn "api.key\|apiKey\|api_key" src/

# Find hardcoded secrets
grep -rn "secret\|password\|token" src/ --include="*.ts" --include="*.tsx"

# Find localStorage sensitive storage
grep -rn "localStorage.setItem.*token\|localStorage.setItem.*jwt" src/

# Find console.log (potential data leaks)
grep -rn "console.log" src/ | wc -l
```

### URL Handling

```bash
# Find href usage (check for javascript: URLs)
grep -rn "href={" src/

# Find window.location assignments
grep -rn "window.location\s*=" src/

# Find redirects
grep -rn "redirect\|navigate" src/
```

### Authentication

```bash
# Find auth-related code
grep -rn "isAuthenticated\|isLoggedIn\|auth" src/

# Find role checks (ensure server-side too)
grep -rn "role.*admin\|isAdmin" src/

# Find permission checks
grep -rn "permission\|can\(" src/
```

---

## ESLint Security Audit

```bash
# Install security plugins
npm install --save-dev eslint-plugin-security eslint-plugin-react-security

# Run security-focused lint
npx eslint --ext .ts,.tsx src/ --rule 'react/no-danger: warn' --rule 'security/detect-object-injection: warn'
```

### Custom ESLint Config for Audit

```javascript
// .eslintrc.audit.js
module.exports = {
  plugins: ['security', 'react-security'],
  rules: {
    'react/no-danger': 'error',
    'react/no-danger-with-children': 'error',
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-child-process': 'error',
  },
};

// Run with: npx eslint -c .eslintrc.audit.js src/
```

---

## Dependency Audit

```bash
# npm audit
npm audit --json > audit-report.json
npm audit --audit-level=high

# Snyk (more comprehensive)
npx snyk test --json > snyk-report.json

# Check for outdated packages
npm outdated

# Find unused dependencies
npx depcheck
```

---

## Manual Review Checklist

### Authentication & Authorization

- [ ] **Token Storage**: Access tokens in memory, not localStorage
- [ ] **Refresh Tokens**: Stored in httpOnly cookies
- [ ] **Token Expiry**: Access tokens < 15 min, refresh < 30 days
- [ ] **Session Regeneration**: New session ID after login
- [ ] **Logout**: Clears both client state and server session
- [ ] **Server Validation**: All permissions checked server-side
- [ ] **Protected Routes**: Redirect unauthenticated users

### Input Handling

- [ ] **Sanitization**: All user HTML sanitized with DOMPurify
- [ ] **URL Validation**: Protocol allowlist (http, https, mailto)
- [ ] **Validation**: Zod/Yup schemas for all forms
- [ ] **Server Validation**: Never trust client-only validation
- [ ] **File Upload**: Type, size, and content validation

### XSS Prevention

- [ ] **dangerouslySetInnerHTML**: Always with DOMPurify
- [ ] **innerHTML**: Never on user content
- [ ] **href/src**: Validated before render
- [ ] **Event Handlers**: Never from user input
- [ ] **CSP**: Content Security Policy configured

### CSRF Protection

- [ ] **CSRF Tokens**: Implemented for cookie auth
- [ ] **SameSite Cookies**: Lax or Strict
- [ ] **State Changes**: Only via POST/PUT/DELETE
- [ ] **Token Validation**: Server validates on every request

### Data Protection

- [ ] **No Secrets in Bundle**: API keys server-side only
- [ ] **PII Minimized**: Only collect what's needed
- [ ] **Masked Display**: Sensitive data masked in UI
- [ ] **No Logging PII**: Console.log reviewed
- [ ] **HTTPS Only**: All requests over HTTPS

### Security Headers

- [ ] **CSP**: Configured (at least report-only)
- [ ] **HSTS**: Strict-Transport-Security set
- [ ] **X-Frame-Options**: DENY or SAMEORIGIN
- [ ] **X-Content-Type-Options**: nosniff
- [ ] **Referrer-Policy**: strict-origin-when-cross-origin

### Dependencies

- [ ] **npm audit**: No high/critical vulnerabilities
- [ ] **Lock File**: package-lock.json committed
- [ ] **Outdated Packages**: Regularly updated
- [ ] **Minimal Dependencies**: No unnecessary packages

---

## CI/CD Security Gates

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: npm audit
        run: npm audit --audit-level=high

      - name: ESLint security
        run: npx eslint --ext .ts,.tsx src/ -c .eslintrc.audit.js

      - name: Check for secrets
        run: |
          if grep -rn "sk_live\|api_key.*=.*['\"]" src/; then
            echo "Potential secrets found!"
            exit 1
          fi

      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Audit Report Template

```markdown
# Security Audit Report

**Application:** [App Name]
**Date:** [Date]
**Auditor:** [Name]

## Summary

| Category | Issues Found | Severity |
|----------|--------------|----------|
| XSS | X | Critical/High/Medium |
| Auth | X | Critical/High/Medium |
| CSRF | X | Critical/High/Medium |
| Data | X | Critical/High/Medium |
| Dependencies | X | Critical/High/Medium |

## Critical Findings

### Finding 1: [Title]
- **Severity:** Critical
- **Location:** src/components/X.tsx:42
- **Description:** [What's wrong]
- **Recommendation:** [How to fix]

## Recommendations

1. [Priority 1 action]
2. [Priority 2 action]
3. [Priority 3 action]
```

---

## Quick Audit Commands

```bash
# One-liner security check
npm audit --audit-level=high && \
grep -rn "dangerouslySetInnerHTML" src/ && \
grep -rn "localStorage.setItem.*token" src/ && \
grep -rn "eval(" src/

# Generate audit report
{
  echo "# Security Audit $(date)"
  echo "## npm audit"
  npm audit 2>&1
  echo "## dangerouslySetInnerHTML usage"
  grep -rn "dangerouslySetInnerHTML" src/ || echo "None found"
  echo "## localStorage token storage"
  grep -rn "localStorage.*token" src/ || echo "None found"
} > security-audit.md
```

---

## Related Resources

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
