# Defense Selection Decision Trees

Decision trees for selecting appropriate D3FEND defensive techniques.

---

## Defense Category Selection

### "Which Defense Category Should I Recommend?"

```
What is the primary remediation goal?

├─ Prevent the vulnerability from existing?
│   └─ **Harden** (D3-CH, D3-SH, D3-UA, D3-ECR)
│       Examples: Remove hardcoded credentials, patch software, enforce least privilege

├─ Detect when an attack happens?
│   └─ **Detect** (D3-PSA, D3-NTA, D3-FA, D3-ISVA)
│       Examples: Monitor process creation, analyze network traffic, inspect files

├─ Prevent lateral movement or damage?
│   └─ **Isolate** (D3-NI, D3-EI, D3-ACH)
│       Examples: Network segmentation, sandbox execution, protect auth tokens

├─ Understand the threat before choosing defense?
│   └─ **Model** (D3-TA, D3-OA, D3-SAM)
│       Examples: Threat modeling, software analysis, asset inventory

├─ Distract or mislead attackers?
│   └─ **Deceive** (D3-DT, D3-DTE, D3-DF)
│       Examples: Deploy honeypots, create fake environments

└─ Remove attacker access?
    └─ **Evict** (D3-AR, D3-PE, D3-FE)
        Examples: Disable accounts, kill processes, delete malware
```

---

## Credential Security Decision Tree

### "Which Specific Technique for Credential Security?"

```
Credential vulnerability detected:

Where are credentials stored?

├─ In source code/config files
│   └─ D3-CH (Credential Hardening)
│       Implementation: Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
│       Priority: Critical

├─ In memory/runtime
│   └─ D3-ACH (Authentication Cache Hardening)
│       Implementation: Protected memory regions, token encryption
│       Priority: High

├─ On disk unencrypted
│   └─ D3-ECR (Encrypt at Rest)
│       Implementation: Full disk encryption, encrypted volumes
│       Priority: Critical

└─ Transmitted in cleartext
    └─ D3-EIT (Encrypt in Transit)
        Implementation: TLS/HTTPS enforcement
        Priority: Critical
```

---

## Prevention vs Detection Decision Tree

### "Should I Recommend Prevention or Detection?"

```
Can the vulnerability be prevented?

├─ YES
│   ├─ Is prevention cost-effective?
│   │   ├─ YES → Recommend **Harden** (primary)
│   │   │        + **Detect** (backup)
│   │   │        Example: D3-CH + D3-FA for hardcoded credentials
│   │   │
│   │   └─ NO → Recommend **Detect** only
│   │            Example: D3-NTA for zero-day exploits
│   │
│   └─ Is there residual risk after prevention?
│       ├─ YES → Recommend **Harden** + **Detect** + **Isolate**
│       │        Example: D3-MFAA + D3-UA + D3-ACH for account security
│       │
│       └─ NO → Recommend **Harden** only
│                Example: D3-ECR for data at rest
│
└─ NO (inherent system risk)
    └─ Recommend **Detect** + **Isolate**
        Example: D3-NTA + D3-NI for network-based threats
```

---

## Defense-in-Depth Layering Decision Tree

### "How Many Defensive Layers Do I Need?"

```
What is the criticality of the asset?

├─ Critical (crown jewels, production systems)
│   └─ Recommend 4+ layers:
│       1. Harden (D3-CH, D3-UA, D3-ECR)
│       2. Detect (D3-PSA, D3-NTA, D3-FA)
│       3. Isolate (D3-NI, D3-EI)
│       4. Evict (D3-AR, D3-PE)
│
├─ High (sensitive data, customer-facing)
│   └─ Recommend 3 layers:
│       1. Harden (D3-CH, D3-UA)
│       2. Detect (D3-NTA, D3-FA)
│       3. Isolate (D3-NI)
│
├─ Medium (internal systems)
│   └─ Recommend 2 layers:
│       1. Harden (D3-UA)
│       2. Detect (D3-NTA)
│
└─ Low (development, testing)
    └─ Recommend 1 layer:
        1. Detect (D3-NTA) or Harden (D3-UA)
```

---

## Common Scenario Decision Trees

### Scenario 1: Detected Hardcoded Credentials

```
Hardcoded credentials found in source code:

Step 1: Primary Defense
└─ D3-CH (Credential Hardening)
    Implementation: Remove from code, store in secrets manager
    Priority: Critical

Step 2: Detection Layer
└─ D3-FA (File Analysis)
    Implementation: Automated secret scanning in CI/CD (git-secrets, TruffleHog)
    Priority: High

Step 3: Incident Response
└─ D3-AR (Account Removal) if credentials already leaked
    Implementation: Rotate/revoke compromised credentials
    Priority: Critical
```

### Scenario 2: Public-Facing Web Application

```
Web application exposed to internet:

What type of vulnerability?

├─ SQL Injection
│   ├─ Primary: D3-ISVA (Inbound Session Volume Analysis)
│   │   Implementation: WAF with SQL injection rules
│   └─ Secondary: D3-DA (Data Analysis)
│       Implementation: Database query monitoring
│
├─ XSS
│   ├─ Primary: D3-OCD (Outbound Connection Defense)
│   │   Implementation: Content Security Policy (CSP)
│   └─ Secondary: D3-FA (File Analysis)
│       Implementation: Input validation and sanitization
│
├─ Command Injection
│   ├─ Primary: D3-PSA (Process Spawn Analysis)
│   │   Implementation: Monitor spawned processes from web app
│   └─ Secondary: D3-EI (Execution Isolation)
│       Implementation: Run web app in container with limited privileges
│
└─ SSRF
    ├─ Primary: D3-OTA (Outbound Traffic Analysis)
    │   Implementation: Monitor egress connections from web server
    └─ Secondary: D3-NI (Network Isolation)
        Implementation: Restrict web server network access to required services only
```

### Scenario 3: Cloud Storage Exposure

```
S3 bucket or Azure Blob storage misconfigured:

Step 1: Harden
├─ D3-UA (User Account Permissions)
│   Implementation: Set bucket policy to private, use IAM conditions
│   Priority: Critical
│
└─ D3-ECR (Encrypt at Rest)
    Implementation: Enable default encryption (S3: SSE-S3/SSE-KMS)
    Priority: High

Step 2: Detect
└─ D3-RA (Resource Access Analysis)
    Implementation: Monitor bucket access logs (CloudTrail, Azure Storage Analytics)
    Priority: High

Step 3: Isolate (if breach suspected)
└─ D3-NI (Network Isolation)
    Implementation: Apply VPC endpoint policy, restrict to specific VPCs
    Priority: Medium
```

---

## Prioritization Framework

### Defense Selection Priority

```
For each vulnerability, recommend defenses in this order:

1st Priority: Harden (Prevention)
    ├─ Can we eliminate the vulnerability?
    │   └─ YES → D3-CH, D3-SH, D3-UA, D3-ECR
    │
    └─ NO → Move to 2nd priority

2nd Priority: Detect (Identification)
    ├─ Can we detect exploitation attempts?
    │   └─ YES → D3-PSA, D3-NTA, D3-FA, D3-ISVA
    │
    └─ NO → Move to 3rd priority

3rd Priority: Isolate (Containment)
    ├─ Can we limit blast radius?
    │   └─ YES → D3-NI, D3-EI, D3-ACH
    │
    └─ NO → Accept residual risk or move to 4th priority

4th Priority: Model (Understanding)
    └─ Conduct threat analysis to identify better defenses
        → D3-TA, D3-OA, D3-SAM
```

---

## External Resources

- [D3FEND Knowledge Graph](https://d3fend.mitre.org/ontologies/)
- [ATT&CK to D3FEND Mappings](https://d3fend.mitre.org/offensive-technique/)
