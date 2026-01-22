# CVSS Scoring Examples

**Real-world vulnerability scoring scenarios with complete justifications.**

## Example Format

Each example includes:

- Vulnerability description
- Attack scenario
- Vector justification
- Common mistakes to avoid
- Alternative interpretations

---

## Example 1: Authentication Bypass (CRITICAL)

### Scenario

Remote authentication bypass allowing unauthenticated access to admin panel.

### Attack Scenario

Attacker sends crafted HTTP request with specific headers, bypassing authentication checks entirely. No user interaction required. Attacker gains full administrative access.

### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Score: 9.8 (CRITICAL)
```

### Vector Justification

- **AV:N** - Remotely exploitable over network
- **AC:L** - Simple crafted request, no special conditions
- **PR:N** - No authentication required (that's the bug!)
- **UI:N** - No user interaction needed
- **S:U** - Impact limited to application itself (no container/VM escape)
- **C:H** - Full access to all data
- **I:H** - Can modify all data and settings
- **A:H** - Can shut down or disrupt service

### Why This Is Actually CRITICAL

✓ Complete authentication bypass
✓ Network-accessible
✓ No special conditions
✓ Full system compromise

### Common Mistakes

❌ Setting S:C because "admin access affects all users"
→ S:U is correct - no security boundary crossing

---

## Example 2: SQL Injection (Variable Severity)

### Scenario A: Limited SQL Injection (MEDIUM)

SQL injection in search parameter with read-only database user permissions.

#### Attack Scenario

Attacker injects SQL in search field. Database user has SELECT permission only on user_profiles table (not all tables). Cannot execute system commands.

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N
Score: 6.5 (MEDIUM)
```

#### Vector Justification

- **AV:N** - Remote web application
- **AC:L** - Standard SQL injection, no timing required
- **PR:L** - Requires authenticated user account
- **UI:N** - No user interaction
- **S:U** - Limited to database access, no OS breakout
- **C:H** - Can read entire user_profiles table
- **I:N** - Read-only permissions
- **A:N** - Cannot disrupt service

---

### Scenario B: SQL Injection with Write Access (HIGH)

SQL injection with database user having INSERT/UPDATE/DELETE permissions.

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
Score: 9.1 (CRITICAL)
```

#### Vector Justification

- **PR:N** - Unauthenticated endpoint
- **C:H** - Can read all data
- **I:H** - Can modify/delete data
- **A:N** - Cannot directly cause outage (though data deletion has availability implications)

---

### Scenario C: SQL Injection with xp_cmdshell (CRITICAL)

SQL injection with xp_cmdshell enabled (OS command execution).

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
Score: 10.0 (CRITICAL)
```

#### Vector Justification

- **S:C** - OS command execution breaks out from database context to host OS
- All impacts H - Complete system compromise

---

## Example 3: XSS (Context Dependent)

### Scenario A: Reflected XSS with User Interaction (MEDIUM)

Reflected XSS requiring victim to click malicious link.

#### Attack Scenario

Attacker crafts malicious URL with XSS payload. Victim must click link. XSS executes in victim's browser, can access victim's session and data.

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
Score: 6.1 (MEDIUM)
```

#### Vector Justification

- **AV:N** - Remote attack via crafted URL
- **AC:L** - No special conditions once clicked
- **PR:N** - No authentication needed to send link
- **UI:R** - Victim must click link
- **S:C** - Can access data from other origins (if CSP weak)
- **C:L** - Can access some user data
- **I:L** - Can perform limited actions as user
- **A:N** - No availability impact

#### Common Mistakes

❌ Using S:U because "it's just XSS"
→ S:C is appropriate if XSS can access other origins

❌ Using C:H/I:H
→ C:L/I:L is more realistic for limited XSS impact

---

### Scenario B: Stored XSS (HIGH)

Stored XSS executed automatically when users view page.

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N
Score: 6.5 (MEDIUM to HIGH depending on privileges)
```

#### Vector Justification

- **PR:L** - Requires authenticated account to inject payload
- **UI:N** - Executes automatically when other users view page
- Other metrics same as reflected XSS

---

## Example 4: Weak MFA Policy (MEDIUM)

### Scenario

Default MFA policy allows SMS/Voice factors. ThreatInsight not enabled.

### Attack Scenario

Attacker conducts phishing campaign. Victim enters credentials on fake site. Attacker attempts login, triggers MFA challenge sent via SMS. Attacker uses SIM swapping or SMS interception to bypass MFA. Gains access to victim's account.

### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N
Score: 5.9 (MEDIUM)
```

### Vector Justification

- **AV:N** - Remote phishing attack
- **AC:H** - Requires successful phishing AND MFA bypass (two separate attacks)
- **PR:N** - No authentication required to send phishing
- **UI:R** - Victim must enter credentials
- **S:U** - Impact limited to single compromised account (IdP itself not compromised)
- **C:H** - Attacker gains full access to victim's data
- **I:L** - Can modify data within victim's permissions (not system-wide)
- **A:N** - No service disruption

### Common Mistakes

❌ **Aggressive:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:L = 8.9 (HIGH)`

- S:C (WRONG - single account, not IdP compromise)
- AC:L (WRONG - requires phishing + MFA bypass)
- I:H (WRONG - limited to user permissions)

✅ **Conservative:** `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N = 5.9 (MEDIUM)`

---

## Example 5: Missing Rate Limiting (MEDIUM)

### Scenario

API endpoint lacks rate limiting, enabling credential stuffing attacks.

### Attack Scenario

Attacker obtains leaked credentials from previous breaches. Automated tool tests thousands of credentials against login API. No rate limiting or account lockout. Eventually finds valid credentials.

### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N
Score: 5.9 (MEDIUM)
```

### Vector Justification

- **AV:N** - Remote API attack
- **AC:H** - Requires leaked credentials AND successful match (not guaranteed)
- **PR:N** - No authentication to attempt logins
- **UI:R** - Victim's credentials must be in breach database (victim "interaction" in past)
- **S:U** - Limited to compromised accounts
- **C:H** - Full access to account data
- **I:L** - Limited to account permissions
- **A:N** - No service disruption (though high traffic could degrade)

### Common Mistakes

❌ Using AC:L
→ AC:H is more appropriate - requires credential database AND successful match

❌ Using A:H or A:L for "potential DoS from high traffic"
→ A:N unless actual DoS is demonstrated

---

## Example 6: IDOR (Insecure Direct Object Reference) (MEDIUM)

### Scenario

API endpoint allows accessing other users' data by changing user ID parameter.

### Attack Scenario

Authenticated user discovers they can change `user_id` parameter in API request to access other users' profiles. Can read but not modify.

### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N
Score: 6.5 (MEDIUM)
```

### Vector Justification

- **AV:N** - Remote API
- **AC:L** - Simple parameter manipulation
- **PR:L** - Requires valid user account
- **UI:N** - No user interaction
- **S:U** - Limited to application data (no boundary crossing)
- **C:H** - Can access all user profiles
- **I:N** - Read-only
- **A:N** - No availability impact

### Variations

**IDOR with Write:**

```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N
Score: 8.1 (HIGH)
```

- I:H - Can modify other users' data

---

## Example 7: Missing HTTPS (Context Dependent)

### Scenario A: Login Page Over HTTP (HIGH)

Login credentials transmitted in cleartext over HTTP.

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:A/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N
Score: 6.8 (MEDIUM)
```

#### Vector Justification

- **AV:A** - Requires network proximity (MITM attack)
- **AC:H** - Requires attacker to be in network path
- **C:H** - Credentials fully exposed
- **I:H** - Can use credentials to modify data

---

### Scenario B: Static Content Over HTTP (LOW)

Public marketing website served over HTTP (no sensitive data).

#### CVSS v3.1 Scoring

```
CVSS:3.1/AV:A/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N
Score: 4.2 (MEDIUM)
```

#### Vector Justification

- **UI:R** - User must visit specific page
- **C:L** - Limited information exposure (public content)
- **I:L** - Could inject malicious content via MITM

---

## Example 8: Privilege Escalation (HIGH)

### Scenario

Standard user can escalate to administrator by modifying API request.

### Attack Scenario

Authenticated standard user modifies `role=admin` parameter in account update request. Backend doesn't validate permission. User gains administrative access.

### CVSS v3.1 Scoring

```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H
Score: 8.8 (HIGH)
```

### Vector Justification

- **AV:N** - Remote API
- **AC:L** - Simple parameter modification
- **PR:L** - Requires low-privilege account
- **UI:N** - No user interaction
- **S:U** - Escalation within application (no OS/container escape)
- **C:H/I:H/A:H** - Full administrative access

### Why Not CRITICAL?

**PR:L** - Requires existing account access (not unauthenticated)

If this were **PR:N** (unauthenticated), it would be 9.8 (CRITICAL).

---

## Scoring Decision Matrix

| Vulnerability Type    | Typical Range | Key Factors                               |
| --------------------- | ------------- | ----------------------------------------- |
| Authentication bypass | 9.0-10.0      | PR:N, usually C:H/I:H/A:H                 |
| SQL injection         | 6.5-10.0      | Depends on DB permissions and xp_cmdshell |
| XSS (reflected)       | 6.1-7.3       | UI:R reduces score, S:C increases         |
| XSS (stored)          | 6.5-8.1       | UI:N (self-propagating)                   |
| IDOR                  | 4.3-8.1       | Read-only vs write, scope of data         |
| Privilege escalation  | 8.0-9.8       | PR:L vs PR:N makes huge difference        |
| Missing HTTPS         | 4.2-7.4       | Context-dependent, usually AV:A           |
| Weak MFA policy       | 5.9-6.5       | AC:H (multi-step), S:U (single account)   |
| Missing rate limiting | 5.3-6.5       | AC:H (requires credentials), UI:R         |

---

## Sources

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3-1/specification-document)
- [FIRST CVSS SIG Examples](https://www.first.org/cvss/examples)
- NVD Real-World CVE Scores
