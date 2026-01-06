---
name: mapping-to-cwe
description: Use when tagging security findings with CWE identifiers during capability development - provides taxonomy guidance, decision trees, and lookup tables for Chariot vulnerability types
allowed-tools: Read
---

# Mapping Vulnerabilities to CWE

**Help capability developers select correct CWE (Common Weakness Enumeration) identifiers when tagging security findings.**

> **CWE Version 4.19** (November 2024) contains **944 weaknesses**. This skill covers the subset relevant to Chariot capabilities.

## When to Use

Use this skill when:

- Writing Nebula/Diocletian/Janus capabilities that detect vulnerabilities
- Tagging findings with CWE identifiers
- Unsure which CWE applies to a specific vulnerability type
- Multiple CWEs seem applicable and you need to choose

## Critical Rule: Prefer Base-Level CWEs

**DO NOT use Pillar-level CWEs** (CWE-284, CWE-20, CWE-310) in findings. They are too generic.

| ❌ Avoid (Pillar) | ✅ Use Instead (Base)     | When                         |
| ----------------- | ------------------------- | ---------------------------- |
| CWE-284           | CWE-732, CWE-862, CWE-863 | Access control issues        |
| CWE-20            | CWE-79, CWE-89, CWE-78    | Input validation / injection |
| CWE-310           | CWE-311, CWE-319, CWE-327 | Cryptographic issues         |

---

## Quick Reference

### Cloud Security (AWS/Azure/GCP)

| Vulnerability Pattern               | Primary CWE | Secondary | Notes                          |
| ----------------------------------- | ----------- | --------- | ------------------------------ |
| Public S3 bucket / Storage exposure | CWE-732     | CWE-284   | Permission misconfiguration    |
| Public Azure blob / GCS bucket      | CWE-732     | CWE-668   | Storage container exposed      |
| Overly permissive IAM policy        | CWE-269     | CWE-732   | Improper privilege management  |
| Wildcard IAM policy (`*`)           | CWE-269     | CWE-250   | Excessive privileges           |
| Missing encryption at rest          | CWE-311     | CWE-312   | Data not protected             |
| Missing encryption in transit       | CWE-319     | -         | Cleartext transmission         |
| Exposed secrets in environment      | CWE-798     | CWE-522   | Hardcoded credentials          |
| Security group allows 0.0.0.0/0     | CWE-668     | CWE-284   | Resource exposed to internet   |
| Unencrypted EBS/disk volume         | CWE-311     | -         | Missing encryption             |
| Public RDS/database instance        | CWE-668     | CWE-284   | Database publicly accessible   |
| Missing MFA on root account         | CWE-308     | CWE-287   | Single-factor authentication   |
| CloudTrail logging disabled         | CWE-778     | CWE-223   | Insufficient logging           |
| Default VPC in use                  | CWE-1188    | -         | Insecure default configuration |

### Network Security

| Vulnerability Pattern        | Primary CWE | Secondary | Notes                        |
| ---------------------------- | ----------- | --------- | ---------------------------- |
| Open port with weak protocol | CWE-319     | CWE-326   | Cleartext or weak crypto     |
| SSH with password auth       | CWE-287     | CWE-521   | Weak authentication          |
| Telnet enabled               | CWE-319     | -         | Always cleartext             |
| FTP enabled                  | CWE-319     | CWE-522   | Cleartext credentials        |
| Self-signed certificate      | CWE-295     | -         | Certificate validation issue |
| Expired SSL certificate      | CWE-298     | CWE-295   | Certificate validity         |
| Weak TLS version (< 1.2)     | CWE-326     | CWE-327   | Inadequate encryption        |
| Missing HSTS                 | CWE-319     | CWE-693   | Protocol downgrade risk      |
| Open DNS resolver            | CWE-406     | CWE-400   | Amplification attack         |
| SNMP with default community  | CWE-798     | CWE-287   | Default credentials          |
| RDP exposed to internet      | CWE-668     | CWE-284   | Management plane public      |

### Web Application Security (with 2024 Top 25 Rank)

| Vulnerability Pattern      | Primary CWE | OWASP 2021    | Top 25 Rank |
| -------------------------- | ----------- | ------------- | ----------- |
| Cross-site Scripting (XSS) | CWE-79      | A03 Injection | **#1**      |
| SQL Injection              | CWE-89      | A03 Injection | **#3**      |
| Cross-Site Request Forgery | CWE-352     | A01 Access    | **#4**      |
| Path Traversal             | CWE-22      | A01 Access    | **#5**      |
| OS Command Injection       | CWE-78      | A03 Injection | **#7**      |
| Missing Authorization      | CWE-862     | A01 Access    | **#9**      |
| Unrestricted File Upload   | CWE-434     | A04 Design    | **#10**     |
| Code Injection             | CWE-94      | A03 Injection | **#11**     |
| Improper Authentication    | CWE-287     | A07 Auth      | **#14**     |
| Insecure Deserialization   | CWE-502     | A08 Integrity | **#16**     |
| Information Disclosure     | CWE-200     | A01 Access    | **#17**     |
| Incorrect Authorization    | CWE-863     | A01 Access    | **#18**     |
| SSRF                       | CWE-918     | A10 SSRF      | **#19**     |
| Hard-coded Credentials     | CWE-798     | A07 Auth      | **#22**     |
| Missing Authentication     | CWE-306     | A07 Auth      | **#25**     |
| XXE                        | CWE-611     | A05 Misconfig | -           |
| Open Redirect              | CWE-601     | A01 Access    | -           |

### Secrets and Credentials

| Vulnerability Pattern         | Primary CWE | Secondary | Notes                   |
| ----------------------------- | ----------- | --------- | ----------------------- |
| Hardcoded password            | CWE-798     | CWE-259   | In source code          |
| Hardcoded API key             | CWE-798     | CWE-321   | Embedded key            |
| Hardcoded private key         | CWE-798     | CWE-321   | Crypto key in code      |
| Weak password policy          | CWE-521     | CWE-263   | Password requirements   |
| Plaintext password storage    | CWE-256     | CWE-522   | Unprotected credentials |
| Weak password hash (MD5/SHA1) | CWE-916     | CWE-328   | Insufficient hashing    |
| Exposed .env file             | CWE-538     | CWE-200   | Config exposure         |
| Git history contains secrets  | CWE-798     | CWE-538   | Historical leak         |
| Default credentials in use    | CWE-1188    | CWE-798   | Unchanged defaults      |
| Credentials in URL            | CWE-598     | CWE-200   | Logged in server logs   |

---

## CWE Taxonomy Overview

CWE uses a hierarchical structure (directed acyclic graph). Understanding this helps select the right abstraction level.

### Hierarchy Levels

```
Pillar (most abstract) ─── DO NOT USE for findings
  └── Class ─────────────── Acceptable if no Base available
        └── Base ────────── PREFERRED for capability findings
              └── Variant ─ Use when distinction matters
```

**For capability findings, prefer Base level CWEs.** They're specific enough to be actionable but general enough to be consistent.

### Key Pillars (Avoid These)

| Pillar           | CWE ID  | Use These Children Instead         |
| ---------------- | ------- | ---------------------------------- |
| Access Control   | CWE-284 | CWE-732, CWE-862, CWE-863, CWE-668 |
| Input Validation | CWE-20  | CWE-79, CWE-89, CWE-78, CWE-22     |
| Cryptographic    | CWE-310 | CWE-311, CWE-319, CWE-326, CWE-327 |

**See:** [references/cwe-hierarchy.md](references/cwe-hierarchy.md) for complete taxonomy tree.

---

## Decision Trees

### "Which Access Control CWE?"

```
Is the resource publicly exposed?
├── YES: Are permissions explicitly misconfigured?
│         ├── YES → CWE-732 (Incorrect Permission Assignment)
│         └── NO: Is it exposed to wrong network/sphere?
│                   └── YES → CWE-668 (Exposure to Wrong Sphere)
└── NO: Is authentication present but bypassable?
          ├── YES → CWE-287 (Improper Authentication)
          └── NO: Is authorization check missing?
                    ├── YES → CWE-862 (Missing Authorization)
                    └── NO: Is authorization check wrong?
                              └── YES → CWE-863 (Incorrect Authorization)
```

### "Which Cryptography CWE?"

```
Is data encrypted at all?
├── NO: Is it data at rest?
│        ├── YES → CWE-311 (Missing Encryption of Sensitive Data)
│        └── NO → CWE-319 (Cleartext Transmission)
└── YES: Is the encryption weak?
          ├── Algorithm broken (DES, RC4, MD5) → CWE-327 (Broken Crypto)
          ├── Key too short → CWE-326 (Inadequate Encryption Strength)
          └── Certificate issue → CWE-295 (Improper Certificate Validation)
```

### "Which Credential CWE?"

```
Are credentials embedded in code/config?
├── YES → CWE-798 (Use of Hard-coded Credentials)
│         └── If specifically password → also note CWE-259
└── NO: Are credentials stored insecurely?
          ├── Plaintext → CWE-256 (Plaintext Storage)
          ├── Weak hash → CWE-916 (Insufficient Password Hash)
          └── In URL/logs → CWE-598 (Sensitive Data in GET)
```

**See:** [references/decision-trees.md](references/decision-trees.md) for additional decision trees.

---

## Common Mistakes

### 1. Using Pillar-Level CWEs

**Wrong:** Tagging findings with CWE-284 or CWE-20

These are Pillars - too abstract. CWE-20 appears at #12 in Top 25 because CVEs are mapped too generically.

### 2. Confusing Authentication vs Authorization

| Question           | CWE                             | Example                    |
| ------------------ | ------------------------------- | -------------------------- |
| "Who are you?"     | CWE-287 (Authentication)        | Login bypass               |
| "What can you do?" | CWE-285/862/863 (Authorization) | IDOR, privilege escalation |

### 3. CWE-284 vs CWE-732 vs CWE-668

| CWE     | Meaning                         | Use When                         |
| ------- | ------------------------------- | -------------------------------- |
| CWE-284 | Generic access control (Pillar) | **Avoid** - use children         |
| CWE-732 | Permission misconfiguration     | S3 ACL wrong, file perms wrong   |
| CWE-668 | Resource in wrong sphere        | EC2 in public subnet, DB exposed |

### 4. Deferring to "Team Standard" for Pillar CWEs

**Wrong:** "Lead approved CWE-284, that's our team standard"

Authority doesn't override technical correctness. If a "team standard" uses Pillar-level CWEs:

- Flag it in code review
- Propose the correct Base-level CWE
- Document why the change matters (data quality, SARIF compatibility, downstream analysis)

"We've always done it this way" is not a valid reason to use imprecise CWE tags.

### 5. Missing Secondary CWEs

Many vulnerabilities have multiple applicable CWEs. Document both:

```go
finding := &tabularium.Finding{
    Title:       "Public S3 Bucket Detected",
    Description: "S3 bucket allows public read access",
    CWE:         "CWE-732",  // Primary: Incorrect Permission Assignment
    // Secondary: CWE-284 (Improper Access Control - parent)
}
```

**See:** [references/common-misclassifications.md](references/common-misclassifications.md) for more disambiguation.

---

## Integration with Capability Development

### Nebula/Diocletian Pattern

```go
finding := &tabularium.Finding{
    Title:       "Hardcoded AWS Credentials",
    Description: "AWS access key found in source code",
    CWE:         "CWE-798",  // Primary: Hard-coded Credentials
    // Secondary: CWE-321 (Hard-coded Crypto Key) if it's a secret key
}
```

### Validation Checklist

Before finalizing CWE assignment:

1. ✅ Is this Base level? (Not Pillar like CWE-284, CWE-20)
2. ✅ Does the CWE match root cause, not symptom?
3. ✅ Are secondary CWEs documented?
4. ✅ Would another security professional agree?

---

## Knowledge Gaps

CWE coverage is incomplete for some areas:

| Area                    | Closest CWE      | Notes                             |
| ----------------------- | ---------------- | --------------------------------- |
| Container escape        | CWE-269          | No container-specific CWE         |
| K8s RBAC issues         | CWE-269, CWE-732 | Use privilege/permission CWEs     |
| Default creds unchanged | CWE-1188         | "Insecure Default Initialization" |
| Weak TLS ciphers        | CWE-326          | Fragmented coverage               |

---

## References

| Reference                                                               | Content                       |
| ----------------------------------------------------------------------- | ----------------------------- |
| [cwe-hierarchy.md](references/cwe-hierarchy.md)                         | Complete CWE taxonomy tree    |
| [cwe-by-domain.md](references/cwe-by-domain.md)                         | Domain-specific lookup tables |
| [decision-trees.md](references/decision-trees.md)                       | Extended decision trees       |
| [common-misclassifications.md](references/common-misclassifications.md) | Frequently confused CWE pairs |

## External Sources

- [CWE List v4.19](https://cwe.mitre.org/data/index.html)
- [2024 CWE Top 25](https://cwe.mitre.org/top25/archive/2024/2024_cwe_top25.html)
- [OWASP Top 10:2021](https://owasp.org/Top10/2021/)

---

## Related Skills

| Skill                                  | Purpose                                 |
| -------------------------------------- | --------------------------------------- |
| `mapping-to-mitre-attack`              | Map findings to MITRE ATT&CK techniques |
| `calculating-cvss-vectors`             | Determine CVSS scores for findings      |
| `mapping-to-owasp`                     | Map to OWASP Top 10 categories          |
| `enforcing-go-capability-architecture` | Capability development patterns         |
