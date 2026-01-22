---
name: windows-internals
description: Use when investigating Windows OS architecture, kernel mechanisms, processes, threads, memory management, I/O system, or security internals - authoritative reference from Windows Internals 7th Edition Part 1 by Russinovich, Ionescu, Solomon, and Yosifovich
allowed-tools: Read
---

# Windows Internals 7th Edition Part 1

**Authoritative reference for Windows operating system architecture, kernel internals, and low-level mechanisms.**

## When to Use This Skill

Use this skill when:

- Investigating Windows kernel architecture and system components
- Understanding process and thread lifecycle at the kernel level
- Analyzing memory management, virtual memory, and address spaces
- Researching I/O system architecture and driver models
- Deep-diving into Windows security mechanisms at the OS level
- Debugging low-level Windows behavior or performance issues
- Implementing security tools that interact with Windows internals

**This skill provides access to the complete text of Windows Internals 7th Edition Part 1.**

## Book Overview

**Authors**: Mark E. Russinovich, David A. Solomon, Alex Ionescu, Pavel Yosifovich
**Edition**: 7th Edition, Part 1 (2017)
**Publisher**: Microsoft Press
**Coverage**: Windows 10 and Windows Server 2016

This book is the canonical reference for Windows internals, written by the authors of Sysinternals tools and Microsoft kernel engineers. It covers:

- System architecture and design goals
- Core OS components (kernel, executive, HAL, drivers)
- Process and thread management
- Memory management and virtual memory
- I/O system and driver model
- Security architecture and access control

## Available Chapters

All chapters have been split into individual markdown files with OCR corrections applied.

**Location**: `references/chapters/` (within this skill)

| Chapter          | File            | Topics Covered                                                                                                                                       |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (Front Matter) | `chapter-00.md` | Introduction, table of contents, setup                                                                                                               |
| 1                | `chapter-01.md` | Concepts and tools - Windows API, processes, threads, virtual memory, kernel/user mode, objects, security, registry, debugging tools                 |
| 2                | `chapter-02.md` | System architecture - OS model, portability, SMP, VBS architecture, environment subsystems, executive, kernel, HAL, device drivers, system processes |
| 3                | `chapter-03.md` | Processes and jobs - CreateProcess flow, protected processes, PPL, minimal/pico processes, trustlets, image loader, DLL resolution                   |
| 4                | `chapter-04.md` | Threads - Thread internals, scheduling, synchronization, context switching, thread pools, worker threads                                             |
| 5                | `chapter-05.md` | Memory management - Virtual memory, address spaces, page tables, heaps, memory-mapped files, section objects                                         |
| 6                | `chapter-06.md` | I/O system - I/O architecture, driver types, IRPs, I/O completion, plug and play, power management                                                   |
| 7                | `chapter-07.md` | Security - Security architecture, access tokens, security descriptors, ACLs, privileges, auditing, UAC                                               |

## How to Use

### Quick Chapter Reference

When you need information about a specific Windows internal mechanism:

```markdown
Read(".claude/skill-library/security/windows/windows-internals/references/chapters/chapter-0N.md")
```

**Example queries:**

- "How does CreateProcess work internally?" → Read chapter 3
- "What are the stages of thread scheduling?" → Read chapter 4
- "How does Windows implement virtual memory?" → Read chapter 5
- "What happens during I/O request processing?" → Read chapter 6
- "How do access tokens and security descriptors work?" → Read chapter 7

### Search Within Chapters

Use Grep to find specific topics across all chapters:

```bash
grep -i "keyword" .claude/skill-library/security/windows/windows-internals/references/chapters/*.md
```

**Common search terms:**

- Process creation, EPROCESS, process object
- Thread scheduling, KTHREAD, context switch
- Virtual memory, page tables, VAD tree
- Security descriptor, access token, ACL
- I/O request packet, IRP, driver dispatch

### Progressive Reading Strategy

1. **Start with Chapter 1** for foundational concepts (API, processes, threads, memory)
2. **Chapter 2** for system architecture overview
3. **Dive deep** into specific chapters (3-7) based on your investigation needs

## Key Concepts by Chapter

### Chapter 1: Concepts and Tools

- Windows API layers (Win32, Native API)
- Process structure and lifecycle
- Thread execution and scheduling basics
- Virtual memory fundamentals
- Kernel mode vs user mode transitions
- Object Manager and handle tables
- Security basics (tokens, ACLs)
- Debugging tools (WinDbg, Performance Monitor, Sysinternals)

### Chapter 2: System Architecture

- OS design goals (portability, SMP, scalability)
- Virtualization-Based Security (VBS) architecture
- Environment subsystems (Win32, POSIX, WSL)
- Executive components (Object Manager, Process Manager, Memory Manager, I/O Manager, Security Reference Monitor)
- Kernel primitives (threads, synchronization, interrupts, DPCs)
- Hardware Abstraction Layer (HAL)
- Device driver types and loading
- System processes (System, Smss, Csrss, Wininit, Services, Lsass)

### Chapter 3: Processes and Jobs

- CreateProcess flow (7 stages from validation to thread startup)
- Protected processes and Protected Process Light (PPL)
- Minimal processes and Pico processes
- Trustlets (secure processes in VTL 1)
- Process internals (EPROCESS, PEB, image base)
- Image loader and DLL resolution
- Import parsing and initialization
- Job objects for process groups

### Chapter 4: Threads

- Thread internals (KTHREAD, ETHREAD, TEB)
- Thread states and scheduling
- Priority and affinity
- Context switching mechanics
- Thread synchronization primitives
- Thread pools and worker threads
- Fibers and UMS threads

### Chapter 5: Memory Management

- Virtual address space layout
- Page tables and TLBs
- Virtual Address Descriptors (VAD tree)
- Heap management (NT heap, segment heap)
- Memory-mapped files and section objects
- Page fault handling
- Working sets and page frame database
- Memory compression

### Chapter 6: I/O System

- I/O architecture and request flow
- Driver types (WDM, KMDF, UMDF)
- I/O Request Packets (IRPs)
- Driver dispatch routines
- Asynchronous I/O and completion ports
- Plug and Play (PnP)
- Power management
- File system drivers

### Chapter 7: Security

- Security architecture overview
- Access tokens (user SID, groups, privileges)
- Security descriptors and ACLs
- Access check process
- Privileges and rights
- Security auditing
- User Account Control (UAC)
- Mandatory Integrity Control (MIC)

## Integration

### Called By

- Security researchers investigating Windows exploit mechanisms
- Developers building Windows-specific security tools
- Engineers debugging kernel-level or low-level Windows issues
- Penetration testers analyzing Windows attack surfaces
- `gateway-security` - When Windows-specific kernel questions arise

### Requires (invoke before starting)

None - standalone reference skill

### Calls (during execution)

None - terminal skill (reads chapter files directly)

### Pairs With (conditional)

| Skill                        | Trigger                                                                   | Purpose                                             |
| ---------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `windows-security-internals` | When security mechanisms need deeper authentication/authorization details | Complements Chapter 7 with authentication internals |
| `evading-edr`                | When researching EDR bypass techniques                                    | Applies Chapter 3-7 concepts to detection evasion   |

## References

### Complete Chapter List

For full chapter navigation and topic index, see [references/chapter-index.md](references/chapter-index.md)

### Book Citation

```
Russinovich, M. E., Solomon, D. A., Ionescu, A., & Yosifovich, P. (2017).
Windows Internals, Seventh Edition, Part 1: System architecture, processes,
threads, memory management, and more. Microsoft Press.
ISBN: 978-0-7356-8418-8
```

### OCR Quality Notes

Chapters have been OCR-transcribed from PDF with automated error corrections applied:

- Common patterns fixed: `| n` → `In`, `0r` → `Or`, `ttObject` → `NtObject`
- Some technical diagrams converted to figure references
- Complex tables preserved in markdown format
- Registry paths and API names verified against Windows SDK

For remaining OCR patterns and manual review items, see `ocr_fix_patterns.md` in repository root.

## Related Skills

- `windows-security-internals` - Deep dive into authentication, authorization, and auditing
- `evading-edr` - EDR architecture and evasion techniques (applies Windows Internals concepts)
- `debugging-systematically` - When investigating Windows behavior issues
- `gateway-security` - Routes to this skill for Windows OS questions

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
