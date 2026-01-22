---
name: windows-security-internals
description: Use when investigating Windows authentication mechanisms, Kerberos, NTLM, access tokens, security descriptors, Active Directory security, network authentication, or access control internals - authoritative reference from Windows Security Internals by James Forshaw
allowed-tools: Read
---

# Windows Security Internals

**Authoritative deep dive into Windows authentication, authorization, and auditing mechanisms by Google Project Zero researcher James Forshaw.**

## When to Use This Skill

Use this skill when:

- Investigating Windows authentication protocols (Kerberos, NTLM, Negotiate)
- Analyzing security access tokens and their components
- Understanding security descriptors, DACLs, SACLs, and access control
- Researching Active Directory security architecture
- Debugging authentication failures or authorization issues
- Implementing security tools that interact with Windows security subsystems
- Performing security assessments of Windows authentication mechanisms
- Understanding network authentication flows and delegation

**This skill provides access to the complete text of Windows Security Internals.**

## Book Overview

**Author**: James Forshaw (Google Project Zero)
**Publisher**: No Starch Press (2024)
**Technical Reviewer**: Lee Holmes (Azure Security, PowerShell team)

James Forshaw has discovered hundreds of publicly disclosed vulnerabilities in Microsoft platforms over 20+ years. This book represents his deep expertise in Windows security internals, combining theoretical knowledge with practical exploitation and defense perspectives.

**Key Topics**:

- PowerShell security testing environment setup
- Windows kernel security architecture
- User-mode application security
- Security access tokens and privileges
- Security descriptors and ACLs
- Access check process internals
- Security auditing mechanisms
- Windows authentication (local and domain)
- Active Directory security
- Network authentication protocols (Negotiate, Kerberos, NTLM)

## Available Chapters

All chapters have been split into individual markdown files with OCR corrections applied.

**Location**: `references/chapters/` (within this skill)

| Chapter          | File            | Topics Covered                                                                                             |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| 0 (Front Matter) | `chapter-00.md` | Author info, dedication, about the book                                                                    |
| 1                | `chapter-01.md` | Setting up PowerShell testing environment - NtObjectManager module, PowerShell basics, types and variables |
| 2                | `chapter-02.md` | The Windows kernel - Architecture, drivers, system calls, kernel objects                                   |
| 3                | `chapter-03.md` | User-mode applications - Process creation, memory layout, PE format, loading                               |
| 4                | `chapter-04.md` | Security access tokens - Token structure, user SID, groups, privileges, integrity levels, capabilities     |
| 5                | `chapter-05.md` | Security descriptors - DACL, SACL, owner, group, ACE types, inheritance                                    |
| 7                | `chapter-07.md` | The access check process - Security Reference Monitor, access checking algorithm, ResultantAccess          |
| 9                | `chapter-09.md` | Security auditing - Audit policies, security event log, object access auditing                             |
| 10               | `chapter-10.md` | Windows authentication - Local authentication, SAM database, credential storage, LSA                       |
| 11               | `chapter-11.md` | Active Directory - Domain controllers, Kerberos KDC, trust relationships, group policy                     |
| 13               | `chapter-13.md` | Network authentication - Negotiate, SPNEGO, credential delegation                                          |
| 14               | `chapter-14.md` | Kerberos - Ticket structure, TGT, service tickets, delegation types, constrained delegation                |

**Note**: Some chapter numbers are missing due to book structure or OCR extraction (chapters 6, 8, 12, 15 not present in current extraction).

## How to Use

### Quick Chapter Reference

When you need information about a specific Windows security mechanism:

```markdown
Read(".claude/skill-library/security/windows/windows-security-internals/references/chapters/chapter-0N.md")
```

**Example queries:**

- "How do security access tokens work?" → Read chapter 4
- "What's in a security descriptor?" → Read chapter 5
- "How does the access check process work?" → Read chapter 7
- "How does Kerberos authentication flow?" → Read chapter 14
- "What are the components of Active Directory security?" → Read chapter 11

### Search Within Chapters

Use Grep to find specific security topics:

```bash
grep -i "keyword" .claude/skill-library/security/windows/windows-security-internals/references/chapters/*.md
```

**Common search terms:**

- Access token, token privileges, integrity level
- Security descriptor, DACL, SACL, ACE
- Kerberos, TGT, service ticket, delegation
- NTLM, challenge-response, NTLMv2
- Active Directory, domain controller, KDC
- LSA, SAM, credential guard

### PowerShell Testing Setup

**Chapter 1 provides complete PowerShell environment setup:**

1. Install NtObjectManager module: `Install-Module NtObjectManager`
2. Configure execution policy for security testing
3. Use PowerShell cmdlets to inspect security objects

## Key Concepts by Chapter

### Chapter 1: PowerShell Testing Environment

- PowerShell version selection (5.1 vs open source)
- Execution policy configuration
- NtObjectManager module installation and verification
- PowerShell language basics (types, variables, expressions)
- cmdlet usage and help system

### Chapter 2: The Windows Kernel

- Kernel architecture and privilege levels
- System call interface
- Kernel drivers and device objects
- Object Manager and kernel objects
- Handle tables and reference counting

### Chapter 3: User-Mode Applications

- Process creation and initialization
- Virtual memory layout
- Portable Executable (PE) format
- DLL loading and import resolution
- Application compatibility

### Chapter 4: Security Access Tokens

- Token structure and components
- User SID and group SIDs
- Privilege list and enablement
- Integrity levels (Low, Medium, High, System)
- Token capabilities (AppContainer)
- Restricted tokens and filtered tokens
- Impersonation tokens

### Chapter 5: Security Descriptors

- Security descriptor structure
- Owner and group SIDs
- Discretionary Access Control List (DACL)
- System Access Control List (SACL)
- Access Control Entry (ACE) types
- ACE flags and inheritance
- Security descriptor control flags

### Chapter 7: The Access Check Process

- Security Reference Monitor (SRM)
- Access checking algorithm
- Generic vs specific access rights
- Maximum allowed access
- ResultantAccess calculation
- Access check caching
- Privilege checks

### Chapter 9: Security Auditing

- Audit policy configuration
- Security event log structure
- Object access auditing
- SACL-based auditing
- Audit event categories
- Advanced audit policy

### Chapter 10: Windows Authentication

- Local authentication flow
- Security Accounts Manager (SAM) database
- Credential storage (LSA secrets, Credential Manager)
- Password hashing (NT hash, LM hash)
- Local Security Authority (LSA)
- Authentication packages
- Credential Guard

### Chapter 11: Active Directory

- Domain controller role
- Kerberos Key Distribution Center (KDC)
- Domain trust relationships
- Group Policy Objects (GPO)
- LDAP queries
- Replication and sites
- Domain functional levels

### Chapter 13: Network Authentication

- Negotiate protocol (SPNEGO)
- Credential delegation
- Mutual authentication
- Channel binding
- Extended Protection for Authentication
- Network authentication flows

### Chapter 14: Kerberos

- Kerberos ticket structure
- Ticket Granting Ticket (TGT)
- Service tickets
- Pre-authentication
- Delegation types (basic, constrained, resource-based)
- S4U2Self and S4U2Proxy
- Claims and compound authentication
- Kerberos encryption types

## Integration

### Called By

- Security researchers investigating Windows authentication vulnerabilities
- Penetration testers analyzing access control weaknesses
- Engineers implementing Windows authentication in applications
- Defenders analyzing authentication logs and detecting attacks
- `gateway-security` - When Windows authentication/authorization questions arise

### Requires (invoke before starting)

None - standalone reference skill

### Calls (during execution)

None - terminal skill (reads chapter files directly)

### Pairs With (conditional)

| Skill               | Trigger                                                    | Purpose                                         |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `windows-internals` | When kernel-level context needed                           | Complements with OS architecture from Chapter 7 |
| `evading-edr`       | When researching credential access or privilege escalation | Applies authentication concepts to evasion      |

## PowerShell Integration

**This book heavily uses PowerShell for security research.** Chapter 1 provides setup for the NtObjectManager module, which exposes Windows security internals through PowerShell cmdlets.

**Key cmdlets covered:**

- `New-NTSecurityDescriptor` - Create and inspect security descriptors
- `Get-NTAccessToken` - Inspect access tokens
- `Test-NTAccess` - Simulate access checks
- `Get-NTKerberosTicket` - Enumerate Kerberos tickets
- Many more security-focused cmdlets

**See Chapter 1 for complete environment setup and cmdlet usage patterns.**

## References

### Complete Chapter List

For full chapter navigation and security topic index, see [references/chapter-index.md](references/chapter-index.md)

### Book Citation

```
Forshaw, J. (2024). Windows Security Internals: A Deep Dive into Windows
Authentication, Authorization, and Auditing. No Starch Press.
ISBN: 978-1-7185-0198-0
```

### OCR Quality Notes

Chapters have been OCR-transcribed from PDF with automated error corrections applied:

- Common patterns fixed: `ttObject` → `NtObject`, `ASN-13` → `ISBN-13`
- PowerShell code blocks preserved
- Security descriptor diagrams converted to figure references
- Technical terms verified against Windows security documentation

For remaining OCR patterns, see `ocr_fix_patterns.md` in repository root.

## Related Skills

- `windows-internals` - OS architecture and kernel internals (complements Chapter 2-3)
- `evading-edr` - EDR evasion techniques that exploit authentication mechanisms
- `debugging-systematically` - When investigating authentication failures
- `gateway-security` - Routes to this skill for Windows authentication questions

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
