# Threat Model Process Documentation

**Master Index** - Navigation guide for the Threat Model Process documentation
suite

---

## Document Suite Overview

| Property              | Value                    |
| --------------------- | ------------------------ |
| **Total Documents**   | 6 + Index                |
| **Total Token Count** | ~11,000 tokens           |
| **Total Read Time**   | 60-90 minutes            |
| **Last Synchronized** | 2026-01-10               |
| **Status**            | Ready for Implementation |

---

## Quick Navigation

| Doc | Title                    | Tokens | Read Time | Purpose                                   |
| --- | ------------------------ | ------ | --------- | ----------------------------------------- |
| 01  | Overview & Architecture  | ~1,200 | 5-10 min  | MVP scope, design decisions, architecture |
| 02  | Scope & Checkpoints      | ~1,600 | 8-12 min  | Scope selection, human-in-the-loop        |
| 03  | Methodology              | ~700   | 5-8 min   | STRIDE + PASTA + DFD frameworks           |
| 04  | Phase Details            | ~4,000 | 25-35 min | Phase 1-6 specifications (core content)   |
| 05  | State & Output           | ~1,400 | 8-12 min  | Session state, output formats             |
| 06  | Implementation & Roadmap | ~2,700 | 15-20 min | Implementation, tools, future plans       |

---

## Document Summaries

### [01-OVERVIEW-ARCHITECTURE.md](01-OVERVIEW-ARCHITECTURE.md)

**Overview & Architecture** - Start here to understand the big picture.

- What the `/threat-model` command does
- MVP scope: 4 core outputs (Business Context, Application Understanding, Threat
  Intelligence, Security Test Plan)
- Key design decisions and constraints
- High-level architecture diagram showing phase flow

### [02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md)

**Scope Selection & Checkpoints** - User interaction patterns.

- Scope selection flow (full/component/incremental)
- Human-in-the-loop checkpoint requirements
- Checkpoint prompt templates for each phase
- TypeScript interfaces for scope and checkpoints

### [03-METHODOLOGY.md](03-METHODOLOGY.md)

**Methodology** - Threat modeling frameworks.

- STRIDE threat categorization (Microsoft)
- PASTA risk-centric approach (7 stages)
- DFD-based threat modeling principles
- Combined threat model output schema

### [04-PHASE-DETAILS.md](04-PHASE-DETAILS.md)

**Phase Details** - The core workflow specifications.

- **Phase 1**: Business Context Discovery (crown jewels, threat actors, impact)
- **Phase 2**: Codebase Sizing (dynamic parallelization strategy)
- **Phase 3**: Codebase Mapping (architecture, data flows, entry points)
- **Phase 4**: Security Controls Mapping (10 control categories)
- **Phase 5**: Threat Modeling & Abuse Cases (CVSS 4.0 scoring)
- **Phase 6**: Security Test Planning (prioritized test plan)

### [05-STATE-OUTPUT.md](05-STATE-OUTPUT.md)

**State Management & Output** - Data persistence and formats.

- Session directory structure
- Session configuration schema
- Handoff schema between phases
- Output formats: Markdown, JSON, SARIF

### [06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md)

**Implementation & Roadmap** - Building and extending.

- Implementation architecture (hybrid approach)
- File organization structure
- Tool requirements for agents
- Current implementation status (10/15 components)
- Future enhancements (v2.0 plans)
- References and methodology links

---

## Reading Paths

### For Architects (Understanding the System)

```
01 → 03 → 04 → 05
```

Focus on architecture, methodology, phase details, and state management.

### For Implementers (Building Components)

```
01 → 04 → 06 → 05
```

Focus on overview, phase specifications, implementation details, and output
schemas.

### For Users (Running Threat Models)

```
01 → 02 → 04
```

Focus on overview, scope/checkpoints, and phase workflow.

### Quick Reference (Already Familiar)

```
04 → 05
```

Jump directly to phase details and output formats.

---

## Document Dependencies

```
                    ┌──────────────────┐
                    │   00-INDEX.md    │
                    │  (Master Index)  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │     01      │  │     02      │  │     03      │
    │  Overview   │  │   Scope &   │  │ Methodology │
    │ Architecture│  │ Checkpoints │  │ STRIDE/PASTA│
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │     04      │
                    │   Phase     │
                    │  Details    │
                    │ (Core Doc)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────┐           ┌─────────────┐
    │     05      │           │     06      │
    │   State &   │           │ Implementation│
    │   Output    │           │  & Roadmap   │
    └─────────────┘           └─────────────┘
```

---

## Change History

| Date       | Change                                                      | Documents Affected |
| ---------- | ----------------------------------------------------------- | ------------------ |
| 2026-01-10 | Renumbered phases 0-4 to 1-6, added Phase 2 Codebase Sizing | All                |
| 2026-01-10 | Initial split from THREAT-MODELING-PROCESS.md               | All (created)      |

---

## Related Documentation

- **DevPod Infrastructure Suite**: `../00-INDEX.md` - Secure environment for
  threat modeling sessions
- **Original Source**: `../THREAT-MODELING-PROCESS.md` - Monolithic source
  document (retained for reference)

---

**Total Documentation**: 6 documents + index | ~11,000 tokens | 60-90 minutes
