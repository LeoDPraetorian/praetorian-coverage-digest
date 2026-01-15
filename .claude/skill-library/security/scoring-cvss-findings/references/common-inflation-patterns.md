# Common CVSS Inflation Patterns

**How to recognize and avoid over-inflating CVSS scores.**

## The Inflation Problem

CVSS scores are frequently inflated by 1-4 points due to:
1. **Worst-case assumptions** instead of realistic impact
2. **Scope (S) misunderstanding** - most common inflation source
3. **CIA Triad defaults to High** without justification
4. **Attack Complexity underestimated** (defaulting to Low)

---

## Pattern 1: Scope Changed (S:C) Abuse

**THE #1 INFLATION SOURCE - Adds 1.0-2.0 points**

### ❌ Common Mistake

"Compromising this IdP affects all integrated apps, so S:C"

**Problem:** Conflates *potential* downstream impact with actual security boundary crossing.

### ✅ Correct Approach

Ask: "Does this exploit allow escaping from the vulnerable component's security authority?"

**S:C is ONLY appropriate when:**
- Container escape to host
- VM breakout to hypervisor
- Cross-tenant data access in multi-tenant system
- Complete IdP compromise with SAML assertion forgery

**S:U is correct when:**
- Single user account compromised (IdP itself intact)
- Weak configuration (not complete compromise)
- Impact limited to vulnerable component
- "Downstream effects" without boundary crossing

### Real Examples

| Scenario                                  | Wrong | Right | Why                                          |
| ----------------------------------------- | ----- | ----- | -------------------------------------------- |
| Weak MFA policy allows SMS                | S:C   | S:U   | Single account compromised, not IdP itself   |
| SQL injection in user table               | S:C   | S:U   | Database access doesn't escape to OS         |
| XSS in web app accessing other APIs       | S:C   | S:U   | API access via user session, not breakout    |
| Docker container escape to host           | S:C   | S:C   | ✓ Actual security boundary crossing          |

**Impact:** Using S:U instead of S:C typically reduces score by 1.0-2.0 points.

---

## Pattern 2: CIA Triad Defaults to High

**Adds 2.0-4.0 points when both C:H and I:H used incorrectly**

### ❌ Common Mistake

"This is a security issue, so C:H/I:H by default"

**Problem:** Assumes worst-case impact without evidence.

### ✅ Correct Approach

**Confidentiality (C):**
- **H (High):** ONLY when complete data disclosure OR >1000 records
- **L (Low):** Limited disclosure, <100 records, requires additional exploitation
- **N (None):** No data exposure

**Integrity (I):**
- **H (High):** ONLY when complete modification OR critical system settings
- **L (Low):** Partial modification, non-critical settings
- **N (None):** Read-only vulnerability

**Availability (A):**
- **H (High):** Complete service outage
- **L (Low):** Performance degradation
- **N (None):** No availability impact **(MOST COMMON)**

### Real Examples

| Vulnerability Type      | Often Scored       | Should Be          | Justification                              |
| ----------------------- | ------------------ | ------------------ | ------------------------------------------ |
| IDOR (single user)      | C:H/I:H           | C:L/I:L            | Limited to one user's data                 |
| SQL injection (limited) | C:H/I:H           | C:H/I:L or C:L/I:L | Depends on query scope                     |
| Weak password policy    | C:H/I:H/A:L       | C:L/I:L/A:N        | Requires successful attack first           |
| Information disclosure  | C:H/I:N/A:N       | C:L/I:N/A:N        | Unless >1000 records                       |

**Impact:** Using C:L/I:L instead of C:H/I:H typically reduces score by 2.0-4.0 points.

---

## Pattern 3: Attack Complexity (AC) Defaults to Low

**Adds 0.5-1.0 points**

### ❌ Common Mistake

"This vulnerability can be exploited, so AC:L"

**Problem:** Ignores preparation, timing, or multi-step requirements.

### ✅ Correct Approach

**AC:H (High) when:**
- Requires phishing + additional steps (e.g., MFA bypass)
- Timing or race condition exploitation
- Requires information gathering about target
- Specific environmental conditions needed
- Multi-step exploitation chain

**AC:L (Low) ONLY when:**
- Single-step exploitation
- Reliable in all scenarios
- No special conditions required
- Public exploit code works without modification

### Real Examples

| Scenario                               | Often Scored | Should Be | Why                                     |
| -------------------------------------- | ------------ | --------- | --------------------------------------- |
| Phishing + weak MFA bypass             | AC:L         | AC:H      | Requires successful phishing AND bypass |
| SQL injection requiring timing         | AC:L         | AC:H      | Timing/race condition involved          |
| Unauthenticated API with no validation | AC:L         | AC:L      | ✓ Simple, reliable exploitation         |

**Impact:** Using AC:H instead of AC:L reduces score by 0.5-1.0 points.

---

## Pattern 4: User Interaction (UI) Underestimated

**Adds 0.5-2.0 points**

### ❌ Common Mistake

"Attacker sends phishing email, so UI:N"

**Problem:** Confuses attacker action with victim action.

### ✅ Correct Approach

**UI:R (Required) when:**
- Victim must click anything
- Victim must enter credentials
- Victim must approve/download
- ANY social engineering required

**UI:N (None) ONLY when:**
- Completely automated exploitation
- No victim participation whatsoever
- Background exploitation

### Real Examples

| Attack Vector           | Often Scored | Should Be | Why                            |
| ----------------------- | ------------ | --------- | ------------------------------ |
| Phishing link           | UI:N         | UI:R      | Victim must click              |
| Malicious email attachment | UI:N      | UI:R      | Victim must open               |
| Drive-by download       | UI:R         | UI:R      | ✓ Requires site visit          |
| Automated API exploit   | UI:N         | UI:N      | ✓ No user interaction          |

**Impact:** Using UI:R instead of UI:N reduces score by 0.5-2.0 points.

---

## Pattern 5: Cumulative Inflation Effect

**When multiple patterns combine, score inflation compounds.**

### Example: Weak MFA Policy

**Aggressive scoring (combining all inflation patterns):**
```
CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:L
Score: 8.9 (HIGH)

Inflation sources:
- S:C instead of S:U (+1.5 points)
- C:H/I:H instead of C:L/I:L (+2.0 points)
- AC:L instead of AC:H (+0.4 points)
Total inflation: ~4 points
```

**Conservative scoring (avoiding inflation):**
```
CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N
Score: 5.9 (MEDIUM)

Corrections:
- S:U (single account, not IdP compromise)
- AC:H (phishing + MFA bypass required)
- I:L (limited to user permissions)
- A:N (no availability impact)
```

**Difference:** 3.0 points (HIGH → MEDIUM)

---

## Detection Checklist

Use this to identify potential over-inflation:

### Red Flags

- [ ] S:C justified by "affects other systems" without boundary crossing
- [ ] C:H without specific evidence of complete disclosure
- [ ] I:H without evidence of complete modification
- [ ] AC:L when multiple exploitation steps required
- [ ] UI:N when social engineering involved
- [ ] A:H or A:L when no service disruption

### Validation Questions

**Before finalizing score, ask:**

1. **Scope:** Does this actually cross a security boundary, or just have downstream effects?
2. **CIA:** Can I prove complete impact, or is it partial/limited?
3. **Complexity:** Can this be exploited reliably in one step, or does it require preparation?
4. **Interaction:** Can attacker exploit this without any victim action?

---

## Conservative Defaults Summary

When uncertain, use these conservative defaults:

| Metric | Conservative Default | When to Use Higher        |
| ------ | -------------------- | ------------------------- |
| **S**  | U (Unchanged)        | Only for boundary escapes |
| **C**  | L (Low) or N         | Only C:H if >1000 records |
| **I**  | L (Low) or N         | Only I:H if complete mod  |
| **A**  | N (None)             | Only A:H if complete DoS  |
| **AC** | H (High)             | Only AC:L if single-step  |
| **UI** | R (Required)         | Only UI:N if automated    |

---

## Real-World Score Adjustments

| Vulnerability Type           | Typical Aggressive | Conservative | Balanced    |
| ---------------------------- | ------------------ | ------------ | ----------- |
| Weak MFA policy              | 8.9 (HIGH)         | 4.2 (MED)    | 5.9 (MED)   |
| Missing rate limiting        | 8.6 (HIGH)         | 4.2 (MED)    | 5.5 (MED)   |
| IDOR (single user)           | 7.5 (HIGH)         | 4.3 (MED)    | 5.3 (MED)   |
| Information disclosure       | 7.5 (HIGH)         | 5.3 (MED)    | 6.5 (MED)   |
| Authentication bypass        | 9.8 (CRIT)         | 9.8 (CRIT)   | 9.8 (CRIT)  |

**Key insight:** True CRITICAL/HIGH findings remain high even with conservative scoring. Inflation primarily affects MEDIUM findings scored as HIGH.

---

## Sources

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3-1/specification-document)
- [NVD CVSS Guidelines](https://nvd.nist.gov/vuln-metrics/cvss)
- FIRST CVSS SIG - Scoring Examples
