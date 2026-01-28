# Phase 10: Domain Compliance

**Validate fingerprintx-specific P0 requirements before code review.**

---

## Overview

Domain Compliance validates that implementation meets mandatory patterns specific to fingerprintx plugin development. This is a **blocking gate** between Implementation and Code Quality.

**Entry Criteria:** Phase 9 (Design Verification) complete.

**Exit Criteria:** All P0 requirements pass (or user explicitly approves proceeding with documented violations).

---

## Fingerprintx P0 Requirements

| Check               | Description                                       | Severity | Validation                          |
| ------------------- | ------------------------------------------------- | -------- | ----------------------------------- |
| Protocol Detection  | Service/protocol identification logic implemented | P0       | grep for Match/Detect method        |
| Banner Parsing      | Banner response parsing handles malformed input   | P0       | Check error handling in parse logic |
| Default Ports       | Default port(s) documented in package comment     | P0       | grep for port documentation         |
| Type Constant       | Type constant added to {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go       | P0       | grep for Service constant           |
| Type Alphabetical   | Type constant in alphabetical position            | P0       | sort -c validation                  |
| Plugin Import       | Plugin imported in {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go         | P0       | grep for package import             |
| Import Alphabetical | Plugin import in alphabetical position            | P0       | sort -c validation                  |
| Version Extraction  | Version extraction implemented (if open-source)   | P1       | Check for version parsing           |
| Shodan Test Vectors | At least 3 Shodan query test vectors documented   | P1       | Check test file or docs             |
| Error Handling      | Connection errors handled gracefully              | P0       | grep for err != nil returns         |

---

## Step 1: Run P0 Compliance Checks

### Protocol Detection Check

```bash
# Verify Match or Detect method exists
grep -E "func.*Match\(|func.*Detect\(" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Detection method found

# Verify ServiceMatch return
grep "ServiceMatch" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Returns ServiceMatch type
```

### Banner Parsing Check

```bash
# Check for banner parsing logic
grep -A5 "banner\|Banner\|response\|Response" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Banner parsing present

# Check for malformed input handling
grep -E "len\(.*\)\s*[<>=]|if.*==.*nil" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Length/nil checks present
```

### Default Ports Check

```bash
# Check package comment for ports
head -30 {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go | grep -i "port\|Port"
-> PASS: Default port documented

# Or check DefaultPorts constant/variable
grep "DefaultPort\|defaultPort" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Port constant defined
```

### Type Constant Check

```bash
# Check type constant exists
grep "Service{Protocol}" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go
-> PASS: Service{Protocol} = "service-{protocol}"

# Check alphabetical order
grep "Service" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go | sort -c
-> PASS: Constants sorted alphabetically
```

### Plugin Import Check

```bash
# Check plugin import exists
grep "{protocol}" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go
-> PASS: Plugin package imported

# Check import alphabetical order
grep "plugins/services" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go | sort -c
-> PASS: Imports sorted alphabetically
```

### Error Handling Check

```bash
# Check for error returns
grep -E "err != nil|return nil" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Error handling present

# Check for graceful handling (no panics)
grep -v "panic" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go | wc -l
-> PASS: No panic statements
```

---

## Step 2: Run P1 Advisory Checks

### Version Extraction Check (P1)

```bash
# Check for version extraction
grep -i "version\|Version" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Version extraction implemented
# OR
-> ADVISORY: Version extraction not implemented (acceptable for proprietary protocols)
```

### Shodan Test Vectors Check (P1)

```bash
# Check for Shodan queries in tests or docs
grep -r "shodan\|Shodan\|product:" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/
-> PASS: Shodan queries documented
# OR
-> ADVISORY: Shodan queries not documented (add before production)
```

---

## Step 3: Classify Results

For each check:

| Status   | Meaning                 | Action                            |
| -------- | ----------------------- | --------------------------------- |
| PASS     | Requirement met         | Document evidence                 |
| FAIL     | P0 Requirement violated | Document violation + fix guidance |
| ADVISORY | P1 soft limit exceeded  | Document, proceed with note       |

---

## Step 4: Proceed or Escalate

**Decision matrix:**

| Result             | Action                                | Human Checkpoint? |
| ------------------ | ------------------------------------- | ----------------- |
| All P0 PASS        | Proceed to Phase 11                   | No                |
| Any P0 FAIL        | Generate compliance report + escalate | **YES**           |
| P1 advisories only | Document + ask user preference        | Optional          |

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

## Step 5: Write Compliance Report

Create `.fingerprintx-development/domain-compliance.md`:

```markdown
# Domain Compliance Report

**Protocol:** {protocol}
**Checked:** {timestamp}

## P0 Checks (BLOCKING)

| Check               | Status | Evidence                                |
| ------------------- | ------ | --------------------------------------- |
| Protocol Detection  | PASS   | Match() method in plugin.go:45          |
| Banner Parsing      | PASS   | Handles len=0 case, line 62             |
| Default Ports       | PASS   | Port 1234 documented in package comment |
| Type Constant       | PASS   | Service{Protocol} in types.go:123       |
| Type Alphabetical   | PASS   | sort -c returns 0                       |
| Plugin Import       | PASS   | Import in plugins.go:45                 |
| Import Alphabetical | PASS   | sort -c returns 0                       |
| Error Handling      | PASS   | Returns nil on error, no panics         |

## P1 Checks (Advisory)

| Check               | Status   | Evidence                   |
| ------------------- | -------- | -------------------------- |
| Version Extraction  | PASS     | Regex extracts from banner |
| Shodan Test Vectors | ADVISORY | 2 of 3 recommended queries |

## Summary

**P0 Violations:** 0
**P1 Advisories:** 1

**Verdict:** COMPLIANT - Ready for Code Quality review
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  10_domain_compliance:
    status: "complete"
    completed_at: "{timestamp}"
    plugin_type: "fingerprintx"

compliance:
  p0_checks:
    - requirement: "Protocol Detection"
      status: "pass"
      evidence: "Match() method in plugin.go:45"
    - requirement: "Banner Parsing"
      status: "pass"
      evidence: "Handles len=0 case"
    - requirement: "Default Ports"
      status: "pass"
      evidence: "Port documented in package comment"
    - requirement: "Type Constant"
      status: "pass"
      evidence: "Service{Protocol} in types.go"
    - requirement: "Type Alphabetical"
      status: "pass"
      evidence: "sort -c returns 0"
    - requirement: "Plugin Import"
      status: "pass"
      evidence: "Import in plugins.go"
    - requirement: "Import Alphabetical"
      status: "pass"
      evidence: "sort -c returns 0"
    - requirement: "Error Handling"
      status: "pass"
      evidence: "Returns nil on error"

  p1_checks:
    - requirement: "Version Extraction"
      status: "pass"
      evidence: "Regex extracts from banner"
    - requirement: "Shodan Test Vectors"
      status: "advisory"
      evidence: "2 of 3 queries documented"

  p0_violations: 0
  p1_advisories: 1
```

---

## Step 7: Update TodoWrite & Report

```markdown
## Domain Compliance Complete

**Protocol:** {protocol}
**P0 Checks:** 8 executed, 8 passed

| Check               | Status |
| ------------------- | ------ |
| Protocol Detection  | PASS   |
| Banner Parsing      | PASS   |
| Default Ports       | PASS   |
| Type Constant       | PASS   |
| Type Alphabetical   | PASS   |
| Plugin Import       | PASS   |
| Import Alphabetical | PASS   |
| Error Handling      | PASS   |

**P1 Advisories:** 1 (Shodan queries)
**P0 Violations:** 0

-> Proceeding to Phase 11: Code Quality
```

---

## Common P0 Violations and Fixes

| Violation                      | Fix Guidance                                               |
| ------------------------------ | ---------------------------------------------------------- |
| Type constant not alphabetical | Move constant to correct alphabetical position in types.go |
| Plugin import not alphabetical | Move import to correct alphabetical position in plugins.go |
| No error handling              | Add `if err != nil { return nil }` patterns                |
| No banner parsing              | Add length check before accessing response bytes           |
| No default port documented     | Add port to package comment header                         |
| Missing detection method       | Implement Match() or Detect() returning ServiceMatch       |

---

## Edge Cases

### Protocol Has No Clear Banner

If protocol doesn't have a text banner:

1. Document binary detection approach
2. Use byte pattern matching instead
3. Still requires error handling for short/empty responses

### User Overrides P0 Gate

If user chooses "Proceed anyway":

1. **Document ALL violations** in MANIFEST with `gate_override`
2. **Warn** that code review will likely flag these
3. **Proceed** to Phase 11

---

## Related References

- [Phase 9: Design Verification](phase-9-design-verification.md) - Previous phase
- [Phase 11: Code Quality](phase-11-code-quality.md) - Next phase
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval
- `writing-nerva-tcp-udp-modules` - P0 requirements source (`.claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/SKILL.md`)
