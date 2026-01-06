# Historical Trends (2024-2025)

**Year-over-year changes in CWE Top 25 rankings.**

## 2024 → 2025 Comparison

| CWE     | Name                             | 2024 Rank | 2025 Rank | Change   |
| ------- | -------------------------------- | --------- | --------- | -------- |
| CWE-79  | Cross-site Scripting             | #1        | #1        | → Stable |
| CWE-89  | SQL Injection                    | #3        | #2        | ↑ +1     |
| CWE-352 | CSRF                             | #4        | #3        | ↑ +1     |
| CWE-862 | Missing Authorization            | #9        | #4        | ↑↑ +5    |
| CWE-787 | Out-of-bounds Write              | #2        | #5        | ↓ -3     |
| CWE-22  | Path Traversal                   | #5        | #6        | ↓ -1     |
| CWE-416 | Use After Free                   | #8        | #7        | ↑ +1     |
| CWE-125 | Out-of-bounds Read               | #6        | #8        | ↓ -2     |
| CWE-78  | OS Command Injection             | #7        | #9        | ↓ -2     |
| CWE-94  | Code Injection                   | #11       | #10       | ↑ +1     |
| CWE-120 | Classic Buffer Overflow          | N/A       | #11       | NEW      |
| CWE-434 | Unrestricted File Upload         | #10       | #12       | ↓ -2     |
| CWE-476 | NULL Pointer Dereference         | #21       | #13       | ↑↑ +8    |
| CWE-121 | Stack-based Buffer Overflow      | N/A       | #14       | NEW      |
| CWE-502 | Deserialization                  | #16       | #15       | ↑ +1     |
| CWE-122 | Heap-based Buffer Overflow       | N/A       | #16       | NEW      |
| CWE-863 | Incorrect Authorization          | #18       | #17       | ↑ +1     |
| CWE-20  | Improper Input Validation        | #12       | #18       | ↓ -6     |
| CWE-284 | Improper Access Control          | N/A       | #19       | NEW      |
| CWE-200 | Information Disclosure           | #17       | #20       | ↓ -3     |
| CWE-306 | Missing Authentication           | #25       | #21       | ↓ -4     |
| CWE-918 | SSRF                             | #19       | #22       | ↓ -3     |
| CWE-77  | Command Injection                | #13       | #23       | ↓↓ -10   |
| CWE-639 | Auth Bypass via User Key         | N/A       | #24       | NEW      |
| CWE-770 | Uncontrolled Resource Allocation | N/A       | #25       | NEW      |

## Biggest Movers (2025)

### Rising Threats

| CWE                         | Change | Analysis                                           |
| --------------------------- | ------ | -------------------------------------------------- |
| **CWE-476** (NULL Pointer)  | ↑↑ +8  | #21 → #13: Major increase in CVE frequency         |
| **CWE-862** (Missing AuthZ) | ↑↑ +5  | #9 → #4: Authorization gaps increasingly exploited |

### Falling Threats

| CWE                            | Change | Analysis                                                          |
| ------------------------------ | ------ | ----------------------------------------------------------------- |
| **CWE-77** (Command Injection) | ↓↓ -10 | #13 → #23: Significant drop, possibly better detection/prevention |
| **CWE-20** (Input Validation)  | ↓ -6   | #12 → #18: Pillar CWE being replaced by specific children         |
| **CWE-306** (Missing Auth)     | ↓ -4   | #25 → #21: Some improvement in baseline authentication            |

## New Entries (2025)

Six CWEs entered the Top 25 in 2025:

1. **CWE-120** - Classic Buffer Overflow (#11)
2. **CWE-121** - Stack-based Buffer Overflow (#14)
3. **CWE-122** - Heap-based Buffer Overflow (#16)
4. **CWE-284** - Improper Access Control (#19) - Pillar CWE
5. **CWE-639** - Authorization Bypass via User-Controlled Key (#24)
6. **CWE-770** - Uncontrolled Resource Allocation (#25)

**Note:** CWE-284 entering at #19 is concerning - it's a Pillar CWE (too generic). This suggests CVEs are being mapped imprecisely.

## Removed from Top 25 (2024 → 2025)

Six CWEs dropped out:

1. **CWE-269** (Improper Privilege Management) - was #15 in 2024
2. **CWE-119** (Memory Buffer Restriction) - was #20 in 2024
3. **CWE-798** (Hard-coded Credentials) - was #22 in 2024
4. **CWE-190** (Integer Overflow) - was #23 in 2024
5. **CWE-400** (Uncontrolled Resource Consumption) - was #24 in 2024
6. **CWE-287** (Improper Authentication) - was #14 in 2024

## Key Insights

### Memory Safety Dominates

Three buffer overflow variants (CWE-120, 121, 122) entered the Top 25 in 2025. Combined with existing memory issues (CWE-787, 125, 416, 476), **memory safety weaknesses represent 7 of Top 25**.

### Authorization Gaps Growing

Both CWE-862 (Missing Authorization) and CWE-863 (Incorrect Authorization) moved up. Together at #4 and #17, authorization is a major 2025 trend.

### Injection Remains Critical

Despite some movers, injection vulnerabilities remain dominant:

- CWE-79 (XSS): #1
- CWE-89 (SQLi): #2
- CWE-78 (OS Command): #9
- CWE-94 (Code): #10

## Methodology Evolution

| Year | CVE Records Analyzed | Timeframe             |
| ---- | -------------------- | --------------------- |
| 2024 | 31,770               | June 2023 - June 2024 |
| 2025 | 39,080               | June 2024 - June 2025 |

**23% increase** in CVE volume analyzed for 2025.
