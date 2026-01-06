# Result Analysis Patterns

**How to analyze fingerprintx results against Shodan baseline for validation.**

## Data Collection

### Shodan Baseline

For each target from Shodan, record:

```json
{
  "ip": "1.2.3.4",
  "port": 27017,
  "shodan_product": "MongoDB",
  "shodan_version": "4.4.0",
  "shodan_org": "Example Corp"
}
```

### Fingerprintx Results

For each target scanned, record:

```json
{
  "ip": "1.2.3.4",
  "port": 27017,
  "fpx_detected": true,
  "fpx_protocol": "mongodb",
  "fpx_version": "4.4.0",
  "fpx_cpe": "cpe:2.3:a:mongodb:mongodb:4.4.0:*:*:*:*:*:*:*",
  "fpx_error": null,
  "fpx_duration_ms": 234
}
```

## Metric Calculations

### Detection Rate

```
Detection Rate = (targets_detected / targets_scanned) × 100

Where:
- targets_detected = count where fpx_detected == true AND fpx_protocol == expected_protocol
- targets_scanned = total targets attempted (excluding network errors)
```

**Threshold:** ≥ 80%

**Why 80%?** Shodan has false positives (wrong product identification, proxies, honeypots). 80% accounts for this noise while ensuring the plugin works reliably.

### Version Extraction Rate

```
Version Extraction Rate = (targets_with_version / targets_detected) × 100

Where:
- targets_with_version = count where fpx_version is not empty/null
- targets_detected = count where fpx_detected == true
```

**Threshold:** ≥ 50% (only if version research was done)

**Why 50%?** Many production systems:

- Hide version information (security hardening)
- Require authentication for version info
- Use custom builds without standard banners

### CPE Generation Rate

```
CPE Generation Rate = (targets_with_cpe / targets_detected) × 100

Where:
- targets_with_cpe = count where fpx_cpe is not empty/null
- targets_detected = count where fpx_detected == true
```

**Threshold:** ≥ 50% (only if version research was done)

**Note:** CPE requires version extraction, so CPE rate ≤ version extraction rate.

### False Negative Rate

```
False Negative Rate = (false_negatives / targets_scanned) × 100

Where:
- false_negatives = count where:
    - Shodan says product matches expected protocol
    - Fingerprintx returns nil or different protocol
    - NOT a network error (timeout, connection refused)
```

**Threshold:** ≤ 20%

**What counts as false negative:**

- Shodan: `product: MongoDB`, Fingerprintx: `nil` → False negative
- Shodan: `product: MongoDB`, Fingerprintx: `http` → False negative
- Shodan: `product: MongoDB`, Fingerprintx: timeout → NOT false negative (network issue)

## Result Categories

Classify each target into one of these categories:

| Category                       | Criteria                           | Impact                          |
| ------------------------------ | ---------------------------------- | ------------------------------- |
| **True Positive**              | Shodan: X, Fingerprintx: X         | ✅ Detection works              |
| **True Positive with Version** | TP + version extracted             | ✅ Version extraction works     |
| **True Positive with CPE**     | TP + CPE generated                 | ✅ Full enrichment works        |
| **False Negative**             | Shodan: X, Fingerprintx: nil/other | ❌ Detection failed             |
| **Network Error**              | Connection refused/timeout         | ⚠️ Host unavailable             |
| **Unexpected Detection**       | Shodan: nil/other, Fingerprintx: X | 🔍 Investigate (may be correct) |

## Analysis Script Pattern

```bash
#!/bin/bash
# analyze-results.sh

# Input files
SHODAN_TARGETS="shodan-targets.json"
FPX_RESULTS="fpx-results.json"

# Parse and count
total=$(jq length "$SHODAN_TARGETS")
detected=$(jq '[.[] | select(.fpx_detected == true)] | length' "$FPX_RESULTS")
with_version=$(jq '[.[] | select(.fpx_version != null and .fpx_version != "")] | length' "$FPX_RESULTS")
with_cpe=$(jq '[.[] | select(.fpx_cpe != null and .fpx_cpe != "")] | length' "$FPX_RESULTS")
network_errors=$(jq '[.[] | select(.fpx_error != null and (.fpx_error | contains("timeout") or contains("refused")))] | length' "$FPX_RESULTS")
false_negatives=$(jq '[.[] | select(.fpx_detected == false and .fpx_error == null)] | length' "$FPX_RESULTS")

# Calculate rates
valid_targets=$((total - network_errors))
detection_rate=$(echo "scale=1; $detected * 100 / $valid_targets" | bc)
version_rate=$(echo "scale=1; $with_version * 100 / $detected" | bc)
cpe_rate=$(echo "scale=1; $with_cpe * 100 / $detected" | bc)
fn_rate=$(echo "scale=1; $false_negatives * 100 / $valid_targets" | bc)

# Output
echo "=== Live Validation Results ==="
echo "Total targets: $total"
echo "Network errors: $network_errors (excluded)"
echo "Valid targets: $valid_targets"
echo ""
echo "Detection rate: $detection_rate% (threshold: ≥80%)"
echo "Version extraction: $version_rate% (threshold: ≥50%)"
echo "CPE generation: $cpe_rate% (threshold: ≥50%)"
echo "False negative rate: $fn_rate% (threshold: ≤20%)"
```

## Edge Case Handling

### Network Errors

**Exclude from metrics but document:**

```json
{
  "network_errors": {
    "timeout": 3,
    "connection_refused": 2,
    "dns_error": 0,
    "total": 5
  },
  "analysis_note": "5 targets excluded due to network errors"
}
```

### Protocol Mismatch

When fingerprintx detects a different protocol than Shodan reported:

```json
{
  "ip": "1.2.3.4",
  "port": 27017,
  "shodan_product": "MongoDB",
  "fpx_protocol": "http",
  "classification": "false_negative",
  "investigation_note": "May be HTTP proxy in front of MongoDB"
}
```

### No Shodan Product

When Shodan has no product field but we detect:

```json
{
  "ip": "1.2.3.4",
  "port": 27017,
  "shodan_product": null,
  "fpx_protocol": "mongodb",
  "classification": "unexpected_detection",
  "investigation_note": "Fingerprintx more accurate than Shodan"
}
```

**These don't count as false negatives** - they may indicate fingerprintx is better.

## Pass/Fail Decision Tree

```
START
  │
  ├── Detection Rate ≥ 80%?
  │     ├── NO → FAIL (detection not reliable)
  │     └── YES → Continue
  │
  ├── False Negative Rate ≤ 20%?
  │     ├── NO → FAIL (too many missed detections)
  │     └── YES → Continue
  │
  ├── Was version research done (Phase 4)?
  │     ├── NO → PASS (version metrics not required)
  │     └── YES → Continue
  │
  ├── Version Extraction Rate ≥ 50%?
  │     ├── NO → FAIL (version extraction not working)
  │     └── YES → Continue
  │
  └── CPE Generation Rate ≥ 50%?
        ├── NO → FAIL (CPE generation not working)
        └── YES → PASS
```

## Reporting Format

Generate structured output for report:

```json
{
  "protocol": "mongodb",
  "timestamp": "2024-01-15T10:30:00Z",
  "sample_size": 50,
  "query": "port:27017 product:mongodb",
  "metrics": {
    "detection_rate": 85.0,
    "version_extraction_rate": 62.0,
    "cpe_generation_rate": 58.0,
    "false_negative_rate": 15.0
  },
  "thresholds": {
    "detection_rate": { "min": 80, "passed": true },
    "version_extraction_rate": { "min": 50, "passed": true },
    "cpe_generation_rate": { "min": 50, "passed": true },
    "false_negative_rate": { "max": 20, "passed": true }
  },
  "categories": {
    "true_positive": 34,
    "true_positive_with_version": 21,
    "true_positive_with_cpe": 20,
    "false_negative": 6,
    "network_error": 10
  },
  "verdict": "PASS"
}
```
