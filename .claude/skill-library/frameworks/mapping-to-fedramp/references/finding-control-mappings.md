# Security Finding to Control Mapping Patterns

**Systematic mapping from vulnerability/finding types to NIST 800-53 controls.**

---

## Mapping Framework

### Core Principle

```
Finding Type → Primary Control → Related Controls → Baseline Validation
```

**Every finding should map to:**
1. **Primary Control**: Main control addressing the finding
2. **Related Controls**: Supporting/adjacent controls
3. **Baseline Validation**: Verify control required for target baseline (Low/Moderate/High)

---

## Common Finding-to-Control Mappings

### Vulnerability Management

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Unpatched vulnerabilities | RA-5 (Vulnerability Monitoring) | SI-2 (Flaw Remediation), CM-3 (Change Control) | ✓ |
| Missing vulnerability scans | RA-5 (Vulnerability Monitoring) | CA-2 (Control Assessment), SI-4 (System Monitoring) | ✓ |
| Delayed patching | SI-2 (Flaw Remediation) | RA-5 (Vulnerability Monitoring), CM-3 (Change Control) | ✓ |

**Framework Pattern:**
```
Detection (RA-5) → Assessment (RA-3) → Remediation (SI-2) → Validation (CA-2)
```

### Encryption and Cryptography

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Weak TLS configuration | SC-8 (Transmission Confidentiality) | SC-13 (Cryptographic Protection), SC-23 (Session Authenticity) | ✓ |
| Unencrypted data transmission | SC-8 (Transmission Confidentiality) | SC-13 (Cryptographic Protection), IA-5 (Authenticator Mgmt) | ✓ |
| Weak cipher suites | SC-13 (Cryptographic Protection) | SC-8 (Transmission Confidentiality), SC-12 (Key Management) | ✓ |
| Insecure key management | SC-12 (Cryptographic Key Management) | SC-13 (Cryptographic Protection), IA-5 (Authenticator Mgmt) | ✓ |
| Missing encryption at rest | SC-28 (Protection of Info at Rest) | MP-5 (Media Transport), MP-6 (Media Sanitization) | ✓ |

### Authentication and Identity

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Weak password policy | IA-5 (Authenticator Management) | AC-7 (Unsuccessful Logon), AU-2 (Audit Events) | ✓ |
| No MFA/2FA | IA-2(1) (Multi-Factor Authentication) | IA-5 (Authenticator Management), AC-7 (Unsuccessful Logon) | Moderate+ |
| Password not changed regularly | IA-5(1) (Password-Based Auth) | IA-5 (Authenticator Management), AC-2 (Account Management) | ✓ |
| Insecure credential storage | IA-5(7) (No Embedded Credentials) | SC-13 (Cryptographic Protection), AC-3 (Access Enforcement) | Moderate+ |
| Account lockout missing | AC-7 (Unsuccessful Logon Attempts) | IA-5 (Authenticator Management), AU-2 (Audit Events) | ✓ |

### Access Control

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Excessive privileges | AC-6 (Least Privilege) | AC-2 (Account Management), AC-3 (Access Enforcement) | ✓ |
| Stale/orphaned accounts | AC-2 (Account Management) | AC-6 (Least Privilege), AU-2 (Audit Events) | ✓ |
| Missing RBAC | AC-3 (Access Enforcement) | AC-2 (Account Management), AC-6 (Least Privilege) | ✓ |
| Shared accounts | AC-2(1) (Automated System Accounts) | IA-2 (Identification/Authentication), AU-2 (Audit Events) | Moderate+ |
| No separation of duties | AC-5 (Separation of Duties) | AC-6 (Least Privilege), AC-3 (Access Enforcement) | Moderate+ |

### Logging and Monitoring

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Insufficient security logging | AU-2 (Event Logging) | AU-6 (Audit Review), SI-4 (System Monitoring) | ✓ |
| Logs not reviewed | AU-6 (Audit Review & Analysis) | AU-2 (Event Logging), IR-5 (Incident Monitoring) | ✓ |
| Missing SIEM/centralized logging | AU-6(1) (Process Integration) | AU-2 (Event Logging), SI-4 (System Monitoring) | Moderate+ |
| Log retention too short | AU-11 (Audit Record Retention) | AU-2 (Event Logging), AU-4 (Audit Storage) | ✓ |
| No log integrity protection | AU-9 (Protection of Audit Information) | AU-10 (Non-repudiation), SC-8 (Transmission Confidentiality) | ✓ |

### Network Security

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Open unnecessary ports | SC-7 (Boundary Protection) | CM-6 (Configuration Settings), CM-7 (Least Functionality) | ✓ |
| Missing firewall rules | SC-7 (Boundary Protection) | AC-4 (Information Flow Enforcement), SC-7(5) (Deny by Default) | ✓ |
| Insecure network segmentation | SC-7(2) (Public Access Protections) | AC-4 (Information Flow Enforcement), SC-7 (Boundary Protection) | Moderate+ |
| No IDS/IPS | SI-4 (System Monitoring) | SC-7 (Boundary Protection), IR-4 (Incident Handling) | Moderate+ |

### Configuration Management

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| Configuration drift | CM-6 (Configuration Settings) | CM-2 (Baseline Configuration), CM-3 (Change Control) | ✓ |
| Insecure default configurations | CM-7 (Least Functionality) | CM-6 (Configuration Settings), SC-7 (Boundary Protection) | ✓ |
| Unauthorized changes | CM-3 (Configuration Change Control) | CM-5 (Access Restrictions), AU-2 (Audit Events) | ✓ |
| Missing configuration baseline | CM-2 (Baseline Configuration) | CM-6 (Configuration Settings), CM-8 (System Component Inventory) | ✓ |

### Incident Response

| Finding Type | Primary Control | Related Controls | All Baselines |
|---|---|---|---|
| No incident response plan | IR-8 (Incident Response Plan) | IR-4 (Incident Handling), IR-6 (Incident Reporting) | ✓ |
| IR plan not tested | IR-3 (Incident Response Testing) | IR-8 (Incident Response Plan), CP-4 (Contingency Plan Testing) | ✓ |
| Missing incident monitoring | IR-5 (Incident Monitoring) | SI-4 (System Monitoring), AU-6 (Audit Review) | Moderate+ |
| Slow incident response | IR-4 (Incident Handling) | IR-6 (Incident Reporting), IR-5 (Incident Monitoring) | ✓ |

---

## Control Family Quick Reference

| Family Code | Family Name | Key Controls | Common Findings |
|---|---|---|---|
| **AC** | Access Control | AC-2, AC-3, AC-6, AC-7 | Excessive privileges, stale accounts, shared accounts |
| **AU** | Audit and Accountability | AU-2, AU-6, AU-9, AU-11 | Insufficient logging, no log review, log integrity |
| **CA** | Assessment and Authorization | CA-2, CA-7, CA-8 | Missing assessments, no continuous monitoring, no pentests |
| **CM** | Configuration Management | CM-2, CM-3, CM-6, CM-7, CM-8 | Config drift, insecure defaults, unauthorized changes |
| **IA** | Identification and Authentication | IA-2, IA-5 | Weak passwords, no MFA, insecure credentials |
| **IR** | Incident Response | IR-3, IR-4, IR-5, IR-6, IR-8 | No IR plan, slow response, missing monitoring |
| **RA** | Risk Assessment | RA-3, RA-5, RA-7 | No risk assessments, missing vuln scans, delayed patching |
| **SC** | System and Communications Protection | SC-7, SC-8, SC-12, SC-13, SC-28 | Weak encryption, network exposure, insecure boundaries |
| **SI** | System and Information Integrity | SI-2, SI-3, SI-4, SI-7 | Unpatched systems, no malware protection, no integrity checks |

---

## Mapping Workflow

### Step 1: Identify Finding Type

Classify the security finding:
- Infrastructure (network, firewall, ports)
- Application (auth, input validation, session management)
- Data Protection (encryption, key management, data retention)
- Operational (logging, monitoring, patching, backups)

### Step 2: Map to Control Family

Use the finding type to identify the relevant control family:

**Infrastructure → SC (Communications), CM (Configuration)**
**Application → AC (Access Control), IA (Identity/Auth)**
**Data Protection → SC (Communications), MP (Media Protection)**
**Operational → AU (Audit), SI (System Integrity), IR (Incident Response)**

### Step 3: Identify Specific Controls

Within the control family, identify the specific control addressing the finding:

**Example**: "Weak TLS configuration on API endpoint"
1. Finding Type: Infrastructure (encryption)
2. Control Family: SC (System and Communications Protection)
3. Specific Controls:
   - Primary: SC-8 (Transmission Confidentiality and Integrity)
   - Related: SC-13 (Cryptographic Protection), IA-5(7) (No Embedded Credentials)

### Step 4: Validate Baseline Applicability

Check if the control is required for the target baseline:
- All baselines: Low, Moderate, High
- Moderate+: Moderate and High only
- High only: High baseline only

### Step 5: Document Mapping

```yaml
finding:
  id: "VULN-2024-001"
  title: "Weak TLS configuration on API endpoint"
  fedramp_controls:
    - control: "SC-8"
      enhancement: null
      description: "Transmission Confidentiality and Integrity"
      role: "primary"
    - control: "SC-13"
      enhancement: null
      description: "Cryptographic Protection"
      role: "related"
  applicable_baselines: ["low", "moderate", "high"]
  implementation_status: "not_implemented"
  requires_poam: true
```

---

## Advanced Patterns

### Multi-Control Findings

Some findings map to multiple controls simultaneously:

**Example**: "Unpatched critical vulnerability with public exploit"
- RA-5 (Vulnerability Monitoring) - Detection
- SI-2 (Flaw Remediation) - Patching
- CM-3 (Configuration Change Control) - Change management
- IR-4 (Incident Handling) - If exploited, triggers IR

**Pattern**: Map to ALL applicable controls, designate one as primary.

### Control Enhancement Mappings

Some findings require specific control enhancements:

**Example**: "No automated vulnerability scanning"
- RA-5 (base): Vulnerability Monitoring
- RA-5(1): Update tool capability (Moderate+)
- RA-5(2): Update vulnerabilities to be scanned (Moderate+)
- RA-5(5): Privileged access (Moderate+)

**Pattern**: Map to base control + applicable enhancements by baseline.

### Inherited vs Implemented Controls

For cloud services:

**Inherited Controls**: Provided by CSP (e.g., physical security - PE family)
**Implemented Controls**: Customer responsibility (e.g., access control - AC family)
**Shared Controls**: Both CSP and customer (e.g., incident response - IR family)

**Pattern**: Only create POA&Ms for controls you're responsible for implementing.

---

## Common Mapping Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Map everything to AC-1 (Access Control Policy) | AC-1 is policy-level, not technical control | Map to specific controls (AC-2, AC-3, AC-6) |
| Ignore control enhancements | Baselines require specific enhancements | Check baseline for required enhancements |
| Map to single control | Most findings affect multiple controls | Identify primary + related controls |
| Map to controls not in target baseline | Wastes effort, not required for authorization | Validate control is in target baseline |
| Create POA&M for inherited controls | Not your responsibility | Only POA&M for controls you implement |

---

## References

- [NIST SP 800-53 Rev 5 Control Catalog](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [RA-5 Control Details](https://csf.tools/reference/nist-sp-800-53/r5/ra/ra-5/)
- [NIST 800-53 Control Families](https://www.cybersaint.io/blog/nist-800-53-control-families)
- [FedRAMP Baseline Spreadsheet](https://www.fedramp.gov/assets/resources/documents/FedRAMP_Security_Controls_Baseline.xlsx)
