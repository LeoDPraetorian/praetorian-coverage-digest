# CVSS v3.1 Decision Tree

**Step-by-step interactive decision tree for scoring vulnerabilities using CVSS v3.1.**

## Overview

This decision tree guides you through each metric with:
- Clear questions to ask
- Decision points with criteria
- When to use AskUserQuestion for clarification
- Conservative defaults when uncertain

---

## Step 1: Attack Vector (AV)

**Question:** From where can the attacker exploit this vulnerability?

```
┌─ Can the attacker exploit remotely over a network?
│  ├─ YES → AV:N (Network)
│  │   Examples: Web app vulnerabilities, remote service exploits
│  └─ NO → Continue
│
├─ Must attacker be on the same physical/logical network?
│  ├─ YES → AV:A (Adjacent)
│  │   Examples: ARP spoofing, Bluetooth attacks
│  └─ NO → Continue
│
├─ Must attacker have local access (logged in or local network)?
│  ├─ YES → AV:L (Local)
│  │   Examples: Privilege escalation, local malware
│  └─ NO → Continue
│
└─ Requires physical access to the device?
   └─ YES → AV:P (Physical)
       Examples: DMA attacks, hardware manipulation
```

**AskUserQuestion Template:**

```javascript
{
  question: "From where can the attacker exploit this vulnerability?",
  header: "Attack Vector",
  options: [
    {
      label: "Network (AV:N) - Remotely via Internet/WAN/LAN",
      description: "Attacker can exploit from anywhere on the network"
    },
    {
      label: "Adjacent (AV:A) - Same physical/logical network",
      description: "Requires attacker on same subnet, VLAN, or Bluetooth range"
    },
    {
      label: "Local (AV:L) - Local access required",
      description: "Requires local system access or local network proximity"
    },
    {
      label: "Physical (AV:P) - Physical access required",
      description: "Requires physical contact with the device"
    }
  ]
}
```

---

## Step 2: Attack Complexity (AC)

**Question:** Are there special conditions or preparation required for successful exploitation?

**Conservative Approach:** Default to **AC:H** when uncertain.

```
┌─ Can attacker reliably exploit in all scenarios with no preparation?
│  ├─ YES → Continue to next check
│  └─ NO → AC:H (High)
│      Requires: timing, race conditions, specific configs, info gathering
│
├─ Is public exploit code available that works without modification?
│  ├─ YES → Continue to next check
│  └─ NO → AC:H (High)
│
├─ Does exploitation require multiple steps or preconditions?
│  ├─ YES → AC:H (High)
│  │   Examples: Phishing + MFA bypass, timing attacks, race conditions
│  └─ NO → Continue
│
└─ No special conditions, reliable single-step exploitation?
   └─ YES → AC:L (Low)
       Examples: Simple SQL injection, unauthenticated API access
```

**AskUserQuestion Template:**

```javascript
{
  question: "Does successful exploitation require special conditions beyond user interaction?",
  header: "Complexity",
  options: [
    {
      label: "Low (AC:L) - No special conditions (Rare)",
      description: "Attacker can reliably exploit without preparation, timing, or specific setup"
    },
    {
      label: "High (AC:H) - Requires preparation (Recommended default)",
      description: "Requires timing, race conditions, information gathering, or multiple steps"
    }
  ]
}
```

---

## Step 3: Privileges Required (PR)

**Question:** What level of authentication/privileges does the attacker need before exploiting?

```
┌─ Can attacker exploit without any authentication?
│  ├─ YES → PR:N (None)
│  │   Examples: Public-facing vulnerabilities, unauthenticated API
│  └─ NO → Continue
│
├─ Does attacker need basic user-level privileges?
│  ├─ YES → PR:L (Low)
│  │   Examples: Authenticated user exploits, IDOR within user scope
│  └─ NO → Continue
│
└─ Does attacker need administrative/elevated privileges?
   └─ YES → PR:H (High)
       Examples: Admin panel vulnerabilities, service account exploits
```

**AskUserQuestion Template:**

```javascript
{
  question: "What level of privileges must the attacker have before exploiting?",
  header: "Privileges",
  options: [
    {
      label: "None (PR:N) - Unauthenticated",
      description: "No authentication required, attacker is unauthorized"
    },
    {
      label: "Low (PR:L) - Basic user account",
      description: "Requires standard user credentials with limited privileges"
    },
    {
      label: "High (PR:H) - Admin/elevated privileges",
      description: "Requires administrative control or elevated permissions"
    }
  ]
}
```

---

## Step 4: User Interaction (UI)

**Question:** Must a non-attacker user perform an action for the exploit to succeed?

**Conservative Approach:** Default to **UI:R** when social engineering is involved.

```
┌─ Does exploitation require social engineering or phishing?
│  ├─ YES → UI:R (Required)
│  │   Examples: Phishing, malicious links, drive-by downloads
│  └─ NO → Continue
│
├─ Must victim click, open, approve, or enter anything?
│  ├─ YES → UI:R (Required)
│  └─ NO → Continue
│
└─ Can attacker exploit completely in the background?
   └─ YES → UI:N (None)
       Examples: Automated exploitation, background attacks
```

**AskUserQuestion Template:**

```javascript
{
  question: "Does successful exploitation require a victim to take any action?",
  header: "Interaction",
  options: [
    {
      label: "None (UI:N) - No user action needed",
      description: "Attacker can exploit in the background without victim participation"
    },
    {
      label: "Required (UI:R) - Victim must act (Recommended if uncertain)",
      description: "Victim must click, open, approve, or enter something"
    }
  ]
}
```

---

## Step 5: Scope (S) **CRITICAL - #1 Inflation Source**

**Question:** Does exploitation allow the attacker to cross a security boundary?

**Conservative Approach:** Default to **S:U** unless you can prove boundary crossing.

```
┌─ Does vulnerability allow container escape to host?
│  ├─ YES → S:C (Changed)
│  └─ NO → Continue
│
├─ Does vulnerability allow VM breakout to hypervisor?
│  ├─ YES → S:C (Changed)
│  └─ NO → Continue
│
├─ Does vulnerability allow cross-tenant data access?
│  ├─ YES → S:C (Changed)
│  └─ NO → Continue
│
├─ Does vulnerability enable SAML assertion forgery or complete IdP compromise?
│  ├─ YES → S:C (Changed)
│  └─ NO → Continue
│
└─ Impact limited to the vulnerable component itself?
   └─ YES → S:U (Unchanged) ← DEFAULT
       Examples: Single account compromise, isolated service disruption
```

**Common Mistakes:**

❌ **WRONG:** "Compromising IdP affects all apps" → S:C
✅ **RIGHT:** "Single account compromised, IdP itself intact" → S:U

❌ **WRONG:** "Downstream impact on other systems" → S:C
✅ **RIGHT:** "Does it cross a security boundary?" → Usually S:U

**AskUserQuestion Template:**

```javascript
{
  question: "Does this vulnerability allow crossing a security boundary?",
  header: "Scope",
  options: [
    {
      label: "Unchanged (S:U) - Impact limited to component (Recommended default)",
      description: "Single account/service affected, no security boundary crossing"
    },
    {
      label: "Changed (S:C) - Crosses security boundary (Rare)",
      description: "Container escape, VM breakout, cross-tenant access, or SAML forgery"
    }
  ]
}
```

---

## Step 6: Confidentiality Impact (C)

**Question:** How much data can the attacker read or access?

**Conservative Approach:** Default to **C:L** unless complete disclosure proven.

```
┌─ Can attacker access ALL data in the component?
│  ├─ YES → Check data volume
│  │   ├─ >1000 records exposed → C:H (High)
│  │   └─ <1000 records → C:L (Low)
│  └─ NO → Continue
│
├─ Can attacker access SOME restricted information?
│  ├─ YES → Check data volume
│  │   ├─ >100 records exposed → C:L (Low)
│  │   └─ <100 records → C:L (Low) or C:N (if trivial)
│  └─ NO → Continue
│
└─ No data exposure at all?
   └─ YES → C:N (None)
       Examples: Write-only vulnerability, availability-only impact
```

**AskUserQuestion Template:**

```javascript
{
  question: "How much data can the attacker read or access?",
  header: "Confidentiality",
  options: [
    {
      label: "High (C:H) - Complete data disclosure",
      description: "All data accessible, >1000 records exposed, full read access"
    },
    {
      label: "Low (C:L) - Limited disclosure (Recommended default)",
      description: "Some data accessible, <100 records, partial read access"
    },
    {
      label: "None (C:N) - No data exposure",
      description: "Write-only or availability-only impact"
    }
  ]
}
```

---

## Step 7: Integrity Impact (I)

**Question:** How much data can the attacker modify or delete?

**Conservative Approach:** Default to **I:L** unless complete modification proven.

```
┌─ Can attacker modify ANY/ALL files or settings?
│  ├─ YES → Are they critical system settings?
│  │   ├─ YES → I:H (High)
│  │   └─ NO → I:L (Low)
│  └─ NO → Continue
│
├─ Can attacker modify SOME data?
│  ├─ YES → Are modifications critical?
│  │   ├─ YES → I:H (High)
│  │   └─ NO → I:L (Low) ← MOST COMMON
│  └─ NO → Continue
│
└─ No modification possible?
   └─ YES → I:N (None)
       Examples: Read-only vulnerability, information disclosure only
```

**AskUserQuestion Template:**

```javascript
{
  question: "How much data can the attacker modify or delete?",
  header: "Integrity",
  options: [
    {
      label: "High (I:H) - Complete data modification",
      description: "Attacker can modify any/all files or critical system settings"
    },
    {
      label: "Low (I:L) - Partial modification (Recommended default)",
      description: "Limited modification, non-critical settings, partial write access"
    },
    {
      label: "None (I:N) - No modification possible",
      description: "Read-only vulnerability"
    }
  ]
}
```

---

## Step 8: Availability Impact (A)

**Question:** Can the attacker disrupt service availability?

**Conservative Approach:** Default to **A:N** for most vulnerabilities.

```
┌─ Can attacker cause complete service outage?
│  ├─ YES → A:H (High)
│  │   Examples: DoS, resource exhaustion, crash
│  └─ NO → Continue
│
├─ Can attacker cause performance degradation?
│  ├─ YES → A:L (Low)
│  │   Examples: Slowdown, temporary disruption
│  └─ NO → Continue
│
└─ No availability impact?
   └─ YES → A:N (None) ← MOST COMMON
       Examples: Information disclosure, data modification without disruption
```

**AskUserQuestion Template:**

```javascript
{
  question: "Can the attacker disrupt service availability?",
  header: "Availability",
  options: [
    {
      label: "High (A:H) - Complete service outage",
      description: "Total DoS, resource exhaustion, system crash"
    },
    {
      label: "Low (A:L) - Performance degradation",
      description: "Slowdown, temporary disruption, reduced performance"
    },
    {
      label: "None (A:N) - No availability impact (Most common)",
      description: "Service remains available"
    }
  ]
}
```

---

## Step 9: Calculate and Validate

1. **Build vector string:**
   ```
   CVSS:3.1/AV:{value}/AC:{value}/PR:{value}/UI:{value}/S:{value}/C:{value}/I:{value}/A:{value}
   ```

2. **Use official calculator:**
   https://www.first.org/cvss/calculator/3.1

3. **Validate result:**
   - Does score match your intuition?
   - Are assumptions documented?
   - Would a security expert agree?
   - Is this defensible in a report?

4. **Review inflation checklist:**
   - [ ] Did you assume S:C without boundary crossing?
   - [ ] Did you use C:H/I:H without justification?
   - [ ] Did you set AC:L when multiple steps required?
   - [ ] Did you use UI:N when social engineering involved?

---

## Complete Example: Weak MFA Policy

**Scenario:** Weak MFA policy allows SMS/Voice factors (default "Any two factors").

### Decision Tree Walkthrough

1. **Attack Vector:** Remote phishing → AV:N
2. **Attack Complexity:** Requires phishing + MFA bypass → AC:H (multiple steps)
3. **Privileges Required:** No auth to send phish → PR:N
4. **User Interaction:** Victim must enter credentials → UI:R
5. **Scope:** Single account compromised, IdP intact → S:U
6. **Confidentiality:** Access to user's data → C:H (full user access)
7. **Integrity:** Can modify user's data → I:L (limited to user permissions)
8. **Availability:** No service disruption → A:N

**Vector:** `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N`
**Score:** 5.9 (MEDIUM)

**Justification:**
- AC:H because requires successful phishing AND MFA bypass
- S:U because impact limited to single account, not IdP compromise
- C:H because attacker gains full access to user's data
- I:L because modifications limited to user's permissions

---

## Quick Decision Checklist

Use this for rapid scoring:

1. **Remote exploit?** → AV:N (else A/L/P)
2. **Multiple steps or conditions?** → AC:H (else L)
3. **No authentication needed?** → PR:N (else L/H)
4. **Social engineering required?** → UI:R (else N)
5. **Crosses security boundary?** → S:C (else U - **default to U**)
6. **Complete data access?** → C:H (else L/N - **default to L**)
7. **Complete data modification?** → I:H (else L/N - **default to L**)
8. **Service outage?** → A:H (else L/N - **default to N**)

---

## Sources

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3-1/specification-document)
- [CVSS v3.1 Calculator](https://www.first.org/cvss/calculator/3.1)
- [CVSS v3.1 User Guide](https://www.first.org/cvss/v3-1/user-guide)
