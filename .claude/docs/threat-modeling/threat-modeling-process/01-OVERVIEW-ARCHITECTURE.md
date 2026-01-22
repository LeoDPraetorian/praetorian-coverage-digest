# Threat Model Process: Overview & Architecture

**Document**: 1 of 6 - Overview & Architecture **Purpose**: High-level system
understanding, MVP scope, and architecture diagram **Last Synchronized**:
2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                |
| ------------------ | ------------------------------------ |
| **Document ID**    | 01-OVERVIEW-ARCHITECTURE             |
| **Token Count**    | ~1,200 tokens                        |
| **Read Time**      | 5-10 minutes                         |
| **Prerequisites**  | None (starting point)                |
| **Next Documents** | 02-SCOPE-CHECKPOINTS, 03-METHODOLOGY |

---

## Related Documents

This document is part of the Threat Model Process documentation series:

- **[02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md)** - Scope selection and
  human-in-the-loop checkpoints
- **[03-METHODOLOGY.md](03-METHODOLOGY.md)** - STRIDE + PASTA + DFD methodology
- **[04-PHASE-DETAILS.md](04-PHASE-DETAILS.md)** - Phase 1-6 detailed
  specifications
- **[05-STATE-OUTPUT.md](05-STATE-OUTPUT.md)** - State management and output
  formats
- **[06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md)** -
  Implementation, tools, and roadmap

---

## Entry and Exit Criteria

### Entry Criteria

- None - this is the starting point for understanding the threat modeling process

### Exit Criteria

After reading this document, you should understand:

- What the `/threat-model` command does
- The MVP scope and core outputs
- Key design decisions and constraints
- The high-level architecture and phase flow

---

## Overview

The `/threat-model {prompt}` command orchestrates a multi-phase security
analysis workflow that produces actionable threat intelligence and security
testing guidance.

### MVP Scope (v1.0 + Phase 1 Enhancement)

The MVP delivers four core outputs:

1. **Business Context** (Phase 1 - NEW) - WHAT you're protecting and WHY (crown
   jewels, threat actors, business impact, compliance requirements)
2. **Application Understanding** (Phase 2-3) - HOW it's built (codebase sizing +
   architecture mapping, components, data flows)
3. **Threat Intelligence** (Phases 4-5) - Contextualized threats and abuse
   scenarios driven by business risk
4. **Security Test Plan** (Phase 6) - Risk-prioritized testing guided by
   business impact

### Key Design Decisions

| Decision                      | Choice                          | Rationale                                                                               |
| ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| **Business Context First**    | Mandatory Phase 1               | Cannot assess risk without understanding WHAT you're protecting and WHY - PASTA Stage 1 |
| **Scope Selection**           | Interactive prompt              | User must explicitly choose full app vs specific component                              |
| **Incremental Support**       | Yes (MVP)                       | Support delta analysis on changed files                                                 |
| **Methodologies**             | STRIDE + PASTA + DFD principles | Proven frameworks, applied as principles not tools                                      |
| **Risk-Based Prioritization** | Phase 1 drives all phases       | Crown jewels, threat actors, and business impact guide technical analysis               |
| **Test Execution**            | Future enhancement              | MVP focuses on planning, execution is v2.0                                              |
| **Output Formats**            | Markdown, JSON, SARIF           | All three supported                                                                     |
| **Token Budget**              | Future enhancement              | No artificial limits in MVP                                                             |
| **Human-in-the-Loop**         | Required                        | Checkpoints between all phases (including Phase 1)                                      |
| **CI/CD Integration**         | Future enhancement              | Focus on interactive use first                                                          |

### Key Constraints

- **Large codebases** exceed single agent context window
- **State persistence** required between phases for handoff
- **Parallelization** needed for performance on large repos
- **Progressive summarization** to compress findings for downstream phases
- **Human approval** required at each phase transition

---

## Architecture Diagram

```
                         /threat-model {prompt}
                              Command Router

                                  Read(".claude/skill-library/security/threat-model/threat-modeling-orchestrator/SKILL.md")


                         SCOPE SELECTION
                    (Interactive User Prompt)

  "What would you like to threat model?"

    Entire application
    Specific component(s): [________________________________]
    Changed files only (incremental): [git ref or file list]




-
                    threat-modeling-orchestrator
                         (Core Skill - ~600 lines)
   Creates session directory
   Enforces Phase 1 (Business Context) BEFORE Phase 2 (mandatory)
   Manages phase transitions with business context handoff
   Coordinates parallel work (dynamic from Phase 2 sizing)
   Enforces human checkpoints
   Consolidates final report
--



                    Phase 1: Business Context Discovery
                         (Interactive, Sequential)

  Outputs (drive ALL subsequent phases):
   business-objectives.json     # App purpose, users, value
   data-classification.json     # Crown jewels, sensitive data
   threat-actors.json           # Who attacks, motivations, capabilities
   business-impact.json         # Financial, operational, regulatory
   compliance-requirements.json # SOC2, PCI-DSS, HIPAA, GDPR
   security-objectives.json     # Protection priorities, risk tolerance
   summary.md                   # <2000 tokens for quick loading

   CHECKPOINT: Validate business understanding before technical analysis

                                  Business context feeds into all phases


                    Phase 2: Codebase Sizing
                         (Automatic, No Checkpoint)

  Outputs (configure Phase 3 parallelization):
   sizing-report.json           # File counts, components, strategy
   component-analysis.json      # Per-component breakdown (optional)

   NO CHECKPOINT: Sizing is deterministic, auto-progresses to Phase 3



   Phase 3             Phase 4               Phase 5
   Codebase    Security Controls  Threat Model
   Mapping            Mapping              & Abuse Cases
 (Context-         (Compliance-          (CVSS 4.0
  Driven)           Aware)                Scoring)


         Dynamic parallel       Batched parallel        Sequential
         agents (from           agents (by severity)    (needs full context)
         Phase 2 sizing)

         (load Phase 1           (check compliance       (apply threat actors,
          crown jewels)           requirements)           CVSS Environmental)

          CHECKPOINT            CHECKPOINT             CHECKPOINT
         User approval           User approval           User approval


                         Phase 6
              Security Test Planning
   Prioritized by CVSS Environmental scores (from Phase 5)
   Compliance validation tests (from Phase 1 requirements)
   Focused on crown jewel protection (from Phase 1)


                                 FINAL CHECKPOINT
                                User approval


                       Final Report
                     (MD + JSON +
                         SARIF)
                     w/ Business
                     Impact Context



                    Phase 7 (Future)
                    Test Execution
```

---

**End of Document 1 of 6**

**Continue to**: [02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md) for scope
selection and checkpoint workflows
