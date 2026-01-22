# CVSS v4.0 Decision Tree

**Step-by-step decision tree for CVSS v4.0 scoring with new metrics.**

## Key Differences from v3.1

1. **New metric:** Attack Requirements (AT)
2. **Impact split:** Vulnerable System (VC/VI/VA) + Subsequent System (SC/SI/SA)
3. **UI enhanced:** None (N), Passive (P), Active (A)
4. **Scope removed:** Replaced by impact split
5. **Supplemental metrics:** Safety, Automatable, Recovery, Value Density, Response Effort, Provider Urgency

---

## Base Metrics Decision Tree

### 1. Attack Vector (AV)

**Same as v3.1:** N (Network), A (Adjacent), L (Local), P (Physical)

See [cvss-v3-decision-tree.md](cvss-v3-decision-tree.md#step-1-attack-vector-av) for detailed guidance.

---

### 2. Attack Complexity (AC)

**Same as v3.1:** L (Low), H (High)

See [cvss-v3-decision-tree.md](cvss-v3-decision-tree.md#step-2-attack-complexity-ac) for detailed guidance.

---

### 3. Attack Requirements (AT) **NEW**

**Question:** Are there specific deployment or execution conditions that must exist?

```
┌─ Does exploitation require a race condition?
│  ├─ YES → AT:P (Present)
│  └─ NO → Continue
│
├─ Must attacker be in specific network position (MITM)?
│  ├─ YES → AT:P (Present)
│  └─ NO → Continue
│
├─ Does exploitation depend on timing windows or specific system state?
│  ├─ YES → AT:P (Present)
│  └─ NO → Continue
│
└─ No special deployment/execution conditions?
   └─ YES → AT:N (None) ← DEFAULT
```

**Examples:**

- **AT:P:** TOCTOU vulnerabilities, network MITM requirements, timing attacks
- **AT:N:** Standard SQL injection, XSS, authentication bypass

**Conservative default:** AT:N (most vulnerabilities)

---

### 4. Privileges Required (PR)

**Same as v3.1:** N (None), L (Low), H (High)

See [cvss-v3-decision-tree.md](cvss-v3-decision-tree.md#step-3-privileges-required-pr) for detailed guidance.

---

### 5. User Interaction (UI) **ENHANCED**

**Question:** What level of user interaction is required?

```
┌─ Can attacker exploit with zero user involvement?
│  ├─ YES → UI:N (None)
│  └─ NO → Continue
│
├─ Does user unknowingly trigger the vulnerability?
│  ├─ YES → UI:P (Passive)
│  │   Examples: Viewing malicious image, automatic background processing
│  └─ NO → Continue
│
└─ Must user deliberately perform an action?
   └─ YES → UI:A (Active)
       Examples: Clicking link, running file, entering credentials
```

**v3.1 Migration:**

- v3.1 UI:N → v4.0 UI:N
- v3.1 UI:R → v4.0 UI:P (if passive) or UI:A (if active)

---

### 6. Vulnerable System Impact (VC/VI/VA)

**Question:** What is the direct impact on the vulnerable system itself?

#### Confidentiality (VC)

```
├─ Total data disclosure from vulnerable system?
│  └─ YES → VC:H
├─ Some data disclosure?
│  └─ YES → VC:L
└─ No data disclosure?
   └─ YES → VC:N
```

#### Integrity (VI)

```
├─ Complete data modification on vulnerable system?
│  └─ YES → VI:H
├─ Partial data modification?
│  └─ YES → VI:L
└─ No modification?
   └─ YES → VI:N
```

#### Availability (VA)

```
├─ Complete service outage on vulnerable system?
│  └─ YES → VA:H
├─ Performance degradation?
│  └─ YES → VA:L
└─ No availability impact?
   └─ YES → VA:N
```

---

### 7. Subsequent System Impact (SC/SI/SA) **NEW**

**Question:** What is the impact on other systems beyond the vulnerable component?

**Key difference from v3.1 Scope:** More granular assessment of downstream impact.

#### Confidentiality (SC)

```
├─ Can attacker access data from OTHER systems?
│  ├─ YES → How much?
│  │   ├─ Total disclosure → SC:H
│  │   └─ Partial disclosure → SC:L
│  └─ NO → SC:N ← DEFAULT
```

#### Integrity (SI)

```
├─ Can attacker modify data on OTHER systems?
│  ├─ YES → How much?
│  │   ├─ Complete modification → SI:H
│  │   └─ Partial modification → SI:L
│  └─ NO → SI:N ← DEFAULT
```

#### Availability (SA)

```
├─ Can attacker disrupt OTHER systems?
│  ├─ YES → How much?
│  │   ├─ Complete outage → SA:H
│  │   └─ Degradation → SA:L
│  └─ NO → SA:N ← DEFAULT
```

**Conservative approach:** Default to N (None) for subsequent systems unless clear downstream impact.

---

## Supplemental Metrics (Optional)

These **do NOT** affect the numeric CVSS score. Use for context only.

### Safety (S)

**Question:** Could exploitation cause physical harm?

- **Not Defined:** No safety implication assessment
- **Present:** Potential for human injury (IEC 61508 scope)

**Use when:** IoT, industrial control systems, medical devices, automotive

---

### Automatable (AU)

**Question:** Can the entire attack be automated without human intervention?

- **No:** Requires human involvement (e.g., social engineering)
- **Yes:** Fully automatable (e.g., automated scanning + exploitation)

**Use when:** Assessing wormable vulnerabilities, automated attack potential

---

### Recovery (R)

**Question:** How easily can the system recover from attack?

- **Not Defined:** No recovery assessment
- **Automatic:** System recovers automatically (reboot, self-healing)
- **User:** Requires manual intervention
- **Irrecoverable:** Permanent damage (hardware destruction, data loss)

**Use when:** Assessing business continuity impact

---

### Value Density (V)

**Question:** Are affected resources concentrated or distributed?

- **Diffuse:** Resources distributed (e.g., individual user data)
- **Concentrated:** High-value concentration (e.g., centralized database)

**Use when:** Assessing data breach impact

---

### Vulnerability Response Effort (RE)

**Question:** How much effort required to remediate?

- **None:** Automated fix available
- **Low:** Simple configuration change
- **Moderate:** Code patch required
- **High:** Major refactoring or replacement

**Use when:** Prioritizing remediation efforts

---

### Provider Urgency (U)

**Question:** What is vendor's urgency assessment?

- **Clear:** No urgency communication from vendor
- **Green:** Routine fix schedule
- **Amber:** Priority fix
- **Red:** Emergency fix required

**Use when:** Vendor provides severity assessment

---

## Complete Example: XSS with Downstream Impact

**Scenario:** XSS in web application that can access data from integrated systems.

### v4.0 Scoring

1. **AV:N** - Remote exploit via web
2. **AC:L** - No special conditions
3. **AT:N** - No timing/positioning required
4. **PR:N** - No authentication needed
5. **UI:A** - User must click malicious link (active interaction)
6. **VC:N** - No direct data from vulnerable page
7. **VI:N** - No modification of vulnerable page data
8. **VA:N** - Vulnerable page remains available
9. **SC:L** - Can access SOME data from integrated systems
10. **SI:L** - Can modify SOME data in integrated systems
11. **SA:N** - No availability impact on integrated systems

**Vector:** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N`
**Score:** 5.4 (MEDIUM)

**Supplemental (optional):**

- **AU:No** - Requires social engineering
- **R:Automatic** - Browser session clears on close

---

## v3.1 vs v4.0 Comparison

| Aspect                | v3.1             | v4.0                                             |
| --------------------- | ---------------- | ------------------------------------------------ |
| **Scope**             | S:U or S:C       | Removed, replaced by VC/VI/VA + SC/SI/SA         |
| **Attack Conditions** | Partially in AC  | Dedicated AT metric                              |
| **User Interaction**  | N or R           | N, P, or A (more granular)                       |
| **Impact Assessment** | Single C/I/A     | Vulnerable (VC/VI/VA) + Subsequent (SC/SI/SA)    |
| **Context**           | Not standardized | Supplemental metrics (Safety, Automatable, etc.) |

---

## Migration Checklist

When migrating from v3.1 to v4.0:

- [ ] Add AT (Attack Requirements) assessment
- [ ] Split impact into Vulnerable vs Subsequent systems
- [ ] Convert UI:R to either UI:P or UI:A
- [ ] Remove Scope (S) metric entirely
- [ ] Consider supplemental metrics if applicable
- [ ] Use v4.0 calculator (scores are NOT equivalent)
- [ ] Document as CVSS-B, CVSS-BT, CVSS-BE, or CVSS-BTE

---

## Resources

- [CVSS v4.0 Specification](https://www.first.org/cvss/v4-0/specification-document)
- [CVSS v4.0 Calculator](https://www.first.org/cvss/calculator/4.0)
- [CVSS v4.0 User Guide](https://www.first.org/cvss/v4-0/user-guide)
