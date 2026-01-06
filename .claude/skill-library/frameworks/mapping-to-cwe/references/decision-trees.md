# CWE Decision Trees

**Extended decision trees for selecting the correct CWE in edge cases.**

## Access Control Decision Tree

```
Is the issue about controlling access to a resource?
│
├── YES: Is authentication involved?
│   │
│   ├── YES: Is authentication present at all?
│   │   │
│   │   ├── NO → CWE-306 (Missing Authentication for Critical Function)
│   │   │
│   │   └── YES: Can it be bypassed?
│   │       │
│   │       ├── YES: How?
│   │       │   ├── Spoofing identity → CWE-290 (Authentication Bypass by Spoofing)
│   │       │   ├── Replay attack → CWE-294 (Authentication Bypass by Capture-replay)
│   │       │   ├── Weak credentials → CWE-521 (Weak Password Requirements)
│   │       │   └── Other bypass → CWE-287 (Improper Authentication)
│   │       │
│   │       └── NO: Is MFA enforced?
│   │           ├── NO → CWE-308 (Use of Single-factor Authentication)
│   │           └── YES → Check authorization next
│   │
│   └── NO: Is authorization the issue?
│       │
│       ├── YES: Is authorization present at all?
│       │   │
│       │   ├── NO → CWE-862 (Missing Authorization)
│       │   │
│       │   └── YES: Is authorization correct?
│       │       │
│       │       ├── NO: What's wrong?
│       │       │   ├── Wrong role/privilege → CWE-863 (Incorrect Authorization)
│       │       │   ├── Privilege escalation → CWE-269 (Improper Privilege Management)
│       │       │   └── IDOR → CWE-639 (Authorization Bypass Through User-Controlled Key)
│       │       │
│       │       └── YES → Not an authorization issue
│       │
│       └── NO: Are permissions set correctly on the resource?
│           │
│           ├── NO → CWE-732 (Incorrect Permission Assignment)
│           │
│           └── YES: Is the resource exposed to the wrong sphere?
│               │
│               ├── YES → CWE-668 (Exposure of Resource to Wrong Sphere)
│               │
│               └── NO → CWE-284 (Improper Access Control) - last resort only
```

## Injection Decision Tree

```
Is user input incorporated into a command/query/output?
│
├── YES: What type of interpreter/output?
│   │
│   ├── SQL database
│   │   └── CWE-89 (SQL Injection)
│   │
│   ├── Operating system shell
│   │   ├── Direct shell command → CWE-78 (OS Command Injection)
│   │   └── Application command → CWE-77 (Command Injection)
│   │
│   ├── Web page (HTML/JS)
│   │   ├── Reflected in same request → CWE-79 (XSS)
│   │   │   └── Variant: CWE-80 (Basic XSS - no encoding at all)
│   │   └── Stored for later → CWE-79 (XSS) - same CWE
│   │
│   ├── LDAP query
│   │   └── CWE-90 (LDAP Injection)
│   │
│   ├── XPath query
│   │   └── CWE-91 (XPath Injection)
│   │
│   ├── XML parser
│   │   └── CWE-611 (XXE)
│   │
│   ├── NoSQL database (MongoDB, etc.)
│   │   └── CWE-943 (NoSQL Injection) or CWE-89 (SQL Injection)
│   │
│   ├── Template engine
│   │   └── CWE-94 (Code Injection) or CWE-1336 (Template Injection)
│   │
│   ├── Expression language (EL, OGNL)
│   │   └── CWE-917 (Expression Language Injection)
│   │
│   ├── Code interpreter (eval, exec)
│   │   └── CWE-94 (Code Injection)
│   │
│   └── Format string
│       └── CWE-134 (Format String)
│
└── NO: Not an injection issue
```

## Cryptography Decision Tree

```
Is the issue related to cryptography or encryption?
│
├── YES: Is encryption applied at all?
│   │
│   ├── NO: What kind of data?
│   │   │
│   │   ├── Data at rest → CWE-311 (Missing Encryption of Sensitive Data)
│   │   │   └── Variant: CWE-312 (Cleartext Storage)
│   │   │
│   │   └── Data in transit → CWE-319 (Cleartext Transmission)
│   │
│   └── YES: Is the encryption adequate?
│       │
│       ├── NO: What's the problem?
│       │   │
│       │   ├── Algorithm is broken (MD5, DES, RC4)
│       │   │   └── CWE-327 (Use of Broken/Risky Crypto Algorithm)
│       │   │
│       │   ├── Key is too short
│       │   │   └── CWE-326 (Inadequate Encryption Strength)
│       │   │
│       │   ├── Random values are predictable
│       │   │   └── CWE-330 (Insufficiently Random Values)
│       │   │   └── Variant: CWE-338 (Weak PRNG)
│       │   │
│       │   ├── Hash is reversible
│       │   │   └── CWE-328 (Reversible One-Way Hash)
│       │   │
│       │   └── Implementation flaw
│       │       └── CWE-327 (Broken/Risky Crypto)
│       │
│       └── YES: Is the certificate valid?
│           │
│           ├── NO: What's wrong with the certificate?
│           │   │
│           │   ├── Expired → CWE-298 (Improper Validation of Certificate Expiration)
│           │   │
│           │   ├── Self-signed/untrusted → CWE-295 (Improper Certificate Validation)
│           │   │
│           │   └── Chain invalid → CWE-296 (Improper Following of Chain of Trust)
│           │
│           └── YES → Not a crypto issue
```

## Credential Decision Tree

```
Is the issue about credentials (passwords, keys, tokens)?
│
├── YES: Are credentials embedded in code/config?
│   │
│   ├── YES: What type of credential?
│   │   │
│   │   ├── Password → CWE-798 (Hard-coded Credentials)
│   │   │   └── Variant: CWE-259 (Hard-coded Password)
│   │   │
│   │   ├── API key → CWE-798 (Hard-coded Credentials)
│   │   │   └── Secondary: CWE-321 (Hard-coded Crypto Key)
│   │   │
│   │   ├── Private key → CWE-798 (Hard-coded Credentials)
│   │   │
│   │   └── Connection string → CWE-798 (Hard-coded Credentials)
│   │
│   └── NO: How are credentials stored?
│       │
│       ├── Plaintext → CWE-256 (Unprotected Storage of Credentials)
│       │
│       ├── Weak hash (MD5, SHA1 unsalted)
│       │   └── CWE-916 (Insufficient Password Hash)
│       │
│       ├── Reversible encryption
│       │   └── CWE-261 (Weak Encoding for Password)
│       │
│       └── Properly hashed → Check transmission
│           │
│           ├── Over HTTP → CWE-319 (Cleartext Transmission)
│           │   └── Secondary: CWE-522 (Insufficiently Protected Credentials)
│           │
│           ├── In URL/GET parameter → CWE-598 (Use of GET for Sensitive Data)
│           │
│           └── Properly transmitted → Not a credential issue
```

## Cloud Resource Decision Tree

```
Is this a cloud resource misconfiguration?
│
├── YES: What type of resource?
│   │
│   ├── Storage (S3, Blob, GCS)
│   │   │
│   │   ├── Publicly accessible?
│   │   │   ├── YES → CWE-732 (Incorrect Permission Assignment)
│   │   │   │   └── Secondary: CWE-284 (Improper Access Control)
│   │   │   └── NO → Check encryption
│   │   │
│   │   └── Unencrypted?
│   │       └── YES → CWE-311 (Missing Encryption)
│   │
│   ├── IAM/Identity
│   │   │
│   │   ├── Overly permissive policy?
│   │   │   └── YES → CWE-269 (Improper Privilege Management)
│   │   │
│   │   ├── Missing MFA?
│   │   │   └── YES → CWE-308 (Single-factor Authentication)
│   │   │
│   │   └── Cross-account trust issue?
│   │       └── YES → CWE-284 (Improper Access Control)
│   │
│   ├── Network (Security Group, NACL)
│   │   │
│   │   └── Open to internet (0.0.0.0/0)?
│   │       └── YES → CWE-284 (Improper Access Control)
│   │           └── Secondary: CWE-668 (Exposure to Wrong Sphere)
│   │
│   ├── Database (RDS, etc.)
│   │   │
│   │   ├── Publicly accessible?
│   │   │   └── YES → CWE-668 (Exposure to Wrong Sphere)
│   │   │
│   │   └── Unencrypted?
│   │       └── YES → CWE-311 (Missing Encryption)
│   │
│   └── Logging (CloudTrail, Flow Logs)
│       │
│       └── Disabled?
│           └── YES → CWE-778 (Insufficient Logging)
```

## Quick Reference: Similar CWE Pairs

| If you're considering... | And the issue is...                    | Use                                |
| ------------------------ | -------------------------------------- | ---------------------------------- |
| CWE-284 vs CWE-732       | Permissions wrong on specific resource | CWE-732                            |
| CWE-284 vs CWE-732       | Access control mechanism missing       | CWE-284 (but prefer more specific) |
| CWE-287 vs CWE-285       | Can't verify identity                  | CWE-287                            |
| CWE-287 vs CWE-285       | Identity verified but wrong access     | CWE-285                            |
| CWE-862 vs CWE-863       | No authorization check exists          | CWE-862                            |
| CWE-862 vs CWE-863       | Authorization check is wrong           | CWE-863                            |
| CWE-78 vs CWE-77         | OS shell command                       | CWE-78                             |
| CWE-78 vs CWE-77         | Application-level command              | CWE-77                             |
| CWE-311 vs CWE-319       | Data stored unencrypted                | CWE-311                            |
| CWE-311 vs CWE-319       | Data transmitted unencrypted           | CWE-319                            |
| CWE-798 vs CWE-259       | Any hard-coded credential              | CWE-798                            |
| CWE-798 vs CWE-259       | Specifically password                  | CWE-259 (variant of 798)           |
