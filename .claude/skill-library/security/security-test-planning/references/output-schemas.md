# Output Schemas

**Required JSON schemas for all Phase 4 output files.**

## 1. code-review-plan.json

```typescript
interface CodeReviewPlan {
  generatedAt: string; // ISO timestamp
  totalTargets: number;
  estimatedEffort: string; // e.g., "40 hours"

  critical: CodeReviewTarget[]; // Risk 9-12
  high: CodeReviewTarget[]; // Risk 6-8
  medium: CodeReviewTarget[]; // Risk 3-5
  low: CodeReviewTarget[]; // Risk 1-2
}

interface CodeReviewTarget {
  file: string; // Absolute or relative path
  lines?: string; // e.g., "45-120"
  focusAreas: string[]; // What to look for
  relatedThreats: string[]; // THREAT-xxx IDs
  riskScore: number; // From Phase 3
  estimatedTime: string; // e.g., "2 hours"
  reviewChecklist: string[]; // Specific questions to answer
}
```

## 2. sast-recommendations.json

```typescript
interface SASTRecommendations {
  generatedAt: string;
  toolSuggestions: string[]; // e.g., ["semgrep", "codeql"]

  rulesets: {
    [category: string]: {
      // e.g., "injection", "authentication"
      priority: "critical" | "high" | "medium" | "low";
      rules: string[]; // e.g., ["semgrep:go.lang.security.*"]
      customPatterns: CustomPattern[];
    };
  };

  focusAreas: FocusArea[];
  excludePaths: string[]; // e.g., ["vendor/", "test/"]
}

interface CustomPattern {
  name: string;
  pattern: string; // Regex or semgrep pattern
  message: string;
  languages: string[];
  severity: "critical" | "high" | "medium" | "low";
}

interface FocusArea {
  category: string; // e.g., "Injection"
  relatedThreats: string[];
  paths: string[]; // Glob patterns
  expectedFindings: number;
}
```

## 3. dast-recommendations.json

```typescript
interface DASTRecommendations {
  generatedAt: string;
  toolSuggestions: string[]; // e.g., ["nuclei", "burp", "zap"]

  endpoints: EndpointTarget[];

  authentication: {
    type: string; // e.g., "JWT", "Cookie", "API Key"
    tokenHeader?: string;
    testAccounts: string[];
  };

  rateLimit: {
    maxRequestsPerMinute: number;
    delayBetweenRequests: number; // ms
  };
}

interface EndpointTarget {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  priority: "critical" | "high" | "medium" | "low";
  relatedThreats: string[];
  testScenarios: string[];
  payloads?: string[]; // Payload file references
  expectedBehavior: string;
  authentication: boolean;
}
```

## 4. sca-recommendations.json

```typescript
interface SCARecommendations {
  generatedAt: string;
  toolSuggestions: string[]; // e.g., ["trivy", "snyk"]

  prioritizedDependencies: DependencyRecommendation[];

  scanPaths: string[]; // e.g., ["go.mod", "package.json"]
  excludeDevDependencies: boolean;
  minimumSeverity: "critical" | "high" | "medium" | "low";
}

interface DependencyRecommendation {
  package: string;
  currentVersion: string;
  recommendedVersion: string;
  vulnerability?: string; // CVE ID
  severity: "critical" | "high" | "medium" | "low";
  relatedThreats: string[];
  upgradeRisk: "low" | "medium" | "high";
  testAfterUpgrade: string[];
}
```

## 5. manual-test-cases.json

```typescript
interface ManualTestCases {
  generatedAt: string;
  totalTestCases: number;
  estimatedEffort: string;

  testCases: TestCase[];
}

interface TestCase {
  id: string; // e.g., "TC-001"
  name: string;
  relatedThreat: string; // THREAT-xxx
  relatedAbuseCase?: string; // ABUSE-xxx
  priority: "P0" | "P1" | "P2" | "P3";
  category: string; // e.g., "Authorization"

  objective: string;
  preconditions: string[];

  steps: TestStep[];

  evidence: string[]; // What to capture
  passCriteria: string;
  failureCriteria: string;
  estimatedTime: string;
}

interface TestStep {
  step: number;
  action: string;
  expectedResult: string;
  payload?: object; // If applicable
}
```

## 6. test-priorities.json

```typescript
interface TestPriorities {
  generatedAt: string;

  summary: {
    P0: PrioritySummary;
    P1: PrioritySummary;
    P2: PrioritySummary;
    P3: PrioritySummary;
  };

  prioritizedTests: PrioritizedTest[];
}

interface PrioritySummary {
  count: number;
  effort: string; // e.g., "20 hours"
  timeline: string; // e.g., "Sprint 0"
}

interface PrioritizedTest {
  id: string; // Test ID or reference
  priority: "P0" | "P1" | "P2" | "P3";
  type: "manual" | "automated" | "sast" | "dast" | "sca";
  threat: string; // THREAT-xxx
  riskScore: number;
  effort: string;
}
```

## 7. summary.md

```markdown
# Phase 4 Summary: Security Test Plan

**Session**: {timestamp}-{slug}
**Scope**: {scope}
**Date**: {date}

## Test Plan Overview

- **Total Tests**: X
- **Total Effort**: Y hours
- **Critical Coverage**: 100%
- **High Coverage**: 100%

## Priority Breakdown

| Priority | Tests | Effort | Timeline   |
| -------- | ----- | ------ | ---------- |
| P0       | N     | X hrs  | Sprint 0   |
| P1       | N     | X hrs  | Sprint 1   |
| P2       | N     | X hrs  | Sprint 2-3 |
| P3       | N     | X hrs  | Backlog    |

## Immediate Actions (P0)

1. {Action with THREAT reference}
2. {Action with THREAT reference}
3. {Action with THREAT reference}

## Tool Setup

- SAST: {tools with focus}
- DAST: {tools with focus}
- SCA: {tools with focus}

## Artifacts Location

`.claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/`
```

**Token limit**: <2000 tokens for summary.md
