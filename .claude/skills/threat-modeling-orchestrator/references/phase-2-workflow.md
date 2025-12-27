# Phase 2: Security Controls Mapping Workflow

**Detailed workflow for orchestrating Phase 2 of threat modeling.**

## Overview

Phase 2 identifies existing security mechanisms and gaps:

- Authentication mechanisms
- Authorization patterns
- Input validation
- Cryptography usage
- Audit logging
- Rate limiting

## Execution Strategy

### Parallel by Control Category

Spawn agents per control category for thorough analysis:

```
Task("security-controls-mapper", "Map authentication controls in {scope}")
Task("security-controls-mapper", "Map authorization controls in {scope}")
Task("security-controls-mapper", "Map input validation in {scope}")
Task("security-controls-mapper", "Map cryptography usage in {scope}")
Task("security-controls-mapper", "Map audit logging in {scope}")
```

### Sequential (Smaller Codebases)

Single agent with all categories:

```
Task("security-controls-mapper", "Map all security controls in {scope}. Categories: authentication, authorization, input-validation, cryptography, audit-logging, rate-limiting")
```

## Required Artifacts

| Artifact                  | Description             | Maps to STRIDE         |
| ------------------------- | ----------------------- | ---------------------- |
| `authentication.json`     | Auth mechanisms         | Spoofing               |
| `authorization.json`      | RBAC, ABAC, permissions | Elevation of Privilege |
| `input-validation.json`   | Validation patterns     | Tampering              |
| `output-encoding.json`    | XSS prevention          | Info Disclosure        |
| `cryptography.json`       | Encryption, hashing     | Info Disclosure        |
| `secrets-management.json` | Secret storage          | Info Disclosure        |
| `audit-logging.json`      | Security events         | Repudiation            |
| `rate-limiting.json`      | DoS protection          | Denial of Service      |
| `control-gaps.json`       | Missing controls        | All categories         |
| `summary.md`              | Compressed handoff      | <2000 tokens           |

## Control Detection Patterns

### Authentication

```bash
grep -rn "jwt\|token\|session\|cookie\|auth\|login\|cognito\|oauth" {scope}
```

### Authorization

```bash
grep -rn "rbac\|role\|permission\|policy\|guard\|middleware\|authorize" {scope}
```

### Input Validation

```bash
grep -rn "validate\|sanitize\|schema\|zod\|joi\|express-validator" {scope}
```

### Cryptography

```bash
grep -rn "encrypt\|decrypt\|hash\|bcrypt\|argon\|aes\|rsa\|hmac" {scope}
```

## Control Gap Analysis

For each component from Phase 1:

1. Check which control categories are present
2. Identify missing controls
3. Assess control strength (strong/weak/missing)
4. Document in `control-gaps.json`

```json
{
  "gaps": [
    {
      "component": "user-api",
      "category": "rate-limiting",
      "severity": "high",
      "description": "No rate limiting on login endpoint",
      "recommendation": "Add rate limiting to prevent brute force"
    }
  ]
}
```

## Checkpoint Preparation

Before presenting checkpoint, ensure:

- [ ] All control category JSONs created
- [ ] Control gaps identified
- [ ] Gap severity assessed
- [ ] Summary under 2000 tokens

## Common Issues

**Too many auth references**: Focus on actual control implementations, not just keyword matches.

**Framework-specific patterns**: Check for framework middleware (Express, Gin, etc.) that may handle controls implicitly.
