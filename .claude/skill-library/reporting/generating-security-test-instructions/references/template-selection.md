# Template Selection Guide

**Complete template library for generating security test case instructions.**

---

## Template Selection Matrix

| Timeframe | Assessment Type | Detail Level | Automation | Template ID |
|-----------|----------------|--------------|------------|-------------|
| 1-2 days | Pentest | Concise | No | PT-CONCISE |
| 3-5 days | Pentest | Detailed | Optional | PT-STANDARD |
| 1+ week | Pentest | Comprehensive | Yes | PT-COMPREHENSIVE |
| 1-2 days | Audit | Focused | No | AUDIT-FOCUSED |
| 3-5 days | Audit | Detailed | Optional | AUDIT-STANDARD |
| Any | Compliance | Evidence-based | No | COMPLIANCE-STD |
| Any | Vuln Assessment | Discovery-focused | Optional | VULN-DISCOVERY |

---

## Standard Template Structure

### Complete Test Case Template

```markdown
# TC-{ID}: {Title}

**Assessment Type:** {Pentest/Audit/Compliance/Vuln Assessment}
**Priority:** {CRITICAL/HIGH/MEDIUM/LOW}
**Estimated Time:** Manual: {X min} | Automated: {Y min}

---

## Objective

{One-sentence description of what security control is being validated}

---

## Security Impact

**Risk if Control Fails:** {Business impact description}

**Attack Scenarios:**
1. {Real-world exploit example 1}
2. {Real-world exploit example 2}

---

## Prerequisites

### Environment
- {Environment setup requirements}
- {Access/credentials needed}

### Tools Required
- {Tool 1 with version if applicable}
- {Tool 2}

### Test Data
- {Sample data or credentials needed}

### Dependencies (Optional)

**If this test case depends on others:**

**Requires completion of:**
- TC-X.Y: {What's needed from prior test case - e.g., "session tokens from TC-2.1"}

**Provides inputs for:**
- TC-X.Z: {What this test case produces for later tests - e.g., "extracted session tokens for TC-2.2"}

**Sequential requirement:** This test case {must / should} be executed after TC-X.Y to ensure proper context.

---

## Test Steps

### Step 1: {Action Title}

**Action:** {What to do}

**Command:**
\`\`\`bash
{Copy-paste ready command}
\`\`\`

**Expected Result:** ✅ {What should happen if secure}

**Failure Indicator:** ❌ {What indicates vulnerability}

**Documentation Template:**
\`\`\`
Step 1 Result:
- Status: [ ] Pass [ ] Fail
- Observation: {What you observed}
- Evidence: {Screenshot/output filename}
\`\`\`

### Step 2-N: {Continue pattern...}

---

## Pass/Fail Criteria

### ✅ PASS Conditions
- {Condition 1 that indicates secure configuration}
- {Condition 2}

### ❌ FAIL Conditions (with severity)
- {Condition 1} → **CRITICAL** severity
- {Condition 2} → **HIGH** severity
- {Condition 3} → **MEDIUM** severity

---

## Finding Template

**Use this template if test FAILS:**

**Title:** {Vulnerability Name}

**Severity:** {CRITICAL/HIGH/MEDIUM/LOW}

**Description:**
{What is the vulnerability? 2-3 sentences}

**Evidence:**
1. {Step-by-step reproduction}
2. {Include command outputs or screenshots}
3. {Show actual vs expected behavior}

**Impact:**
- {Business impact}
- {Attack scenario}
- {Data at risk}

**Recommendation:**
1. **Immediate:** {Quick fix or mitigation}
2. **Long-term:** {Architectural fix}
3. **Validation:** {How to verify fix}

**References:**
- OWASP: {Relevant OWASP category}
- CWE: {CWE identifier}
- {Other references}

---

## Remediation Guidance

### Configuration Fix
\`\`\`yaml
# Example configuration
{secure configuration example}
\`\`\`

### Code Fix (if applicable)
\`\`\`go
// ❌ INSECURE
{vulnerable code}

// ✅ SECURE
{fixed code with explanation}
\`\`\`

---

## Automation Script (Optional - for 3+ day assessments)

\`\`\`python
#!/usr/bin/env python3
"""
Automated test for TC-{ID}
Usage: python3 tc-{id}-automation.py
"""

import requests
import sys

def test_{feature}():
    """Test {what this tests}"""
    try:
        # Test logic
        response = requests.get("...")
        assert condition, "Clear failure message"
        print("✅ PASS: {Test name}")
        return True
    except AssertionError as e:
        print(f"❌ FAIL: {e}")
        return False

if __name__ == "__main__":
    results = [
        test_{feature}(),
        # Add more test functions
    ]
    sys.exit(0 if all(results) else 1)
\`\`\`

---

## Checklist

**Use checklist to track test case completion:**

```markdown
## TC-{ID} Completion Checklist

### {Section 1 Name}
- [ ] Step/requirement 1
- [ ] Step/requirement 2

### {Section 2 Name}
- [ ] Step/requirement 3
- [ ] Step/requirement 4

### Documentation
- [ ] Findings created (if test failed)
- [ ] Evidence captured (screenshots, outputs)
- [ ] Results documented
```

**Benefits:**
- Track progress during multi-step testing
- Ensure no steps are skipped
- Provide completion status to assessment lead
- Support handoff between testers

---

## References

- OWASP Testing Guide: {Relevant chapter}
- CWE: {CWE identifier}
- RFC: {If applicable}
- Internal docs: {Project-specific references}
```

---

## Template Variants by Timeframe

### 1-2 Day (Concise) Variant

**Changes from standard:**
- Reduce to 3-5 test steps (prioritize critical paths)
- Omit automation scripts
- Simplified finding template
- Single remediation approach (no long-term guidance)
- Minimal prerequisites (assume standard tooling)

**Line count target:** 100-150 lines per test case

### 3-5 Day (Standard) Variant

**Uses standard template above.**

**Line count target:** 200-300 lines per test case

### 1+ Week (Comprehensive) Variant

**Additions to standard:**
- 8-10 test steps with edge cases
- Multiple testing approaches (Option A, B, C)
- Full automation suite (200+ line Python scripts)
- Unit test examples for remediation
- Advanced attack scenarios
- Integration with CI/CD

**Line count target:** 300-500 lines per test case

---

## Template Variants by Assessment Type

### Pentest Template

**Focus:** Exploitation and business impact

**Key sections:**
- Attack scenarios upfront
- Exploitation steps with PoC commands
- Finding template emphasizes impact
- Multiple severity levels

### Audit Template

**Focus:** Policy validation and baselines

**Key sections:**
- Baseline expectations table
- Configuration checks
- Compliance mapping (CIS, NIST)
- Pass/fail based on policy requirements

### Compliance Template

**Focus:** Control evidence and traceability

**Key sections:**
- Control ID mapping (NIST 800-53, ISO 27001)
- Evidence collection guidance
- Auditor-friendly documentation templates
- Artifact preservation

### Vulnerability Assessment Template

**Focus:** Discovery without exploitation

**Key sections:**
- Enumeration techniques
- Vulnerability identification (no exploitation)
- Risk-based prioritization
- Remediation tracking

---

## Tool-Specific Command Examples

### Burp Suite Professional

```markdown
### Step X: Test with Burp Suite

**Action:** Intercept and manipulate request in Burp Repeater

**Steps:**
1. Configure browser proxy (127.0.0.1:8080)
2. Navigate to {URL}
3. Find request in HTTP History
4. Send to Repeater (Cmd+R)
5. Modify parameter: `{param}={malicious_value}`
6. Send request and analyze response

**Expected:**  Security control rejects malicious input
**Failure:** Application processes malicious input
```

### curl + jq

```markdown
### Step X: Test with curl

**Command:**
\`\`\`bash
curl -s -X POST "https://api.example.com/endpoint" \\
  -H "Authorization: Bearer ${TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{"param": "value"}' \\
  | jq '.result'
\`\`\`

**Expected Output:**
\`\`\`json
{"status": "success"}
\`\`\`
```

### Postman

```markdown
### Step X: Test with Postman

**Collection:** {Collection name}
**Request:** {Request name}

**Setup:**
1. Import collection from `{path}`
2. Set environment variable `API_URL={url}`
3. Set environment variable `TOKEN={token}`

**Execute:**
1. Select request "{Request name}"
2. Click "Send"
3. Verify response in Tests tab

**Expected:** Status code 200, `result` field present
**Failure:** Status code 4xx/5xx or missing `result`
```

### Python Automation

```markdown
### Step X: Automated Test

**Script:** `tc-{id}-automation.py`

**Execute:**
\`\`\`bash
export API_URL="https://api.example.com"
export TOKEN="your-token-here"
python3 tc-{id}-automation.py
\`\`\`

**Expected Output:**
\`\`\`
✅ Test 1: PASS - Feature A secure
✅ Test 2: PASS - Feature B secure
✅ All tests passed (2/2)
\`\`\`
```

---

## Finding Template Variants

### PlexTrac-Compatible Finding

```markdown
**Title:** {Vulnerability Name}

**Severity:** {CRITICAL/HIGH/MEDIUM/LOW}

**CVSS Score:** {Score} ({Vector})

**Description:**
{What is the vulnerability}

**Impact:**
{Business impact and attack scenarios}

**Affected Assets:**
- {Asset 1}
- {Asset 2}

**Evidence:**
{Step-by-step reproduction with screenshots}

**Recommendation:**
{Detailed remediation guidance}

**References:**
- OWASP: {Category}
- CWE: {ID}
```

### Simple Markdown Finding

```markdown
## Finding: {Vulnerability Name}

**Severity:** {CRITICAL/HIGH/MEDIUM/LOW}

**Issue:** {Brief description}

**Fix:** {Remediation in 1-2 sentences}
```

### SARIF Finding (JSON)

```json
{
  "ruleId": "TC-{ID}",
  "level": "error",
  "message": {
    "text": "{Vulnerability description}"
  },
  "locations": [{
    "physicalLocation": {
      "artifactLocation": {
        "uri": "{file/endpoint}"
      }
    }
  }]
}
```

---

## Quick Reference: When to Use Which Template

| Scenario | Template | Rationale |
|----------|----------|-----------|
| 2-day OAuth assessment | PT-CONCISE | Limited time, focus on critical paths |
| 5-day web app pentest | PT-STANDARD | Balanced detail with automation options |
| 2-week red team engagement | PT-COMPREHENSIVE | Full automation, edge cases, advanced techniques |
| Policy review audit | AUDIT-STANDARD | Configuration validation, baseline checks |
| SOC 2 assessment | COMPLIANCE-STD | Control evidence, traceability |
| External vuln scan | VULN-DISCOVERY | Discovery-focused, no exploitation needed |

---
