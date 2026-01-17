# CVSS 4.0 Calculation

**Guidance for calculating CVSS 4.0 base metrics for cloud security findings.**

---

## Format

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N
```

**Base metrics only** - no temporal or environmental metrics.

---

## Base Metrics

### Attack Vector (AV)

**How the vulnerability is exploited:**

- **N (Network)**: Exploitable remotely over the internet
  - Example: Public S3 bucket, internet-facing API
- **A (Adjacent)**: Exploitable from adjacent network
  - Example: Same VPC, local network segment
- **L (Local)**: Requires local access to vulnerable system
  - Example: Physical access to server, local shell required
- **P (Physical)**: Requires physical access to device
  - Example: USB drive required, physical console access

**Cloud vulnerabilities are typically Network (N) or Adjacent (A).**

### Attack Complexity (AC)

**Effort required to exploit once attacker reaches vulnerable component:**

- **L (Low)**: No special conditions, straightforward exploitation
  - Example: Unauthenticated S3 bucket read, open security group
- **H (High)**: Requires special conditions, race condition, or sophisticated attack
  - Example: Timing attack, requires specific configuration state

**Most cloud misconfigurations are Low (L).**

### Attack Requirements (AT)

**Preconditions beyond attacker's control that must exist:**

- **N (None)**: No preconditions required
  - Example: Public bucket, no restrictions
- **P (Present)**: Requires preconditions outside attacker's control
  - Example: Requires specific workflow to be running, certain time window

**Most cloud findings are None (N).**

### Privileges Required (PR)

**Level of privileges attacker must possess before exploitation:**

- **N (None)**: No authentication required
  - Example: Public bucket, unauthenticated API
- **L (Low)**: Basic user-level privileges required
  - Example: Authenticated user can escalate, developer can access admin resources
- **H (High)**: Significant privileges required (admin-level)
  - Example: Admin can access other admins' data (still a finding but less severe)

**Privilege escalation findings typically use Low (L).**

### User Interaction (UI)

**Requires action from another user:**

- **N (None)**: No user interaction required
  - Example: Direct exploitation of misconfiguration
- **P (Passive)**: Limited user interaction
  - Example: User browses to malicious site
- **A (Active)**: Requires significant user interaction
  - Example: User must download and execute payload

**Most cloud misconfigurations are None (N).**

### Confidentiality Impact (VC)

**Impact to confidentiality of the vulnerable system:**

- **N (None)**: No confidentiality impact
- **L (Low)**: Some confidentiality impact, access to non-sensitive data
  - Example: Access to public-equivalent data, logs
- **H (High)**: Total confidentiality loss
  - Example: Access to all data on vulnerable system, credentials leaked

### Integrity Impact (VI)

**Impact to integrity of the vulnerable system:**

- **N (None)**: No integrity impact
- **L (Low)**: Limited modification capability
  - Example: Can modify non-critical data
- **H (High)**: Total integrity loss
  - Example: Complete control over system, can modify anything

### Availability Impact (VA)

**Impact to availability of the vulnerable system:**

- **N (None)**: No availability impact
- **L (Low)**: Reduced performance or degraded availability
  - Example: Resource consumption, some denial of service
- **H (High)**: Total availability loss
  - Example: Complete system shutdown possible

### Subsequent System Impact (SC/SI/SA)

**Impact to systems beyond the vulnerable component:**

These metrics describe impact to systems OTHER than the initially vulnerable system.

- **Subsequent Confidentiality (SC)**: Confidentiality impact to other systems
- **Subsequent Integrity (SI)**: Integrity impact to other systems
- **Subsequent Availability (SA)**: Availability impact to other systems

**Values**: N (None), L (Low), H (High) - same as primary impact metrics

**Example**: IAM privilege escalation

- Initial vulnerable system: Developer IAM role
  - VC: N (no data on the role itself)
  - VI: L (can modify role permissions)
  - VA: N (role availability not affected)
- Subsequent systems: Production account resources
  - SC: H (full access to all account data)
  - SI: H (can modify any production resource)
  - SA: H (can delete production infrastructure)

---

## Common Cloud Finding Patterns

### Public S3 Bucket (Read-Only)

- **AV**: N (internet-accessible)
- **AC**: L (straightforward access)
- **AT**: N (no preconditions)
- **PR**: N (no authentication)
- **UI**: N (direct access)
- **VC**: H (all data readable)
- **VI**: N (cannot modify)
- **VA**: N (no availability impact)
- **SC**: N (bucket is the only system)
- **SI**: N
- **SA**: N

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N
```

### Public S3 Bucket (Read-Write)

- **AV**: N (internet-accessible)
- **AC**: L (straightforward access)
- **AT**: N (no preconditions)
- **PR**: N (no authentication)
- **UI**: N (direct access)
- **VC**: H (all data readable)
- **VI**: H (can modify/delete objects)
- **VA**: L (can fill storage, impact billing)
- **SC**: L (downstream services may be affected)
- **SI**: L (modified objects impact other systems)
- **SA**: N

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:L/SC:L/SI:L/SA:N
```

### IAM Privilege Escalation (Compute Takeover)

- **AV**: A (requires initial access to developer workstation)
- **AC**: L (straightforward once inside)
- **AT**: N (no special preconditions)
- **PR**: L (requires developer access)
- **UI**: N (direct exploitation)
- **VC**: N (developer role has no sensitive data itself)
- **VI**: L (can modify role properties)
- **VA**: N (role availability not affected)
- **SC**: H (full access to all account resources)
- **SI**: H (can modify production infrastructure)
- **SA**: H (can delete critical resources)

```
CVSS:4.0/AV:A/AC:L/AT:N/PR:L/UI:N/VC:N/VI:L/VA:N/SC:H/SI:H/SA:H
```

### Overpermissive IAM Policy (No Escalation)

- **AV**: L (requires access to system with the role)
- **AC**: L (straightforward use of permissions)
- **AT**: N (no preconditions)
- **PR**: L (requires authenticated access)
- **UI**: N (direct use)
- **VC**: L (can read some data beyond intended scope)
- **VI**: L (can modify some resources beyond intended scope)
- **VA**: N (no availability impact)
- **SC**: N (no subsequent system impact)
- **SI**: N
- **SA**: N

```
CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N
```

### Lambda Function Code Injection

- **AV**: A (requires network access to management plane)
- **AC**: L (straightforward code update)
- **AT**: N (no preconditions)
- **PR**: L (developer permissions)
- **UI**: N (direct exploitation)
- **VC**: N (Lambda code itself has no data)
- **VI**: H (complete control of function code)
- **VA**: N (function availability not affected)
- **SC**: H (function execution role may have admin access)
- **SI**: H (can modify resources function accesses)
- **SA**: L (can disrupt function processing)

```
CVSS:4.0/AV:A/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N/SC:H/SI:H/SA:L
```

---

## Calculation Tips

1. **Start with Attack Vector**: Determines how attacker reaches the vulnerability
2. **Consider Subsequent Impact**: If exploitation leads to compromise of additional systems, use SC/SI/SA
3. **Privilege Escalation**: Often has low VC/VI/VA but high SC/SI/SA
4. **Data Exposure**: High VC, but may have low VI/VA
5. **Configuration Issues**: Often Low PR (authenticated user) or None PR (public)

---

## External Resources

- [CVSS v4.0 Specification](https://www.first.org/cvss/v4.0/specification-document)
- [CVSS v4.0 Calculator](https://www.first.org/cvss/calculator/4.0)
- [CVSS v4.0 User Guide](https://www.first.org/cvss/v4.0/user-guide)
