# Report Templates

**Output format templates for final threat model deliverables.**

## Supported Formats

| Format   | File                     | Purpose               |
| -------- | ------------------------ | --------------------- |
| Markdown | `threat-model-report.md` | Human-readable report |
| JSON     | `threat-model-data.json` | Machine-readable data |
| SARIF    | `threat-model.sarif`     | IDE integration       |

---

## Markdown Report Template

```markdown
# Threat Model Report: {Application Name}

**Session ID:** {session-id}
**Date:** {date}
**Scope:** {scope description}

---

## Executive Summary

{2-3 paragraph overview of findings, top risks, and recommendations}

### Key Statistics

- **Components Analyzed:** {n}
- **Entry Points:** {n}
- **Threats Identified:** {n}
- **Critical Risks:** {n}
- **Control Gaps:** {n}

### Top 3 Risks

1. **{Risk 1}** - {brief description}
2. **{Risk 2}** - {brief description}
3. **{Risk 3}** - {brief description}

---

## Architecture Overview

{Summary from Phase 1}

### Components

{Component list with brief descriptions}

### Data Flows

{Key data flow diagram or description}

### Trust Boundaries

{Trust boundary descriptions}

---

## Security Controls Assessment

| Category         | Status   | Notes   |
| ---------------- | -------- | ------- |
| Authentication   | {status} | {notes} |
| Authorization    | {status} | {notes} |
| Input Validation | {status} | {notes} |
| Cryptography     | {status} | {notes} |
| Audit Logging    | {status} | {notes} |
| Rate Limiting    | {status} | {notes} |

### Control Gaps

{List of identified gaps with severity}

---

## Threat Analysis

### Threat Summary by STRIDE Category

| Category               | Count | Critical | High | Medium | Low |
| ---------------------- | ----- | -------- | ---- | ------ | --- |
| Spoofing               | {n}   | {n}      | {n}  | {n}    | {n} |
| Tampering              | {n}   | {n}      | {n}  | {n}    | {n} |
| Repudiation            | {n}   | {n}      | {n}  | {n}    | {n} |
| Info Disclosure        | {n}   | {n}      | {n}  | {n}    | {n} |
| Denial of Service      | {n}   | {n}      | {n}  | {n}    | {n} |
| Elevation of Privilege | {n}   | {n}      | {n}  | {n}    | {n} |

### Critical Threats

{Detailed description of each critical threat}

### High Priority Threats

{Detailed description of each high priority threat}

---

## Abuse Cases

### {Abuse Case 1 Name}

- **Threat Actor:** {who}
- **Motivation:** {why}
- **Attack Path:** {how}
- **Impact:** {what happens}
- **Mitigations:** {recommendations}

{Repeat for key abuse cases}

---

## Security Test Plan

### Code Review Priority

| Priority | File   | Focus Areas | Time   |
| -------- | ------ | ----------- | ------ |
| Critical | {file} | {areas}     | {time} |
| High     | {file} | {areas}     | {time} |

### SAST Recommendations

{Tool and rule recommendations}

### Manual Test Cases

{Summary of test cases with priorities}

---

## Recommendations

### Immediate Actions (Critical)

1. {Action 1}
2. {Action 2}

### Short-Term (High)

1. {Action 1}
2. {Action 2}

### Medium-Term (Medium)

1. {Action 1}
2. {Action 2}

---

## Appendix

### A. Methodology

This threat model used STRIDE + PASTA + DFD methodologies.

### B. Artifacts

- Phase 1: {artifact list}
- Phase 2: {artifact list}
- Phase 3: {artifact list}
- Phase 4: {artifact list}

### C. Session Information

- Session ID: {id}
- Analyst: Claude (AI)
- Duration: {time}
- Tokens Used: {tokens}
```

---

## JSON Data Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "sessionId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "scope": {
      "type": "object",
      "properties": {
        "type": { "enum": ["full", "component", "incremental"] },
        "paths": { "type": "array", "items": { "type": "string" } }
      }
    },
    "architecture": {
      "type": "object",
      "properties": {
        "components": { "type": "array" },
        "entryPoints": { "type": "array" },
        "dataFlows": { "type": "array" },
        "trustBoundaries": { "type": "array" }
      }
    },
    "securityControls": {
      "type": "object"
    },
    "threats": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "component": { "type": "string" },
          "strideCategory": { "type": "string" },
          "threat": { "type": "string" },
          "riskScore": { "type": "number" }
        }
      }
    },
    "abuseCases": { "type": "array" },
    "testPlan": {
      "type": "object",
      "properties": {
        "codeReview": { "type": "object" },
        "sastRecommendations": { "type": "object" },
        "dastRecommendations": { "type": "object" },
        "manualTestCases": { "type": "array" }
      }
    }
  }
}
```

---

## SARIF Template

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "threat-model",
          "version": "1.0.0",
          "informationUri": "https://github.com/praetorian-inc/chariot",
          "rules": [
            {
              "id": "THREAT-001",
              "name": "JWTTokenTheftViaXSS",
              "shortDescription": {
                "text": "JWT token theft via XSS vulnerability"
              },
              "fullDescription": {
                "text": "An attacker could steal JWT tokens through cross-site scripting..."
              },
              "defaultConfiguration": {
                "level": "error"
              },
              "properties": {
                "strideCategory": "Spoofing",
                "riskScore": 9
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "THREAT-001",
          "level": "error",
          "message": {
            "text": "Potential JWT token theft via XSS in search parameter"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "pkg/handler/search.go"
                },
                "region": {
                  "startLine": 42,
                  "endLine": 55
                }
              }
            }
          ],
          "properties": {
            "businessImpact": "High",
            "likelihood": "Medium",
            "recommendedControls": ["Set HttpOnly flag", "Implement CSP"]
          }
        }
      ]
    }
  ]
}
```
