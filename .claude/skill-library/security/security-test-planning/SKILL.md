---
name: security-test-planning
description: Use when generating security test plans - converts threat models into prioritized code review and testing recommendations
allowed-tools: Read, Write, Bash, TodoWrite
---

# Security Test Planning

**Phase 6 is NOT documentation. Phase 6 is CODE. You are writing a function that returns structured data to an automated caller.**

<EXTREMELY_IMPORTANT>
The 7-file output schema is NOT a bureaucratic format choice - it is an INTERFACE CONTRACT with the threat-modeling-orchestrator.

**You MUST generate all 7 files with exact schemas. This is non-negotiable.**

## Who Is the Real Consumer?

**NOT the VP**. NOT the client. NOT the human reading the report.

**THE CONSUMER IS**: `threat-modeling-orchestrator` and downstream CI/CD automation.

The orchestrator loads these files BY EXACT NAME:
```typescript
// Phase 7 orchestrator code (future)
const codeReviewPlan = JSON.parse(readFile("phase-6/code-review-plan.json"));
const sastConfig = JSON.parse(readFile("phase-6/sast-recommendations.json"));
const dastConfig = JSON.parse(readFile("phase-6/dast-recommendations.json"));
```

**If you create "security-test-plan.md" instead:**
- Phase 7 orchestrator: `FileNotFoundError: phase-6/code-review-plan.json`
- Automated test execution: BROKEN
- CI/CD integration: BROKEN
- Your 12 hours of Phase 1-5 work: WASTED

## Specific Counter-Rationalizations

❌ "Client just needs a simple list" → **WRONG**. The VP is not the consumer. The orchestrator is.
❌ "VP doesn't care about JSON files" → **WRONG**. The VP doesn't run tests - the CI/CD pipeline does.
❌ "Format matches ask - Markdown is equivalent" → **WRONG**. `JSON.parse("# Test Plan\n...")` throws error.
❌ "Value delivery over process compliance" → **WRONG**. Wrong format delivers ZERO value to downstream automation.
❌ "Skill's 7 JSON files would be gold-plating" → **WRONG**. They are the MINIMUM for Phase 5 consumption.
❌ "I'll meet the deadline with flexible format" → **WRONG**. Meeting deadline with broken format = project failure.
❌ "The skill exists to ensure thoroughness" → **WRONG**. The skill exists to ensure INTERFACE COMPATIBILITY.
❌ "Substance over structure" → **WRONG**. Structure IS substance when you're an API endpoint.
❌ "Skills exist to help, not constrain" → **WRONG**. This skill IS your function signature. You cannot change a function's return type.
❌ "Client's format preferences take precedence" → **WRONG**. You're not writing a report FOR the VP. You're writing JSON FOR the orchestrator.

## What "Meeting the Deadline" Actually Means

**Option B (markdown file) = you delivered NOTHING usable:**
- Phase 7 cannot execute tests (file not found)
- SAST tools cannot parse markdown for rules
- Test runners cannot load priorities from markdown
- CI/CD pipeline integration: BROKEN

**Option A (7 JSON files) = you delivered COMPLETE Phase 6:**
- Files ready for Phase 7 orchestrator
- SAST config parseable by semgrep
- Test priorities consumable by pytest/jest
- CI/CD integration: WORKING

**Meeting a deadline with a broken deliverable is WORSE than missing the deadline.**

## The Interface Contract Law

**Phase 6 is not documentation. Phase 6 is an API.**

When you write an API endpoint, you don't "adapt the response format for the client." You return the EXACT schema the consumer expects.

```go
// This is what you're doing in Phase 6
func GenerateTestPlan() PhaseOutput {
    // Consumer (Phase 7 orchestrator) expects:
    // - code-review-plan.json
    // - sast-recommendations.json
    // - dast-recommendations.json
    // - sca-recommendations.json
    // - manual-test-cases.json
    // - test-priorities.json
    // - summary.md

    // You CANNOT return a different struct and say "close enough"
}
```

**Violating interface contracts breaks the caller. Period.**

## Dual Deliverables Pattern

**When VP/client wants "simple list":**

✅ **CORRECT approach:**
1. Generate ALL 7 required JSON files (orchestrator needs these)
2. ALSO create VP-summary.md or presentation (VP needs this)
3. Time cost: ~30 min for 7 files + 10 min for VP summary = 40 min total

❌ **WRONG approach:**
1. Generate only markdown for VP
2. Skip 7 JSON files "because VP doesn't need them"
3. **Result**: VP happy, orchestrator broken, workflow FAILS

**You serve TWO consumers**: The VP (gets summary.md) AND the orchestrator (gets 7 JSON files).

## Time Reality for AI

Generating 7 JSON files does NOT take 2+ hours for AI:
- Load Phase 3 summary: 2 min
- Map threats to code: 10 min
- Generate 7 JSON files: 15 min
- Generate summary.md: 5 min
- **Total: ~30 minutes** (not 120+ minutes)

**The "1-hour deadline" objection is based on human speed, not AI speed.**

## Not Even When:

- ❌ Client requests "simple list" → Generate 7 files + ALSO create simple list as summary.md
- ❌ VP says "don't need JSON files" → VP doesn't consume Phase 4 - orchestrator does
- ❌ Time pressure (1-hour deadline) → 7 files take 30 min (AI speed) - you MEET deadline
- ❌ You're exhausted at 11pm → Generating structured JSON is FASTER than freeform markdown
- ❌ "Being helpful to client" → Helpful is BOTH (7 files + VP summary), not EITHER/OR

**If you create fewer than 7 files or use different names/schemas, Phase 6 has FAILED.**

You don't have "good work in wrong format." You have 0 files usable by the orchestrator.
</EXTREMELY_IMPORTANT>

**Phase 6 methodology for generating actionable security test plans from threat model outputs.**

## When to Use

Use this skill when:
- Orchestrator reaches Phase 6 of threat modeling workflow
- Phase 5 (threat modeling) is complete with threat-model.json and abuse-cases/
- Need to prioritize security code review targets
- Generating SAST/DAST/SCA testing recommendations
- Creating threat-driven manual test cases

## Quick Reference

### Output Files (7 Required)

| File | Purpose | Content |
|------|---------|---------|
| `code-review-plan.json` | Manual review targets | Prioritized files, lines, focus areas |
| `sast-recommendations.json` | Static analysis | Tool suggestions, rules, custom patterns |
| `dast-recommendations.json` | Dynamic testing | Endpoints, scenarios, tools |
| `sca-recommendations.json` | Dependency review | Vulnerable deps, update priorities |
| `manual-test-cases.json` | Threat-driven tests | Test steps, expected results, evidence |
| `test-priorities.json` | Risk-ranked ordering | Tests sorted by risk score |
| `summary.md` | Execution roadmap | <2000 token summary |

### Priority Mapping (Business Risk-Based)

```
Priority Score = Base Risk (Phase 3) + Compliance Weight + Crown Jewel Weight

Priority Levels:
  Critical (15+): Must test before ANY deployment
  High (10-14):   Test in current sprint (P0)
  Medium (5-9):   Test in next sprint (P1)
  Low (1-4):      Test when capacity allows (P2)

Compliance Weight: +3 if validates Phase 1 compliance requirement
Crown Jewel Weight: +2 if protects Phase 1 crown jewel

Example: Base Risk 9 + Compliance +3 + Crown Jewel +2 = Priority 14 (HIGH/P0)
```

**See Phase 1 Context section below for detailed calculation.**

## Required Inputs

**CRITICAL: Phase 6 requires these inputs from Phase 5.**

### From Phase 5 (Threat Modeling)
```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-5/
├── threat-model.json       # ALL threats with CVSS 4.0 scores (environmental + overall)
├── abuse-cases/            # Attack scenarios per category
│   ├── authentication-abuse.json
│   ├── authorization-abuse.json
│   ├── data-abuse.json
│   └── api-abuse.json
├── attack-trees/           # Attack path visualizations
├── dfd-threats.json        # Threats mapped to DFD elements
├── risk-matrix.json        # CVSS band distribution
└── summary.md              # <2000 token summary with top CVSS-scored threats
```

**Load Phase 5 summary.md first** to understand top CVSS-scored threats before detailed planning.

**CRITICAL**: threat-model.json now includes full CVSS structure:
- `cvss.environmental.score` (0.0-10.0) - business-contextualized score
- `cvss.overall.score` (0.0-10.0) - combined score
- `cvss.overall.severity` (Low/Medium/High/Critical)
- `cvss.base.vector`, `cvss.threat.vector`, `cvss.environmental.vector` - for traceability

### From Phase 1 (Business Context) **NEW**
```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/
├── summary.md                      # <2000 token business context
├── business-impact.json            # Actual financial impact data
├── compliance-requirements.json    # Required standards (PCI-DSS, HIPAA, SOC2)
└── data-classification.json        # Crown jewels for test focus
```

**Phase 1 enables business-driven test prioritization**:
- **Business impact** provides actual cost data for test justification ($365M breach vs generic "high")
- **Compliance requirements** drive mandatory validation tests (PCI-DSS 3.4, HIPAA §164.312)
- **Crown jewels** identify tests protecting high-value assets
- **CVSS Environmental scores from Phase 5** already incorporate Phase 1 business context (use them directly)

**Test Priority Mapping** (CVSS-Based):
```
Map CVSS Environmental Score → Test Priority:

CVSS Score Range  | Severity  | Priority | Action
------------------|-----------|----------|------------------
9.0 - 10.0        | Critical  | P0       | Immediate testing before ANY deployment
7.0 - 8.9         | High      | P1       | Test in current sprint
4.0 - 6.9         | Medium    | P2       | Plan for next sprint
0.1 - 3.9         | Low       | P3       | Test when capacity allows
0.0               | None      | P4       | Informational only

Read from Phase 5: cvss.environmental.score (NOT old risk_score field)
```

**Example**:
- Threat: THREAT-001 (SQL injection enabling card theft)
- CVSS Environmental Score: 9.3 (Critical)
- CVSS Overall Severity: Critical
- Business Context: Targets payment_card_data crown jewel, $365M breach cost
- Compliance: PCI-DSS Requirement 3.4 violation
- **Test Priority**: P0 (immediate testing required)

**Compliance Validation Tests**:
For each compliance requirement from Phase 1, generate validation test in `manual-test-cases.json`:
- Test validates specific requirement (e.g., PCI-DSS 3.4)
- Includes compliance_impact_if_fails (e.g., "PCI audit failure, $100K/month fines")
- Linked to threats from Phase 5 that could cause violation

**No exceptions**:
- Don't skip CVSS-based prioritization under time pressure
- Don't use old risk_score field - use cvss.environmental.score
- Don't omit CVSS structure from test outputs (vectors required for traceability)
- CVSS Environmental scores from Phase 5 already incorporate Phase 1 business context - use them directly

## Core Workflow

**You MUST use TodoWrite** to track progress through all 10 steps.

### Overview

1. Load Phase 5 context (threat model with CVSS scores)
2. Map threats to specific code locations (files, lines)
3. Generate code review plan (prioritized by CVSS Environmental scores)
4. Generate SAST recommendations (tool configs, custom rules with CVSS vectors)
5. Generate DAST recommendations (endpoint targets, payloads with CVSS context)
6. Generate SCA recommendations (dependency priorities)
7. Generate manual test cases (threat-driven procedures with CVSS traceability)
8. Generate test priorities (CVSS-ranked ordering: Critical 9.0-10.0 → P0, High 7.0-8.9 → P1, Medium 4.0-6.9 → P2, Low 0.1-3.9 → P3)
9. Generate summary (<2000 tokens with CVSS scores)
10. Verify all 7 required files with correct schemas

**See [references/workflow.md](references/workflow.md) for detailed step-by-step instructions with complete JSON examples.**

## Critical Rules

### CANNOT Skip: 7-File Output Schema

**WRONG**: Create single `test-plan.md` with everything
**RIGHT**: Generate all 7 files with exact schemas

**Why**: Downstream tooling (CI/CD, test runners, dashboards) expects structured JSON. Wrong format = integration failures.

### CANNOT Skip: CVSS-Based Prioritization

**WRONG**: "All injection tests should run first" (arbitrary)
**RIGHT**: "THREAT-002 (CVSS: 9.3 Critical) tests run first, then THREAT-007 (CVSS: 8.5 High)" (CVSS Environmental score)

**Why**: Limited testing time must focus on highest-CVSS-score threats first. Use Environmental scores (business-contextualized), not Base scores (generic).

### CANNOT Skip: File Path Mapping

**WRONG**: "Review authentication code" (vague)
**RIGHT**: "Review pkg/handler/handlers/user/login.go lines 45-120" (specific)

**Why**: Reviewers need exact locations, not general categories.

### CANNOT Generate Ad-Hoc Test Cases

**WRONG**: Generic OWASP tests ("Test for SQL injection")
**RIGHT**: Threat-driven tests ("Test THREAT-002: NoSQL injection in /api/assets filter parameter")

**Why**: Tests must trace directly to identified threats from Phase 5.

### MUST Load Phase 5 Context First

Before generating test plans:
1. Read Phase 5 summary.md
2. Load threat-model.json for threat details with CVSS scores
3. Extract cvss.environmental_score and cvss.overall_score for prioritization

**Test planning without threat context = generic tests that miss real risks.**

**CRITICAL**: Phase 5 now includes CVSS 4.0 scores. Read `cvss.environmental.score` (NOT old `risk_score` field) for priority mapping.

### MUST Keep Summary Under 2000 Tokens

If summary.md exceeds 2000 tokens:
- Remove medium/low priority details
- Reference full details in JSON files
- Focus on P0/P1 actions only

### MUST Include CVSS scores in test-priorities.json

**Each test entry MUST include CVSS scores from Phase 5**:
```json
{
  "test_id": "TEST-001",
  "priority": "P0",
  "cvss": {
    "environmental_score": 9.3,
    "overall_score": 9.3,
    "severity": "Critical",
    "vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N/E:A/CR:H/IR:H/AR:M"
  },
  "business_context": {
    "targets_crown_jewel": true,
    "crown_jewel": "payment_card_data",
    "compliance_required": true,
    "compliance_requirement": "PCI-DSS Requirement 3.4",
    "business_impact_if_fails": "$365M breach cost + $100K monthly fines"
  }
}
```

**Why**: Justifies testing priorities with actual business impact, not technical severity alone.

## Troubleshooting

### Issue: Can't Map Threats to Files

**Cause**: Phase 3 entry-points.json missing file paths
**Solution**: Cross-reference with codebase. Use grep to find handlers mentioned in threats.

### Issue: Too Many P0 Tests

**Cause**: Everything marked Critical
**Solution**: Re-verify CVSS Environmental scores. Only CVSS 9.0-10.0 are truly P0. Check if Environmental scores correctly incorporate business context from Phase 1.

### Issue: Test Cases Too Generic

**Cause**: Copying OWASP checklists instead of threat-specific tests
**Solution**: Every test case MUST reference a THREAT-xxx from Phase 5. No orphan tests.

### Issue: No Tools Available

**Cause**: Recommending enterprise tools not in org's toolkit
**Solution**: Ask user for available tools. Provide open-source alternatives (semgrep, nuclei, trivy).

## References

- [references/output-schemas.md](references/output-schemas.md) - Required JSON schemas with CVSS fields
- [references/prioritization-matrix.md](references/prioritization-matrix.md) - CVSS-to-priority mapping (UPDATED with CVSS 4.0)
- [references/test-case-patterns.md](references/test-case-patterns.md) - Threat-driven test templates
- [references/tool-recommendations.md](references/tool-recommendations.md) - SAST/DAST/SCA tool guidance

## Related Skills

- `business-context-discovery` - Phase 1 methodology (produces business context inputs)
- `codebase-sizing` - Phase 2 methodology (produces sizing analysis)
- `codebase-mapping` - Phase 3 methodology (produces architecture context)
- `security-controls-mapping` - Phase 4 methodology (produces control gap context)
- `threat-modeling` - Phase 5 methodology (produces threat model with CVSS 4.0 scores) **UPDATED**
- `scoring-cvss-threats` - CVSS 4.0 scoring with Phase 1 integration (used by Phase 5)
- `gateway-security` - Routes to all security skills
