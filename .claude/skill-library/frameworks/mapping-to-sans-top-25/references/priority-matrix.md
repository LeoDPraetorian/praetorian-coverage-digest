# Capability Prioritization Matrix

**Decision framework for prioritizing capability development using Top 25 + KEV data.**

## Priority Levels

### P0: Critical (Build First)

**Criteria:** Top 10 + High KEV activity (10+ new KEV entries in 2025)

| CWE    | Rank | KEV | Why Critical                      |
| ------ | ---- | --- | --------------------------------- |
| CWE-78 | #9   | 18  | Most KEV activity in 2025         |
| CWE-22 | #6   | 13  | Path traversal actively exploited |
| CWE-79 | #1   | 7   | #1 rank + consistent KEV          |

**Action:** If capabilities for these don't exist, build immediately.

### P1: High (Next Priority)

**Criteria:** Top 10 OR High KEV (5-14 KEV entries)

| CWE     | Rank | KEV        | Why High                  |
| ------- | ---- | ---------- | ------------------------- |
| CWE-89  | #2   | Historical | #2 rank, classic attack   |
| CWE-502 | #15  | 14         | High KEV despite mid-rank |
| CWE-787 | #5   | 10         | Memory safety + KEV       |
| CWE-416 | #7   | 11         | Use-after-free exploited  |
| CWE-94  | #10  | 6          | Code injection danger     |

**Action:** Build after P0 complete, or if domain-specific need exists.

### P2: Medium (Standard Priority)

**Criteria:** Top 25 but low KEV

| CWE             | Rank   | KEV | Why Medium                 |
| --------------- | ------ | --- | -------------------------- |
| CWE-862         | #4     | Low | New to Top 10, watch trend |
| CWE-352         | #3     | Low | CSRF detection common      |
| CWE-125         | #8     | Low | Memory issue, lower KEV    |
| CWE-434         | #12    | Low | File upload validation     |
| CWE-120/121/122 | #11-16 | NEW | Buffer overflows, emerging |

**Action:** Build based on customer demand or domain coverage gaps.

### P3: Low (Deprioritize)

**Criteria:** Not in Top 25

Weaknesses outside Top 25 should be lower priority unless:

- Customer requirement
- Industry-specific (medical devices, ICS)
- Part of compliance framework (FedRAMP specific controls)

## Decision Tree

```
Does the CWE rank in Top 10?
│
├── YES: High KEV activity (10+ new in 2025)?
│   ├── YES → P0 (Critical)
│   └── NO → P1 (High)
│
└── NO: Is it in Top 25?
    ├── YES: High KEV activity?
    │   ├── YES → P1 (High)
    │   └── NO → P2 (Medium)
    │
    └── NO → P3 (Low)
```

## Coverage Analysis

### Current Chariot Capability Coverage

**To assess coverage, check existing capabilities against Top 10:**

```bash
# Check for XSS detection (CWE-79, #1)
grep -r "CWE-79\|XSS\|cross-site" modules/nuclei-templates/

# Check for SQLi detection (CWE-89, #2)
grep -r "CWE-89\|SQL.*injection" modules/nuclei-templates/

# Check for OS command injection (CWE-78, #9)
grep -r "CWE-78\|command.*injection" modules/nuclei-templates/
```

### Gap Identification

**Coverage gaps to prioritize:**

| If This CWE   | Is Missing Coverage    | Priority               |
| ------------- | ---------------------- | ---------------------- |
| CWE-78 (#9)   | No OS command scanners | P0 - Build immediately |
| CWE-22 (#6)   | Limited path traversal | P0 - Expand coverage   |
| CWE-502 (#15) | No deserialization     | P1 - High KEV          |
| CWE-862 (#4)  | Missing authZ checks   | P1 - Rising threat     |

## Scoring Formula

**Custom priority score:**

```
Priority Score = (Top25_Weight × Rank_Inverse) + (KEV_Weight × KEV_Count)

Where:
- Top25_Weight = 10
- Rank_Inverse = (26 - Rank)  # #1 = 25 points, #25 = 1 point
- KEV_Weight = 2
- KEV_Count = New KEV entries in 2025
```

**Example calculations:**

| CWE     | Rank | Rank_Inverse | KEV | Score              | Priority |
| ------- | ---- | ------------ | --- | ------------------ | -------- |
| CWE-78  | #9   | 17           | 18  | 170 + 36 = **206** | P0       |
| CWE-79  | #1   | 25           | 7   | 250 + 14 = **264** | P0       |
| CWE-89  | #2   | 24           | 0   | 240 + 0 = **240**  | P1       |
| CWE-502 | #15  | 11           | 14  | 110 + 28 = **138** | P1       |

## Quarterly Review Cadence

**When to re-prioritize:**

- **Q4 annually**: New Top 25 released (typically November)
- **Monthly**: KEV catalog updates (CISA adds vulnerabilities throughout year)
- **Ad-hoc**: Major breach using specific CWE (reactive prioritization)

**Action items:**

1. Review Top 25 changes
2. Check KEV additions for new CWE patterns
3. Re-calculate priority scores
4. Adjust capability roadmap
