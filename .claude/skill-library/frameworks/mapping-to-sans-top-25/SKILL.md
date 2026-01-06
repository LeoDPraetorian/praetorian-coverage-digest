---
name: mapping-to-sans-top-25
description: Use when prioritizing capability development or assessing finding severity - provides CWE Top 25 rankings, trends, and KEV correlation for risk-based decision making
allowed-tools: Read
---

# Mapping to SANS/CWE Top 25

**Help capability developers prioritize findings based on real-world exploitation data.**

> **2025 CWE Top 25** released December 2025. Based on 39,080 CVE records (June 2024 - June 2025).

## When to Use

Use this skill when:

- Prioritizing which capabilities to build next
- Assessing severity/risk of a CWE-tagged finding
- Understanding which weaknesses are most exploited in the wild
- Comparing criticality between two CWEs

## Complete 2025 Top 25 List

| Rank    | CWE     | Name                      | Score | Change |
| ------- | ------- | ------------------------- | ----- | ------ |
| **#1**  | CWE-79  | Cross-site Scripting      | 60.38 | →      |
| **#2**  | CWE-89  | SQL Injection             | 28.72 | ↑ +1   |
| **#3**  | CWE-352 | CSRF                      | 13.64 | ↑ +1   |
| **#4**  | CWE-862 | Missing Authorization     | 13.28 | ↑↑ +5  |
| **#5**  | CWE-787 | Out-of-bounds Write       | 12.68 | ↓ -3   |
| **#6**  | CWE-22  | Path Traversal            | 8.99  | ↓ -1   |
| **#7**  | CWE-416 | Use After Free            | 8.47  | ↑ +1   |
| **#8**  | CWE-125 | Out-of-bounds Read        | 7.88  | ↓ -2   |
| **#9**  | CWE-78  | OS Command Injection      | 7.85  | ↓ -2   |
| **#10** | CWE-94  | Code Injection            | 7.57  | ↑ +1   |
| **#11** | CWE-120 | Classic Buffer Overflow   | 6.96  | NEW    |
| **#12** | CWE-434 | Unrestricted File Upload  | 6.87  | ↓ -2   |
| **#13** | CWE-476 | NULL Pointer Dereference  | 6.41  | ↑↑ +8  |
| **#14** | CWE-121 | Stack Buffer Overflow     | 5.75  | NEW    |
| **#15** | CWE-502 | Deserialization           | 5.23  | ↑ +1   |
| **#16** | CWE-122 | Heap Buffer Overflow      | 5.21  | NEW    |
| **#17** | CWE-863 | Incorrect Authorization   | 4.14  | ↑ +1   |
| **#18** | CWE-20  | Input Validation (Pillar) | 4.09  | ↓ -6   |
| **#19** | CWE-284 | Access Control (Pillar)   | 4.07  | NEW    |
| **#20** | CWE-200 | Information Disclosure    | 4.01  | ↓ -3   |
| **#21** | CWE-306 | Missing Authentication    | 3.47  | ↑ +4   |
| **#22** | CWE-918 | SSRF                      | 3.36  | ↓ -3   |
| **#23** | CWE-77  | Command Injection         | 3.15  | ↓↓ -10 |
| **#24** | CWE-639 | AuthZ Bypass via User Key | 2.62  | NEW    |
| **#25** | CWE-770 | Resource Allocation       | 2.54  | NEW    |

---

## Prioritization by KEV Activity

**KEV = Known Exploited Vulnerabilities** (CISA catalog: 1,484 entries as of Dec 2025)

### Critical Priority (Top 10 + High KEV)

| CWE        | Rank | 2025 KEV Adds | Why Critical                      |
| ---------- | ---- | ------------- | --------------------------------- |
| **CWE-78** | #9   | **18**        | Most KEV activity in 2025         |
| **CWE-22** | #6   | **13**        | Path traversal actively exploited |
| **CWE-79** | #1   | **7**         | #1 rank + consistent exploitation |

### High Priority (Top 10 OR High KEV)

| CWE         | Rank | 2025 KEV Adds | Why High                         |
| ----------- | ---- | ------------- | -------------------------------- |
| **CWE-502** | #15  | **14**        | High KEV despite mid-rank        |
| **CWE-416** | #7   | **11**        | Use-after-free memory corruption |
| **CWE-787** | #5   | **10**        | Memory safety + KEV              |
| **CWE-89**  | #2   | Historical    | #2 rank, classic attack          |
| **CWE-94**  | #10  | **6**         | Code injection                   |

---

## Key Trends (2024 → 2025)

### Biggest Movers Up

| CWE                         | Change | Analysis                                  |
| --------------------------- | ------ | ----------------------------------------- |
| **CWE-476** (NULL Pointer)  | ↑↑ +8  | #21 → #13: Major surge                    |
| **CWE-862** (Missing AuthZ) | ↑↑ +5  | #9 → #4: Authorization gaps growing       |
| **CWE-306** (Missing Auth)  | ↑ +4   | #25 → #21: Authentication baseline issues |

### Biggest Movers Down

| CWE                            | Change | Analysis                                          |
| ------------------------------ | ------ | ------------------------------------------------- |
| **CWE-77** (Command Injection) | ↓↓ -10 | #13 → #23: Better prevention                      |
| **CWE-20** (Input Validation)  | ↓ -6   | #12 → #18: Pillar being replaced by specific CWEs |
| **CWE-787** (Out-of-bounds)    | ↓ -3   | #2 → #5: Still critical but declining             |

### New Entries (2025)

Six new CWEs entered Top 25:

1. CWE-120 (Classic Buffer Overflow) - #11
2. CWE-121 (Stack Buffer Overflow) - #14
3. CWE-122 (Heap Buffer Overflow) - #16
4. CWE-284 (Improper Access Control) - #19 ⚠️ Pillar CWE
5. CWE-639 (AuthZ Bypass via User Key) - #24
6. CWE-770 (Resource Allocation) - #25

### Removed from Top 25 (2024 → 2025)

| CWE                               | 2024 Rank | Why Removed                              |
| --------------------------------- | --------- | ---------------------------------------- |
| CWE-269 (Privilege Management)    | #15       | Replaced by specific access control CWEs |
| CWE-798 (Hard-coded Credentials)  | #22       | Better secure development practices      |
| CWE-287 (Improper Authentication) | #14       | Despite 6 KEV, replaced by CWE-306       |
| CWE-119 (Memory Buffer)           | #20       | Replaced by specific buffer CWEs         |
| CWE-190 (Integer Overflow)        | #23       | -                                        |
| CWE-400 (Resource Consumption)    | #24       | Replaced by CWE-770                      |

---

## Use Cases

### "Should we prioritize CSRF capabilities?"

CWE-352 (CSRF) = **#3** in 2025 (↑ from #4 in 2024)

**Answer**: YES. Moved up and stable in Top 3.

### "Is CWE-502 worth investing in?"

CWE-502 (Deserialization) = **#15** + **14 KEV entries** in 2025

**Answer**: YES. Mid-rank but **highest KEV activity** outside Top 10. High exploitation despite ranking.

### "CWE-78 vs CWE-77 - which to prioritize?"

- CWE-78 (OS Command): **#9** + **18 KEV** = Critical
- CWE-77 (Command): **#23** + low KEV = Medium

**Answer**: CWE-78 by far. 18 KEV entries makes it most actively exploited in 2025.

---

## Methodology Notes

**2025 Scoring**:

- Analyzed 39,080 CVE records (23% increase from 2024's 31,770)
- Timeframe: June 1, 2024 - June 1, 2025
- Formula: `Score = (Prevalence × 10) + (Average CVSS × 0.5)`

**KEV Integration**:

- CISA KEV catalog: 1,484 vulnerabilities (Dec 2025)
- +245 vulnerabilities added in 2025 (+20% growth)
- 24 ransomware-related KEV entries added

---

## References

| Reference                                               | Content                                         |
| ------------------------------------------------------- | ----------------------------------------------- |
| [historical-trends.md](references/historical-trends.md) | 2024-2025 year-over-year comparison             |
| [kev-correlation.md](references/kev-correlation.md)     | KEV catalog mappings and ransomware correlation |
| [priority-matrix.md](references/priority-matrix.md)     | Decision matrix for capability prioritization   |

## External Sources

- [2025 CWE Top 25 - MITRE](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html)
- [2025 CWE Top 25 - CISA](https://www.cisa.gov/news-events/alerts/2025/12/11/2025-cwe-top-25-most-dangerous-software-weaknesses)
- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)

---

## Related Skills

| Skill                                  | Purpose                         |
| -------------------------------------- | ------------------------------- |
| `mapping-to-cwe`                       | Identify which CWE to use       |
| `mapping-to-owasp-web`                 | OWASP Top 10 mapping            |
| `mapping-to-mitre-attack`              | Attack technique context        |
| `enforcing-go-capability-architecture` | Capability development patterns |
