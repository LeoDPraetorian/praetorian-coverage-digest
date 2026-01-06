# Complete Tactic Reference with Kill Chain Mapping

**Source:** Research synthesis from MITRE ATT&CK v18.1 (December 2025)

## 14 Tactics Overview

| ID     | Tactic               | Description                        | Common in Chariot            | Kill Chain Phase |
| ------ | -------------------- | ---------------------------------- | ---------------------------- | ---------------- |
| TA0043 | Reconnaissance       | Gather information for planning    | ⚠️ Medium                    | Reconnaissance   |
| TA0042 | Resource Development | Establish resources for operations | ⚠️ Low                       | Weaponization    |
| TA0001 | Initial Access       | Entry point to environment         | ✅ High (exposed services)   | Delivery         |
| TA0002 | Execution            | Running malicious code             | ✅ Medium (injection vulns)  | Exploitation     |
| TA0003 | Persistence          | Maintain foothold                  | ⚠️ Low (detection focus)     | Installation     |
| TA0004 | Privilege Escalation | Gain higher permissions            | ✅ High (misconfigurations)  | Exploitation     |
| TA0005 | Defense Evasion      | Avoid detection                    | ✅ Medium (logging disabled) | Installation     |
| TA0006 | Credential Access    | Steal credentials                  | ✅ Very High (secrets)       | Installation     |
| TA0007 | Discovery            | Understand environment             | ✅ High (reconnaissance)     | C2               |
| TA0008 | Lateral Movement     | Move through network               | ⚠️ Medium                    | C2               |
| TA0009 | Collection           | Gather data of interest            | ✅ High (data exposure)      | Actions          |
| TA0010 | Exfiltration         | Steal data                         | ✅ High (public storage)     | Actions          |
| TA0011 | Command & Control    | Communicate with systems           | ⚠️ Low                       | C2               |
| TA0040 | Impact               | Disrupt operations                 | ⚠️ Low                       | Actions          |

## Detailed Tactic Descriptions

### TA0043: Reconnaissance

**Purpose:** Adversary gathers information to plan future operations.

**Scope:** Technical information gathering about the target organization, infrastructure, personnel.

**Chariot Detection Focus:** Network scanning detections, DNS enumeration, OSINT gathering.

**Key Techniques:**

- T1595: Active Scanning (port scans, vulnerability scans)
- T1590: Gather Victim Network Information
- T1589: Gather Victim Identity Information

**Detection Strategy:** Monitor for unusual network scanning patterns, DNS queries, WHOIS lookups from external IPs.

---

### TA0042: Resource Development

**Purpose:** Adversary establishes resources to support operations (infrastructure, capabilities).

**Scope:** Acquire/develop resources like domains, certificates, tools, exploits.

**Chariot Detection Focus:** Limited (mostly external to target network).

**Key Techniques:**

- T1583: Acquire Infrastructure
- T1588: Obtain Capabilities (malware, exploits)
- T1587: Develop Capabilities

**Detection Strategy:** Monitor certificate transparency logs, malware feeds, exploit databases for indicators.

---

### TA0001: Initial Access

**Purpose:** Adversary gains initial foothold in the target network.

**Scope:** Entry vectors into the environment.

**Chariot Detection Focus:** **Very High** - Most Chariot capabilities detect Initial Access vulnerabilities.

**Key Techniques:**

- T1190: Exploit Public-Facing Application (web app exploits, RCE)
- T1566: Phishing (email-based attacks)
- T1078: Valid Accounts (compromised credentials)
- T1133: External Remote Services (VPN, RDP exposed)

**Chariot Examples:**

- Public S3 bucket → attacker gains initial data access
- Exposed RDP → T1133
- SQL injection → T1190
- Missing authentication → T1078 (default creds)

**Detection Strategy:** WAF logs, authentication failures, exploit attempts in web logs.

---

### TA0002: Execution

**Purpose:** Adversary runs malicious code on victim system.

**Scope:** Code execution techniques (scripts, binaries, commands).

**Chariot Detection Focus:** **Medium** - Injection vulnerabilities enable execution.

**Key Techniques:**

- T1059: Command and Scripting Interpreter (PowerShell, Bash, Python)
- T1203: Exploitation for Client Execution (memory corruption)
- T1047: Windows Management Instrumentation

**Chariot Examples:**

- Command injection vulnerability → T1059
- RCE exploit → T1203
- Deserialization flaw → T1203

**Detection Strategy:** Process creation logs, command-line auditing, script execution monitoring.

---

### TA0003: Persistence

**Purpose:** Adversary maintains presence across reboots, credential changes.

**Scope:** Techniques for maintaining access.

**Chariot Detection Focus:** **Low** - Chariot focuses on vulnerability discovery, not post-exploitation persistence.

**Key Techniques:**

- T1053: Scheduled Task/Job
- T1547: Boot or Logon Autostart Execution
- T1098: Account Manipulation

**Detection Strategy:** Autoruns monitoring, scheduled task creation, registry modifications.

---

### TA0004: Privilege Escalation

**Purpose:** Adversary gains higher-level permissions.

**Scope:** Techniques for elevation from user to admin/root.

**Chariot Detection Focus:** **Very High** - Misconfigurations and privilege escalation vulns are common findings.

**Key Techniques:**

- T1068: Exploitation for Privilege Escalation (kernel exploits)
- T1078: Valid Accounts (with elevated privileges)
- T1548: Abuse Elevation Control Mechanism (sudo, UAC bypass)

**Chariot Examples:**

- IAM policy with `*` permissions → T1078.004
- Container with privileged flag → T1611
- Sudo misconfiguration → T1548

**Detection Strategy:** Privilege escalation attempts, IAM policy changes, sudo logs.

---

### TA0005: Defense Evasion

**Purpose:** Adversary avoids detection by security controls.

**Scope:** Techniques for evading defensive tools and logging.

**Chariot Detection Focus:** **Medium** - Disabled logging/monitoring as findings.

**Key Techniques:**

- T1562: Impair Defenses (disable logging, AV)
- T1070: Indicator Removal (log deletion)
- T1027: Obfuscated Files or Information

**Chariot Examples:**

- CloudTrail disabled → T1562.008
- Security group allows all traffic → enables evasion
- Missing EDR/AV → T1562.001

**Detection Strategy:** Monitor for logging service interruptions, security tool tampering.

---

### TA0006: Credential Access

**Purpose:** Adversary steals credentials (passwords, keys, tokens).

**Scope:** Techniques for credential theft.

**Chariot Detection Focus:** **Very High** - Hardcoded secrets, weak auth are top findings.

**Key Techniques:**

- T1552: Unsecured Credentials (hardcoded, in files)
- T1555: Credentials from Password Stores
- T1110: Brute Force

**Chariot Examples:**

- Hardcoded API key in code → T1552.001
- IMDSv1 enabled → T1552.005
- Exposed .env file → T1552.001
- Weak password policy → enables T1110

**Detection Strategy:** Secrets scanning, failed login attempts, unusual authentication patterns.

---

### TA0007: Discovery

**Purpose:** Adversary explores the environment to understand layout, systems, data.

**Scope:** Reconnaissance post-compromise.

**Chariot Detection Focus:** **High** - Network exposure, open ports enable discovery.

**Key Techniques:**

- T1046: Network Service Discovery (port scanning)
- T1083: File and Directory Discovery
- T1087: Account Discovery

**Chariot Examples:**

- Open port scan → enables T1046
- Path traversal vuln → T1083
- LDAP enumeration exposed → T1087

**Detection Strategy:** Internal network scans, unusual file access patterns, AD queries.

---

### TA0008: Lateral Movement

**Purpose:** Adversary moves through the network to reach additional systems.

**Scope:** Techniques for pivoting across systems.

**Chariot Detection Focus:** **Medium** - Network segmentation issues enable lateral movement.

**Key Techniques:**

- T1021: Remote Services (RDP, SSH, WinRM)
- T1080: Taint Shared Content
- T1091: Replication Through Removable Media

**Chariot Examples:**

- Flat network (no segmentation) → enables all T1021 techniques
- Shared credentials across systems → T1021
- Exposed SSH with weak auth → T1021.004

**Detection Strategy:** Unusual remote login patterns, lateral movement tools, network flow analysis.

---

### TA0009: Collection

**Purpose:** Adversary gathers data of interest prior to exfiltration.

**Scope:** Techniques for identifying and collecting target data.

**Chariot Detection Focus:** **Very High** - Public data exposure is a primary finding type.

**Key Techniques:**

- T1530: Data from Cloud Storage Object (S3, Azure Blob)
- T1213: Data from Information Repositories
- T1005: Data from Local System

**Chariot Examples:**

- Public S3 bucket with sensitive data → T1530
- Public database snapshot → T1530
- Exposed backup files → T1213

**Detection Strategy:** Unusual data access patterns, large file reads, backup access.

---

### TA0010: Exfiltration

**Purpose:** Adversary steals data from the target network.

**Scope:** Techniques for data theft.

**Chariot Detection Focus:** **High** - Public storage enables exfiltration.

**Key Techniques:**

- T1048: Exfiltration Over Alternative Protocol
- T1567: Exfiltration Over Web Service
- T1537: Transfer Data to Cloud Account

**Chariot Examples:**

- Public S3 bucket (no auth) → enables T1530/T1537
- Missing DLP → enables all exfiltration techniques
- Exposed database → data already "exfiltrated" (publicly accessible)

**Detection Strategy:** DLP, unusual network traffic, cloud storage access from external IPs.

---

### TA0011: Command and Control

**Purpose:** Adversary communicates with compromised systems.

**Scope:** Techniques for C2 communication.

**Chariot Detection Focus:** **Low** - Chariot focuses on vulnerabilities, not C2 detection.

**Key Techniques:**

- T1071: Application Layer Protocol (HTTP, DNS)
- T1573: Encrypted Channel
- T1090: Proxy

**Chariot Examples:**

- SSRF vulnerability → can be used for internal C2 (T1090)
- Missing egress filtering → enables C2

**Detection Strategy:** Network IDS, proxy logs, DNS anomalies, beaconing patterns.

---

### TA0040: Impact

**Purpose:** Adversary disrupts, destroys, or manipulates systems/data.

**Scope:** Techniques causing business impact.

**Chariot Detection Focus:** **Low** - Impact is post-exploitation, not vulnerability discovery.

**Key Techniques:**

- T1486: Data Encrypted for Impact (ransomware)
- T1485: Data Destruction
- T1499: Endpoint Denial of Service

**Chariot Examples:**

- Missing backups → increases ransomware impact (T1486)
- No resource limits → enables DoS (T1496, T1499)

**Detection Strategy:** File integrity monitoring, backup monitoring, resource usage spikes.

---

## Tactic Selection Decision Tree

```
What does the vulnerability enable an attacker to do FIRST?

├─ Gain initial foothold in network?
│   └─ TA0001 Initial Access

├─ Execute arbitrary code?
│   └─ TA0002 Execution

├─ Elevate privileges (user → admin)?
│   └─ TA0004 Privilege Escalation

├─ Steal credentials or secrets?
│   └─ TA0006 Credential Access

├─ Access or collect sensitive data?
│   └─ TA0009 Collection

├─ Disable security controls?
│   └─ TA0005 Defense Evasion

├─ Discover internal systems/data?
│   └─ TA0007 Discovery

└─ Other (check full tactic list)
```

## Multi-Tactic Techniques

Some techniques appear in multiple tactics. Map based on **primary adversary goal**:

| Technique                     | Tactics                                                            | When to Use Which                                                                                          |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| T1078 (Valid Accounts)        | Initial Access, Persistence, Privilege Escalation, Defense Evasion | Initial Access if first entry, Persistence if maintaining access, Privilege Escalation if elevated account |
| T1059 (Command Interpreter)   | Execution                                                          | Always Execution (primary goal is code execution)                                                          |
| T1552 (Unsecured Credentials) | Credential Access                                                  | Always Credential Access                                                                                   |

## Common in Chariot Detection

**Very High Priority:**

- TA0001 (Initial Access) - Exposed services, missing auth
- TA0004 (Privilege Escalation) - Misconfigurations, IAM issues
- TA0006 (Credential Access) - Hardcoded secrets, weak auth
- TA0009 (Collection) - Public data exposure
- TA0010 (Exfiltration) - Public storage

**Medium Priority:**

- TA0002 (Execution) - Injection vulnerabilities
- TA0005 (Defense Evasion) - Disabled logging
- TA0007 (Discovery) - Network exposure

**Low Priority (Post-Exploitation):**

- TA0003 (Persistence) - Capability focus is pre-exploitation
- TA0008 (Lateral Movement) - Network-level, not vuln-level
- TA0011 (C2) - Runtime detection, not vuln detection
- TA0040 (Impact) - Post-exploitation phase

## Version Notes

- Tactic structure stable since v14 (2023)
- Cloud matrix uses subset: 10 tactics (excludes TA0003 Persistence, TA0042 Resource Development, TA0043 Reconnaissance, TA0008 Lateral Movement)
- ICS matrix uses 12 tactics (adds ICS-specific: TA0106 Impair Process Control, TA0107 Inhibit Response Function)

## External References

- [MITRE ATT&CK Enterprise Tactics](https://attack.mitre.org/tactics/enterprise/)
- [ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/)
- Research synthesis: `.claude/.output/research/2026-01-06-051018-mitre-attack-framework/SYNTHESIS.md`
