---
name: planning-security-tests
description: Use when executing Phase 6 of threat modeling to generate prioritized security test plans. Provides 5-step workflow (load phase outputs, apply business risk formula, generate 4 test categories, create prioritization matrix, write summary) with artifact schemas for code review targets, SAST/DAST recommendations, and manual test cases prioritized by crown jewels and compliance.
allowed-tools: Read, Write, TodoWrite, Bash, Grep, Glob
---

# Planning Security Tests (Threat Modeling Phase 6)

**Complete methodology for generating prioritized security test plans from threat modeling outputs.**

## When to Use

Use this skill when:

- Executing Phase 6 of threat modeling workflow
- Generating security test plans from Phase 1, 3, and 5 outputs
- Prioritizing tests by business risk (crown jewels, compliance)
- Creating code review plans, SAST/DAST recommendations, manual test cases
- Spawned by threat-modeling-orchestrator or security-test-planner agent

## Quick Reference

| Step   | What                     | Output Artifacts                               |
| ------ | ------------------------ | ---------------------------------------------- |
| Step 1 | Load Phase Outputs       | Phase 1/3/5 artifacts loaded                   |
| Step 2 | Apply Prioritization     | Priority scores calculated                     |
| Step 3 | Generate Test Categories | 4 JSON files (code-review, sast, dast, manual) |
| Step 4 | Generate Priority Matrix | test-priorities.json                           |
| Step 5 | Generate Summary         | summary.md (<2000 tokens)                      |

**Target output**: 6 artifacts in `.claude/.threat-model/{session}/phase-6/`

---

## Phase 6 Test Planning Workflow

**You MUST complete all workflow steps. Create TodoWrite items for each.**

### Step 1: Load Phase Outputs

Phase 6 builds on all prior phases:

| Phase   | Artifact                                | Purpose                                   | Location                                   |
| ------- | --------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Phase 1 | `business-context.md`                   | Crown jewels, compliance, business impact | `.claude/.threat-model/{session}/phase-1/` |
| Phase 3 | `entry-points.json`                     | Attack surface for test targeting         | `.claude/.threat-model/{session}/phase-3/` |
| Phase 5 | `threat-model.json`, `risk-matrix.json` | Threat IDs, risk scores                   | `.claude/.threat-model/{session}/phase-5/` |

**Action**: Use Read tool to load all artifacts before proceeding.

**Critical**: Load Phase 1 business context FIRST to understand:

- Crown jewels (data/systems most critical to business)
- Compliance requirements (SOC 2, HIPAA, PCI-DSS, etc.)
- Business impact scores (financial, operational, reputational)

### Step 2: Apply Prioritization Formula

```
Priority = (Threat Risk Score) + (Crown Jewel Bonus) + (Compliance Bonus)

Where:
- Threat Risk Score: From phase-5/risk-matrix.json (1-12)
- Crown Jewel Bonus: +2 if threat affects Phase 1 crown jewels
- Compliance Bonus: +3 if test validates Phase 1 compliance requirement
```

**Example Prioritization**:

| Threat                 | Base Risk | Crown Jewel? | Compliance? | Final Priority |
| ---------------------- | --------- | ------------ | ----------- | -------------- |
| SQL injection in login | 10        | Yes (+2)     | Yes (+3)    | 15             |
| XSS in admin panel     | 8         | Yes (+2)     | No          | 10             |
| CSRF in logout         | 4         | No           | No          | 4              |

**Action**: Calculate priority scores for all threats from Phase 5.

### Step 3: Generate Test Recommendations

**Four test categories (create TodoWrite items for each)**:

#### 3.1 Code Review Plan (`code-review-plan.json`)

Prioritized files for manual security code review:

```json
{
  "reviews": [
    {
      "file_path": "src/auth/login.go",
      "priority": 15,
      "threat_ids": ["T-001", "T-003"],
      "focus_areas": ["SQL injection prevention", "Input validation"],
      "estimated_time_minutes": 45,
      "crown_jewel": true,
      "compliance": ["SOC2-CC6.1"]
    }
  ],
  "total_estimated_hours": 12.5
}
```

**Required fields**:

- `file_path` - Relative path from repository root
- `priority` - Final priority score (1-15)
- `threat_ids` - Array of threat IDs from Phase 5
- `focus_areas` - Array of security concerns to review
- `estimated_time_minutes` - Review time estimate (15-120 min)
- `crown_jewel` - Boolean flag from Phase 1
- `compliance` - Array of compliance control IDs

#### 3.2 SAST Recommendations (`sast-recommendations.json`)

Static analysis tool recommendations:

```json
{
  "tools": [
    {
      "tool_name": "semgrep",
      "priority": "high",
      "threat_ids": ["T-001", "T-002"],
      "focus_areas": ["SQL injection", "Command injection"],
      "custom_rules": [
        {
          "pattern": "db.Query($USER_INPUT)",
          "message": "Potential SQL injection",
          "severity": "ERROR"
        }
      ]
    }
  ]
}
```

**Required fields**:

- `tool_name` - SAST tool (semgrep, codeql, bandit, gosec)
- `priority` - high/medium/low based on threat priorities
- `threat_ids` - Array of threat IDs addressed
- `focus_areas` - Vulnerability classes to scan
- `custom_rules` - Optional custom detection patterns

#### 3.3 DAST Recommendations (`dast-recommendations.json`)

Dynamic application security testing targets:

```json
{
  "endpoints": [
    {
      "endpoint": "POST /api/auth/login",
      "priority": 15,
      "threat_ids": ["T-001"],
      "test_scenarios": [
        {
          "scenario": "SQL injection in username field",
          "payloads": ["' OR '1'='1", "admin'--"],
          "expected_behavior": "Reject with 400, log attempt"
        }
      ],
      "tools": ["nuclei", "burp-suite"]
    }
  ]
}
```

**Required fields**:

- `endpoint` - HTTP method + path
- `priority` - Final priority score
- `threat_ids` - Array of threat IDs
- `test_scenarios` - Array of attack scenarios
- `tools` - Recommended DAST tools

#### 3.4 Manual Test Cases (`manual-test-cases.json`)

Threat-driven manual test procedures:

```json
{
  "test_cases": [
    {
      "test_id": "MTC-001",
      "priority": 15,
      "threat_ids": ["T-001"],
      "title": "SQL Injection via Login Form",
      "test_type": "abuse_case",
      "steps": [
        "Navigate to /login",
        "Enter SQL payload in username: ' OR '1'='1--",
        "Submit form",
        "Verify authentication rejected",
        "Check logs for injection attempt"
      ],
      "expected_result": "Login rejected, attempt logged",
      "crown_jewel": true,
      "compliance": ["SOC2-CC6.1"]
    }
  ]
}
```

**Required fields**:

- `test_id` - Unique identifier (MTC-###)
- `priority` - Final priority score
- `threat_ids` - Array of threat IDs
- `title` - Descriptive test name
- `test_type` - abuse_case, boundary_test, authorization_test
- `steps` - Array of test procedure steps
- `expected_result` - What should happen
- `crown_jewel` - Boolean flag
- `compliance` - Array of compliance control IDs

### Step 4: Generate Prioritization Matrix

Write `test-priorities.json` ranking all tests by:

```json
{
  "priorities": [
    {
      "rank": 1,
      "test_type": "code_review",
      "test_ref": "src/auth/login.go",
      "priority_score": 15,
      "threat_ids": ["T-001", "T-003"],
      "crown_jewel": true,
      "compliance": ["SOC2-CC6.1", "SOC2-CC6.7"]
    },
    {
      "rank": 2,
      "test_type": "manual",
      "test_ref": "MTC-001",
      "priority_score": 15,
      "threat_ids": ["T-001"],
      "crown_jewel": true,
      "compliance": ["SOC2-CC6.1"]
    }
  ]
}
```

**Ranking criteria**:

1. Final priority score (descending)
2. Number of threat IDs covered (descending)
3. Crown jewel flag (true before false)
4. Compliance flag (tests with compliance before others)

### Step 5: Generate Summary

Write `summary.md` (<2000 tokens) with:

```markdown
# Phase 6 Security Test Plan Summary

## Test Statistics

- Total test recommendations: 47
- High priority (10+): 12
- Medium priority (5-9): 23
- Low priority (1-4): 12

## Crown Jewel Coverage

- Crown jewel assets: 3
- Tests covering crown jewels: 18
- Coverage: 100%

## Compliance Validation

- SOC2 controls validated: 8
- HIPAA controls validated: 0
- PCI-DSS controls validated: 0

## Key Recommendations

### Priority 1: Authentication System Review

- Files: `src/auth/login.go`, `src/auth/session.go`
- Threats: T-001 (SQL injection), T-003 (Auth bypass)
- Estimated time: 2 hours

### Priority 2: SAST with Semgrep

- Focus: SQL injection, command injection
- Custom rules: 4
- Estimated time: 1 hour setup + automated

### Priority 3: DAST on Login Endpoints

- Endpoints: `/api/auth/login`, `/api/auth/refresh`
- Tools: nuclei, burp-suite
- Test scenarios: 8
```

**Required sections**:

- Test Statistics - Counts by priority level
- Crown Jewel Coverage - Percentage of crown jewels with tests
- Compliance Validation - Controls tested by framework
- Key Recommendations - Top 3-5 priority actions with time estimates

---

## Output Directory Structure

All artifacts written to `.claude/.threat-model/{session}/phase-6/`:

```
.claude/.threat-model/{session-id}/phase-6/
├── code-review-plan.json       # Prioritized files for manual review
├── sast-recommendations.json   # Static analysis focus areas
├── dast-recommendations.json   # Dynamic testing targets
├── manual-test-cases.json      # Threat-driven test scenarios
├── test-priorities.json        # Ranked by risk score
└── summary.md                  # <2000 token handoff
```

**Session directory discovery**: Use `persisting-agent-outputs` skill for session directory management and MANIFEST.yaml updates.

---

## Critical Rules

### Evidence-Based Planning

- Load Phase 1/3/5 artifacts BEFORE planning (use `enforcing-evidence-based-analysis` skill)
- Cite specific threats from `phase-5/threat-model.json`
- Map every test to threat IDs for traceability
- Prioritize by actual business risk scores from Phase 1 (not guesses)

### Prioritization Formula

- ALWAYS use: Priority = Risk Score + Crown Jewel Bonus + Compliance Bonus
- NEVER prioritize arbitrarily or by "common sense"
- Crown jewel bonus = +2
- Compliance bonus = +3

### Required Outputs

- MUST produce all 6 artifacts (4 test categories + priorities + summary)
- Summary MUST be <2000 tokens
- Every test MUST have threat_ids array
- Priority matrix MUST rank by formula (not arbitrary)

---

## Common Mistakes to Avoid

### 1. Skipping Phase 1 Business Context

❌ **Wrong**: Prioritize based on CVSS scores or "obvious" high-risk threats
✅ **Right**: Load Phase 1 crown jewels and compliance requirements first

### 2. Arbitrary Prioritization

❌ **Wrong**: "SQL injection is always critical, so priority = 15"
✅ **Right**: Calculate priority using formula with actual Phase 5 risk scores

### 3. Missing Traceability

❌ **Wrong**: Create tests without threat_ids
✅ **Right**: Every test maps to threat IDs from Phase 5

### 4. Incomplete Outputs

❌ **Wrong**: Generate code review plan and summary only
✅ **Right**: Produce all 6 artifacts (4 test categories + priorities + summary)

### 5. Verbose Summary

❌ **Wrong**: 5000-token summary with full test details
✅ **Right**: <2000 token summary with key recommendations and statistics

---

## Related Skills

- `enforcing-evidence-based-analysis` - Load Phase 1/3/5 artifacts before planning
- `persisting-agent-outputs` - Session directory discovery and MANIFEST updates
- `using-todowrite` - Track all 5 workflow steps and 6 artifact generation
- `verifying-before-completion` - Ensure all 6 artifacts produced before claiming done
- `adhering-to-dry` - Reuse test patterns, avoid redundant test cases
- `adhering-to-yagni` - Plan only tests needed for threat validation

---

## For More Details

- **Prioritization examples**: See `references/prioritization-examples.md`
- **Artifact schemas**: See `references/artifact-schemas.md`
- **Integration with orchestrator**: See `references/orchestrator-integration.md`
