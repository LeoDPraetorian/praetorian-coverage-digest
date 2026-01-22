# P0 Compliance: Capability Development

**Domain-specific compliance checks for security capability implementations (VQL, Nuclei, Janus, fingerprintx).**

---

## Overview

P0 Compliance Validation is a **blocking gate** that verifies capability implementations meet mandatory requirements BEFORE code enters review. This prevents:

- Capabilities that don't conform to expected schemas
- Runtime panics from unhandled errors
- False positives/negatives from poorly validated matchers
- Integration failures from interface mismatches

**When it runs**: Phase 10 (Domain Compliance), after implementation
**Blocking behavior**: Violations found → Human Checkpoint → Must fix before proceeding
**Success behavior**: All checks pass → Automatic progression to review

---

## Universal P0 Requirements (All Capability Types)

These checks apply to ALL capability types:

| P0 Requirement             | What to Verify                                       | Validation Command                             | Blocking |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------- | -------- |
| **Capability Type Matrix** | Matches correct type (VQL/Nuclei/Janus/fingerprintx) | Check file extension + framework imports       | Always   |
| **Output Schema**          | Conforms to Tabularium schema                        | Validate against `modules/tabularium/schemas/` | Always   |
| **Error Handling**         | No panics, structured errors                         | `grep -n "panic"` + error wrapping check       | Always   |

### Capability Type Detection

| Type         | File Pattern   | Key Imports/Fields                    |
| ------------ | -------------- | ------------------------------------- |
| VQL          | `*.vql`        | imports `collector` framework         |
| Nuclei       | `*.yaml`       | `id:` field, `info:` metadata         |
| Janus        | `*.go`         | `janus.Tool` interface implementation |
| fingerprintx | `plugins/*.go` | `Plugin` interface                    |
| Scanner      | `*.go`         | Scanner-specific interfaces           |

---

## VQL Capability P0 Requirements

| P0 Requirement      | What to Verify                            | Validation Command                    | Blocking |
| ------------------- | ----------------------------------------- | ------------------------------------- | -------- |
| **Query Syntax**    | VQL query parses without errors           | `velociraptor query parse {file}.vql` | Always   |
| **Artifact Schema** | Output matches expected schema            | Compare output fields to schema       | Always   |
| **Performance**     | Query completes in ≤60s on typical system | Benchmark test with timeout           | Always   |

### P1 Requirements (VQL)

| P1 Requirement    | What to Verify                            | Notes                         |
| ----------------- | ----------------------------------------- | ----------------------------- |
| Platform Coverage | Works on target platforms (Win/Linux/Mac) | Document platform limitations |

### VQL Validation Commands

```bash
# Parse check
velociraptor query parse artifacts/capability.vql

# Schema validation
velociraptor query run --format=json artifacts/capability.vql | \
  jq 'keys' | diff - expected_schema.json

# Performance benchmark
timeout 60s velociraptor query run artifacts/capability.vql
```

---

## Nuclei Template P0 Requirements

| P0 Requirement       | What to Verify                    | Validation Command                       | Blocking |
| -------------------- | --------------------------------- | ---------------------------------------- | -------- |
| **YAML Syntax**      | Template validates without errors | `nuclei -validate -t {template}.yaml`    | Always   |
| **Matcher Accuracy** | ≤2% false positive rate           | Test against known-good/bad targets      | Always   |
| **CVE Metadata**     | Complete CVE info if CVE-specific | Check `info.classification.cve-id` field | Always   |

### P1 Requirements (Nuclei)

| P1 Requirement | What to Verify              | Notes                   |
| -------------- | --------------------------- | ----------------------- |
| Request Count  | ≤3 HTTP requests per target | Document if more needed |

### Nuclei Validation Commands

```bash
# Syntax validation
nuclei -validate -t templates/CVE-2024-XXXX.yaml

# Test against known vulnerable target
nuclei -t templates/CVE-2024-XXXX.yaml -u http://vulnerable.test

# Test against known safe target (should NOT match)
nuclei -t templates/CVE-2024-XXXX.yaml -u http://safe.test

# Check CVE metadata
yq '.info.classification.cve-id' templates/CVE-2024-XXXX.yaml
```

---

## Janus/fingerprintx/Scanner P0 Requirements

| P0 Requirement         | What to Verify                     | Validation Command                | Blocking |
| ---------------------- | ---------------------------------- | --------------------------------- | -------- |
| **Go Compilation**     | Compiles without errors            | `go build ./...`                  | Always   |
| **Interface Contract** | Implements required interfaces     | `go vet` + interface check        | Always   |
| **Error Handling**     | Graceful failure on tool errors    | `grep -n "panic"` should be empty | Always   |
| **Rate Limiting**      | Respects API rate limits (Scanner) | Check for rate limiter usage      | Always   |

### Go Validation Commands

```bash
# Compilation check
go build ./...

# Interface verification
go vet ./...

# Panic check (should return no results)
grep -rn "panic(" --include="*.go" .

# Rate limiter check (Scanner only)
grep -n "rate.Limiter\|time.Sleep\|Backoff" --include="*.go" .
```

---

## Validation Protocol

**3-Step Validation Process (MANDATORY):**

### Step 1: Detect Capability Type

```bash
# Determine type from file pattern
if [[ "$FILE" == *.vql ]]; then TYPE="VQL"
elif [[ "$FILE" == *.yaml ]] && grep -q "^id:" "$FILE"; then TYPE="Nuclei"
elif [[ "$FILE" == *.go ]] && grep -q "janus.Tool" "$FILE"; then TYPE="Janus"
elif [[ "$FILE" == plugins/*.go ]]; then TYPE="fingerprintx"
else TYPE="Scanner"
fi
```

### Step 2: Run Type-Specific P0 Checks

Run ALL checks from the appropriate table above. Capture output for each.

### Step 3: Proceed or Escalate

| Result          | Action                                  | Human Checkpoint? |
| --------------- | --------------------------------------- | ----------------- |
| All checks PASS | Proceed to Phase 11 (Code Quality)      | No                |
| Any check FAILS | Generate compliance report + escalate   | **YES**           |
| Warnings only   | Document warnings + ask user preference | Optional          |

---

## Failure Handling

**When P0 checks fail:**

1. **Generate compliance report** (see Output Format below)
2. **Classify violations**:
   - **CRITICAL**: Compilation failures, panic calls, schema mismatches
   - **ERROR**: Interface violations, missing metadata
   - **WARNING**: Performance borderline, platform gaps
3. **Escalate to user** via AskUserQuestion:

```
P0 Compliance Verification found {count} violations.

**Critical**: VQL query fails to parse (syntax error line 45)
**Error**: Nuclei template missing CVE metadata
**Warning**: Query takes 55s (target: ≤60s)

Options:
1. Fix violations now (Recommended)
2. Proceed anyway with violations documented
3. Review violations and decide
```

---

## Output Format

````markdown
# P0 Compliance Report: Capability Development - {capability-name}

**Status**: COMPLIANT | NON-COMPLIANT
**Capability Type**: VQL | Nuclei | Janus | fingerprintx | Scanner
**Violations**: {count} ({critical} CRITICAL, {error} ERROR, {warning} WARNING)
**Date**: {ISO 8601 timestamp}

## Universal Requirements

| Requirement            | Status   | Evidence                          |
| ---------------------- | -------- | --------------------------------- |
| Capability Type Matrix | ✅       | Detected as {type} from {pattern} |
| Output Schema          | ✅       | Matches Tabularium schema         |
| Error Handling         | ❌ ERROR | panic() call at line 156          |

## Type-Specific Requirements ({type})

| Requirement       | Status   | Evidence            |
| ----------------- | -------- | ------------------- |
| {type-specific-1} | ✅       | {evidence}          |
| {type-specific-2} | ❌ ERROR | {violation details} |

## Violations Details

### ERROR: Error Handling (capability.go:156)

**Current:**

```go
if err != nil {
    panic(err)  // ❌ Never panic in capabilities
}
```
````

**Fix**: Return structured error instead

```go
if err != nil {
    return nil, fmt.Errorf("capability failed: %w", err)
}
```

```

---

## Rationalization Prevention

| Rationalization | Reality | Counter |
| --------------- | ------- | ------- |
| "panic() is fine for unrecoverable errors" | Capabilities must NEVER panic - return errors | Replace with error return |
| "False positive rate is close to 2%" | 2.5% means 1 in 40 targets get false alert | Tune matchers to hit target |
| "60s timeout is arbitrary" | Users expect quick results; slow = abandoned | Optimize query or document limitation |
| "Interface doesn't need all methods" | Partial implementation breaks integration | Implement all required methods |
| "Rate limiting slows things down" | No rate limit = API ban = complete failure | Add rate limiter |

---

## Related References

| Reference | Location | Purpose |
| --------- | -------- | ------- |
| Phase 10 Details | `references/phase-10-domain-compliance.md` | Full domain compliance checklist |
| Capability Type Matrix | `references/phase-10-domain-compliance.md` | Type detection patterns |
| VQL Development | `.claude/skill-library/development/capabilities/writing-vql-capabilities/` | VQL best practices |
| Nuclei Development | `.claude/skill-library/development/capabilities/writing-nuclei-templates/` | Nuclei template patterns |
| fingerprintx Development | `.claude/skill-library/development/capabilities/writing-fingerprintx-modules/` | fingerprintx patterns |
```
