# Gate Checklist

Complete pass/fail criteria for all blocking gates in the fingerprintx development workflow.

## Phase 3: Protocol Research Gate (BLOCKING)

**Cannot proceed to Phase 4 until ALL conditions are met.**

### Checklist

- [ ] **Protocol detection strategy document exists**
  - File: `{protocol}-protocol-research.md`
  - Location: `.claude/features/{date}-{protocol}-fingerprintx/`
  - Minimum content: Detection probes, response patterns, lab results

- [ ] **Detection probes identified**
  - Primary probe documented (what data to send)
  - Secondary probe documented (fallback)
  - Probe timing/sequence specified
  - Expected response patterns for each probe

- [ ] **Response validation patterns documented**
  - Byte sequences that confirm protocol
  - Field structures (headers, flags, etc.)
  - Distinguishing features from similar protocols
  - Negative patterns (what rules out this protocol)

- [ ] **Lab environment tested**
  - Docker container tested (with version tag)
  - Live service connection verified
  - Probe sequences tested against real service
  - Response capture documented (hex dumps, packet traces)

- [ ] **False positive mitigation addressed**
  - Similar protocols analyzed (e.g., MySQL vs MariaDB)
  - Distinguishing features identified
  - Validation checks documented
  - Edge cases tested

### Pass Criteria

**PASS** if:
- All 5 checklist items are complete with documented evidence
- Protocol detection strategy document is readable and comprehensive
- Lab tests demonstrate successful detection

**FAIL** if:
- Any checklist item missing
- Detection strategy relies on guesswork without lab verification
- Similar protocols not analyzed for false positive risk
- Document is incomplete or placeholder text remains

### Common Failure Reasons

1. **"I know the protocol, skipping lab"** - Lab testing reveals edge cases
2. **"Similar protocol analysis is optional"** - False positives are common
3. **"Basic probe is enough"** - Fallback probes handle timeouts/errors
4. **"Documentation later"** - Undocumented research = forgot research

### How to Fix

If gate fails, return to `researching-protocols` skill and complete missing phases:
- Phase 3: Lab Environment Setup
- Phase 4: Active Probing
- Phase 5: Pattern Identification
- Phase 6: False Positive Mitigation

---

## Phase 4: Version Marker Research Gate (CONDITIONAL BLOCKING)

**Skip if**: Closed-source protocol (no source repository available)

**Cannot proceed to Phase 5 until ALL conditions are met (if open-source).**

### Checklist

- [ ] **Version Fingerprint Matrix exists**
  - File: `{protocol}-version-matrix.md`
  - Location: `.claude/features/{date}-{protocol}-fingerprintx/`
  - Minimum content: Version ranges, markers, confidence levels

- [ ] **At least 3 version ranges distinguishable**
  - Major version distinctions (e.g., 5.x vs 8.x)
  - Minor version distinctions where possible (e.g., 8.0.4-8.0.22)
  - Marker documented for each range
  - Decision tree for classification

- [ ] **Marker categories documented**
  - Capability flags (bit fields that change)
  - Default value changes (configs, passwords)
  - Feature additions/removals
  - Protocol changes (packet structure)
  - Constants (version numbers, magic bytes)

- [ ] **Confidence levels assigned**
  - HIGH: Deterministic marker (always present in version range)
  - MEDIUM: Probabilistic marker (usually present)
  - LOW: Heuristic marker (best guess)
  - Confidence level per marker documented

- [ ] **CPE format defined**
  - Full CPE string format: `cpe:2.3:a:{vendor}:{product}:{version}:::::::*`
  - Version substitution pattern
  - Examples for each version range
  - Fallback CPE for unknown versions

### Pass Criteria

**PASS** if:
- All 5 checklist items complete
- At least 3 distinguishable version ranges
- Each marker has confidence level and category
- CPE format produces valid CPE strings

**FAIL** if:
- Fewer than 3 version ranges distinguishable
- Markers lack confidence levels or categories
- CPE format missing or incorrect
- Matrix is theoretical without source code verification

### Common Failure Reasons

1. **"Version detection can be added later"** - Precise CPEs are a requirement
2. **"Just use banner parsing"** - Banners are often missing or spoofed
3. **"3 version ranges is too many"** - Minimum for useful version detection
4. **"Confidence levels are subjective"** - HIGH = always present, not a guess

### How to Fix

If gate fails, return to `researching-version-markers` skill and complete missing phases:
- Phase 3: Source Repository Analysis
- Phase 4: Version Comparison
- Phase 5: Marker Extraction
- Phase 6: Version Fingerprint Matrix Construction

---

## Phase 6: Validation Gate (BLOCKING)

**Cannot proceed to Phase 7 until ALL conditions are met.**

### Checklist

- [ ] **Code compiles without errors**
  ```bash
  cd modules/fingerprintx
  go build ./...
  # Exit code 0 required
  ```

- [ ] **Go vet passes**
  ```bash
  go vet ./...
  # No suspicious constructs reported
  ```

- [ ] **Tests pass**
  ```bash
  go test ./pkg/plugins/services/{protocol}/... -v
  # All tests PASS, no FAIL
  ```

- [ ] **Manual verification succeeds**
  ```bash
  ./fingerprintx -t localhost:{port} --json
  # Output includes correct protocol detection
  # Output includes version (if version research done)
  # Output includes CPE
  ```

- [ ] **Version detection matches matrix predictions**
  - Test against each version range in matrix
  - Docker containers for each version
  - Version extracted matches expected version
  - CPE generated matches expected CPE format

- [ ] **CPE generated correctly**
  - Format: `cpe:2.3:a:{vendor}:{product}:{version}:::::::*`
  - Version substitution works
  - Fallback CPE used when version unknown

### Pass Criteria

**PASS** if:
- All compilation/test commands succeed (exit code 0)
- Manual verification shows correct detection
- Version detection accuracy ≥80% across test versions
- CPE format is valid and consistent

**FAIL** if:
- Compilation errors
- Test failures
- Manual verification shows wrong protocol or missing version
- CPE format invalid or inconsistent

### Common Failure Reasons

1. **"Tests pass, skipping manual verification"** - Tests may not cover all cases
2. **"Version detection works on one version"** - Must test all matrix ranges
3. **"CPE format looks right"** - Must validate with real tool output
4. **"TODO comments for CPE"** - No TODOs allowed, must be complete

### How to Fix

If gate fails:
1. Fix compilation/test errors first
2. Run manual verification against Docker containers
3. Compare version detection output to matrix predictions
4. Validate CPE format against CPE 2.3 specification

---

## Gate Override Protocol

**See**: [gate-override-protocol.md](gate-override-protocol.md) for when and how to override gates (EXTREMELY RARE).
