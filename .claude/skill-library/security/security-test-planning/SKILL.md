---
name: security-test-planning
description: Use when generating security test plans - converts threat models into prioritized code review and testing recommendations
allowed-tools: Read, Write, Bash, TodoWrite
---

# Security Test Planning

**Phase 4 is NOT documentation. Phase 4 is CODE. You are writing a function that returns structured data to an automated caller.**

<EXTREMELY_IMPORTANT>
The 7-file output schema is NOT a bureaucratic format choice - it is an INTERFACE CONTRACT with the threat-modeling-orchestrator.

**You MUST generate all 7 files with exact schemas. This is non-negotiable.**

## Who Is the Real Consumer?

**NOT the VP**. NOT the client. NOT the human reading the report.

**THE CONSUMER IS**: `threat-modeling-orchestrator` skill in Phase 5 (future test execution).

The orchestrator loads these files BY EXACT NAME:
```typescript
// Phase 5 orchestrator code (future)
const codeReviewPlan = JSON.parse(readFile("phase-4/code-review-plan.json"));
const sastConfig = JSON.parse(readFile("phase-4/sast-recommendations.json"));
const dastConfig = JSON.parse(readFile("phase-4/dast-recommendations.json"));
```

**If you create "security-test-plan.md" instead:**
- Phase 5 orchestrator: `FileNotFoundError: phase-4/code-review-plan.json`
- Automated test execution: BROKEN
- CI/CD integration: BROKEN
- Your 12 hours of Phase 1-3 work: WASTED

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
- Phase 5 cannot execute tests (file not found)
- SAST tools cannot parse markdown for rules
- Test runners cannot load priorities from markdown
- CI/CD pipeline integration: BROKEN

**Option A (7 JSON files) = you delivered COMPLETE Phase 4:**
- Files ready for Phase 5 orchestrator
- SAST config parseable by semgrep
- Test priorities consumable by pytest/jest
- CI/CD integration: WORKING

**Meeting a deadline with a broken deliverable is WORSE than missing the deadline.**

## The Interface Contract Law

**Phase 4 is not documentation. Phase 4 is an API.**

When you write an API endpoint, you don't "adapt the response format for the client." You return the EXACT schema the consumer expects.

```go
// This is what you're doing in Phase 4
func GenerateTestPlan() PhaseOutput {
    // Consumer (Phase 5 orchestrator) expects:
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

**If you create fewer than 7 files or use different names/schemas, Phase 4 has FAILED.**

You don't have "good work in wrong format." You have 0 files usable by the orchestrator.
</EXTREMELY_IMPORTANT>

**Phase 4 methodology for generating actionable security test plans from threat model outputs.**

## When to Use

Use this skill when:
- Orchestrator reaches Phase 4 of threat modeling workflow
- Phase 3 (threat modeling) is complete with threat-model.json and abuse-cases/
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

### Priority Mapping

```
Risk Score (from Phase 3) → Test Priority

Critical (9-12): P0 - Test immediately (Sprint 0)
High (6-8):      P1 - Test next sprint (Sprint 1)
Medium (3-5):    P2 - Plan for testing (Sprint 2-3)
Low (1-2):       P3 - Accept risk or defer (Backlog)
```

## Required Inputs

**CRITICAL: Phase 4 requires these inputs from Phase 3.**

### From Phase 3 (Threat Modeling)
```
.claude/.threat-model/{session}/phase-3/
├── threat-model.json       # ALL threats with STRIDE + risk scores
├── abuse-cases/            # Attack scenarios per category
│   ├── authentication-abuse.json
│   ├── authorization-abuse.json
│   ├── data-abuse.json
│   └── api-abuse.json
├── attack-trees/           # Attack path visualizations
├── dfd-threats.json        # Threats mapped to DFD elements
├── risk-matrix.json        # Impact × Likelihood scores
└── summary.md              # <2000 token summary with top risks
```

**Load Phase 3 summary.md first** to understand top threats before detailed planning.

## Core Workflow

**You MUST use TodoWrite** to track progress through all 10 steps.

### Overview

1. Load Phase 3 context (threat model, risk matrix)
2. Map threats to specific code locations (files, lines)
3. Generate code review plan (prioritized targets)
4. Generate SAST recommendations (tool configs, custom rules)
5. Generate DAST recommendations (endpoint targets, payloads)
6. Generate SCA recommendations (dependency priorities)
7. Generate manual test cases (threat-driven procedures)
8. Generate test priorities (risk-ranked ordering)
9. Generate summary (<2000 tokens)
10. Verify all 7 required files with correct schemas

**See [references/workflow.md](references/workflow.md) for detailed step-by-step instructions with complete JSON examples.**

## Critical Rules

### CANNOT Skip: 7-File Output Schema

**WRONG**: Create single `test-plan.md` with everything
**RIGHT**: Generate all 7 files with exact schemas

**Why**: Downstream tooling (CI/CD, test runners, dashboards) expects structured JSON. Wrong format = integration failures.

### CANNOT Skip: Risk-Based Prioritization

**WRONG**: "All injection tests should run first" (arbitrary)
**RIGHT**: "THREAT-002 (Risk: 12) tests run first, then THREAT-007 (Risk: 9)" (risk-based)

**Why**: Limited testing time must focus on highest-risk threats first.

### CANNOT Skip: File Path Mapping

**WRONG**: "Review authentication code" (vague)
**RIGHT**: "Review pkg/handler/handlers/user/login.go lines 45-120" (specific)

**Why**: Reviewers need exact locations, not general categories.

### CANNOT Generate Ad-Hoc Test Cases

**WRONG**: Generic OWASP tests ("Test for SQL injection")
**RIGHT**: Threat-driven tests ("Test THREAT-002: NoSQL injection in /api/assets filter parameter")

**Why**: Tests must trace directly to identified threats from Phase 3.

### MUST Load Phase 3 Context First

Before generating test plans:
1. Read Phase 3 summary.md
2. Load threat-model.json for threat details
3. Load risk-matrix.json for prioritization

**Test planning without threat context = generic tests that miss real risks.**

### MUST Keep Summary Under 2000 Tokens

If summary.md exceeds 2000 tokens:
- Remove medium/low priority details
- Reference full details in JSON files
- Focus on P0/P1 actions only

## Troubleshooting

### Issue: Can't Map Threats to Files

**Cause**: Phase 1 entry-points.json missing file paths
**Solution**: Cross-reference with codebase. Use grep to find handlers mentioned in threats.

### Issue: Too Many P0 Tests

**Cause**: Everything marked Critical
**Solution**: Re-verify risk scores. Only Risk 9-12 are truly P0. Adjust priority based on actual exploitability.

### Issue: Test Cases Too Generic

**Cause**: Copying OWASP checklists instead of threat-specific tests
**Solution**: Every test case MUST reference a THREAT-xxx from Phase 3. No orphan tests.

### Issue: No Tools Available

**Cause**: Recommending enterprise tools not in org's toolkit
**Solution**: Ask user for available tools. Provide open-source alternatives (semgrep, nuclei, trivy).

## References

- [references/output-schemas.md](references/output-schemas.md) - Required JSON schemas
- [references/test-case-patterns.md](references/test-case-patterns.md) - Threat-driven test templates
- [references/tool-recommendations.md](references/tool-recommendations.md) - SAST/DAST/SCA tool guidance

## Related Skills

- `threat-modeling` - Phase 3 methodology (produces threat model inputs)
- `security-controls-mapping` - Phase 2 methodology (produces control gap context)
- `codebase-mapping` - Phase 1 methodology (produces architecture context)
- `gateway-security` - Routes to all security skills
