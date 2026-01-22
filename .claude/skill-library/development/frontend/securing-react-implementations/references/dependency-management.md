# Dependency Management Security

**Securing npm dependencies in React applications.**

---

## The Risk

**Third-party packages are a major attack vector.**

- Supply chain attacks (compromised packages)
- Known vulnerabilities (CVEs)
- Typosquatting (malicious lookalike packages)
- Abandoned packages (unpatched vulnerabilities)

---

## npm audit

### Basic Usage

```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force

# JSON output for CI
npm audit --json

# Only high/critical
npm audit --audit-level=high
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Security audit
  run: npm audit --audit-level=high
  continue-on-error: false  # Fail build on vulnerabilities

# GitLab CI
security_audit:
  script:
    - npm audit --audit-level=high
  allow_failure: false
```

### Handling Transitive Dependencies

```json
// package.json - Override vulnerable transitive deps
{
  "overrides": {
    "lodash": "^4.17.21",
    "minimist": "^1.2.6"
  }
}
```

---

## Snyk

More comprehensive than npm audit.

### Installation

```bash
npm install -g snyk
snyk auth
```

### Usage

```bash
# Test for vulnerabilities
snyk test

# Monitor project (continuous)
snyk monitor

# Fix vulnerabilities
snyk fix

# Ignore specific vulnerability
snyk ignore --id=SNYK-JS-LODASH-1234
```

### CI Integration

```yaml
# GitHub Actions
- name: Snyk security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

---

## Dependabot

Automated dependency updates via GitHub.

### Configuration (.github/dependabot.yml)

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    reviewers:
      - security-team
    labels:
      - dependencies
      - security
    ignore:
      # Ignore major version updates for stability
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
```

---

## Package Evaluation Checklist

Before adding a new dependency:

| Criteria | Check |
|----------|-------|
| **Popularity** | Downloads/week > 10,000? |
| **Maintenance** | Updated in last 6 months? |
| **Security** | Recent CVEs? Response time? |
| **Dependencies** | How many transitive deps? |
| **Size** | Bundle impact acceptable? |
| **License** | Compatible with your project? |

### Tools for Evaluation

```bash
# Check bundle size impact
npx bundlephobia <package-name>

# Check npm stats
npx npm-check

# Check for known vulnerabilities
npx snyk test <package-name>
```

---

## Lock File Security

### Why Lock Files Matter

```bash
# package-lock.json pins exact versions
# Prevents supply chain attacks via version drift
# MUST be committed to version control
```

### Verify Lock File Integrity

```bash
# Verify package-lock.json matches package.json
npm ci  # Clean install from lock file

# Never use `npm install` in CI
# It can modify lock file
```

---

## Subresource Integrity (SRI)

For CDN-hosted scripts.

```html
<!-- Without SRI - vulnerable to CDN compromise -->
<script src="https://cdn.example.com/react.js"></script>

<!-- With SRI - fails if content modified -->
<script
  src="https://cdn.example.com/react.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

### Generate SRI Hash

```bash
# Generate hash for a file
openssl dgst -sha384 -binary react.min.js | openssl base64 -A
```

---

## Minimal Dependencies

### Evaluate Before Adding

```typescript
// ❌ WRONG: Adding lodash for one function
import { debounce } from 'lodash'; // 70KB+ bundle impact

// ✅ CORRECT: Native or minimal alternative
function debounce(fn: Function, ms: number) {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

// Or use modular import
import debounce from 'lodash.debounce'; // ~1KB
```

### Bundle Analysis

```bash
# Vite
npx vite-bundle-visualizer

# Webpack
npx webpack-bundle-analyzer

# Check unused deps
npx depcheck
```

---

## Typosquatting Protection

### Common Attacks

| Legitimate | Typosquat |
|------------|-----------|
| lodash | lodash-js, 1odash |
| express | expres, expresss |
| react | reactjs, reakt |

### Prevention

```bash
# Verify package before install
npm info <package-name>

# Check author and repo
npm view <package-name> repository

# Use exact versions in package.json
npm install package@1.2.3 --save-exact
```

---

## Automated Security Scanning

### Pre-commit Hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm audit --audit-level=high"
    }
  }
}
```

### CI Pipeline

```yaml
name: Security
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Security Checklist

- [ ] npm audit in CI (fail on high/critical)
- [ ] Snyk monitoring enabled
- [ ] Dependabot configured
- [ ] Lock file committed
- [ ] Using `npm ci` in CI (not `npm install`)
- [ ] SRI for CDN resources
- [ ] Bundle size monitored
- [ ] New deps evaluated before adding

---

## Related Resources

- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Socket.dev](https://socket.dev/) - Supply chain security
