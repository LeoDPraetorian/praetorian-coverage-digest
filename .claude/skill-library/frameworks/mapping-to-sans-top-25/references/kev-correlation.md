# KEV Correlation Data

**Mapping between CWE Top 25 and CISA Known Exploited Vulnerabilities catalog.**

## KEV Catalog Overview (2025)

- **Total KEV entries**: 1,484 vulnerabilities (as of Dec 2025)
- **Growth in 2025**: +245 vulnerabilities (+20% from 2024's 1,239)
- **Ransomware-related**: 24 new KEV entries known to be exploited by ransomware

## Top CWEs in 2025 KEV Additions

CWEs most frequently appearing in 245 vulnerabilities added to KEV in 2025:

| Rank | CWE     | Name                    | KEV Count | Top 25 Rank         |
| ---- | ------- | ----------------------- | --------- | ------------------- |
| 1    | CWE-78  | OS Command Injection    | 18        | #9                  |
| 2    | CWE-502 | Deserialization         | 14        | #15                 |
| 3    | CWE-22  | Path Traversal          | 13        | #6                  |
| 4    | CWE-416 | Use After Free          | 11        | #7                  |
| 5    | CWE-787 | Out-of-bounds Write     | 10        | #5                  |
| 6    | CWE-79  | Cross-site Scripting    | 7         | #1                  |
| 7    | CWE-94  | Code Injection          | 6         | #10                 |
| 7    | CWE-287 | Improper Authentication | 6         | Removed from Top 25 |

## KEV Overlap with Top 25

**High KEV Correlation** (Top 10 overlap):

| Top 25 Rank | CWE     | KEV Activity   | Priority |
| ----------- | ------- | -------------- | -------- |
| #1          | CWE-79  | 7 new in 2025  | CRITICAL |
| #2          | CWE-89  | Historical KEV | CRITICAL |
| #5          | CWE-787 | 10 new in 2025 | HIGH     |
| #6          | CWE-22  | 13 new in 2025 | HIGH     |
| #7          | CWE-416 | 11 new in 2025 | HIGH     |
| #9          | CWE-78  | 18 new in 2025 | CRITICAL |
| #10         | CWE-94  | 6 new in 2025  | HIGH     |

**Medium KEV Correlation** (11-25):

| Top 25 Rank | CWE     | KEV Activity   | Priority |
| ----------- | ------- | -------------- | -------- |
| #15         | CWE-502 | 14 new in 2025 | MEDIUM   |
| #22         | CWE-918 | Historical KEV | MEDIUM   |

## Prioritization Matrix

**Combine Top 25 rank with KEV activity for capability prioritization:**

| Priority Level    | Criteria           | CWEs                      |
| ----------------- | ------------------ | ------------------------- |
| **P0 (Critical)** | Top 10 + High KEV  | CWE-79, 78, 22            |
| **P1 (High)**     | Top 10 OR High KEV | CWE-89, 787, 416, 94, 502 |
| **P2 (Medium)**   | Top 25             | All others in Top 25      |
| **P3 (Low)**      | Not in Top 25      | Everything else           |

## Anomalies

### CWE-287 (Improper Authentication)

- **2024**: #14 in Top 25
- **2025**: Removed from Top 25
- **KEV**: 6 new KEV entries in 2025

**Analysis**: Despite dropping from Top 25, still actively exploited. May indicate CVEs are being mapped to more specific authentication CWEs (CWE-306, etc.) instead of the generic CWE-287.

## Ransomware CWE Correlation

24 KEV entries added in 2025 are known ransomware vectors. Top CWEs exploited by ransomware groups:

1. **CWE-78** (OS Command Injection) - Lateral movement, privilege escalation
2. **CWE-502** (Deserialization) - Initial access, RCE
3. **CWE-22** (Path Traversal) - File access, credential theft
4. **CWE-787** (Buffer Overflow) - Memory corruption, code execution

## Capability Development Recommendations

### Must-Have Capabilities (P0)

Build/maintain capabilities detecting:

- CWE-79 (XSS): #1 + 7 KEV
- CWE-78 (OS Command): #9 + 18 KEV (most KEV activity)
- CWE-22 (Path Traversal): #6 + 13 KEV

### High-Value Capabilities (P1)

- CWE-89 (SQLi): #2, historical KEV
- CWE-502 (Deserialization): #15 + 14 KEV (high exploitation despite lower rank)
- CWE-787 (Buffer Overflow): #5 + 10 KEV
- CWE-416 (Use After Free): #7 + 11 KEV

### Coverage Gaps

CWEs in Top 25 but low KEV activity suggest emerging threats:

- CWE-862 (Missing AuthZ): #4 but limited KEV
- CWE-120/121/122 (Buffer variants): NEW to Top 25, watch for KEV growth

## Sources

- [2025 CWE Top 25 - CISA](https://www.cisa.gov/news-events/alerts/2025/12/11/2025-cwe-top-25-most-dangerous-software-weaknesses)
- [2025 CWE Top 25 - MITRE](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html)
- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [KEV 2025 Analysis](https://cyble.com/blog/cisa-kev-2025-exploited-vulnerabilities-growth/)
