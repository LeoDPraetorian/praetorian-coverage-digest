# CVSS Scoring Anti-Patterns

**What NOT to do when scoring vulnerabilities - common mistakes and how to avoid them.**

## Anti-Pattern 1: "This Feels High, So High Score"

### ❌ Wrong Approach

Scoring based on gut feeling or severity perception without methodical evaluation.

**Example:**
> "This is an authentication issue, those are always critical" → CVSS 9.0

### ✅ Correct Approach

Follow the decision tree methodically for each metric. Severity emerges from metric values, not vice versa.

**Example:**
> Authentication bypass (PR:N, full access) → 9.8 (metrics justify CRITICAL)
> Weak password policy (PR:N + AC:H + UI:R, limited impact) → 5.9 (metrics show MEDIUM)

### Why This Matters

Intuition-based scoring leads to inconsistency. Two similar vulnerabilities scored differently by different people.

---

## Anti-Pattern 2: "Scope Changed Because Downstream Impact"

### ❌ Wrong Approach

Setting S:C whenever a vulnerability affects multiple systems or users.

**Common phrases that indicate this mistake:**
- "Compromising this affects all users" → S:C
- "This has downstream impact on other services" → S:C
- "The IdP authenticates multiple apps" → S:C

### ✅ Correct Approach

S:C ONLY when the vulnerability **crosses a security boundary**.

**Security boundaries:**
- Container → Host OS
- VM → Hypervisor
- Tenant A → Tenant B (in multi-tenant system)
- Database user → Operating system

**NOT security boundaries:**
- User A → User B (same authority)
- Application → Backend API (same owner)
- IdP account → Integrated apps (via authorized session)

### Real Examples

| Scenario                                     | Wrong | Right | Why                                  |
| -------------------------------------------- | ----- | ----- | ------------------------------------ |
| Weak MFA allows account compromise           | S:C   | S:U   | Single account, IdP intact           |
| XSS in web app accesses integrated APIs      | S:C   | S:U   | APIs accessed via user session       |
| SQL injection in database                    | S:C   | S:U   | Stays within database layer          |
| Docker escape to host                        | S:C   | S:C   | ✓ Actual boundary crossing           |

### Impact on Score

This single mistake typically adds **1.0-2.0 points** to the base score.

---

## Anti-Pattern 3: "Default to Worst Case CIA Values"

### ❌ Wrong Approach

Assuming C:H/I:H/A:H for any security vulnerability "to be safe."

**Example:**
> Information disclosure vulnerability → C:H (because "data was disclosed")

### ✅ Correct Approach

Assess actual impact with evidence:

**Confidentiality (C):**
- H: Complete disclosure, >1000 records
- L: Partial disclosure, <100 records
- N: No disclosure

**Integrity (I):**
- H: Complete modification, critical settings
- L: Partial modification, non-critical
- N: Read-only

**Availability (A):**
- H: Complete outage
- L: Degradation
- N: No impact ← **MOST COMMON**

### Real Examples

| Vulnerability                  | Often Scored | Should Be   | Justification                          |
| ------------------------------ | ------------ | ----------- | -------------------------------------- |
| Single user IDOR               | C:H/I:H/A:N  | C:L/I:L/A:N | Limited to one account                 |
| Limited SQL injection          | C:H/I:H/A:N  | C:H/I:N/A:N | Read-only DB user                      |
| Config file disclosure         | C:H/I:N/A:N  | C:L/I:N/A:N | Unless >1000 records or critical secrets |

### Impact on Score

Using C:H/I:H instead of C:L/I:L adds **2.0-4.0 points**.

---

## Anti-Pattern 4: "Attack Complexity is Always Low"

### ❌ Wrong Approach

Defaulting to AC:L because "if it's a vulnerability, it can be exploited."

**Example:**
> Phishing + MFA bypass → AC:L ("social engineering is easy")

### ✅ Correct Approach

AC:H when exploitation requires:
- Multiple steps (phishing + additional attack)
- Timing or race conditions
- Information gathering
- Specific environmental conditions

AC:L ONLY when:
- Single-step exploitation
- Reliable in all scenarios
- No preparation needed

### Real Examples

| Scenario                             | Often Scored | Should Be | Justification                         |
| ------------------------------------ | ------------ | --------- | ------------------------------------- |
| Phishing + MFA bypass                | AC:L         | AC:H      | Two separate attacks required         |
| TOCTOU race condition                | AC:L         | AC:H      | Timing-dependent exploitation         |
| SQL injection (simple)               | AC:L         | AC:L      | ✓ Reliable single-step exploitation   |

### Impact on Score

Using AC:H instead of AC:L reduces score by **0.5-1.0 points**.

---

## Anti-Pattern 5: "No User Interaction for Phishing"

### ❌ Wrong Approach

Setting UI:N for attacks that require victim to click, open, or enter something.

**Common phrases:**
- "The attacker sends the phishing email" → UI:N
- "It's automated from the attacker's perspective" → UI:N

### ✅ Correct Approach

UI is about **victim** action, not attacker action.

**UI:R when victim must:**
- Click any link
- Open any file
- Enter any credentials
- Approve any prompt

**UI:N ONLY when:**
- Completely automated exploitation
- No victim participation whatsoever

### Real Examples

| Attack                      | Often Scored | Should Be | Why                             |
| --------------------------- | ------------ | --------- | ------------------------------- |
| Phishing email              | UI:N         | UI:R      | Victim must click               |
| Malicious download link     | UI:N         | UI:R      | Victim must download/open       |
| Automated API exploit       | UI:N         | UI:N      | ✓ No victim interaction         |

---

## Anti-Pattern 6: "Scoring Without Understanding the Vulnerability"

### ❌ Wrong Approach

Scoring based on vulnerability type alone without understanding the specific instance.

**Example:**
> "It's SQL injection, so it must be 9.0 or higher"

### ✅ Correct Approach

Understand the specific context:
- What database permissions does the exploitable query have?
- Is it read-only or read-write?
- Does the DB user have OS access (xp_cmdshell)?
- Is authentication required?

### Real Examples

**Same vulnerability type, different scores:**

| SQL Injection Context              | Score          | Why                                |
| ---------------------------------- | -------------- | ---------------------------------- |
| Read-only user, auth required      | 6.5 (MEDIUM)   | Limited impact                     |
| Write access, no auth              | 9.1 (CRITICAL) | Can modify data                    |
| xp_cmdshell enabled, no auth       | 10.0 (CRITICAL) | OS command execution              |

---

## Anti-Pattern 7: "Round Up to the Next Severity Level"

### ❌ Wrong Approach

"6.9 is basically 7.0, so I'll call it HIGH instead of MEDIUM"

### ✅ Correct Approach

Use the exact calculated score. Severity thresholds exist for a reason.

**Severity thresholds (v3.1):**
- 9.0-10.0 = CRITICAL
- 7.0-8.9 = HIGH
- 4.0-6.9 = MEDIUM
- 0.1-3.9 = LOW

**A 6.9 is MEDIUM, not HIGH.**

### Why This Matters

Rounding up compounds with other inflation patterns, turning MEDIUM findings into HIGH/CRITICAL.

---

## Anti-Pattern 8: "Justify the Score I Want"

### ❌ Wrong Approach

Deciding on a severity level first, then selecting metrics to achieve that score.

**Example:**
> "This needs to be HIGH, so I'll set S:C and C:H/I:H to get there"

### ✅ Correct Approach

Select metrics based on factual assessment, then accept the resulting score.

**If the score seems wrong:**
1. Re-examine your metric choices
2. Check for inflation patterns
3. Document your reasoning
4. Consider getting a second opinion

**Don't:**
- Manipulate metrics to hit a target score
- Work backward from desired severity

---

## Anti-Pattern 9: "Everything on the Internet is AV:N"

### ❌ Wrong Approach (Sometimes)

Setting AV:N for vulnerabilities that technically require network access but are highly restricted.

### ✅ Correct Approach

**AV:N is correct for:**
- Public-facing websites
- Internet-accessible APIs
- Remote services

**Consider AV:A or AV:L for:**
- VPN-only access (still AV:N, but context matters)
- Internal network services
- Localhost-only services → AV:L

### Impact

This is usually **not** an anti-pattern. AV:N is correct for most web/API vulnerabilities. Just be aware of the nuance.

---

## Anti-Pattern 10: "Skip the Calculator, I Can Estimate"

### ❌ Wrong Approach

Manually estimating CVSS scores without using the official calculator.

**Problem:** CVSS scoring formulas are complex. Manual estimation leads to errors.

### ✅ Correct Approach

**ALWAYS use the official calculator:**
- v3.1: https://www.first.org/cvss/calculator/3.1
- v4.0: https://www.first.org/cvss/calculator/4.0

Enter your vector string and get the exact score.

---

## Anti-Pattern 11: "Copy Scores from Similar CVEs"

### ❌ Wrong Approach

Finding a similar CVE and copying its CVSS score.

**Example:**
> "This looks like CVE-2023-12345, so I'll use 8.8"

### ✅ Correct Approach

Score each vulnerability independently based on its specific context.

**Why:**
- Similar vulnerabilities can have different impacts in different contexts
- CVE scores are sometimes incorrectly scored
- Your specific instance may have additional mitigating factors

---

## Anti-Pattern 12: "No Justification Needed"

### ❌ Wrong Approach

Providing a CVSS score without explaining the reasoning.

**Example:**
> "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:L - Score: 8.9 (HIGH)"
> [No explanation provided]

### ✅ Correct Approach

Always include:
- Vector string
- Base score and severity
- Rationale for each non-obvious metric choice
- Justification for C/I/A values
- Why S:U or S:C

**Example:**
```markdown
## CVSS Score

**Vector:** CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N
**Score:** 5.9 (MEDIUM)

**Rationale:**
- AV:N - Remote phishing attack
- AC:H - Requires successful phishing AND MFA bypass (multi-step)
- PR:N - No authentication required to send phishing
- UI:R - Victim must enter credentials
- S:U - Impact limited to compromised account (IdP itself not compromised)
- C:H - Attacker gains full access to user's data
- I:L - Modifications limited to user's permissions, not system-wide
- A:N - No availability impact

**Justification:**
Used S:U instead of S:C because compromising a single user account
doesn't cross a security boundary - the IdP itself remains secure.
```

---

## Detection Checklist

Use this before finalizing any CVSS score:

### Red Flags (Review Needed)

- [ ] Score is 7.0+ (HIGH/CRITICAL) - Are you sure?
- [ ] S:C used - Can you prove security boundary crossing?
- [ ] C:H and/I:H used - Can you prove complete impact?
- [ ] AC:L used - Is it really single-step exploitation?
- [ ] UI:N used - Is there truly no victim action required?
- [ ] No justification provided - Add reasoning
- [ ] Score was rounded up - Use exact calculated score
- [ ] Score estimated without calculator - Use official tool

### Validation Questions

1. Would a security expert agree with this score?
2. Can I defend this in a client presentation?
3. Have I documented my assumptions?
4. Did I check for inflation patterns?
5. Does the score match the actual risk?

---

## Common Score Ranges by Vulnerability Type

Use this as a sanity check (not a rule):

| Vulnerability Type            | Typical Range | Red Flag Range |
| ----------------------------- | ------------- | -------------- |
| Authentication bypass         | 8.0-10.0      | <7.0 suspicious |
| SQL injection                 | 6.5-10.0      | Context-dependent |
| XSS (reflected)               | 6.0-7.5       | >8.0 suspicious |
| XSS (stored)                  | 6.5-8.5       | >9.0 suspicious |
| IDOR                          | 4.0-8.5       | >9.0 suspicious |
| Weak configuration            | 4.0-7.0       | >8.0 suspicious |
| Information disclosure        | 4.0-7.5       | >8.0 suspicious |
| Missing security control      | 4.0-7.0       | >8.0 suspicious |
| Privilege escalation          | 8.0-9.8       | 10.0 rare      |

**If your score is in the "Red Flag Range," double-check your reasoning.**

---

## Summary: The Top 5 Anti-Patterns

1. **S:C without boundary crossing** → Adds 1-2 points
2. **C:H/I:H without justification** → Adds 2-4 points
3. **AC:L when multi-step** → Adds 0.5-1 point
4. **UI:N for phishing/social engineering** → Adds 0.5-2 points
5. **No justification provided** → Makes score indefensible

**Total potential inflation from all 5:** **4-9 points** (MEDIUM → CRITICAL)

---

## Sources

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3-1/specification-document)
- [FIRST CVSS SIG Examples](https://www.first.org/cvss/examples)
- Common CVSS Scoring Mistakes - Security Community Analysis
