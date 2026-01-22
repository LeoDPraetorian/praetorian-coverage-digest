# CVSS v3.1 Vector Metrics Reference

**Complete guidance for all 8 Base Metrics in CVSS v3.1.**

## Vector String Format

```
CVSS:3.1/AV:{N|A|L|P}/AC:{L|H}/PR:{N|L|H}/UI:{N|R}/S:{U|C}/C:{N|L|H}/I:{N|L|H}/A:{N|L|H}
```

**Example:**

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N
```

---

## 1. Attack Vector (AV) - Where Attacker Exploits From

**Definition:** The context from which vulnerability exploitation is possible.

### Values

| Value | Name     | Description                                                  | Score Impact |
| ----- | -------- | ------------------------------------------------------------ | ------------ |
| **N** | Network  | Remotely exploitable over network (Internet, WAN, LAN)       | Worst        |
| **A** | Adjacent | Logically adjacent network (same broadcast/collision domain) | High         |
| **L** | Local    | Requires local access (logged in) or local network proximity | Medium       |
| **P** | Physical | Requires physical access to the vulnerable component         | Low          |

### Detailed Criteria

#### AV:N (Network)

- Vulnerable component is network-accessible
- Attacker can be anywhere (Internet, WAN, or LAN)
- No physical proximity required
- **Examples:** Web application vulnerabilities, remotely exploitable services

#### AV:A (Adjacent)

- Attack limited to same physical or logical network
- Requires attacker to be on same subnet, VLAN, Bluetooth range, or local wireless
- **Examples:** ARP spoofing, Bluetooth vulnerabilities, local network MITM

#### AV:L (Local)

- Requires local system access OR relies on User Interaction
- Attacker must be logged in locally or have local network access
- **Examples:** Privilege escalation requiring shell access, local malware execution

#### AV:P (Physical)

- Requires physical contact or manipulation
- **Examples:** DMA attacks, cold boot attacks, hardware implants

### Common Questions

**Q:** Is a vulnerability that requires VPN access considered Network (N) or Adjacent (A)?
**A:** Network (N) - VPN is just a network connection method.

**Q:** If an attack requires the user to download and run a file, is that Local (L)?
**A:** Yes, if the exploit requires local execution.

---

## 2. Attack Complexity (AC) - Exploitation Difficulty

**Definition:** Conditions beyond attacker's control that must exist for successful exploitation.

**CRITICAL:** This excludes User Interaction (captured separately in UI metric).

### Values

| Value | Name | Description                                         | Score Impact |
| ----- | ---- | --------------------------------------------------- | ------------ |
| **L** | Low  | No special conditions, reliable exploitation        | Worst        |
| **H** | High | Requires timing, race conditions, or specific setup | Better       |

### Detailed Criteria

#### AC:L (Low)

- No special access conditions required
- Attacker can repeatedly and reliably exploit
- No information gathering needed
- **Examples:** SQL injection without special setup, unauthenticated API access

#### AC:H (High)

- Requires measurable effort beyond User Interaction
- May require: timing windows, race conditions, specific configurations, brute-force attempts, information gathering
- Success is not guaranteed on first attempt
- **Examples:** Time-of-check-to-time-of-use (TOCTOU) race conditions, vulnerabilities requiring specific browser versions

### Conservative Guidance

**Default to AC:H when:**

- Multiple steps required (phishing + MFA bypass)
- Requires specific environmental conditions
- Exploitation depends on timing or race conditions
- Requires information gathering about target

**Use AC:L only when:**

- Single-step exploitation
- Reliable exploitation in all scenarios
- No special conditions needed

---

## 3. Privileges Required (PR) - Authentication Level

**Definition:** Level of privileges attacker must possess before exploiting.

### Values

| Value | Name | Description                           | Score Impact |
| ----- | ---- | ------------------------------------- | ------------ |
| **N** | None | Unauthenticated exploitation          | Worst        |
| **L** | Low  | Basic user privileges required        | Medium       |
| **H** | High | Admin or elevated privileges required | Better       |

### Detailed Criteria

#### PR:N (None)

- Attacker is unauthorized/unauthenticated
- No credentials or access required
- **Examples:** Public-facing vulnerability, unauthenticated API endpoints

#### PR:L (Low)

- Basic user-level capabilities required
- Standard user account with limited privileges
- Can only affect user-owned resources
- **Examples:** Authenticated user API vulnerabilities, IDOR within user scope

#### PR:H (High)

- Administrative or elevated control required
- Can affect system-wide settings and files
- **Examples:** Admin panel vulnerabilities, service account exploits

### Scope Modifier

**PR values change based on Scope (S) value:**

| PR Value | S:U (Unchanged) Impact | S:C (Changed) Impact |
| -------- | ---------------------- | -------------------- |
| N        | 0.85                   | 0.85                 |
| L        | 0.62                   | 0.68                 |
| H        | 0.27                   | 0.50                 |

---

## 4. User Interaction (UI) - Victim Action Required

**Definition:** Whether exploitation requires a non-attacker user to perform an action.

### Values

| Value | Name     | Description             | Score Impact |
| ----- | -------- | ----------------------- | ------------ |
| **N** | None     | No user action required | Worst        |
| **R** | Required | Victim must take action | Better       |

### Detailed Criteria

#### UI:N (None)

- Attacker can exploit without any user participation
- No victim interaction needed
- **Examples:** Automated scanning, background exploitation

#### UI:R (Required)

- Victim must perform an action for successful exploit
- Includes: clicking links, opening files, entering credentials, approving prompts
- **Examples:** Phishing, social engineering, drive-by downloads requiring click

### Conservative Guidance

**Use UI:R when:**

- Phishing or social engineering involved
- Victim must click, open, or approve anything
- Any human interaction required beyond attacker's control

**Use UI:N only when:**

- Completely automated exploitation
- No victim participation needed
- Background exploitation possible

---

## 5. Scope (S) - Security Boundary Crossing

**Definition:** Whether vulnerability can affect resources beyond its security authority.

**THIS IS THE #1 INFLATION SOURCE - Use conservatively.**

### Values

| Value | Name      | Description                             | Score Impact |
| ----- | --------- | --------------------------------------- | ------------ |
| **U** | Unchanged | Impact confined to vulnerable component | Better       |
| **C** | Changed   | Impact extends beyond security boundary | Worst        |

### Detailed Criteria

#### S:U (Unchanged)

- Impact limited to same security authority managing vulnerable component
- Resources affected are under same control
- **Examples:** Single user account compromise, isolated service disruption

#### S:C (Changed)

- Impact extends beyond vulnerable component's security authority
- Crosses security boundaries
- **Examples:** Container escape, VM breakout, cross-tenant data access, SAML assertion forgery

### Conservative Guidance

**Use S:C ONLY when:**

- ✅ Container escape to host
- ✅ VM breakout to hypervisor
- ✅ Cross-tenant data access in multi-tenant system
- ✅ Complete IdP compromise with assertion forgery
- ✅ Privilege escalation crossing security boundaries

**Use S:U when:**

- ❌ Weak configuration (not complete compromise)
- ❌ Impact limited to vulnerable component itself
- ❌ Single user/account compromise
- ❌ "Downstream impact" without boundary crossing

**Impact on score:** S:C typically adds 1.0-2.0 points to base score.

---

## 6. Confidentiality Impact (C) - Data Disclosure

**Definition:** Impact to confidentiality of information managed by component.

### Values

| Value | Name | Description                                  | Score Impact |
| ----- | ---- | -------------------------------------------- | ------------ |
| **H** | High | Total confidentiality loss, all data exposed | Worst        |
| **L** | Low  | Some information disclosure                  | Medium       |
| **N** | None | No confidentiality impact                    | None         |

### Detailed Criteria

#### C:H (High)

- **Total loss of confidentiality**
- All resources within impacted component divulged to attacker
- Attacker has complete read access
- **Examples:** Database dump, credential theft with full access

#### C:L (Low)

- Some information disclosure
- Access to some restricted information
- Attacker does not have full read access
- **Examples:** Limited file access, partial data exposure

#### C:N (None)

- No confidentiality loss
- **Examples:** Write-only vulnerability, availability-only impact

### Conservative Guidance

**Use C:H only when:**

- Complete data disclosure possible
- \>1000 records exposed
- All data accessible without restrictions

**Use C:L when:**

- Limited disclosure
- <100 records exposed
- Requires additional exploitation steps

**Use C:N when:**

- No data exposure
- Write-only or availability-only impact

---

## 7. Integrity Impact (I) - Data Modification

**Definition:** Impact to trustworthiness and veracity of information.

### Values

| Value | Name | Description                                        | Score Impact |
| ----- | ---- | -------------------------------------------------- | ------------ |
| **H** | High | Total integrity loss, attacker can modify anything | Worst        |
| **L** | Low  | Partial data modification possible                 | Medium       |
| **N** | None | No integrity impact                                | None         |

### Detailed Criteria

#### I:H (High)

- **Total loss of integrity**
- Attacker can modify any/all files
- Complete loss of protection
- Serious impact on component
- **Examples:** Administrative access, unrestricted file modification

#### I:L (Low)

- Modification of data possible
- Attacker does not control consequence of modification
- Limited impact
- **Examples:** Partial file modification, non-critical settings change

#### I:N (None)

- No integrity loss
- **Examples:** Read-only vulnerability, information disclosure only

### Conservative Guidance

**Use I:H only when:**

- Complete data modification possible
- Critical system settings modifiable
- Unrestricted write access

**Use I:L when:**

- Partial modification possible
- Non-critical settings only
- Limited write access

**Use I:N when:**

- No modification possible
- Read-only access only

---

## 8. Availability Impact (A) - Service Disruption

**Definition:** Impact to availability of impacted component.

### Values

| Value | Name | Description                                       | Score Impact |
| ----- | ---- | ------------------------------------------------- | ------------ |
| **H** | High | Total availability loss, complete DoS             | Worst        |
| **L** | Low  | Reduced performance or intermittent interruptions | Medium       |
| **N** | None | No availability impact                            | None         |

### Detailed Criteria

#### A:H (High)

- **Total loss of availability**
- Attacker can fully deny access to resources
- Complete service outage
- **Examples:** DoS attacks, resource exhaustion, crash

#### A:L (Low)

- Performance degradation
- Intermittent resource availability interruptions
- Partial disruption
- **Examples:** Slowdown, temporary service degradation

#### A:N (None)

- No availability impact
- **Examples:** Information disclosure, data modification without disruption

### Conservative Guidance

**Most vulnerabilities should be A:N.**

Use A:H only for complete service outage.
Use A:L for performance degradation.

---

## Quick Reference Table

| Metric | Worst Case  | Moderate | Best Case     | Conservative Default  |
| ------ | ----------- | -------- | ------------- | --------------------- |
| AV     | N (Network) | A/L      | P (Physical)  | N (if remote)         |
| AC     | L (Low)     | -        | H (High)      | **H** (if multi-step) |
| PR     | N (None)    | L (Low)  | H (High)      | N (if unauth)         |
| UI     | N (None)    | -        | R (Required)  | **R** (if social eng) |
| S      | C (Changed) | -        | U (Unchanged) | **U** (default)       |
| C      | H (High)    | L (Low)  | N (None)      | **L** (unless proven) |
| I      | H (High)    | L (Low)  | N (None)      | **L** (unless proven) |
| A      | H (High)    | L (Low)  | N (None)      | **N** (most common)   |

---

## Sources

- [CVSS v3.1 Specification Document](https://www.first.org/cvss/v3-1/specification-document)
- [CVSS v3.1 Calculator](https://www.first.org/cvss/calculator/3.1)
- [CVSS v3.1 User Guide](https://www.first.org/cvss/v3-1/user-guide)
