# Security Test Planning Workflow

**Detailed step-by-step workflow for Phase 4 test plan generation.**

## Step 1: Load Phase 3 Context

Load threat model summary and risk matrix:

```bash
# Read Phase 3 summary
cat .claude/.threat-model/{session}/phase-3/summary.md

# Read risk matrix for prioritization
cat .claude/.threat-model/{session}/phase-3/risk-matrix.json
```

**Understanding check**: What are the top 5 Critical/High threats? What files/components do they affect?

## Step 2: Map Threats to Code Locations

For EACH threat in threat-model.json, identify:

1. **Affected files** - Which source files contain the vulnerability?
2. **Specific lines** - What functions/methods need review?
3. **Focus areas** - What to look for during review?

**Use data from Phase 1 architecture**:

```bash
# Reference Phase 1 entry points for code locations
cat .claude/.threat-model/{session}/phase-1/entry-points.json
```

## Step 3: Generate Code Review Plan

Create `code-review-plan.json` with prioritized targets:

```json
{
  "generatedAt": "ISO timestamp",
  "totalTargets": 25,
  "estimatedEffort": "40 hours",
  "critical": [
    {
      "file": "pkg/handler/handlers/user/login.go",
      "lines": "45-120",
      "focusAreas": ["Input validation", "SQL parameterization", "Rate limiting"],
      "relatedThreats": ["THREAT-002", "THREAT-011"],
      "riskScore": 12,
      "estimatedTime": "2 hours",
      "reviewChecklist": [
        "Are all query parameters bound?",
        "Is rate limiting applied?",
        "Are error messages generic?"
      ]
    }
  ],
  "high": [...],
  "medium": [...],
  "low": [...]
}
```

**Prioritize by**: Risk score > Exploitability > Business impact

## Step 4: Generate SAST Recommendations

Create `sast-recommendations.json` with static analysis guidance:

```json
{
  "generatedAt": "ISO timestamp",
  "toolSuggestions": ["semgrep", "codeql", "gosec"],
  "rulesets": {
    "injection": {
      "priority": "critical",
      "rules": ["semgrep:go.lang.security.injection.*"],
      "customPatterns": [
        {
          "name": "dynamodb-filter-injection",
          "pattern": "FilterExpression.*+.*",
          "message": "Potential NoSQL injection via string concatenation",
          "languages": ["go"]
        }
      ]
    },
    "authentication": {...},
    "authorization": {...}
  },
  "focusAreas": [
    {
      "category": "Injection",
      "relatedThreats": ["THREAT-002", "THREAT-003"],
      "paths": ["pkg/query/", "pkg/handler/handlers/*/"],
      "expectedFindings": 10
    }
  ],
  "excludePaths": ["vendor/", "test/", "mock/"]
}
```

## Step 5: Generate DAST Recommendations

Create `dast-recommendations.json` with dynamic testing targets:

```json
{
  "generatedAt": "ISO timestamp",
  "toolSuggestions": ["nuclei", "burp", "zap"],
  "endpoints": [
    {
      "path": "/api/assets",
      "method": "GET",
      "priority": "critical",
      "relatedThreats": ["THREAT-004"],
      "testScenarios": [
        "IDOR: Access assets with manipulated IDs",
        "Injection: Inject into filter parameters",
        "AuthN bypass: Access without valid token"
      ],
      "payloads": ["idor-ids.txt", "sqli-payloads.txt"],
      "expectedBehavior": "403 Forbidden for cross-tenant access"
    }
  ],
  "authentication": {
    "type": "JWT",
    "tokenHeader": "Authorization",
    "testAccounts": ["attacker@test.com", "victim@test.com"]
  },
  "rateLimit": {
    "maxRequestsPerMinute": 100,
    "delayBetweenRequests": 500
  }
}
```

## Step 6: Generate SCA Recommendations

Create `sca-recommendations.json` with dependency review guidance:

```json
{
  "generatedAt": "ISO timestamp",
  "toolSuggestions": ["trivy", "snyk", "dependabot"],
  "prioritizedDependencies": [
    {
      "package": "github.com/example/vulnerable-lib",
      "currentVersion": "1.2.3",
      "recommendedVersion": "1.2.5",
      "vulnerability": "CVE-2024-XXXX",
      "severity": "high",
      "relatedThreats": ["THREAT-015"],
      "upgradeRisk": "low",
      "testAfterUpgrade": ["Authentication flow", "Token validation"]
    }
  ],
  "scanPaths": ["go.mod", "package.json", "requirements.txt"],
  "excludeDevDependencies": true,
  "minimumSeverity": "medium"
}
```

## Step 7: Generate Manual Test Cases

Create `manual-test-cases.json` with threat-driven tests:

```json
{
  "generatedAt": "ISO timestamp",
  "totalTestCases": 45,
  "estimatedEffort": "80 hours",
  "testCases": [
    {
      "id": "TC-001",
      "name": "Cross-Tenant IDOR via Asset ID Manipulation",
      "relatedThreat": "THREAT-004",
      "relatedAbuseCase": "ABUSE-003",
      "priority": "P0",
      "category": "Authorization",
      "objective": "Verify tenant isolation prevents cross-tenant asset access",
      "preconditions": [
        "Two test tenant accounts exist",
        "Each tenant has unique assets",
        "Valid JWT tokens for both tenants"
      ],
      "steps": [
        {
          "step": 1,
          "action": "Login as Tenant A, retrieve asset list",
          "expectedResult": "Receive only Tenant A assets"
        },
        {
          "step": 2,
          "action": "Note an asset ID (e.g., asset-123)",
          "expectedResult": "Asset ID captured"
        },
        {
          "step": 3,
          "action": "Login as Tenant B",
          "expectedResult": "New JWT for Tenant B"
        },
        {
          "step": 4,
          "action": "Request Tenant A's asset: GET /api/assets/asset-123",
          "expectedResult": "403 Forbidden (NOT 200 with Tenant A data)"
        }
      ],
      "evidence": ["HTTP request/response", "Screenshot of error"],
      "passCriteria": "403 returned for cross-tenant access attempts",
      "failureCriteria": "200 returned with other tenant's data",
      "estimatedTime": "30 minutes"
    }
  ]
}
```

## Step 8: Generate Test Priorities

Create `test-priorities.json` consolidating all tests by priority:

```json
{
  "generatedAt": "ISO timestamp",
  "summary": {
    "P0": { "count": 12, "effort": "20 hours", "timeline": "Sprint 0" },
    "P1": { "count": 18, "effort": "30 hours", "timeline": "Sprint 1" },
    "P2": { "count": 10, "effort": "20 hours", "timeline": "Sprint 2-3" },
    "P3": { "count": 5, "effort": "10 hours", "timeline": "Backlog" }
  },
  "prioritizedTests": [
    {
      "id": "TC-001",
      "priority": "P0",
      "type": "manual",
      "threat": "THREAT-004",
      "riskScore": 12,
      "effort": "30 minutes"
    },
    {
      "id": "SAST-INJECTION-001",
      "priority": "P0",
      "type": "automated",
      "threat": "THREAT-002",
      "riskScore": 12,
      "effort": "2 hours (setup)"
    }
  ]
}
```

## Step 9: Generate Summary

Create `summary.md` (<2000 tokens) as execution roadmap:

**Template**:

```markdown
# Phase 4 Summary: Security Test Plan

**Session**: {session-id}
**Scope**: {scope from Phase 1}
**Date**: {ISO date}

## Test Plan Overview

- **Total Tests**: X (Y automated, Z manual)
- **Total Effort**: N hours
- **Critical Coverage**: 100% of Critical threats have tests
- **High Coverage**: 100% of High threats have tests

## Priority Breakdown

| Priority      | Tests | Effort | Timeline   |
| ------------- | ----- | ------ | ---------- |
| P0 (Critical) | 12    | 20 hrs | Sprint 0   |
| P1 (High)     | 18    | 30 hrs | Sprint 1   |
| P2 (Medium)   | 10    | 20 hrs | Sprint 2-3 |
| P3 (Low)      | 5     | 10 hrs | Backlog    |

## Immediate Actions (P0)

1. **IDOR Testing** - All CRUD endpoints (THREAT-004)
2. **Injection Testing** - DynamoDB + Neo4j (THREAT-002, THREAT-003)
3. **MFA Bypass Testing** - Recovery code brute force (THREAT-011)

## Tool Setup

- SAST: semgrep with custom rules for [injection patterns]
- DAST: nuclei templates for [IDOR, auth bypass]
- SCA: trivy scan on [go.mod, package.json]

## Artifacts Location

`.claude/.threat-model/{session}/phase-4/`
```

## Step 10: Verify Completeness

Before completing Phase 4, verify:

- [ ] All 7 required files generated
- [ ] code-review-plan.json has prioritized targets with file paths
- [ ] sast-recommendations.json has tool + rule recommendations
- [ ] dast-recommendations.json has endpoint targets
- [ ] sca-recommendations.json has dependency priorities
- [ ] manual-test-cases.json has threat-driven test cases
- [ ] test-priorities.json consolidates all tests by risk score
- [ ] summary.md is <2000 tokens

**Threat modeling workflow complete when Phase 4 artifacts validated.**
