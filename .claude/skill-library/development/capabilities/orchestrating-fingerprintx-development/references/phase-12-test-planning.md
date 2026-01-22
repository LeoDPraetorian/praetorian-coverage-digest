# Phase 12: Test Planning

**Create comprehensive test plan with fingerprintx-specific coverage targets and test patterns.**

---

## Overview

Test Planning designs test strategy with fingerprintx-specific coverage targets and test patterns.

**Entry Criteria:** Phase 11 (Code Quality) complete.

**Exit Criteria:** Test plan saved with all required sections.

---

## Fingerprintx Coverage Targets

| Category           | Target | Rationale                      |
| ------------------ | ------ | ------------------------------ |
| Detection Logic    | 95%    | CRITICAL - core fingerprinting |
| Banner Parsing     | 90%    | HIGH - handles external input  |
| Version Extraction | 85%    | HIGH - user-visible output     |
| Error Paths        | 90%    | HIGH - security/robustness     |
| Utility Functions  | 70%    | MEDIUM - helper code           |

---

## Spawn Test Lead for Planning

```markdown
Task(
subagent_type: "test-lead",
description: "Create test plan for {protocol} plugin",
prompt: "
Task: Create comprehensive test plan for fingerprintx plugin

INPUTS (Read and synthesize):

1. Architecture: .fingerprintx-development/architecture.md
2. Implementation: .fingerprintx-development/implementation-summary.md
3. Security Assessment: .fingerprintx-development/security-review.md (from Phase 11)
4. Protocol Research: .fingerprintx-development/protocol-research.md (from Phase 3)

PLUGIN TYPE: fingerprintx

ANALYZE and create test plan specifying:

1. COVERAGE TARGETS
   - Detection logic: 95% (CRITICAL - core fingerprinting)
   - Banner parsing: 90% (HIGH - handles external input)
   - Version extraction: 85% (HIGH - user-visible output)
   - Error paths: 90% (HIGH - security/robustness)

2. REQUIRED TESTS (Priority Order)

   Unit Tests:
   - Detection logic with valid banners
   - Detection logic with invalid banners
   - Version extraction happy path
   - Version extraction failure cases
   - Banner parsing edge cases

   Integration Tests:
   - Full plugin flow with mock server
   - Timeout handling
   - Connection failure handling

   Shodan Validation Tests:
   - At least 3 real-world banners from Shodan
   - Version extraction from real banners
   - Detection accuracy validation

3. TEST PATTERNS FOR FINGERPRINTX

   Anti-Patterns to AVOID:
   - Testing only happy path
   - No malformed input tests
   - Testing implementation details (internal state)
   - Mocking the service being detected
   - No timeout/error scenario tests

   Required Patterns:
   - Table-driven tests for banner variations
   - Fuzz testing for banner parsing
   - Golden file tests for version extraction
   - Mock server tests for full flow

4. SHODAN VALIDATION
   - Minimum 3 Shodan queries for real-world banners
   - Document query used to find each banner
   - Include version variations if available

5. ACCEPTANCE CRITERIA
   - All coverage targets met
   - Zero anti-patterns detected
   - Shodan validation passes (3+ real banners)
   - All tests pass consistently (3 runs)

DELIVERABLE:
Save test plan to: .fingerprintx-development/test-plan.md

Return:
{
'status': 'complete',
'coverage_analysis': {
'detection_logic': { 'target': '95%', 'priority': 'CRITICAL' },
'banner_parsing': { 'target': '90%', 'priority': 'HIGH' },
'version_extraction': { 'target': '85%', 'priority': 'HIGH' },
'error_paths': { 'target': '90%', 'priority': 'HIGH' }
},
'tests_required': {
'unit': {count},
'integration': {count},
'shodan_validation': {count},
'total': {count}
}
}
"
)
```

---

## Fingerprintx Test Frameworks

| Test Type         | Framework            | Location                                                        |
| ----------------- | -------------------- | --------------------------------------------------------------- |
| Unit              | Go testing + testify | pkg/plugins/services/{protocol}/{protocol}\_test.go             |
| Integration       | Go httptest/net      | pkg/plugins/services/{protocol}/{protocol}\_integration_test.go |
| Shodan Validation | Manual + Go          | pkg/plugins/services/{protocol}/{protocol}\_shodan_test.go      |

---

## Test Plan Structure for Fingerprintx

```markdown
## Test Plan: {Protocol} Fingerprintx Plugin

### Plugin Type: fingerprintx

### Coverage Analysis (Current State)

| Category           | Current | Target | Gap  |
| ------------------ | ------- | ------ | ---- |
| Detection Logic    | 0%      | 95%    | -95% |
| Banner Parsing     | 0%      | 90%    | -90% |
| Version Extraction | 0%      | 85%    | -85% |
| Error Paths        | 0%      | 90%    | -90% |

### Required Tests (Priority Order)

#### Detection Logic (CRITICAL - 95%)

1. `Test{Protocol}Detection_ValidBanner` - Valid banner detection
   - Input: Standard service banner
   - Expected: ServiceMatch with correct type
   - Acceptance: Detects service type correctly

2. `Test{Protocol}Detection_InvalidBanner` - Invalid banner rejection
   - Input: Different service banner (e.g., HTTP, SSH)
   - Expected: nil (no match)
   - Acceptance: Does not falsely detect

3. `Test{Protocol}Detection_EmptyResponse` - Empty response handling
   - Input: Zero-length response
   - Expected: nil (no match, no panic)
   - Acceptance: Graceful failure

4. `Test{Protocol}Detection_MalformedBanner` - Malformed input handling
   - Input: Truncated/garbage data
   - Expected: nil or partial match
   - Acceptance: No panic, no crash

#### Version Extraction (HIGH - 85%)

5. `Test{Protocol}VersionExtraction_Valid` - Version extraction
   - Input: Banner with version string
   - Expected: ServiceMatch with version populated
   - Acceptance: Version correctly extracted

6. `Test{Protocol}VersionExtraction_NoVersion` - Missing version handling
   - Input: Banner without version
   - Expected: ServiceMatch with empty version
   - Acceptance: Graceful fallback

#### Error Paths (HIGH - 90%)

7. `Test{Protocol}ConnectionTimeout` - Timeout handling
   - Input: Slow/hanging server
   - Expected: Timeout error, no hang
   - Acceptance: Returns within timeout period

8. `Test{Protocol}ConnectionRefused` - Connection failure
   - Input: Closed port
   - Expected: Connection error, nil match
   - Acceptance: Graceful failure

#### Shodan Validation (REQUIRED - 3+)

9. `Test{Protocol}ShodanBanner1` - Real-world banner 1
   - Source: Shodan query "{query}"
   - Banner: "{actual banner from Shodan}"
   - Expected: Detection + version

10. `Test{Protocol}ShodanBanner2` - Real-world banner 2
    - Source: Shodan query "{query}"
    - Banner: "{actual banner from Shodan}"
    - Expected: Detection + version

11. `Test{Protocol}ShodanBanner3` - Real-world banner 3
    - Source: Shodan query "{query}"
    - Banner: "{actual banner from Shodan}"
    - Expected: Detection + version

### Anti-Patterns to AVOID

| Anti-Pattern         | Detection                      | Remedy                  |
| -------------------- | ------------------------------ | ----------------------- |
| Happy path only      | No invalid/error tests         | Add negative test cases |
| No boundary tests    | No empty/truncated inputs      | Add edge case tests     |
| Testing internals    | Accessing unexported functions | Test via public API     |
| Mocking service      | Mocking Match() itself         | Use real/mock server    |
| No Shodan validation | 0 real-world banners           | Add 3+ Shodan banners   |

### Acceptance Criteria

- [ ] Detection logic: 95% coverage
- [ ] Banner parsing: 90% coverage
- [ ] Version extraction: 85% coverage
- [ ] Error paths: 90% coverage
- [ ] Shodan validation: 3+ real banners tested
- [ ] Zero anti-patterns detected
- [ ] All tests pass 3 consecutive runs
```

---

## Update MANIFEST.yaml

```yaml
phases:
  12_test_planning:
    status: "complete"
    completed_at: "{timestamp}"
    agent: "test-lead"

test_plan:
  location: ".fingerprintx-development/test-plan.md"
  plugin_type: "fingerprintx"

  coverage_targets:
    detection_logic: "95%"
    banner_parsing: "90%"
    version_extraction: "85%"
    error_paths: "90%"

  tests_required:
    unit: 8
    integration: 2
    shodan_validation: 3
    total: 13

  anti_patterns:
    - "No happy path only tests"
    - "No mocking service being detected"
    - "No testing implementation details"
    - "Must have Shodan validation"
```

---

## User Report

```markdown
## Test Planning Complete

**Protocol:** {protocol}

**Coverage Targets:**
| Category | Target | Priority |
|----------|--------|----------|
| Detection Logic | 95% | CRITICAL |
| Banner Parsing | 90% | HIGH |
| Version Extraction | 85% | HIGH |
| Error Paths | 90% | HIGH |

**Tests Required:**

- Unit: 8
- Integration: 2
- Shodan Validation: 3
- **Total: 13**

**Anti-Patterns to Avoid:**

- No happy path only tests
- No mocking service being detected
- Must include Shodan validation (3+ banners)

**Test Plan:** .fingerprintx-development/test-plan.md

Proceeding to Phase 13: Testing
```

---

## Skip Conditions

| Work Type | Test Planning                    |
| --------- | -------------------------------- |
| BUGFIX    | Skip (test at bug location only) |
| SMALL     | Skip (minimal test scope)        |
| MODERATE  | Run                              |
| COMPLEX   | Run                              |

---

## Related References

- [Phase 11: Code Quality](phase-11-code-quality.md) - Previous phase
- [Phase 13: Testing](phase-13-testing.md) - Next phase (testers implement plan)
