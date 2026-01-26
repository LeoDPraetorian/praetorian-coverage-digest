# Risk Status Guide

**Complete risk status codes, severity guidelines, and state transition workflows.**

---

## Risk Status Codes

**For "discovered" findings (verified but not demonstrated in production):**

| Status | Code | When to Use                        | Example                                                  |
| ------ | ---- | ---------------------------------- | -------------------------------------------------------- |
| **Critical** | TC | Critical severity, immediate fix   | Privilege escalation to admin, cross-account compromise  |
| **High**     | TH | High severity, fix this week       | Significant privilege escalation, production data access |
| **Medium**   | TM | Medium severity, fix this month    | Limited escalation, non-production impact                |
| **Low**      | TL | Low severity, fix when convenient  | Minor privilege gain, dev environment only               |
| **Info**     | TI | Informational, no immediate action | Security observation, best practice violation            |

---

## State Transitions

**Finding lifecycle:**

```
TC (Discovered) → Validated (Demonstrated) → Remediated (Fixed) → Verified (Confirmed)
```

**State notation in definition:**
- Add to definition markdown: "State: Discovered (not yet demonstrated in production)"
- Update when status changes: "State: Validated (demonstrated on DATE)"

**Transition triggers:**

| From State  | To State    | Trigger                                    |
| ----------- | ----------- | ------------------------------------------ |
| Discovered  | Validated   | Successfully demonstrated exploit in production |
| Validated   | Remediated  | Client implements fix                      |
| Remediated  | Verified    | Praetorian confirms fix is effective       |

---

## Severity Selection Guidelines

### Critical (TC)

**Use when:**
- Full AWS account compromise possible
- Cross-account lateral movement
- Admin access from low-privilege starting point
- Data exfiltration at scale
- RCE with critical business impact

**Attack requirements:** Minimal (no admin creds, no code review)

**Time to exploit:** Minutes to hours

### High (TH)

**Use when:**
- Significant privilege escalation (but requires initial compromise)
- Production data access
- Sensitive resource exposure
- Multi-step attack with moderate complexity

**Attack requirements:** Some initial access (developer workstation, phished creds)

**Time to exploit:** Hours to days

### Medium (TM)

**Use when:**
- Limited privilege escalation
- Non-production environment impact
- Requires multiple compromises
- Partial data exposure

**Attack requirements:** Multiple prerequisites or complex attack chain

**Time to exploit:** Days to weeks

### Low (TL)

**Use when:**
- Minor security gap
- Dev/test environment only
- Limited blast radius
- Theoretical risk without clear exploitation path

**Attack requirements:** Significant prerequisites

**Time to exploit:** Weeks to months (or theoretical)

### Informational (TI)

**Use when:**
- Security observation
- Best practice violation
- No clear exploitation path
- Configuration recommendation

**Attack requirements:** N/A (not exploitable)

---

## Severity Adjustment Factors

**Increase severity (+1 level) when:**
- No MFA requirements
- Federated access (Okta/SAML accessible by many users)
- Production environment
- Affects customer data
- Cross-account impact

**Decrease severity (-1 level) when:**
- Requires initial compromise (developer workstation)
- Multiple prerequisites needed
- Strong mitigating controls present
- Limited blast radius
- Non-production only

---

## Examples

### Example 1: Lambda Code Injection (TH)

**Base severity:** TC (privilege escalation to admin)
**Adjustment:** -1 (requires developer workstation compromise)
**Final:** TH

**Rationale:** Attack is viable and leads to full compromise, but requires initial access to developer endpoint. Attack surface includes any developer workstation.

### Example 2: Public S3 Bucket (TC)

**Base severity:** TH (data exposure)
**Adjustment:** +1 (publicly accessible, no prerequisites)
**Final:** TC

**Rationale:** No authentication required, internet-accessible, immediate exploitation possible.

### Example 3: Sandbox Self-Escalation (TM)

**Base severity:** TH (privilege escalation)
**Adjustment:** -1 (sandbox environment, non-production)
**Final:** TM

**Rationale:** While escalation is possible, impact limited to non-production sandbox environment.
