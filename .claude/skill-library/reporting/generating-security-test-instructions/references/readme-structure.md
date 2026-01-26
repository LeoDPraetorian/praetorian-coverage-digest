# README Structure Guide

**Master README template for security testing documentation packages.**

---

## Purpose

The master README serves as:
- **Entry point** for practitioners starting the assessment
- **Prerequisites checklist** for environment setup
- **Navigation hub** to individual test cases
- **Quick reference** for time estimates and execution order

---

## Standard README Template

```markdown
# {Project Name} Security Testing Instructions

**Assessment Type:** {Pentest/Audit/Compliance/Vulnerability Assessment}
**Target System:** {Brief description - e.g., "OAuth service configuration"}
**Timeframe:** {1-2 days / 3-5 days / 1+ week}
**Created:** {Date}

---

## Overview

{2-3 paragraph description of:
- What is being tested
- Scope of assessment
- Key security concerns
}

---

## Test Cases

| ID | Test Case | Security Control | Priority | Est. Time (Manual) | Est. Time (Auto) |
|----|-----------|------------------|----------|-------------------|------------------|
| TC-1 | {Title} | {Control category} | {CRITICAL/HIGH/MEDIUM} | {X min} | {Y min} |
| TC-2 | {Title} | {Control category} | {HIGH} | {X min} | {Y min} |
| TC-3 | {Title} | {Control category} | {MEDIUM} | {X min} | {Y min} |

**Total Time:**
- Manual execution: {Sum} minutes ({Hours})
- Automated execution: {Sum} minutes ({Hours})

---

## Prerequisites

### Environment Setup

1. **Target System Access**
   - {URL or environment details}
   - {Credentials or access method}

2. **Local Environment**
   - {Operating system requirements}
   - {Network access requirements (VPN, etc.)}

\`\`\`bash
# Example setup commands
cd /path/to/project
source .env
export API_BASE_URL="https://..."
\`\`\`

### Tools Required

**Minimum (All test cases):**
- {Tool 1} - {Purpose}
- {Tool 2} - {Purpose}

**Optional (Automation):**
- {Tool 3} - {Purpose}

**Installation:**
\`\`\`bash
# Example installation commands
brew install curl jq
pip3 install requests pytest
\`\`\`

### Test Data

- {Test user accounts needed}
- {Sample data files}
- {API keys or tokens}

---

## Execution Order

**Recommended sequence:**

1. **TC-1: {Title}** - {Why first}
2. **TC-2: {Title}** - {Depends on TC-1 because...}
3. **TC-3: {Title}** - {Independent, can run anytime}

**Dependencies:**
- TC-2 requires TC-1 completion (authentication established)
- TC-3 can run in parallel with TC-1/TC-2

---

## Quick Start

### Manual Testing

\`\`\`bash
# 1. Navigate to test directory
cd .claude/.output/{project-name}-testing/

# 2. Setup environment
source /path/to/.env

# 3. Start with TC-1
open TC-1-{title}.md
# Follow step-by-step instructions

# 4. Document results
# Use "Actual Results" table in each test case file
\`\`\`

### Automated Testing

\`\`\`bash
# Run all automation scripts
./run-all-tests.sh

# Or run individual test
python3 TC-1-{title}.py
python3 TC-2-{title}.py
\`\`\`

---

## Finding Documentation

### Severity Guidelines

| Severity | Criteria | Example |
|----------|----------|---------|
| **CRITICAL** | {Criteria for critical} | {Example vulnerability} |
| **HIGH** | {Criteria for high} | {Example vulnerability} |
| **MEDIUM** | {Criteria for medium} | {Example vulnerability} |
| **LOW** | {Criteria for low} | {Example vulnerability} |

### Finding Template

Use the finding template provided in each test case file when documenting vulnerabilities.

**Location:** Each TC-X file includes a "Finding Template" section

---

## Compliance Mapping

**Relevant Standards:**

| Test Case | OWASP Top 10 2021 | CWE | NIST 800-53 | ISO 27001 |
|-----------|-------------------|-----|-------------|-----------|
| TC-1 | {Category} | {CWE-XXX} | {Control} | {Annex} |
| TC-2 | {Category} | {CWE-XXX} | {Control} | {Annex} |
| TC-3 | {Category} | {CWE-XXX} | {Control} | {Annex} |

---

## Output and Reporting

### Test Results

Document results in each test case's "Actual Results" table.

### Finding Report

Create consolidated findings report:

\`\`\`markdown
# Security Assessment Findings

## Critical Findings
- {Finding from TC-X}

## High Findings
- {Finding from TC-Y}

## Summary
- Total test cases: {N}
- Test cases passed: {X}
- Findings identified: {Y}
\`\`\`

---

## Troubleshooting

### Common Issues

**Issue 1: {Common problem}**
- **Symptom:** {What you see}
- **Cause:** {Why it happens}
- **Fix:** {How to resolve}

**Issue 2: {Common problem}**
- **Symptom:** {What you see}
- **Cause:** {Why it happens}
- **Fix:** {How to resolve}

---

## References

### Security Standards
- OWASP Testing Guide: {URL}
- NIST 800-53: {URL}
- CWE Top 25: {URL}

### Platform-Specific
- {Target system documentation}
- {Internal security guidelines}

### Tools
- {Tool 1 documentation}
- {Tool 2 documentation}

---

## Appendix

### Test Case Status Tracker

| TC ID | Started | Completed | Result | Notes |
|-------|---------|-----------|--------|-------|
| TC-1 | {Date} | {Date} | Pass/Fail | {Notes} |
| TC-2 | {Date} | {Date} | Pass/Fail | {Notes} |
| TC-3 | {Date} | {Date} | Pass/Fail | {Notes} |

### Timeline

- **Day 1:** TC-1, TC-2
- **Day 2:** TC-3, Finding documentation
- **Day 3:** Report finalization (if applicable)

---

**Created by:** {Your name/team}
**Last updated:** {Date}
**Version:** 1.0
```

---

## README Variants by Assessment Type

### Pentest README Additions

**Additional sections:**
- **Rules of Engagement** - Scope boundaries, prohibited actions
- **Emergency Contacts** - Who to contact if issues arise
- **Evidence Collection** - Screenshot and logging requirements

### Audit README Additions

**Additional sections:**
- **Baseline Expectations** - Policy requirements being validated
- **Control Matrix** - Mapping of test cases to control framework
- **Audit Trail** - Documentation requirements for auditor review

### Compliance README Additions

**Additional sections:**
- **Control Objectives** - What each test validates
- **Evidence Requirements** - Specific artifacts needed for compliance
- **Auditor Guidance** - How auditors can verify test execution

---

## Quick Reference Cards

### One-Page Quick Start

For 1-2 day assessments, include a condensed one-page quick start:

```markdown
# {Project} Quick Start

## Setup (5 min)
\`\`\`bash
{Essential setup commands}
\`\`\`

## Test Cases
1. TC-1: {Title} - {10 min}
2. TC-2: {Title} - {15 min}
3. TC-3: {Title} - {20 min}

## Critical Commands
\`\`\`bash
{Most important test commands}
\`\`\`

## Pass/Fail
✅ All responses return proper errors
❌ Any security control bypass

## Report
Use finding templates in each TC-X file
```

---

## Example: OAuth Assessment README

```markdown
# OAuth Security Assessment

**Target:** oauth-service.example.com
**Timeframe:** 2-3 days
**Test Cases:** 5 (TC-1.1 through TC-1.5)

## Overview

Testing OAuth 2.0 token theft vectors through deprecated grant types.

## Test Cases

| ID | Test Case | Time |
|----|-----------|------|
| TC-1.1 | Grant type enumeration | 30 min |
| TC-1.2 | Implicit flow exploitation | 2 hours |
| TC-1.3 | Authorization code interception | 2 hours |
| TC-1.4 | PKCE enforcement | 1 hour |
| TC-1.5 | Token lifetime security | 2.5 hours |

## Prerequisites

**Tools:** Burp Suite Professional, curl, jq, Python 3

**Access:** Target service domain, test user credentials

## Execution Order

1. TC-1.1 (identifies enabled grant types)
2. TC-1.2, TC-1.3, TC-1.4, TC-1.5 (parallel execution possible)

## Quick Start

\`\`\`bash
cd .claude/.output/oauth-testing/
export TENANT="oauth-service.example.com"
open TC-1.1-grant-type-enumeration.md
\`\`\`
```

---
