# Tool Recommendations

**SAST/DAST/SCA tool guidance for security test planning.**

## SAST Tools (Static Analysis)

### semgrep (Recommended)

**Best for**: Custom rules, multi-language support, CI/CD integration

```bash
# Installation
pip install semgrep

# Run with default rules
semgrep scan --config auto .

# Run with specific rules
semgrep scan --config p/golang --config p/security-audit .

# Custom rule example
semgrep scan --config custom-rules/ .
```

**Custom Rule Template**:

```yaml
rules:
  - id: dynamodb-filter-injection
    pattern: |
      $X.FilterExpression = $Y + $Z
    message: "Potential NoSQL injection via string concatenation"
    languages: [go]
    severity: ERROR
    metadata:
      category: security
      subcategory: injection
```

**Focus Areas by Threat Category**:
| Threat | semgrep Config |
|--------|---------------|
| Injection | `p/security-audit`, `p/golang` |
| Authentication | `p/jwt`, custom auth rules |
| Cryptography | `p/secrets`, `p/insecure-crypto` |

### CodeQL

**Best for**: Deep semantic analysis, GitHub integration

```bash
# Initialize database
codeql database create my-db --language=go

# Run security queries
codeql database analyze my-db codeql/go-queries:Security

# Custom query
codeql query run queries/injection.ql --database=my-db
```

**Recommended Query Suites**:

- `codeql/go-queries:Security/CWE` - Go security issues
- `codeql/javascript-queries:Security` - JS/TS issues
- `codeql/python-queries:Security` - Python issues

### gosec (Go-specific)

**Best for**: Go security analysis, fast execution

```bash
# Installation
go install github.com/securego/gosec/v2/cmd/gosec@latest

# Run scan
gosec ./...

# Exclude rules
gosec -exclude=G104,G304 ./...

# Output formats
gosec -fmt=json -out=results.json ./...
```

**Rule Mapping to STRIDE**:
| gosec Rule | STRIDE Category |
|------------|-----------------|
| G101-G107 | Information Disclosure |
| G201-G203 | Injection/Tampering |
| G301-G307 | Tampering |
| G401-G501 | Information Disclosure |

## DAST Tools (Dynamic Analysis)

### Nuclei (Recommended)

**Best for**: Template-based scanning, API testing, custom checks

```bash
# Installation
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Run default templates
nuclei -u https://target.com -t cves/ -t vulnerabilities/

# Run IDOR templates
nuclei -u https://target.com -t http/vulnerabilities/generic/idor.yaml

# Custom template
nuclei -u https://target.com -t custom-templates/
```

**Custom Template for IDOR**:

```yaml
id: idor-asset-access
info:
  name: Cross-Tenant Asset Access
  severity: critical

http:
  - raw:
      - |
        GET /api/assets/{{asset_id}} HTTP/1.1
        Host: {{Hostname}}
        Authorization: Bearer {{tenant_b_token}}

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200
      - type: word
        words:
          - "tenant_a_data"
```

### Burp Suite

**Best for**: Manual testing, complex auth flows, detailed inspection

**Configuration for Threat Model Testing**:

1. Import target scope from DAST recommendations
2. Configure authentication (Project Options → Sessions)
3. Run active scan on priority endpoints
4. Use Intruder for:
   - IDOR testing (sniper mode with IDs)
   - Injection fuzzing (pitchfork with payloads)

### OWASP ZAP

**Best for**: Free alternative, CI/CD integration, API scanning

```bash
# Docker run
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t https://target.com/openapi.json -f openapi

# Full scan
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t https://target.com

# API scan with auth
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t https://target.com/openapi.json \
  -z "-config api.key=YOUR_API_KEY"
```

## SCA Tools (Dependency Analysis)

### Trivy (Recommended)

**Best for**: Multi-language support, container scanning, fast execution

```bash
# Installation
brew install trivy  # macOS
apt install trivy   # Ubuntu

# Scan filesystem
trivy fs --scanners vuln .

# Scan specific files
trivy fs --scanners vuln --file-patterns "go.mod,package.json" .

# High/Critical only
trivy fs --severity HIGH,CRITICAL .

# JSON output
trivy fs --format json -o results.json .
```

**Focus by File Type**:
| File | Scan Command |
|------|-------------|
| Go | `trivy fs --scanners vuln --file-patterns "go.mod" .` |
| Node | `trivy fs --scanners vuln --file-patterns "package-lock.json" .` |
| Python | `trivy fs --scanners vuln --file-patterns "requirements.txt" .` |

### Snyk

**Best for**: Detailed remediation advice, CI/CD integration

```bash
# Installation
npm install -g snyk

# Authenticate
snyk auth

# Test project
snyk test

# Monitor continuously
snyk monitor

# Test specific manifest
snyk test --file=go.mod
```

### npm audit / go mod

**Best for**: Built-in, no additional tools required

```bash
# Node.js
npm audit
npm audit --json > audit.json
npm audit fix  # Auto-fix

# Go
go list -m -json all | nancy sleuth
govulncheck ./...
```

## Tool Selection Matrix

| Requirement       | Recommended Tools   |
| ----------------- | ------------------- |
| Quick scan        | semgrep, trivy      |
| Deep analysis     | CodeQL, Burp Suite  |
| Custom rules      | semgrep, Nuclei     |
| CI/CD integration | semgrep, trivy, ZAP |
| Go-specific       | gosec, govulncheck  |
| API testing       | Nuclei, ZAP         |
| Manual testing    | Burp Suite          |

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit

  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          severity: "HIGH,CRITICAL"
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/returntocorp/semgrep
    rev: v1.0.0
    hooks:
      - id: semgrep
        args: ["--config", "p/security-audit"]

  - repo: https://github.com/securego/gosec
    rev: v2.18.0
    hooks:
      - id: gosec
```

## Payload Libraries

| Category          | Source                             |
| ----------------- | ---------------------------------- |
| SQL Injection     | SecLists/Fuzzing/SQLi              |
| XSS               | SecLists/Fuzzing/XSS               |
| NoSQL Injection   | Custom DynamoDB/MongoDB payloads   |
| Path Traversal    | SecLists/Fuzzing/LFI               |
| Command Injection | SecLists/Fuzzing/command-injection |

**SecLists Installation**:

```bash
git clone https://github.com/danielmiessler/SecLists.git
```
