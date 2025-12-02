---
name: capabilities-nuclei-templates
description: Use when creating Nuclei templates - YAML syntax, matchers, extractors, vulnerability detection
allowed-tools: Read, Write, Bash, Glob, Grep
skill-type: process
---

# Nuclei Template Development for Chariot

**You MUST use TodoWrite before starting to track all development steps.**

This skill covers Nuclei template creation for vulnerability detection in the Chariot security platform. Nuclei templates define security checks using a declarative YAML format.

## Quick Reference

| Protocol | Use Case | Example |
|----------|----------|---------|
| `http` | Web vulnerabilities, APIs | CVEs, credential stuffing, exposed panels |
| `dns` | DNS reconnaissance | SOA detection, zone transfers |
| `tcp` | Network protocols | Redis, SSH, databases |
| `ssl` | TLS/SSL analysis | Weak ciphers, certificate issues |
| `file` | File-based analysis | Keys, secrets, malware signatures |
| `javascript` | JS-specific checks | Node.js vulnerabilities |

## Directory Structure

```
modules/nuclei-templates/
├── http/                     # Web application testing (largest)
│   ├── cves/                 # Published CVE templates
│   ├── default-logins/       # Default credential checks
│   ├── exposed-panels/       # Admin interface detection
│   ├── credential-stuffing/  # Login validation
│   ├── misconfiguration/     # Server misconfigs
│   └── technologies/         # Technology fingerprinting
├── dns/                      # DNS reconnaissance
├── network/                  # TCP/UDP protocols
├── ssl/                      # TLS configuration
├── cloud/                    # AWS, Azure, GCP, K8s
├── file/                     # File analysis
├── workflows/                # Multi-template orchestration
├── profiles/                 # Scanning profiles
├── praetorian/              # Chariot-specific templates
│   ├── cves/                # Custom CVE variants
│   ├── exposed-panels/      # Custom panel detection
│   ├── misconfigurations/   # Custom misconfiguration
│   └── technologies/        # Technology-specific
└── helpers/                  # Wordlists, payloads
```

## Nuclei Template Anatomy

### Complete HTTP Template

```yaml
id: my-vulnerability-check

info:
  name: My Vulnerability Check
  author: your-name
  severity: high
  description: Detects XYZ vulnerability in ABC software.
  reference:
    - https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-XXXX
    - https://example.com/advisory
  classification:
    cvss-metrics: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
    cvss-score: 9.8
    cwe-id: CWE-89
  metadata:
    verified: true
    max-request: 1
    praetorian:
      attributes:
        technology: Software Name
        cpe: cpe:2.3:a:vendor:product:*:*:*:*:*:*:*:*
  tags: cve,sqli,high,case-reviewed

http:
  - method: GET
    path:
      - "{{BaseURL}}/vulnerable/endpoint?id=1"

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200

      - type: word
        part: body
        words:
          - "vulnerable_string"
          - "another_indicator"
        condition: or

    extractors:
      - type: regex
        name: version
        regex:
          - 'version["\']?:\s*["\']([0-9.]+)'
```

## Severity Classification

| Severity | CVSS Range | Use Cases |
|----------|-----------|-----------|
| **critical** | 9.0-10.0 | RCE, full system compromise, credential theft |
| **high** | 7.0-8.9 | Significant data breach risk, auth bypass |
| **medium** | 4.0-6.9 | Notable security impact, limited exposure |
| **low** | 0.1-3.9 | Minor risk, information disclosure |
| **info** | N/A | Fingerprinting, no direct security risk |

## Matcher Types

### Word Matcher

```yaml
- type: word
  part: body              # body, header, all
  words:
    - "admin"
    - "dashboard"
  condition: or           # or, and
  negative: false         # true for negative match
```

### Regex Matcher

```yaml
- type: regex
  regex:
    - "version\\s*[=:]\\s*([0-9.]+)"
    - "Apache/([0-9.]+)"
```

### Status Matcher

```yaml
- type: status
  status:
    - 200
    - 201
    - 302
```

### DSL Matcher (Complex Logic)

```yaml
- type: dsl
  dsl:
    - 'contains(header, "Set-Cookie")'
    - 'status_code == 200'
    - 'len(body) > 1000'
  condition: and
```

### Binary Matcher

```yaml
- type: binary
  binary:
    - "504B0304"  # ZIP header (hex)
```

### XPath Matcher (HTML/XML)

```yaml
- type: xpath
  xpath:
    - "//form[@id='login']"
    - "//input[@name='csrf']"
```

## Extractor Types

### Regex Extractor

```yaml
extractors:
  - type: regex
    name: version
    regex:
      - 'version["\']?:\s*["\']([0-9.]+)'
```

### XPath Extractor (For CSRF Tokens)

```yaml
extractors:
  - type: xpath
    name: csrf_token
    attribute: value
    internal: true          # Use in subsequent requests
    xpath:
      - //input[@name='csrf']/@value
```

### JSON Extractor

```yaml
extractors:
  - type: json
    json:
      - '.data.apiKey'
      - '.auth.token'
```

### DSL Extractor

```yaml
extractors:
  - type: dsl
    dsl:
      - username
      - password
```

## Pattern: Credential Stuffing Template

```yaml
id: github-login-check

info:
  name: Github Login Check
  author: pdteam
  severity: critical
  tags: cloud,creds-stuffing,login-check,github

self-contained: true

http:
  - raw:
      # Request 1: Get login page for CSRF tokens
      - |
        GET https://github.com/login HTTP/1.1
        Host: github.com

      # Request 2: Submit credentials
      - |
        POST https://github.com/session HTTP/1.1
        Host: github.com
        Content-Type: application/x-www-form-urlencoded

        login={{username}}&password={{password}}&authenticity_token={{csrf}}

    extractors:
      - type: xpath
        name: csrf
        internal: true
        xpath:
          - //input[@name='authenticity_token']/@value

    matchers-condition: or
    matchers:
      - type: dsl
        name: 2fa-required
        dsl:
          - 'contains(location, "two-factor")'
          - 'status_code == 302'
        condition: and

      - type: dsl
        name: login-success
        dsl:
          - 'contains(tolower(header), "logged_in=yes")'
          - 'status_code == 302'
        condition: and
```

## Pattern: DNS Template

```yaml
id: soa-detect

info:
  name: SOA Record - DNS Provider Detection
  author: rxerium
  severity: info
  tags: dns,soa,discovery

dns:
  - name: "{{FQDN}}"
    type: SOA

    matchers-condition: or
    matchers:
      - type: word
        name: cloudflare
        words:
          - dns.cloudflare.com

      - type: word
        name: aws
        words:
          - awsdns

      - type: word
        name: azure
        words:
          - azure-dns.com
```

## Pattern: Network/TCP Template

```yaml
id: exposed-redis

info:
  name: Redis - Unauthenticated Access
  author: pdteam
  severity: high
  classification:
    cvss-metrics: CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:L/A:N
    cvss-score: 7.2
    cwe-id: CWE-306
  tags: network,redis,unauth,tcp

tcp:
  - inputs:
      - data: "info\r\nquit\r\n"
    host:
      - "{{Hostname}}"
    port: 6379,6380
    read-size: 2048

    matchers-condition: and
    matchers:
      - type: word
        words:
          - redis_version

      - type: word
        negative: true
        words:
          - redis_mode:sentinel
```

## Pattern: SSL/TLS Template

```yaml
id: weak-cipher-suites

info:
  name: Weak Cipher Suites Detection
  author: pussycat0x
  severity: low
  tags: ssl,tls,misconfig

ssl:
  - address: "{{Host}}:{{Port}}"
    min_version: tls10
    max_version: tls10

    extractors:
      - type: dsl
        dsl:
          - tls_version
          - cipher

    matchers:
      - type: word
        name: weak-tls10
        part: cipher
        words:
          - TLS_RSA_WITH_AES_128_CBC_SHA
          - TLS_RSA_WITH_3DES_EDE_CBC_SHA
        condition: or
```

## Pattern: Workflow (Multi-Template)

```yaml
id: drupal-workflow

info:
  name: Drupal Security Checks
  author: daffainfo
  description: Runs all Drupal-related templates

workflows:
  - template: http/technologies/tech-detect.yaml
    matchers:
      - name: drupal
        subtemplates:
          - tags: drupal
```

## Chariot-Specific Conventions

### Praetorian Metadata Block

```yaml
metadata:
  praetorian:
    attributes:
      technology: H2O
      cpe: cpe:2.3:a:h2o:h2o:*:*:*:*:*:*:*:*
      vendor: h2o
      product: h2o
```

### Case Review Tags

| Tag | Meaning |
|-----|---------|
| `case-reviewed` | Validated by Praetorian - safe for production |
| `case-excluded` | Known issues/limitations - may have false positives |
| `case-pending` | Under review - not yet validated |

### Optimization Hints

```yaml
metadata:
  max-request: 2              # Limit requests
  verified: true              # Verification status
  shodan-query: title:"H2O"   # Shodan dork for discovery

stop-at-first-match: true     # Stop after first successful match
```

## Testing Templates

### Local Testing

```bash
# Test single template
nuclei -t path/to/template.yaml -u https://target.com

# Test with verbose output
nuclei -t template.yaml -u target.com -debug

# Validate template syntax
nuclei -t template.yaml -validate
```

### Using Profiles

```bash
# Use recommended profile
nuclei -u target.com -config profiles/recommended.yml

# Use pentest profile
nuclei -u target.com -config profiles/pentest.yml

# Use CVE-only profile
nuclei -u target.com -config profiles/cves.yml
```

## Template Checklist

Before submitting:
- [ ] `id` is unique and descriptive
- [ ] `info` section complete (name, author, severity, description)
- [ ] `references` include CVE/advisory links
- [ ] `tags` appropriate for filtering
- [ ] Matchers are specific (minimize false positives)
- [ ] Template validated with `-validate` flag
- [ ] Tested against known vulnerable and safe targets
- [ ] `case-reviewed` tag added after validation
- [ ] Praetorian metadata added if applicable

## Common Issues

| Issue | Solution |
|-------|----------|
| False positives | Add more specific matchers, use `negative` |
| Timeout errors | Reduce `max-request`, add `stop-at-first-match` |
| Missing results | Check `matchers-condition` (and vs or) |
| CSRF failures | Use extractors with `internal: true` |

## References

- [modules/nuclei-templates/](../../../../modules/nuclei-templates/) - Template source
- [Nuclei Documentation](https://nuclei.projectdiscovery.io/) - Official docs
- [Template Guide](https://nuclei.projectdiscovery.io/templating-guide/) - Template syntax
- [CVE Database](https://cve.mitre.org/) - CVE references
