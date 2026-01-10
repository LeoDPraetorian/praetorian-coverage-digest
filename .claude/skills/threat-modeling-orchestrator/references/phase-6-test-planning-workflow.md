# Phase 6: Security Test Planning Workflow

**Detailed workflow for orchestrating Phase 6 of threat modeling.**

## Overview

Phase 6 generates prioritized, actionable test plan:
- Code review targets
- SAST recommendations
- DAST recommendations
- Manual test cases

## Execution Strategy

**This phase runs sequentially** - requires:
- Phase 5 threat model with CVSS scores
- Phase 3 entry points
- Phase 4 control gaps

### Load Required Inputs

```
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-5/threat-model.json
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-5/risk-matrix.json
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/entry-points.json
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/control-gaps.json
```

### Apply Test Planning Skill

```
skill: "security-test-planning"
```

## Required Artifacts

| Artifact | Description |
|----------|-------------|
| `code-review-plan.json` | Prioritized files for manual review |
| `sast-recommendations.json` | Static analysis focus areas |
| `dast-recommendations.json` | Dynamic testing targets |
| `sca-recommendations.json` | Dependency review focus |
| `manual-test-cases.json` | Threat-driven test scenarios |
| `test-priorities.json` | Ranked by CVSS Environmental score |
| `summary.md` | Execution roadmap |

## Code Review Plan Schema

```json
{
  "critical": [
    {
      "file": "pkg/auth/handler.go",
      "lines": "45-120",
      "focusAreas": ["JWT validation", "Token expiry"],
      "relatedThreats": ["THREAT-001", "THREAT-005"],
      "estimatedTime": "45 minutes"
    }
  ],
  "high": [...],
  "medium": [...]
}
```

## Manual Test Case Schema

```json
{
  "id": "TC-001",
  "name": "JWT Token Theft via XSS",
  "relatedThreat": "THREAT-001",
  "relatedAbuseCase": "AC-AUTH-001",
  "objective": "Verify XSS cannot steal session tokens",
  "preconditions": ["Valid user session", "Access to search feature"],
  "steps": [
    "Navigate to search page",
    "Enter XSS payload: <script>alert(document.cookie)</script>",
    "Submit search",
    "Verify payload is escaped or blocked"
  ],
  "expectedResults": [
    "XSS payload is HTML-encoded in response",
    "No script execution",
    "CSP blocks inline scripts"
  ],
  "priority": "Critical",
  "estimatedTime": "15 minutes",
  "skillRequired": "Basic security testing"
}
```

## SAST Recommendations

Focus areas based on threat model:

| Threat Category | SAST Focus | Suggested Tools |
|-----------------|------------|-----------------|
| Injection | SQL/NoSQL injection patterns | semgrep, codeql |
| XSS | Unsafe HTML rendering | semgrep |
| Auth bypass | Hardcoded credentials | gitleaks, semgrep |
| Crypto issues | Weak algorithms | codeql |

## DAST Recommendations

Priority endpoints based on risk:

```json
{
  "endpoints": [
    {
      "path": "/api/v1/auth/login",
      "method": "POST",
      "priority": "Critical",
      "testScenarios": ["Brute force", "Credential stuffing", "SQL injection"],
      "suggestedTools": ["nuclei", "burp"]
    }
  ]
}
```

## Test Prioritization

Order tests by:
1. CVSS Environmental score (highest first: 9.0-10.0 Critical, 7.0-8.9 High)
2. Business context (crown jewels, compliance requirements)
3. Exploitability (from CVSS Base metrics)

### Detailed Priority Examples

**Example 1: Critical Priority (CVSS 9.3)**
```json
{
  "threat_id": "THR-001",
  "threat": "SQL Injection in payment endpoint",
  "cvss_environmental": 9.3,
  "priority": "P0-Critical",
  "test_types": ["code_review", "sast", "dast", "manual"],
  "rationale": "Targets crown jewel (payment_card_data), CVSS Critical, PCI-DSS scope"
}
```

**Example 2: High Priority (CVSS 7.8)**
```json
{
  "threat_id": "THR-007",
  "threat": "Broken access control in admin panel",
  "cvss_environmental": 7.8,
  "priority": "P1-High",
  "test_types": ["code_review", "manual"],
  "rationale": "Privilege escalation risk, affects authorization controls"
}
```

**Example 3: Medium Priority (CVSS 5.4)**
```json
{
  "threat_id": "THR-015",
  "threat": "Information disclosure via verbose errors",
  "cvss_environmental": 5.4,
  "priority": "P2-Medium",
  "test_types": ["sast", "dast"],
  "rationale": "Limited impact, no crown jewel exposure"
}
```

### Tool Configuration Examples

**Semgrep SAST Configuration** (`sast-recommendations.json`):
```json
{
  "tool": "semgrep",
  "config": {
    "rules": [
      "p/owasp-top-ten",
      "p/sql-injection",
      "p/xss"
    ],
    "severity_filter": ["ERROR", "WARNING"],
    "paths": {
      "include": ["src/handlers/", "src/api/"],
      "exclude": ["**/*_test.go", "**/mock_*.go"]
    }
  },
  "custom_rules": [
    {
      "id": "custom-sql-concat",
      "pattern": "db.Query($X + $Y)",
      "message": "Potential SQL injection via string concatenation",
      "severity": "ERROR"
    }
  ]
}
```

**Nuclei DAST Configuration** (`dast-recommendations.json`):
```json
{
  "tool": "nuclei",
  "config": {
    "templates": [
      "cves/",
      "vulnerabilities/",
      "exposures/"
    ],
    "severity_filter": ["critical", "high"],
    "rate_limit": 100,
    "targets": [
      {"url": "https://api.example.com/auth/login", "priority": "critical"},
      {"url": "https://api.example.com/users", "priority": "high"}
    ]
  }
}
```

**CodeQL SAST Configuration**:
```json
{
  "tool": "codeql",
  "config": {
    "queries": [
      "security-and-quality",
      "security-extended"
    ],
    "language": "go",
    "paths": ["./modules/backend/"]
  }
}
```

### Manual Test Case Writing Guide

Each manual test case must include:

**Required Fields**:
| Field | Description | Example |
|-------|-------------|---------|
| `test_id` | Unique identifier | `MTC-001` |
| `threat_id` | Links to Phase 5 threat | `THR-001` |
| `title` | Descriptive name | `SQL Injection via Login Form` |
| `objective` | What we're testing | `Verify parameterized queries prevent SQL injection` |
| `preconditions` | Setup required | `Valid test account, proxy configured` |
| `steps` | Numbered procedure | `1. Navigate to... 2. Enter...` |
| `expected_result` | Pass criteria | `Request rejected with 400, no SQL execution` |
| `cvss_score` | From Phase 5 | `9.3` |
| `estimated_time` | Execution time | `15 minutes` |

**Test Case Template**:
```json
{
  "test_id": "MTC-XXX",
  "threat_id": "THR-XXX",
  "title": "[Vulnerability Type] via [Attack Vector]",
  "objective": "Verify [control] prevents [attack]",
  "preconditions": [
    "Test environment accessible",
    "Test credentials available",
    "Proxy/interception tool configured"
  ],
  "steps": [
    "Step 1: [Setup action]",
    "Step 2: [Attack action]",
    "Step 3: [Verification action]"
  ],
  "test_data": {
    "payloads": ["' OR '1'='1", "<script>alert(1)</script>"],
    "endpoints": ["/api/auth/login"]
  },
  "expected_result": "[Specific expected behavior]",
  "actual_result": null,
  "pass_fail": null,
  "cvss_score": 0.0,
  "priority": "P0-Critical",
  "estimated_time": "15 minutes",
  "tester_skill": "intermediate"
}
```

**Common Test Patterns by STRIDE Category**:

| STRIDE | Test Pattern | Example Payloads |
|--------|--------------|------------------|
| Spoofing | Auth bypass, token manipulation | Modified JWTs, session fixation |
| Tampering | Input modification, IDOR | SQL injection, parameter pollution |
| Repudiation | Log bypass, timestamp manipulation | Log injection, time-based attacks |
| Info Disclosure | Error messages, data leakage | Verbose errors, directory traversal |
| DoS | Resource exhaustion, amplification | Large payloads, recursive requests |
| Elevation | Privilege escalation, RBAC bypass | Role manipulation, forced browsing |

### Complete Output Examples

**code-review-plan.json** (complete example):
```json
{
  "generated": "2026-01-10T15:30:00Z",
  "phase5_threats_count": 23,
  "reviews": {
    "critical": [
      {
        "file": "src/handlers/payment.go",
        "lines": "45-120",
        "threats": ["THR-001", "THR-003"],
        "focus": ["SQL query construction", "Input validation"],
        "estimated_time": "45 min"
      }
    ],
    "high": [
      {
        "file": "src/middleware/auth.go",
        "lines": "78-95",
        "threats": ["THR-007"],
        "focus": ["JWT validation", "Session handling"],
        "estimated_time": "30 min"
      }
    ],
    "medium": []
  },
  "total_estimated_time": "4.5 hours",
  "reviewer_notes": "Prioritize payment.go - targets crown jewel"
}
```

**test-priorities.json** (complete example):
```json
{
  "generated": "2026-01-10T15:30:00Z",
  "prioritization_method": "CVSS Environmental Score",
  "priorities": [
    {
      "rank": 1,
      "threat_id": "THR-001",
      "cvss_environmental": 9.3,
      "test_types": ["code_review", "sast", "dast", "manual"],
      "estimated_total_time": "2 hours"
    },
    {
      "rank": 2,
      "threat_id": "THR-003",
      "cvss_environmental": 9.1,
      "test_types": ["code_review", "dast", "manual"],
      "estimated_total_time": "1.5 hours"
    }
  ],
  "summary": {
    "critical_tests": 5,
    "high_tests": 8,
    "medium_tests": 7,
    "total_estimated_time": "18 hours"
  }
}
```

## Checkpoint Preparation

Before presenting checkpoint, ensure:
- [ ] Code review plan with file priorities
- [ ] SAST recommendations by category
- [ ] DAST endpoint list
- [ ] Manual test cases for top threats
- [ ] Summary execution roadmap

## Error Handling

For error recovery procedures, see [parallel-execution-and-error-handling.md](parallel-execution-and-error-handling.md).

### Phase-Specific Errors

| Error                  | Symptom                        | Recovery                                          |
| ---------------------- | ------------------------------ | ------------------------------------------------- |
| Missing priorities     | Tests have no priority         | Verify Phase 5 CVSS scores loaded                 |
| Empty code review plan | No files identified            | Verify Phase 3 entry points loaded                |
| Tool config invalid    | SAST/DAST config malformed     | Regenerate with explicit tool templates           |

### Escalation

If recovery fails:
1. Save partial results to `phase-6/partial/`
2. Record error in `metadata.json`
3. Present checkpoint with error summary
4. User decides: retry, skip, or abort
