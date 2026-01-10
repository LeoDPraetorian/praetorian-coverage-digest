# Privilege Escalation CVSS Scoring Example

**Complete walkthrough for scoring vertical privilege escalation (user → admin).**

## Scenario

**From Phase 3 Threat Modeling:**

**Threat:** Privilege escalation via parameter tampering

**Description:** The admin dashboard checks user role via `isAdmin` query parameter instead of server-side session validation. A regular user can change `?isAdmin=false` to `?isAdmin=true` in the URL to access admin functionality.

**Component:** `admin_dashboard`

**STRIDE Category:** Elevation of Privilege

---

## Phase 1 Business Context

```json
{
  "crown_jewels": [{
    "asset_name": "admin_dashboard",
    "data_types": ["system_configuration", "user_management"],
    "requires_confidentiality": false,
    "requires_integrity": true,
    "requires_availability": false
  }],
  "compliance": ["SOC2 Type 2"],
  "business_impact": {
    "unauthorized_admin_access": {
      "financial_impact_usd": 2000000
    }
  }
}
```

**Auto-derived:**
- CR: Medium (system config, not highly sensitive)
- IR: High (admin actions must be authentic)
- AR: Medium (standard uptime)

---

## CVSS 3.1 Scoring

### Base Metrics Assessment

| Metric | Value | Rationale |
|--------|-------|-----------|
| **AV** | Network (N) | Web application accessible remotely |
| **AC** | Low (L) | Simple URL parameter change |
| **PR** | Low (L) | **Requires user account** (starts as authenticated user) |
| **UI** | None (N) | No victim involvement |
| **S** | Unchanged (U) | Escalates within application (user→admin in same app) |
| **C** | High (H) | Admin can view all system data |
| **I** | High (H) | Admin can modify configurations |
| **A** | Low (L) | Admin can disrupt some features |

**Common Mistake:** PR:High because result is admin access - **WRONG**. PR is about preconditions, not consequences.

**Base Vector:** `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L`

**Base Calculation:**
```
ISS = 1 - [(1-0.56) × (1-0.56) × (1-0.22)] = 0.849
Impact = 6.42 × 0.849 = 5.45
Exploitability = 8.22 × 0.85 × 0.77 × 0.62 × 0.85 = 3.39
BaseScore = Roundup(5.45 + 3.39) = 8.9
```

**Base Score: 8.9 (High)**

### Temporal Metrics

| Metric | Value | Rationale |
|--------|-------|-----------|
| **E** | Unproven (U) | Theoretical threat |
| **RL** | Unavailable (U) | No fix yet |
| **RC** | Reasonable (R) | Code review confirmed |

**Temporal Calculation:**
```
TemporalScore = Roundup(8.9 × 0.91 × 1.0 × 0.96) = 7.8
```

**Temporal Score: 7.8 (High)**

### Environmental Metrics

**Security Requirements:** CR:M, IR:H, AR:M

**Environmental Calculation:**
```
MISS = min(1 - [(1-1.0×0.56) × (1-1.5×0.56) × (1-1.0×0.22)], 0.915)
     = min(1 - [0.44 × 0.16 × 0.78], 0.915)
     = min(0.945, 0.915) = 0.915

ModifiedImpact = 6.42 × 0.915 = 5.87
ModifiedExploitability = 3.39
ModifiedBaseScore = Roundup(5.87 + 3.39) = 9.3
EnvironmentalScore = Roundup(9.3 × 0.91 × 1.0 × 0.96) = 8.1
```

**Environmental Score: 8.1 (High)**

---

## Final Scores

| Metric Group | Score | Severity |
|--------------|-------|----------|
| Base | 8.9 | High |
| Temporal | 7.8 | High |
| **Environmental** | **8.1** | **High** |

**Complete Vector:**
```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L/E:U/RL:U/RC:R/CR:M/IR:H/AR:M
```

---

## Key Observations

1. **S:Unchanged is correct** - User→Admin within same application (not container→host)
2. **PR:Low is correct** - Attacker starts with user account, not admin
3. **IR:High elevates Environmental** - Admin action integrity is critical (SOC2)
4. **Similar to SQL injection score** - Both are High priority

**Comparison with container escape:**

| Threat | Scope | Base | Environmental | Why Different |
|--------|-------|------|---------------|---------------|
| **User→Admin** | U | 8.9 | 8.1 | Same app authority |
| **Container→Host** | **C** | 7.8 | Higher | Crosses isolation boundary |

Scope Changed significantly impacts scoring for true trust boundary violations.
