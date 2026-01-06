# Common CWE Misclassifications

**Frequently confused CWE pairs with disambiguation guidance.**

## Authentication vs Authorization

### The Core Distinction

| Question               | Domain         | CWEs                      |
| ---------------------- | -------------- | ------------------------- |
| **"Who are you?"**     | Authentication | CWE-287, CWE-306, CWE-308 |
| **"What can you do?"** | Authorization  | CWE-285, CWE-862, CWE-863 |

### CWE-287 (Authentication) vs CWE-285 (Authorization)

| Scenario                                    | Correct CWE | Why                             |
| ------------------------------------------- | ----------- | ------------------------------- |
| No login required to access admin panel     | CWE-306     | Missing authentication entirely |
| Login exists but can be bypassed            | CWE-287     | Authentication is broken        |
| User can login but access other users' data | CWE-285     | Authorization failure           |
| User authenticated but wrong role assigned  | CWE-863     | Incorrect authorization         |
| No permission check on sensitive API        | CWE-862     | Missing authorization           |

**Memory Aid:**

- Authentication = "AuthN" = Identity verification
- Authorization = "AuthZ" = Permission checking

---

## Access Control Hierarchy

### CWE-284 (Pillar) vs Specific Children

**CWE-284 is a PILLAR - never use it directly.** Use these instead:

| Instead of CWE-284 | Use     | When                                   |
| ------------------ | ------- | -------------------------------------- |
| CWE-284            | CWE-732 | File/resource permissions are wrong    |
| CWE-284            | CWE-862 | No authorization check exists          |
| CWE-284            | CWE-863 | Authorization check is incorrect       |
| CWE-284            | CWE-668 | Resource exposed to wrong network/user |
| CWE-284            | CWE-287 | Authentication is the issue            |

**When CWE-284 might be acceptable:** Only if none of the specific children apply AND you cannot determine the specific access control failure type.

### CWE-732 vs CWE-668

| CWE-732                               | CWE-668                              |
| ------------------------------------- | ------------------------------------ |
| **Permissions on resource are wrong** | **Resource exposed to wrong sphere** |
| S3 bucket ACL allows public           | EC2 instance in public subnet        |
| File has world-read permissions       | Database port open to internet       |
| IAM policy too permissive             | Sensitive API on public endpoint     |

**Decision:** If the permission/ACL is explicitly misconfigured → CWE-732. If the resource is architecturally misplaced → CWE-668.

### CWE-862 vs CWE-863

| CWE-862                        | CWE-863                               |
| ------------------------------ | ------------------------------------- |
| **Missing Authorization**      | **Incorrect Authorization**           |
| No permission check exists     | Permission check exists but is wrong  |
| API endpoint has no auth       | API checks role but wrong role        |
| Function doesn't verify caller | Function verifies but logic is flawed |

**Decision:** Does any authorization check exist?

- NO → CWE-862
- YES but wrong → CWE-863

---

## Input Validation Hierarchy

### CWE-20 (Pillar) vs Specific Injection Types

**CWE-20 is a PILLAR - avoid using it.** Despite being #12 in Top 25, it's too generic.

| Instead of CWE-20 | Use     | When                     |
| ----------------- | ------- | ------------------------ |
| CWE-20            | CWE-89  | SQL query manipulation   |
| CWE-20            | CWE-79  | HTML/JS output injection |
| CWE-20            | CWE-78  | OS command injection     |
| CWE-20            | CWE-22  | Path/directory traversal |
| CWE-20            | CWE-611 | XML external entity      |
| CWE-20            | CWE-94  | Code injection/eval      |

### CWE-78 vs CWE-77

| CWE-78                          | CWE-77                        |
| ------------------------------- | ----------------------------- |
| **OS Command Injection**        | **Command Injection**         |
| System shell (bash, cmd.exe)    | Application-level command     |
| `system()`, `exec()`, backticks | App-specific command protocol |
| Direct OS interaction           | Interpreted by application    |

**Decision:** Does the command go to the operating system shell?

- YES → CWE-78
- NO (app-level interpreter) → CWE-77

### CWE-79: XSS Variants

All XSS is CWE-79, but variants exist:

| Variant       | CWE    | Use When                     |
| ------------- | ------ | ---------------------------- |
| Basic XSS     | CWE-80 | No encoding at all           |
| Standard XSS  | CWE-79 | Most XSS cases               |
| Stored XSS    | CWE-79 | Data persisted then rendered |
| Reflected XSS | CWE-79 | Data immediately reflected   |
| DOM XSS       | CWE-79 | Client-side JS manipulation  |

**In practice:** Use CWE-79 for all XSS. Only use CWE-80 if highlighting complete lack of encoding.

---

## Cryptography Confusion

### CWE-311 vs CWE-319

| CWE-311                                  | CWE-319                    |
| ---------------------------------------- | -------------------------- |
| **Missing Encryption of Sensitive Data** | **Cleartext Transmission** |
| Data at rest                             | Data in transit            |
| Unencrypted database                     | HTTP instead of HTTPS      |
| Unencrypted disk                         | FTP, Telnet                |
| Plaintext config file                    | Basic auth over HTTP       |

**Decision:** Where is the data when it's unencrypted?

- Stored → CWE-311
- Moving over network → CWE-319

### CWE-326 vs CWE-327

| CWE-326                            | CWE-327                                  |
| ---------------------------------- | ---------------------------------------- |
| **Inadequate Encryption Strength** | **Broken/Risky Crypto Algorithm**        |
| Key too short (512-bit RSA)        | Algorithm is broken (DES, RC4)           |
| Weak parameters                    | Deprecated algorithm (MD5 for passwords) |
| Insufficient iterations            | Known vulnerabilities                    |

**Decision:** Is the algorithm itself broken, or just configured weakly?

- Algorithm broken → CWE-327
- Algorithm OK but weak config → CWE-326

### CWE-295 Family (Certificates)

| CWE     | Issue                            |
| ------- | -------------------------------- |
| CWE-295 | Certificate not validated at all |
| CWE-296 | Chain of trust not followed      |
| CWE-297 | Hostname mismatch not checked    |
| CWE-298 | Expiration not checked           |
| CWE-299 | Revocation not checked           |

**Default:** Use CWE-295 for general certificate validation issues. Use specific variants when the exact failure is known.

---

## Credential Confusion

### CWE-798 vs CWE-259 vs CWE-321

| CWE     | Scope                                               |
| ------- | --------------------------------------------------- |
| CWE-798 | Any hard-coded credential (passwords, keys, tokens) |
| CWE-259 | Specifically hard-coded passwords                   |
| CWE-321 | Specifically hard-coded cryptographic keys          |

**Recommendation:** Use CWE-798 as primary. It's the Base level that covers all types. CWE-259 and CWE-321 are Variants - use only if the distinction matters for remediation.

### CWE-256 vs CWE-522

| CWE-256                                | CWE-522                                  |
| -------------------------------------- | ---------------------------------------- |
| **Unprotected Storage of Credentials** | **Insufficiently Protected Credentials** |
| Plaintext storage specifically         | Broader - any insufficient protection    |
| Credentials in cleartext file          | Weak encryption, exposed in logs         |

**Decision:** Is the credential stored in literal plaintext?

- YES → CWE-256
- NO but still weak protection → CWE-522

### CWE-916 vs CWE-328

| CWE-916                             | CWE-328                         |
| ----------------------------------- | ------------------------------- |
| **Insufficient Password Hash**      | **Reversible One-Way Hash**     |
| Weak hashing (MD5, low bcrypt cost) | Hash can be reversed            |
| Missing salt                        | Encryption used instead of hash |
| Insufficient iterations             | Rainbow table vulnerable        |

---

## Summary: Most Common Mistakes

| Mistake                        | Why It's Wrong              | Correct Approach                  |
| ------------------------------ | --------------------------- | --------------------------------- |
| Using CWE-284 for everything   | It's a Pillar - too generic | Use CWE-732, 862, 863, 668        |
| Using CWE-20 for injections    | It's a Pillar - too generic | Use CWE-79, 89, 78 specifically   |
| Confusing AuthN and AuthZ      | Different security domains  | 287 = identity, 285 = permissions |
| Using CWE-311 for HTTPS issues | 311 is at-rest encryption   | Use CWE-319 for in-transit        |
| Using only Pillar CWEs         | Loses specificity           | Always prefer Base level          |
| Missing secondary CWEs         | Many vulns have multiple    | Document primary + secondary      |

---

## Quick Disambiguation Table

| If deciding between... | Ask yourself...                          | Choose                             |
| ---------------------- | ---------------------------------------- | ---------------------------------- |
| 287 vs 285             | Is it about identity or permissions?     | 287=identity, 285=permissions      |
| 862 vs 863             | Does any auth check exist?               | 862=none, 863=wrong                |
| 732 vs 668             | Is it ACL/permissions or architecture?   | 732=permissions, 668=placement     |
| 311 vs 319             | Is data stored or transmitted?           | 311=stored, 319=transmitted        |
| 326 vs 327             | Is algorithm broken or just weak config? | 327=broken, 326=weak config        |
| 78 vs 77               | Is it OS shell or app command?           | 78=OS, 77=app                      |
| 798 vs 259             | Does type matter for remediation?        | 798=general, 259=password-specific |
