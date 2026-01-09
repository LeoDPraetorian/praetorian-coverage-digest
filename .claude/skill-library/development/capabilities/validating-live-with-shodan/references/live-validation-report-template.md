# Live Validation Report Template

**Copy-paste template for live validation reports.**

---

## Live Validation Report: {Protocol Name}

**Generated:** {YYYY-MM-DD HH:MM:SS UTC}
**Plugin Path:** `pkg/plugins/services/{protocol}/`
**Analyst:** {Your name or "Claude AI"}

---

### Executive Summary

| Metric              | Value | Threshold | Status                       |
| ------------------- | ----- | --------- | ---------------------------- |
| Detection Rate      | {X}%  | ≥ 80%     | {✅ PASS / ❌ FAIL}          |
| Version Extraction  | {X}%  | ≥ 50%     | {✅ PASS / ❌ FAIL / ⚠️ N/A} |
| CPE Generation      | {X}%  | ≥ 50%     | {✅ PASS / ❌ FAIL / ⚠️ N/A} |
| False Negative Rate | {X}%  | ≤ 20%     | {✅ PASS / ❌ FAIL}          |

**VERDICT: {PASS / FAIL}**

---

### Test Configuration

| Parameter          | Value                      |
| ------------------ | -------------------------- |
| Shodan Query       | `{query}`                  |
| Sample Size        | {N} targets                |
| Pages Queried      | {N}                        |
| Rate Limit         | 1 request/second           |
| Timeout            | 5 seconds                  |
| Fingerprintx Build | `{commit hash or version}` |

---

### Shodan Query Results

**Query:** `{shodan_query}`

```
Total available: {total_from_shodan}
Sampled: {sample_size}
Geographic distribution: {top 3 countries}
```

**Sample diversity:**

- Unique organizations: {N}
- Unique ASNs: {N}
- Version spread: {list of versions seen in Shodan}

---

### Detailed Results

#### Category Breakdown

| Category                | Count | Percentage |
| ----------------------- | ----- | ---------- |
| True Positive           | {N}   | {X}%       |
| True Positive + Version | {N}   | {X}%       |
| True Positive + CPE     | {N}   | {X}%       |
| False Negative          | {N}   | {X}%       |
| Network Error           | {N}   | {X}%       |
| Unexpected Detection    | {N}   | {X}%       |

#### Sample True Positives

| #   | Target        | Shodan Product | Fingerprintx | Version   | CPE     |
| --- | ------------- | -------------- | ------------ | --------- | ------- |
| 1   | `{ip}:{port}` | {product}      | {protocol}   | {version} | {✅/❌} |
| 2   | `{ip}:{port}` | {product}      | {protocol}   | {version} | {✅/❌} |
| 3   | `{ip}:{port}` | {product}      | {protocol}   | {version} | {✅/❌} |
| 4   | `{ip}:{port}` | {product}      | {protocol}   | {version} | {✅/❌} |
| 5   | `{ip}:{port}` | {product}      | {protocol}   | {version} | {✅/❌} |

---

### False Negative Analysis

**Total False Negatives:** {N} ({X}%)

#### False Negative Details

| #   | Target        | Shodan Product | Fingerprintx Result | Possible Cause |
| --- | ------------- | -------------- | ------------------- | -------------- |
| 1   | `{ip}:{port}` | {product}      | {nil / other}       | {analysis}     |
| 2   | `{ip}:{port}` | {product}      | {nil / other}       | {analysis}     |

#### Common Patterns

1. **{Pattern 1}:** {Description and count}
2. **{Pattern 2}:** {Description and count}

#### Recommendations

- {Recommendation for improving detection}
- {Recommendation for handling edge case}

---

### Network Error Analysis

**Total Network Errors:** {N} ({X}% of sample)

| Error Type         | Count | Percentage |
| ------------------ | ----- | ---------- |
| Timeout            | {N}   | {X}%       |
| Connection Refused | {N}   | {X}%       |
| DNS Error          | {N}   | {X}%       |
| Other              | {N}   | {X}%       |

**Note:** Network errors are excluded from pass/fail metrics.

---

### Version Extraction Analysis

**Extraction Rate:** {X}% ({N} of {M} detected targets)

#### Version Distribution

| Version    | Count | Percentage |
| ---------- | ----- | ---------- |
| {version1} | {N}   | {X}%       |
| {version2} | {N}   | {X}%       |
| {unknown}  | {N}   | {X}%       |

#### Comparison with Shodan

| Metric                    | Value     |
| ------------------------- | --------- |
| Version match rate        | {X}%      |
| Fingerprintx more precise | {N} cases |
| Shodan more precise       | {N} cases |
| Both unknown              | {N} cases |

---

### CPE Generation Analysis

**Generation Rate:** {X}% ({N} of {M} detected targets)

#### Sample CPEs Generated

```
cpe:2.3:a:{vendor}:{product}:{version1}:*:*:*:*:*:*:*
cpe:2.3:a:{vendor}:{product}:{version2}:*:*:*:*:*:*:*
cpe:2.3:a:{vendor}:{product}:{version3}:*:*:*:*:*:*:*
```

---

### Performance Metrics

| Metric                 | Value                 |
| ---------------------- | --------------------- |
| Average detection time | {X}ms                 |
| Median detection time  | {X}ms                 |
| 95th percentile        | {X}ms                 |
| Slowest target         | {X}ms (`{ip}:{port}`) |
| Total scan duration    | {X}s                  |

---

### Verdict Summary

#### Pass Criteria Evaluation

| Criterion            | Required | Actual | Status      |
| -------------------- | -------- | ------ | ----------- |
| Detection Rate       | ≥ 80%    | {X}%   | {✅/❌}     |
| False Negative Rate  | ≤ 20%    | {X}%   | {✅/❌}     |
| Version Extraction\* | ≥ 50%    | {X}%   | {✅/❌/N/A} |
| CPE Generation\*     | ≥ 50%    | {X}%   | {✅/❌/N/A} |
| No Crashes           | 0        | {N}    | {✅/❌}     |

\*Only required if version research (Phase 4) was completed.

#### Final Verdict

**{PASS / FAIL}**

{If FAIL, explain which criteria failed and recommended remediation.}

---

### Artifacts

| Artifact             | Path                                   | Description       |
| -------------------- | -------------------------------------- | ----------------- |
| Shodan targets       | `{protocol}-shodan-targets.json`       | Raw query results |
| Fingerprintx results | `{protocol}-fingerprintx-results.json` | Scan output       |
| This report          | `{protocol}-live-validation.md`        | This document     |

---

### Next Steps

{If PASS:}

- [ ] Proceed to Phase 8: Integration & PR Preparation
- [ ] Add live validation report to PR artifacts

{If FAIL:}

- [ ] Review false negative analysis
- [ ] Update plugin implementation
- [ ] Re-run Docker validation
- [ ] Re-run live validation

---

### Appendix: Raw Data

<details>
<summary>Shodan Targets (JSON)</summary>

```json
{paste shodan-targets.json content}
```

</details>

<details>
<summary>Fingerprintx Results (JSON)</summary>

```json
{paste fingerprintx-results.json content}
```

</details>

---

**Report generated by:** `validating-live-with-shodan` skill
**Skill version:** 1.0.0
