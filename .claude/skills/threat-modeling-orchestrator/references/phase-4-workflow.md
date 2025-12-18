# Phase 4: Security Test Planning Workflow

**Detailed workflow for orchestrating Phase 4 of threat modeling.**

## Overview

Phase 4 generates prioritized, actionable test plan:
- Code review targets
- SAST recommendations
- DAST recommendations
- Manual test cases

## Execution Strategy

**This phase runs sequentially** - requires:
- Phase 3 threat model and risk scores
- Phase 1 entry points
- Phase 2 control gaps

### Load Required Inputs

```
Read .claude/.threat-model/{session}/phase-3/threat-model.json
Read .claude/.threat-model/{session}/phase-3/risk-matrix.json
Read .claude/.threat-model/{session}/phase-1/entry-points.json
Read .claude/.threat-model/{session}/phase-2/control-gaps.json
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
| `test-priorities.json` | Ranked by risk score |
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
1. Risk score (highest first)
2. Exploitability (easiest first)
3. Business impact (critical assets first)

## Checkpoint Preparation

Before presenting checkpoint, ensure:
- [ ] Code review plan with file priorities
- [ ] SAST recommendations by category
- [ ] DAST endpoint list
- [ ] Manual test cases for top threats
- [ ] Summary execution roadmap
