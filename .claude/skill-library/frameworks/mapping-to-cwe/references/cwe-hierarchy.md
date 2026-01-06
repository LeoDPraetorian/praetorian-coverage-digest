# CWE Hierarchy Reference

**Complete CWE taxonomy structure for Chariot-relevant domains.**

## Abstraction Levels

CWE organizes weaknesses in a directed acyclic graph (DAG) with four abstraction levels:

```
┌─────────────────────────────────────────────────────────────┐
│                     PILLAR (Most Abstract)                  │
│  High-level groupings - DO NOT USE for findings             │
│  Examples: CWE-284, CWE-20, CWE-310                         │
├─────────────────────────────────────────────────────────────┤
│                          CLASS                               │
│  Broad categories - Use when Base unavailable               │
│  Examples: CWE-287, CWE-285, CWE-326                        │
├─────────────────────────────────────────────────────────────┤
│                    BASE (PREFERRED)                          │
│  Most specific common level - PREFERRED for findings        │
│  Examples: CWE-79, CWE-89, CWE-798, CWE-732                 │
├─────────────────────────────────────────────────────────────┤
│                         VARIANT                              │
│  Implementation-specific - Use only when distinction helps  │
│  Examples: CWE-564 (Hibernate SQLi), CWE-80 (Basic XSS)     │
└─────────────────────────────────────────────────────────────┘
```

## Key Pillars and Their Children

### CWE-284: Improper Access Control (Pillar)

**DO NOT USE CWE-284 directly** - use more specific children:

```
CWE-284 (Pillar) - Improper Access Control
├── CWE-285 (Class) - Improper Authorization
│   ├── CWE-862 (Base) - Missing Authorization
│   └── CWE-863 (Base) - Incorrect Authorization
├── CWE-287 (Class) - Improper Authentication
│   ├── CWE-306 (Base) - Missing Authentication for Critical Function
│   ├── CWE-308 (Base) - Use of Single-factor Authentication
│   └── CWE-521 (Base) - Weak Password Requirements
├── CWE-732 (Base) - Incorrect Permission Assignment for Critical Resource
├── CWE-269 (Class) - Improper Privilege Management
│   ├── CWE-250 (Base) - Execution with Unnecessary Privileges
│   └── CWE-266 (Base) - Incorrect Privilege Assignment
└── CWE-668 (Class) - Exposure of Resource to Wrong Sphere
    ├── CWE-200 (Base) - Exposure of Sensitive Information
    └── CWE-538 (Base) - Insertion of Sensitive Information into Externally-Accessible File
```

### CWE-20: Improper Input Validation (Pillar)

**DO NOT USE CWE-20 directly** - use specific injection types:

```
CWE-20 (Pillar) - Improper Input Validation
├── CWE-74 (Class) - Improper Neutralization of Special Elements in Output
│   ├── CWE-79 (Base) - Cross-site Scripting (XSS)
│   │   ├── CWE-80 (Variant) - Basic XSS
│   │   └── CWE-87 (Variant) - Alt XSS Attribute Injection
│   ├── CWE-89 (Base) - SQL Injection
│   │   └── CWE-564 (Variant) - Hibernate Injection
│   ├── CWE-78 (Base) - OS Command Injection
│   └── CWE-77 (Base) - Command Injection
├── CWE-22 (Base) - Path Traversal
│   └── CWE-23 (Variant) - Relative Path Traversal
└── CWE-134 (Base) - Use of Externally-Controlled Format String
```

### CWE-310: Cryptographic Issues (Pillar)

```
CWE-310 (Pillar) - Cryptographic Issues
├── CWE-311 (Base) - Missing Encryption of Sensitive Data
│   └── CWE-312 (Variant) - Cleartext Storage of Sensitive Information
├── CWE-319 (Base) - Cleartext Transmission of Sensitive Information
├── CWE-326 (Class) - Inadequate Encryption Strength
│   └── CWE-328 (Base) - Reversible One-Way Hash
├── CWE-327 (Base) - Use of a Broken or Risky Cryptographic Algorithm
├── CWE-295 (Base) - Improper Certificate Validation
│   ├── CWE-296 (Variant) - Improper Following of a Certificate's Chain of Trust
│   └── CWE-298 (Variant) - Improper Validation of Certificate Expiration
└── CWE-330 (Class) - Use of Insufficiently Random Values
    └── CWE-338 (Base) - Use of Cryptographically Weak PRNG
```

### CWE-287: Improper Authentication (Class)

```
CWE-287 (Class) - Improper Authentication
├── CWE-306 (Base) - Missing Authentication for Critical Function
├── CWE-308 (Base) - Use of Single-factor Authentication
├── CWE-521 (Base) - Weak Password Requirements
├── CWE-522 (Base) - Insufficiently Protected Credentials
│   ├── CWE-256 (Variant) - Unprotected Storage of Credentials
│   └── CWE-257 (Variant) - Storing Passwords in Recoverable Format
├── CWE-798 (Base) - Use of Hard-coded Credentials
│   └── CWE-259 (Variant) - Use of Hard-coded Password
├── CWE-290 (Base) - Authentication Bypass by Spoofing
└── CWE-294 (Base) - Authentication Bypass by Capture-replay
```

## 2024 CWE Top 25 by Abstraction Level

| Rank | CWE     | Name                               | Level         |
| ---- | ------- | ---------------------------------- | ------------- |
| 1    | CWE-79  | Cross-site Scripting               | Base          |
| 2    | CWE-787 | Out-of-bounds Write                | Base          |
| 3    | CWE-89  | SQL Injection                      | Base          |
| 4    | CWE-352 | Cross-Site Request Forgery         | Base          |
| 5    | CWE-22  | Path Traversal                     | Base          |
| 6    | CWE-125 | Out-of-bounds Read                 | Base          |
| 7    | CWE-78  | OS Command Injection               | Base          |
| 8    | CWE-416 | Use After Free                     | Base          |
| 9    | CWE-862 | Missing Authorization              | Base          |
| 10   | CWE-434 | Unrestricted Upload                | Base          |
| 11   | CWE-94  | Code Injection                     | Base          |
| 12   | CWE-20  | Improper Input Validation          | **Pillar** ⚠️ |
| 13   | CWE-77  | Command Injection                  | Base          |
| 14   | CWE-287 | Improper Authentication            | Class         |
| 15   | CWE-269 | Improper Privilege Management      | Class         |
| 16   | CWE-502 | Deserialization of Untrusted Data  | Base          |
| 17   | CWE-200 | Exposure of Sensitive Information  | Base          |
| 18   | CWE-863 | Incorrect Authorization            | Base          |
| 19   | CWE-918 | Server-Side Request Forgery        | Base          |
| 20   | CWE-119 | Improper Restriction of Operations | Class         |
| 21   | CWE-476 | NULL Pointer Dereference           | Base          |
| 22   | CWE-798 | Use of Hard-coded Credentials      | Base          |
| 23   | CWE-190 | Integer Overflow                   | Base          |
| 24   | CWE-400 | Uncontrolled Resource Consumption  | Class         |
| 25   | CWE-306 | Missing Authentication             | Base          |

**Note:** CWE-20 at #12 is a Pillar - when CVEs map to it, they're being overly generic. Prefer specific children.

## Selection Guidelines

### When to Use Each Level

| If your finding is...          | Use Level | Example                  |
| ------------------------------ | --------- | ------------------------ |
| Generic "access control issue" | Base      | CWE-732, CWE-862         |
| Specific injection type        | Base      | CWE-89, CWE-79           |
| Framework-specific variant     | Variant   | CWE-564 (Hibernate SQLi) |
| Broad category, no better fit  | Class     | CWE-287                  |
| **NEVER**                      | Pillar    | CWE-284, CWE-20          |

### Red Flags (Avoid These)

- CWE-284: Too generic - use CWE-732, CWE-862, CWE-863 instead
- CWE-20: Too generic - use CWE-79, CWE-89, CWE-78 instead
- CWE-310: Too generic - use CWE-311, CWE-319, CWE-327 instead
