# Base Metrics Assessment Guide

**Comprehensive guidance for assessing CVSS 3.1 Base metrics during threat modeling.**

## Overview

CVSS Base metrics capture the **intrinsic characteristics** of a vulnerability that remain constant over time and across environments. These 8 metrics are split into:

- **Exploitability Metrics** (4): AV, AC, PR, UI - How easy to exploit?
- **Impact Metrics** (4): S, C, I, A - What damage can attacker do?

---

## Exploitability Metrics

### Attack Vector (AV)

**Question:** How does the attacker reach the vulnerable component?

**Context for threat modeling:** This reflects WHERE the vulnerable component is accessible.

| Value            | Definition                        | Examples                                     | Threat Modeling Guidance                                             |
| ---------------- | --------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| **Network (N)**  | Remotely exploitable over network | Web APIs, public websites, internet services | Most web/cloud threats. If threat says "remote attacker" → Network   |
| **Adjacent (A)** | Local network required (same LAN) | Bluetooth, NFC, LAN-only services            | Insider threat, corporate network attack. Requires network proximity |
| **Local (L)**    | Local system access required      | Shell access, logged-in user, USB device     | Privilege escalation, local exploits. Attacker already has foothold  |
| **Physical (P)** | Physical hardware access          | Data center access, device in hand           | Hardware attacks, firmware, cold boot attacks                        |

**Numeric values for calculation:**

- N = 0.85
- A = 0.62
- L = 0.55
- P = 0.20

**Decision tree:**

```
Can attacker exploit remotely over internet?
  → Yes: Network
  → No: Is same LAN/subnet required?
    → Yes: Adjacent
    → No: Is shell/local access required?
      → Yes: Local
      → No: Physical
```

**Common threat modeling scenarios:**

- API vulnerability → **Network**
- Admin panel exploit → **Network** (if internet-facing) or **Local** (if localhost only)
- Container escape → **Local** (already inside container)
- Database injection → Depends on database exposure (Network if RDS, Local if localhost)

---

### Attack Complexity (AC)

**Question:** Does successful exploitation require special conditions, timing, or significant effort beyond just sending the attack payload?

**Context for threat modeling:** How reliable is the exploit? Can attacker repeat it at will?

| Value        | Definition                                                                       | Examples                                                                              | Threat Modeling Guidance                               |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Low (L)**  | No special conditions. Works reliably. Attacker can exploit at will.             | Standard SQL injection, path traversal, XSS, command injection                        | Default for most injection attacks and logic flaws     |
| **High (H)** | Requires race conditions, specific configurations, brute force, low success rate | Race conditions, timing attacks, hash collision, attacks requiring specific app state | Only if exploit is unreliable or needs rare conditions |

**Numeric values:**

- L = 0.77
- H = 0.44

**Decision criteria:**

Select **Low** if:

- Attack works every time
- No special timing or race conditions
- No configuration dependencies
- Attacker fully controls attack success

Select **High** if:

- Success requires precise timing (race condition)
- Requires brute forcing with low success probability
- Only works in specific configurations
- Requires information gathering before exploitation

**Examples:**

- SQL injection with error messages → **Low** (reliable)
- Blind SQL injection requiring 1000s of requests → **High** (complex)
- CSRF with predictable tokens → **Low**
- CSRF requiring token brute force → **High**
- Authentication bypass with hard-coded credentials → **Low**
- Authentication bypass via timing attack → **High**

**Common misconception:** AC is NOT about attacker skill level. It's about exploit reliability and special conditions.

---

### Privileges Required (PR)

**Question:** What level of authorization must the attacker obtain before exploiting the vulnerability?

**Context for threat modeling:** Does threat bypass authentication or require authenticated context?

| Value        | Definition                               | Examples                                                                   | Threat Modeling Guidance                           |
| ------------ | ---------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| **None (N)** | Unauthorized. Anonymous/public access.   | Unauthenticated API endpoints, public web pages, pre-auth vulnerabilities  | If threat says "unauthenticated attacker" → None   |
| **Low (L)**  | Standard user privileges. Basic account. | Authenticated user exploiting privilege escalation, standard user features | If threat requires login but no special role → Low |
| **High (H)** | Administrator or significant privileges  | Admin panel exploits, database admin, root user                            | If threat requires admin/root access → High        |

**Numeric values** (depends on Scope):

- None = 0.85
- Low = 0.62 (if Scope Unchanged) or 0.68 (if Scope Changed)
- High = 0.27 (if Scope Unchanged) or 0.50 (if Scope Changed)

**Decision tree:**

```
Does attacker need ANY authentication?
  → No: None (pre-auth vulnerability)
  → Yes: Does attacker need admin/privileged role?
    → Yes: High
    → No: Low (regular user account)
```

**Common threat modeling scenarios:**

- Authentication bypass → **None** (that's the vulnerability - gaining auth without having it)
- Authorization bypass (user → admin) → **Low** (starts as regular user)
- Admin panel XSS → **High** (must already be admin)
- Public API injection → **None**
- Authenticated API injection → **Low**

**Special case - "privilege escalation":**

- Horizontal escalation (user → other user) → **Low** (both are users)
- Vertical escalation (user → admin) → **Low** (starts as user)
- Container escape (container user → host root) → **Low** (has container access)

---

### User Interaction (UI)

**Question:** Does the exploit require a separate victim to perform an action (besides the attacker)?

**Context for threat modeling:** Is this a server-side attack or does it need social engineering?

| Value            | Definition                                                  | Examples                                                 | Threat Modeling Guidance                         |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| **None (N)**     | Fully autonomous. Attacker acts alone. No victim required.  | Server-side vulnerabilities, autonomous exploitation     | If threat is server-side or automated → None     |
| **Required (R)** | Victim must take action (click link, open file, visit page) | Phishing, XSS (victim visits page), malicious file, CSRF | If threat requires victim cooperation → Required |

**Numeric values:**

- N = 0.85
- R = 0.62

**Decision criteria:**

Select **None** if:

- Attacker exploits server/API directly
- No human victim interaction needed
- Automated attack (worm, scanner)

Select **Required** if:

- Victim must click a link
- Victim must open a file
- Victim must visit attacker-controlled page
- Victim must perform action while authenticated (CSRF)

**Examples:**

- SQL injection → **None** (attacker sends malicious query)
- Stored XSS → **Required** (victim must view page with stored payload)
- Reflected XSS → **Required** (victim must click malicious link)
- CSRF → **Required** (victim must be authenticated and visit attacker page)
- Remote code execution → **None** (server-side)
- Malicious file upload with XSS → **Required** (victim must view file)

**Common misconception:** "User Interaction" is NOT about the attacker clicking buttons. It's about a **separate victim** performing actions.

---

## Impact Metrics

### Scope (S)

**Question:** Can the attacker impact resources **beyond the vulnerable component**?

**Context for threat modeling:** This is about **trust boundary crossings**. Does the exploit escape the vulnerable component's security authority?

| Value             | Definition                             | Examples                                              | Threat Modeling Guidance                                   |
| ----------------- | -------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| **Unchanged (U)** | Impact limited to vulnerable component | SQL injection affecting only that database            | Default. Most vulnerabilities don't cross trust boundaries |
| **Changed (C)**   | Impact extends to other components     | Container escape to host, VM escape, sandbox breakout | Only if threat crosses trust/security boundaries           |

**Numeric impact** (increases scores significantly):

- U: Impact × 6.42
- C: Impact × 7.52 (then scaled)

**Trust boundary examples:**

- Application component → Database: **Not** a scope change (same application context)
- Container → Host OS: **Scope Changed** (crosses isolation boundary)
- User session → Other user's session: **Unchanged** (same application)
- Web app → Underlying server OS: **Scope Changed** (crosses application boundary)
- JavaScript sandbox → Browser process: **Scope Changed** (sandbox escape)

**Common threat modeling scenarios:**

- SQL injection in web app → **Unchanged** (database is part of app)
- SQL injection leading to OS command execution → **Changed** (database → OS)
- XSS stealing cookies → **Unchanged** (browser DOM only)
- XSS leading to browser exploit → **Changed** (web page → browser process)
- Privilege escalation (user → admin in same app) → **Unchanged** (same app authority)
- Container escape (container user → host root) → **Changed** (crosses isolation)

**Critical decision:** When in doubt, choose **Unchanged**. Only select Changed for clear trust boundary violations.

---

### Confidentiality Impact (C)

**Question:** How much information can the attacker disclose?

**Context for threat modeling:** What data can attacker read that they shouldn't?

| Value        | Definition                                                                | Threat Modeling Guidance                                                  |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **None (N)** | No confidential data disclosed                                            | No data access, write-only vulnerabilities                                |
| **Low (L)**  | Some data accessible, but attacker doesn't control which. Limited access. | Can read some log entries but not choose which, partial directory listing |
| **High (H)** | All data within the component accessible to attacker                      | Full database read, source code disclosure, credential theft              |

**Numeric values:**

- H = 0.56
- L = 0.22
- N = 0

**Decision tree:**

```
Can attacker read ANY data they shouldn't?
  → No: None
  → Yes: Can attacker read ALL data in the component?
    → Yes: High
    → No: Low (limited/partial access)
```

**Examples:**

- SQL injection with full SELECT access → **High**
- SQL injection limited to one table → **High** (full control of that table)
- Path traversal reading arbitrary files → **High**
- Information leakage (version banner) → **Low** (minimal info)
- Timing attack revealing user existence → **Low** (single bit of info)
- Write-only vulnerability → **None**

**Threat modeling tip:** If threat description says "attacker can read/exfiltrate [data]" → High

---

### Integrity Impact (I)

**Question:** Can the attacker modify data?

**Context for threat modeling:** What can attacker alter, tamper with, or forge?

| Value        | Definition                                                                      | Threat Modeling Guidance                                     |
| ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **None (N)** | No data modification                                                            | Read-only vulnerabilities                                    |
| **Low (L)**  | Some data modifiable, but attacker doesn't control which. Limited consequences. | Can modify log timestamps, partial data corruption           |
| **High (H)** | Serious impact. Attacker can modify critical data.                              | Full database write, code injection, configuration tampering |

**Numeric values:**

- H = 0.56
- L = 0.22
- N = 0

**Decision criteria:**

Select **High** if:

- Attacker can modify protected/critical data
- Can inject code (SQL, OS commands, JavaScript)
- Can alter application logic or configuration
- Modifications have serious consequences

Select **Low** if:

- Can modify non-critical data only
- Modifications don't affect system operation significantly
- Attacker can't control what gets modified

Select **None** if:

- Read-only vulnerability
- No data modification possible

**Examples:**

- SQL injection with UPDATE/DELETE → **High**
- XSS (can inject JavaScript) → **High**
- Command injection → **High**
- CSRF changing profile picture → **Low**
- CSRF changing password → **High**
- Path traversal (read-only) → **None**

---

### Availability Impact (A)

**Question:** Can the attacker deny or degrade service availability?

**Context for threat modeling:** Can attacker make system unavailable to legitimate users?

| Value        | Definition                            | Threat Modeling Guidance                  |
| ------------ | ------------------------------------- | ----------------------------------------- |
| **None (N)** | No availability impact                | Vulnerabilities that don't affect service |
| **Low (L)**  | Performance degradation. Partial DoS. | Slower response times, some requests fail |
| **High (H)** | Complete service denial               | System crash, total unavailability        |

**Numeric values:**

- H = 0.56
- L = 0.22
- N = 0

**Decision criteria:**

Select **High** if:

- Attacker can crash the system
- Can consume all resources (CPU, memory, disk)
- Can make service completely unavailable

Select **Low** if:

- Performance degradation only
- Partial DoS (some requests succeed)
- Resource consumption doesn't crash system

Select **None** if:

- No impact on availability
- Read/write vulnerabilities without DoS component

**Examples:**

- CPU exhaustion attack → **High**
- Memory leak exploit → **High**
- Regex DoS (ReDoS) → **Low** or **High** (depending on impact)
- Slowloris attack → **High**
- SQL injection → **Low** (queries may slow down DB) or **None** (if no perf impact)
- Buffer overflow causing crash → **High**

**Threat modeling tip:** If threat includes "denial of service" or "crash" → Consider High

---

## Complete Assessment Workflow

### Step-by-Step Process

For each threat identified during STRIDE analysis:

**1. Identify the vulnerable component** (from Phase 1 codebase mapping)
**2. Describe the attack** (from Phase 3 threat model)
**3. Assess Exploitability** (4 metrics):

```
AV: How does attacker reach it?
  - Remote → Network
  - LAN → Adjacent
  - Local → Local
  - Physical → Physical

AC: Special conditions required?
  - Works reliably → Low
  - Race condition/timing → High

PR: Authentication needed?
  - No auth → None
  - User account → Low
  - Admin account → High

UI: Victim action required?
  - Server-side → None
  - Phishing/social → Required
```

**4. Assess Scope** (trust boundaries):

```
S: Does exploit escape component?
  - Stays in component → Unchanged
  - Container→Host, VM→Hypervisor, App→OS → Changed
```

**5. Assess Impact** (3 metrics):

```
C: Data disclosure?
  - Full read → High
  - Partial → Low
  - None → None

I: Data modification?
  - Critical data/code → High
  - Non-critical → Low
  - Read-only → None

A: Service disruption?
  - Crash/complete DoS → High
  - Performance hit → Low
  - No impact → None
```

**6. Construct CVSS vector:**

```
CVSS:3.1/AV:{value}/AC:{value}/PR:{value}/UI:{value}/S:{value}/C:{value}/I:{value}/A:{value}
```

**7. Calculate Base Score** using formulas from calculation-formulas.md

---

## Example Assessments

### SQL Injection in Public API

**Threat:** Attacker injects SQL to read customer database

```
AV: Network (API accessible over internet)
AC: Low (standard SQL injection)
PR: None (public API endpoint)
UI: None (attacker sends requests directly)
S: Unchanged (impact limited to database)
C: High (can read entire database)
I: High (can modify/delete data via injection)
A: Low (queries may slow database, not crash it)

Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Base Score: 9.4 (Critical)
```

### XSS in User Profile Page

**Threat:** Stored XSS executes when other users view profile

```
AV: Network (web application)
AC: Low (straightforward XSS injection)
PR: Low (requires user account to edit profile)
UI: Required (victim must view profile page)
S: Unchanged (impact limited to browser/session)
C: Low (can steal victim's session, not all data)
I: Low (can perform actions as victim, limited scope)
A: None (no service disruption)

Vector: CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:N
Base Score: 4.6 (Medium)
```

### Container Escape to Host

**Threat:** Container breakout gains host OS root access

```
AV: Local (must have container access first)
AC: High (complex exploit, not reliable)
PR: Low (container user, not privileged)
UI: None (autonomous exploit)
S: Changed (escapes container to host OS - trust boundary crossing)
C: High (full host filesystem access)
I: High (can modify host)
A: High (can crash host)

Vector: CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:C/C:H/I:H/A:H
Base Score: 7.8 (High)
```

### Privilege Escalation (User → Admin)

**Threat:** Regular user escalates to administrator role

```
AV: Network (exploit via web interface)
AC: Low (logic flaw in role check)
PR: Low (requires user account)
UI: None (direct exploitation)
S: Unchanged (stays within application)
C: High (admin can read all app data)
I: High (admin can modify all app data)
A: Low (can disrupt some features)

Vector: CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L
Base Score: 8.1 (High)
```

---

## Common Pitfalls

### Pitfall 1: Confusing Privileges Required with Impact

**Wrong thinking:** "Attacker becomes admin (High impact) → PR:H"

**Correct thinking:** "Does attacker need admin BEFORE exploiting? → PR value"

PR is about **preconditions**, not consequences.

### Pitfall 2: Scope Changed for All Privilege Escalations

**Wrong:** User→Admin privilege escalation → S:C

**Correct:** User→Admin in same app → S:U (still same application authority)

**Changed only when:** Crossing actual trust boundaries (container→host, VM→hypervisor, app→OS)

### Pitfall 3: High Complexity for "Advanced" Attacks

**Wrong:** "SQL injection requires skill → AC:H"

**Correct:** "Does it work reliably? → AC:L"

AC is about exploit reliability, not attacker sophistication.

### Pitfall 4: Availability for Non-Critical Services

**Wrong:** "Marketing site DoS → A:H because it's down"

**Depends:** If marketing site is business-critical → A:H. If not critical → A:L or A:N.

**Environmental metrics will adjust this** based on business criticality.

---

## Integration with Phase 1 (Architecture)

Use Phase 1 outputs to inform Base metrics:

| Phase 1 Output        | Informs Base Metric                                        |
| --------------------- | ---------------------------------------------------------- |
| entry-points.json     | Attack Vector (network-facing APIs → AV:N)                 |
| trust-boundaries.json | Scope (crossing boundaries → S:C)                          |
| components/\*.json    | Impact assessment (what data does component handle?)       |
| dependencies.json     | Attack Complexity (complex dependency chain → AC may vary) |

---

## References

- CVSS v3.1 Specification sections 2.1, 2.2, 2.3
- NVD CVSS v3 Calculator: https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator
- FIRST.org CVSS v3.1 User Guide: https://www.first.org/cvss/user-guide
