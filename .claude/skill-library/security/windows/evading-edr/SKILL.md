---
name: evading-edr
description: Use when researching EDR architecture, detection mechanisms, evasion techniques, function hooking, kernel callbacks, ETW, or offensive security tradecraft - authoritative reference from Evading EDR by Matt Hand
allowed-tools: Read
---

# Evading EDR

**The Definitive Guide to Defeating Endpoint Detection Systems - offensive security perspective on EDR architecture and evasion by Matt Hand.**

## When to Use This Skill

Use this skill when:

- Researching EDR architecture and sensor components
- Analyzing EDR detection mechanisms and telemetry sources
- Understanding function hooking (userland and kernel)
- Investigating kernel callbacks and notifications
- Studying Event Tracing for Windows (ETW) internals
- Developing or analyzing EDR evasion techniques
- Building offensive security tools that bypass detection
- Performing red team operations against EDR-protected environments
- Understanding the attacker-defender dynamic in endpoint security

**This skill provides access to the complete text of Evading EDR.**

## Book Overview

**Author**: Matt Hand
**Publisher**: No Starch Press (2024)

Matt Hand provides a comprehensive offensive security perspective on EDR systems, explaining how they work under the hood and how adversaries can evade them. The book is essential reading for both red teamers and defenders who need to understand EDR capabilities and limitations.

**Key Topics**:

- EDR architecture (agents, sensors, telemetry, detections)
- Function hooking DLLs (userland API monitoring)
- Kernel callbacks (PsSetCreateProcessNotifyRoutine, etc.)
- Object notifications (ObRegisterCallbacks)
- Image-load and registry notifications
- Network filter drivers (WFP)
- Event Tracing for Windows (ETW) internals
- Antivirus scanners and AMSI
- Early Launch Anti-Malware (ELAM) drivers
- Microsoft-Windows-Threat-Intelligence ETW provider
- Detection-aware attack case studies

## Available Chapters

All chapters have been split into individual markdown files with OCR corrections applied.

**Location**: `references/chapters/` (within this skill)

| Chapter          | File            | Topics Covered                                                                                                                                                 |
| ---------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (Front Matter) | `chapter-00.md` | Praise, dedication, author bio, technical reviewer                                                                                                             |
| 1                | `chapter-01.md` | EDR architecture - Components (agent, telemetry, sensors, detections), challenges of EDR evasion, identifying malicious activity, brittle vs robust detections |
| 2                | `chapter-02.md` | Function-hooking DLLs - Userland API hooking, inline hooks, IAT hooking, detours, hook detection and bypass                                                    |
| 4                | `chapter-04.md` | Object notifications - ObRegisterCallbacks, process/thread handle notifications, protected processes                                                           |
| 5                | `chapter-05.md` | Image-load and registry notifications - PsSetLoadImageNotifyRoutine, CmRegisterCallback, bypasses                                                              |
| 7                | `chapter-07.md` | Network filter drivers - Windows Filtering Platform (WFP), callout drivers, network telemetry collection                                                       |
| 8                | `chapter-08.md` | Event Tracing for Windows (ETW) - Provider architecture, consumer sessions, ETW patching, bypasses                                                             |
| 11               | `chapter-11.md` | Early Launch Anti-Malware (ELAM) drivers - Boot-start protection, driver signing, ELAM bypasses                                                                |
| 12               | `chapter-12.md` | Microsoft-Windows-Threat-Intelligence - Kernel ETW provider, stack walking, memory allocations, RWX detection                                                  |
| 13               | `chapter-13.md` | Case study: A detection-aware attack - End-to-end offensive operation demonstrating evasion techniques                                                         |

**Note**: Some chapter numbers are missing due to book structure (chapters 3, 6, 9, 10 not present in current extraction).

## How to Use

### Quick Chapter Reference

When you need information about a specific EDR mechanism or evasion technique:

```markdown
Read(".claude/skill-library/security/windows/evading-edr/references/chapters/chapter-0N.md")
```

**Example queries:**

- "How do EDR function hooks work?" → Read chapter 2
- "What are kernel callbacks and how do EDRs use them?" → Read chapter 4-5
- "How does ETW provide telemetry to EDRs?" → Read chapter 8
- "What is the Threat-Intelligence ETW provider?" → Read chapter 12
- "How would I plan a detection-aware attack?" → Read chapter 13

### Search Within Chapters

Use Grep to find specific EDR or evasion topics:

```bash
grep -i "keyword" .claude/skill-library/security/windows/evading-edr/references/chapters/*.md
```

**Common search terms:**

- Function hook, inline hook, IAT hook, detours
- Kernel callback, ObRegisterCallbacks, PsSetCreateProcessNotifyRoutine
- ETW, event provider, consumer, trace session
- WFP, filter driver, callout
- ELAM, boot-start driver
- Threat-Intelligence, stack walk, RWX
- AMSI, scanner, signature

### Offensive Security Workflow

1. **Start with Chapter 1** for EDR architecture fundamentals
2. **Map EDR sensors** (Chapters 2, 4-5, 7-8, 11-12) to understand telemetry sources
3. **Study evasion techniques** within each sensor chapter
4. **Review case study** (Chapter 13) for integrated offensive operations

## Key Concepts by Chapter

### Chapter 1: EDR Architecture

- EDR components (agent, sensors, detections, telemetry)
- Sensor types and their purposes
- Detection logic (brittle vs robust)
- Context and environmental heuristics
- Challenges of EDR evasion (evolving products, configuration differences)
- Telemetry as "radar blips"
- Detection engineering principles

### Chapter 2: Function-Hooking DLLs

- Userland API hooking mechanisms
- Inline hooks (trampoline, hotpatching)
- Import Address Table (IAT) hooking
- Microsoft Detours library
- Hook detection techniques
- Hook bypass methods (direct syscalls, unhooking, alternate APIs)
- EDR DLL injection methods

### Chapter 4: Object Notifications

- ObRegisterCallbacks API
- Process handle notifications
- Thread handle notifications
- Protected process enforcement
- Notification bypass techniques
- Handle duplication attacks
- Kernel-mode evasion

### Chapter 5: Image-Load and Registry Notifications

- PsSetLoadImageNotifyRoutine (DLL load monitoring)
- CmRegisterCallback (registry monitoring)
- Image load telemetry for suspicious DLLs
- Registry persistence detection
- Bypassing image-load notifications
- Registry callback evasion

### Chapter 7: Network Filter Drivers

- Windows Filtering Platform (WFP) architecture
- Callout drivers and filter engine
- Network telemetry collection
- Packet inspection and classification
- WFP bypass techniques
- DNS filtering and C2 detection

### Chapter 8: Event Tracing for Windows (ETW)

- ETW provider architecture
- Trace sessions and consumers
- Kernel and user-mode providers
- ETW provider registration
- ETW patching techniques
- ETW provider tampering
- Bypassing ETW-based detection
- Common ETW providers used by EDR

### Chapter 11: Early Launch Anti-Malware (ELAM)

- Boot-start driver loading sequence
- ELAM driver requirements
- Driver signature verification
- Boot time protection
- ELAM bypass techniques
- Secure Boot implications
- Windows Defender ELAM

### Chapter 12: Microsoft-Windows-Threat-Intelligence

- Kernel ETW provider for threat intelligence
- Stack walking and call stack inspection
- Memory allocation tracking (VirtualAlloc, etc.)
- RWX memory detection (Read-Write-Execute pages)
- Shellcode execution indicators
- Suspicious memory patterns
- Bypassing Threat-Intelligence provider

### Chapter 13: Case Study - Detection-Aware Attack

- End-to-end offensive operation planning
- Combining multiple evasion techniques
- Detection surface minimization
- Operational security (OPSEC)
- Tradecraft selection based on EDR capabilities
- Post-exploitation in EDR-protected environments
- Real-world attack chain demonstration

## Integration

### Called By

- Red teamers planning EDR evasion operations
- Offensive tool developers building detection-resistant capabilities
- Security researchers analyzing EDR products
- Defenders understanding attacker tradecraft
- Purple teamers validating EDR detection coverage
- `gateway-security` - When EDR architecture or evasion questions arise

### Requires (invoke before starting)

| Skill                        | When                                      | Purpose                                                         |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `windows-internals`          | When kernel concepts needed               | Provides OS foundation for chapters 2, 4-5, 7-8, 11-12          |
| `windows-security-internals` | When authentication/token concepts needed | Complements Chapter 1 context and Chapter 4 protected processes |

### Calls (during execution)

None - terminal skill (reads chapter files directly)

### Pairs With (conditional)

| Skill                        | Trigger                      | Purpose                                                                         |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `windows-internals`          | Frequently                   | EDR concepts build on Windows internals (processes, threads, drivers, security) |
| `windows-security-internals` | When authentication involved | Token manipulation, privilege escalation in evasion context                     |

## EDR Evasion Mindset

**From Chapter 1 - Key Principles:**

1. **Know the sensor** - Each EDR sensor (hooks, callbacks, ETW, etc.) has specific capabilities and blind spots
2. **Understand telemetry** - What data does the sensor collect? What doesn't it see?
3. **Detection logic varies** - Same evasion technique may work against one product but not another
4. **Configuration matters** - Default EDR configs differ from hardened deployments
5. **Test, don't assume** - Public bypasses may not work; validate against target EDR
6. **Defense in depth** - Modern EDRs use multiple sensor types simultaneously

**This book teaches systematic EDR analysis rather than one-off bypass tricks.**

## Offensive Security Context

**WARNING**: This book describes offensive security techniques. Use ONLY in authorized security testing contexts:

- Authorized penetration testing engagements
- Red team exercises with written authorization
- Security research on systems you own
- CTF competitions
- Defensive security analysis

**DO NOT** use these techniques for unauthorized access, malicious activity, or illegal purposes.

## References

### Complete Chapter List

For full chapter navigation and EDR topic index, see [references/chapter-index.md](references/chapter-index.md)

### Book Citation

```
Hand, M. (2024). Evading EDR: The Definitive Guide to Defeating Endpoint
Detection Systems. No Starch Press.
ISBN: 978-1-7185-0334-2
```

### OCR Quality Notes

Chapters have been OCR-transcribed from PDF with automated error corrections applied:

- Common patterns fixed: `EDR chitecture` → `EDR Architecture`, `rundll2` → `rundll32`
- Technical terms verified against Windows documentation
- Code examples and memory addresses preserved

For remaining OCR patterns, see `ocr_fix_patterns.md` in repository root.

## Related Skills

- `windows-internals` - **FREQUENTLY PAIRED** - OS foundation for EDR concepts (processes, drivers, kernel)
- `windows-security-internals` - Authentication and access control in evasion context
- `debugging-systematically` - When analyzing EDR behavior or testing evasion techniques
- `gateway-security` - Routes to this skill for EDR questions

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
