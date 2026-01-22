# Authentication Bypass CVSS Scoring Example

**Complete walkthrough for scoring an authentication bypass threat.**

## Scenario

**From Phase 3 Threat Modeling:**

**Threat:** Authentication bypass via JWT token manipulation

**Description:** The application validates JWT tokens but doesn't verify the signature. An attacker can craft a JWT with arbitrary claims (including `admin: true`) and the application accepts it without signature verification.

**Component:** `authentication_service`

**STRIDE Category:** Spoofing + Elevation of Privilege

---

## Phase 1 Business Context

```json
{
  "crown_jewels": [
    {
      "asset_name": "authentication_service",
      "data_types": ["user_credentials", "session_tokens"],
      "requires_confidentiality": true,
      "requires_integrity": true,
      "requires_availability": true
    }
  ],
  "compliance": ["SOC2 Type 2"],
  "business_impact": {
    "authentication_compromise": {
      "financial_impact_usd": 5000000,
      "reputational_impact": "severe"
    },
    "rto_hours": 2
  }
}
```

**Auto-derived:**

- CR: High (user credentials + SOC2)
- IR: High (authentication integrity critical)
- AR: High (RTO < 4 hours)

---

## CVSS 3.1 Scoring

### Base Metrics Assessment

| Metric | Value         | Rationale                                                     |
| ------ | ------------- | ------------------------------------------------------------- |
| **AV** | Network (N)   | Auth endpoint accessible over internet                        |
| **AC** | Low (L)       | Simple JWT manipulation, no special conditions                |
| **PR** | None (N)      | **Pre-authentication vulnerability** - that's the whole point |
| **UI** | None (N)      | Attacker acts autonomously                                    |
| **S**  | Unchanged (U) | Stays within application, no container/OS escape              |
| **C**  | High (H)      | Can access all user data by impersonating any user            |
| **I**  | High (H)      | Can modify data as any user                                   |
| **A**  | None (N)      | No availability impact                                        |

**Base Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`

**Base Calculation:**

```
ISS = 1 - [(1-0.56) × (1-0.56) × (1-0)] = 0.81
Impact = 6.42 × 0.81 = 5.20
Exploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.89
BaseScore = Roundup(5.20 + 3.89) = 9.1
```

**Base Score: 9.1 (Critical)**

### Temporal Metrics (Theoretical Threat Defaults)

| Metric | Value           | Rationale                                  |
| ------ | --------------- | ------------------------------------------ |
| **E**  | Unproven (U)    | No public exploit, we just identified this |
| **RL** | Unavailable (U) | No fix yet                                 |
| **RC** | Reasonable (R)  | High confidence from code review           |

**Temporal Vector:** `E:U/RL:U/RC:R`

**Temporal Calculation:**

```
TemporalScore = Roundup(9.1 × 0.91 × 1.0 × 0.96) = 8.0
```

**Temporal Score: 8.0 (High)**

### Environmental Metrics

**Security Requirements:** CR:H, IR:H, AR:H (all High - critical auth system)

**Modified Base:** Same as Base (no environmental controls)

**Environmental Calculation:**

```
MISS = min(1 - [(1-1.5×0.56) × (1-1.5×0.56) × (1-1.5×0)], 0.915)
     = min(1 - [0.16 × 0.16 × 1.0], 0.915)
     = min(0.974, 0.915) = 0.915

ModifiedImpact = 6.42 × 0.915 = 5.87
ModifiedExploitability = 3.89
ModifiedBaseScore = Roundup(5.87 + 3.89) = 9.8
EnvironmentalScore = Roundup(9.8 × 0.91 × 1.0 × 0.96) = 8.6
```

**Environmental Score: 8.6 (High)**

---

## Final Scores

| Metric Group      | Score   | Severity |
| ----------------- | ------- | -------- |
| Base              | 9.1     | Critical |
| Temporal          | 8.0     | High     |
| **Environmental** | **8.6** | **High** |

**Complete Vector:**

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N/E:U/RL:U/RC:R/CR:H/IR:H/AR:H
```

---

## Key Observations

1. **PR:None is correct** - Authentication bypass means attacker doesn't need auth to exploit
2. **Environmental elevated** - All three requirements High (critical auth system)
3. **High priority despite A:None** - No DoS impact, but auth compromise is severe
4. **Use 8.6 for prioritization** - Reflects business-critical nature of authentication

**This threat warrants immediate remediation** due to 8.6 Environmental score and critical system impact.
