# Phase 10: Domain Compliance

**Validate capability-specific P0 requirements before code review.**

---

## Overview

Domain Compliance validates that implementation meets mandatory patterns specific to capability development. This is a **blocking gate** between Design Verification and Code Quality.

**Entry Criteria:** Phase 9 (Design Verification) complete.

**Exit Criteria:** All P0 requirements pass (or user explicitly approves proceeding with documented violations).

---

## Step 1: Identify Capability Type

Determine which P0 table applies based on `capability_type` from Phase 3:

| Capability Type | P0 Table               |
| --------------- | ---------------------- |
| VQL             | VQL Capability P0      |
| Nuclei          | Nuclei Template P0     |
| Janus           | Janus Tool Chain P0    |
| Fingerprintx    | Fingerprintx Module P0 |
| Scanner         | Scanner Integration P0 |

---

## Step 2: Run VQL P0 Checks

**VQL Capability P0 Table:**

| Check             | Description                               | Severity | Validation                           |
| ----------------- | ----------------------------------------- | -------- | ------------------------------------ |
| Query Syntax      | VQL query parses without errors           | P0       | Run query through VQL parser         |
| Artifact Schema   | Output matches expected schema            | P0       | Compare output columns against spec  |
| Performance       | Query completes in ≤60s on typical system | P0       | Time query on test system            |
| Detection Logic   | Detection patterns are present            | P0       | Verify LET statements with detection |
| Platform Coverage | Works on target platforms (Win/Linux/Mac) | P1       | Test on each platform                |

**Validation:** Use VQL linter for syntax, grep for detection patterns, test file existence check.

---

## Step 3: Run Nuclei P0 Checks

**Nuclei Template P0 Table:**

| Check            | Description                         | Severity | Validation                        |
| ---------------- | ----------------------------------- | -------- | --------------------------------- |
| YAML Syntax      | Template validates without errors   | P0       | `nuclei -validate -t {file}`      |
| Matcher Accuracy | ≤2% false positive rate target      | P0       | Review matcher specificity        |
| CVE Metadata     | Complete CVE info (if CVE-specific) | P0       | Check info block for cve-id, cvss |
| Request Count    | ≤3 HTTP requests per target         | P1       | Count http request blocks         |
| Template ID      | Unique template identifier          | P0       | Check id field exists             |

**Validation:** `nuclei -validate -t {file}`, grep for CVE metadata and matcher specificity.

---

## Step 4: Run Janus P0 Checks

**Janus Tool Chain P0 Table:**

| Check              | Description                       | Severity | Validation                    |
| ------------------ | --------------------------------- | -------- | ----------------------------- |
| Go Compilation     | Compiles without errors           | P0       | `go build ./...`              |
| Interface Contract | Implements tool chain interface   | P0       | Check method signatures       |
| Error Handling     | Graceful failure on tool errors   | P0       | Review error handling code    |
| Pipeline Order     | Tools execute in correct sequence | P0       | Review pipeline configuration |
| Test Coverage      | Tests exist for core logic        | P0       | Test file exists              |

**Validation:** `go build ./...`, grep for interface methods and error handling, test file check.

---

## Step 5: Run Fingerprintx P0 Checks

**Fingerprintx Module P0 Table:**

| Check                | Description                                 | Severity | Validation              |
| -------------------- | ------------------------------------------- | -------- | ----------------------- |
| Go Compilation       | Compiles without errors                     | P0       | `go build ./...`        |
| 5-Method Interface   | Implements Name, Tags, Priority, Run, Match | P0       | Check all 5 methods     |
| Type Registration    | Type constant in types.go                   | P0       | Check type registration |
| Plugin Registration  | Registered in plugin_list.go                | P0       | Check plugin list       |
| Protocol Correctness | Probe follows protocol spec                 | P0       | Review against RFC      |
| Test Coverage        | Tests validate service detection            | P0       | Test file exists        |

**Validation:** `go build ./...`, grep for 5-method interface, type/plugin registration, test file check.

---

## Step 6: Run Scanner P0 Checks

**Scanner Integration P0 Table:**

| Check                 | Description                          | Severity | Validation            |
| --------------------- | ------------------------------------ | -------- | --------------------- |
| Go/Python Compilation | Compiles without errors              | P0       | Build verification    |
| API Authentication    | Auth flow implemented correctly      | P0       | Check auth code       |
| Rate Limit Handling   | Graceful handling of 429 errors      | P0       | Check rate limit code |
| Result Normalization  | Scanner output maps to Chariot model | P0       | Review mapping code   |
| Error Handling        | API errors handled gracefully        | P0       | Review error handling |
| Pagination            | Multi-page results handled           | P0       | Check pagination code |
| Test Coverage         | Integration tests exist              | P0       | Test file exists      |

**Validation:** `go build ./...`, grep for rate limit/pagination/normalization patterns, test file check.

---

## Step 7: Classify Results

For each P0 check:

| Status  | Meaning                | Action                            |
| ------- | ---------------------- | --------------------------------- |
| PASS    | Requirement met        | Document evidence                 |
| FAIL    | Requirement violated   | Document violation + fix guidance |
| WARNING | P1 soft limit exceeded | Document, proceed with note       |

---

## Step 8: Proceed or Escalate

**Decision matrix:**

| Result           | Action                                | Human Checkpoint? |
| ---------------- | ------------------------------------- | ----------------- |
| All P0 PASS      | Proceed to Phase 11                   | No                |
| Any P0 FAIL      | Generate compliance report + escalate | **YES**           |
| P1 warnings only | Document + ask user preference        | Optional          |

**If P0 violations found:**

```typescript
AskUserQuestion({
  questions: [
    {
      question: `P0 Compliance found ${count} violations. How to proceed?`,
      header: "P0 Gate",
      multiSelect: false,
      options: [
        {
          label: "Fix violations now (Recommended)",
          description: "Return to Phase 8 to fix issues",
        },
        {
          label: "Proceed anyway",
          description: "Document violations, likely rejected in code review",
        },
        { label: "Review violations", description: "Show me details of each violation" },
      ],
    },
  ],
});
```

---

## Step 9: Write Compliance Report

Create `.capability-development/domain-compliance.md`:

```markdown
# Domain Compliance Report

**Capability Type:** {vql|nuclei|janus|fingerprintx|scanner}
**Checked:** {timestamp}

## P0 Checks

| Check           | Status | Evidence                               |
| --------------- | ------ | -------------------------------------- |
| Query Syntax    | PASS   | VQL parses without errors              |
| Artifact Schema | PASS   | Output matches specification           |
| Detection Logic | PASS   | LET statements with detection patterns |
| Test Coverage   | PASS   | Test file exists                       |

## P1 Checks (Warnings)

| Check             | Status  | Evidence               |
| ----------------- | ------- | ---------------------- |
| Platform Coverage | WARNING | Only tested on Linux   |
| Performance       | PASS    | Query completes in 45s |

## Summary

**P0 Violations:** 0
**P1 Warnings:** 1

**Verdict:** COMPLIANT - Ready for Code Quality review
```

---

## Step 10: Update MANIFEST.yaml

```yaml
phases:
  10_domain_compliance:
    status: "complete"
    completed_at: "{timestamp}"
    capability_type: "{vql|nuclei|janus|fingerprintx|scanner}"

compliance:
  p0_checks:
    - requirement: "Query Syntax"
      status: "pass"
      evidence: "VQL parses without errors"
    - requirement: "Artifact Schema"
      status: "pass"
      evidence: "Output matches specification"
    - requirement: "Detection Logic"
      status: "pass"
      evidence: "Detection patterns present"
    - requirement: "Test Coverage"
      status: "pass"
      evidence: "Test file exists"

  p0_violations: 0
  p1_warnings: 1
```

---

## Step 11: Update TodoWrite & Report

```markdown
## Domain Compliance Complete

**Capability Type:** {type}
**P0 Checks:** {n} executed, {n} passed

| Check           | Status |
| --------------- | ------ |
| Query Syntax    | PASS   |
| Artifact Schema | PASS   |
| Detection Logic | PASS   |
| Test Coverage   | PASS   |

**Violations:** 0
**Warnings:** 1

→ Proceeding to Phase 11: Code Quality
```

---

## Common Violations by Type

### VQL Violations

| Violation               | Fix Guidance                               |
| ----------------------- | ------------------------------------------ |
| Query parse error       | Fix VQL syntax, check for missing keywords |
| Missing detection logic | Add LET statements with detection patterns |
| No artifact schema      | Define output columns explicitly           |
| No test file            | Create test file with detection validation |

### Nuclei Violations

| Violation            | Fix Guidance                                        |
| -------------------- | --------------------------------------------------- |
| YAML syntax error    | Fix YAML formatting, validate with nuclei -validate |
| Missing CVE metadata | Add cve-id, cvss-score to info block                |
| Weak matchers        | Use word/regex matchers instead of status codes     |
| No template ID       | Add unique id field                                 |

### Go Capability Violations (Janus/Fingerprintx/Scanner)

| Violation                 | Fix Guidance                             |
| ------------------------- | ---------------------------------------- |
| Build failure             | Fix Go compilation errors                |
| Missing interface methods | Implement all required interface methods |
| No error handling         | Add error checking and propagation       |
| No test file              | Create \_test.go file with coverage      |

### Scanner-Specific Violations

| Violation                | Fix Guidance                            |
| ------------------------ | --------------------------------------- |
| No rate limit handling   | Add 429 detection and backoff logic     |
| Missing pagination       | Implement cursor/page-based iteration   |
| Incomplete normalization | Map all scanner fields to Chariot model |

---

## Edge Cases

### Multiple Capability Types

If capability spans multiple types (e.g., VQL + Janus):

1. Run ALL applicable P0 checks
2. ALL checks must pass (or be overridden)
3. Document both types in MANIFEST

### User Overrides P0 Gate

If user chooses "Proceed anyway":

1. **Document ALL violations** in MANIFEST with `gate_override`
2. **Warn** that code review will likely flag these
3. **Proceed** to Phase 11

---

## Related References

- [Phase 9: Design Verification](phase-9-design-verification.md) - Previous phase
- [Phase 11: Code Quality](phase-11-code-quality.md) - Next phase
- [Quality Standards](quality-standards.md) - Capability-specific quality metrics
- [Capability Types](capability-types.md) - Type-specific implementation guidance
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
