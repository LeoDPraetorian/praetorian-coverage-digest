# Quality Standards

**Capability-specific quality metrics and thresholds.**

---

## Overview

Each capability type has specific quality targets that MUST be met before Phase 16 (Completion). These are enforced during:

- Phase 10: Domain Compliance (P0 checks)
- Phase 13: Testing (verification)
- Phase 15: Test Quality (validation)

---

## Quality Metrics by Capability Type

| Metric              | VQL   | Nuclei | Janus | Fingerprintx | Scanner |
| ------------------- | ----- | ------ | ----- | ------------ | ------- |
| Detection Accuracy  | >=95% | >=95%  | N/A   | >=98%        | N/A     |
| False Positive Rate | <=5%  | <=2%   | N/A   | <=1%         | N/A     |
| Pipeline Success    | N/A   | N/A    | >=98% | N/A          | N/A     |
| API Integration     | N/A   | N/A    | N/A   | N/A          | 100%    |
| Test Coverage       | >=80% | >=80%  | >=85% | >=85%        | >=85%   |
| Performance         | <=60s | <=3req | <=30s | <=5s         | API SLA |

---

## VQL Quality Standards

### Detection Accuracy (>=95%)

- Test against known-positive samples
- Measure true positive rate
- Minimum 20 test samples required

### False Positive Rate (<=5%)

- Test against known-negative samples
- Minimum 20 clean samples required
- Document any edge cases

### Performance (<=60s)

- Query execution time on typical endpoint
- Exclude network latency for remote queries
- Test on representative dataset size

### Test Coverage (>=80%)

- Query logic branches covered
- Error handling paths tested
- Platform-specific paths verified

---

## Nuclei Quality Standards

### Detection Accuracy (>=95%)

- Test against known-vulnerable targets
- Verify matcher precision
- Document CVE reproduction steps

### False Positive Rate (<=2%)

- Test against known-safe targets
- Minimum 50 clean targets required
- Stricter than VQL due to active probing

### Request Count (<=3 requests)

- Minimize network overhead
- Combine checks where possible
- Document if more requests justified

### CVE Metadata (100% complete)

- CVE ID properly formatted
- CVSS score included
- Reference URLs valid

---

## Janus Quality Standards

### Pipeline Success Rate (>=98%)

- Tool chain executes without errors
- Error recovery handles transient failures
- Timeout handling works correctly

### Test Coverage (>=85%)

- Pipeline paths covered
- Error handling branches tested
- Integration points verified

### Performance (<=30s per tool)

- Individual tool execution time
- Pipeline total time documented
- Bottlenecks identified

---

## Fingerprintx Quality Standards

### Detection Accuracy (>=98%)

- Service identification correctness
- Higher threshold due to fingerprinting precision
- Minimum 100 test services

### False Positive Rate (<=1%)

- Very strict threshold
- Incorrect service ID is worse than unknown
- Confidence scoring calibrated

### Test Coverage (>=85%)

- Protocol variations covered
- Edge cases (malformed responses) tested
- Timeout scenarios verified

---

## Scanner Quality Standards

### API Integration (100%)

- All documented endpoints work
- Authentication flows complete
- Error responses handled

### Rate Limiting (Compliant)

- Respects API rate limits
- Implements backoff strategy
- No ban-triggering behavior

### Test Coverage (>=85%)

- API client paths covered
- Error handling tested
- Data mapping verified

---

## Measurement Methods

### Detection Accuracy

```bash
# For VQL/Nuclei/Fingerprintx
total_positives=20
true_positives=$(run_tests | grep DETECTED | wc -l)
accuracy=$(echo "scale=2; $true_positives / $total_positives" | bc)
```

### False Positive Rate

```bash
# For VQL/Nuclei/Fingerprintx
total_negatives=50
false_positives=$(run_clean_tests | grep DETECTED | wc -l)
fp_rate=$(echo "scale=2; $false_positives / $total_negatives" | bc)
```

### Test Coverage

```bash
# For Go capabilities
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total
```

---

## Quality Gates

| Phase | Quality Check  | Threshold  | Action if Failed         |
| ----- | -------------- | ---------- | ------------------------ |
| 10    | P0 Compliance  | All pass   | BLOCK - fix required     |
| 13    | Test execution | All pass   | Retry up to 2x           |
| 14    | Coverage       | Per-type   | BLOCK if below threshold |
| 15    | Test quality   | Score >=70 | Escalate to user         |

---

## Related References

- [P0 Compliance](p0-compliance.md) - Validation commands
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Compliance checklist
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Coverage measurement
- [Phase 15: Test Quality](phase-15-test-quality.md) - Quality scoring
