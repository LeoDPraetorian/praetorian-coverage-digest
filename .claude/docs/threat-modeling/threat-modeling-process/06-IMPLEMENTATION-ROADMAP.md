# Threat Model Process: Implementation & Roadmap

**Document**: 6 of 6 - Implementation Architecture & Roadmap **Purpose**:
Implementation details, tool requirements, roadmap, and future enhancements
**Last Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| **Document ID**    | 06-IMPLEMENTATION-ROADMAP                    |
| **Token Count**    | ~2,700 tokens                                |
| **Read Time**      | 15-20 minutes                                |
| **Prerequisites**  | 01-05 (Complete process understanding)       |
| **Next Documents** | None (final document)                        |

---

## Related Documents

This document is part of the Threat Model Process documentation series:

- **[01-OVERVIEW-ARCHITECTURE.md](01-OVERVIEW-ARCHITECTURE.md)** - Overview and
  architecture diagram
- **[02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md)** - Scope selection and
  checkpoints
- **[03-METHODOLOGY.md](03-METHODOLOGY.md)** - STRIDE + PASTA + DFD methodology
- **[04-PHASE-DETAILS.md](04-PHASE-DETAILS.md)** - Phase 1-6 detailed
  specifications
- **[05-STATE-OUTPUT.md](05-STATE-OUTPUT.md)** - State management and output
  formats

---

## Entry and Exit Criteria

### Entry Criteria

- Complete understanding of the threat modeling process
- Knowledge of phase workflows and outputs

### Exit Criteria

After reading this document, you should understand:

- Implementation architecture (hybrid approach)
- File organization structure
- Tool requirements for agents
- Current implementation status
- Future enhancement plans

---

## Implementation Architecture

### Recommended: Hybrid Approach

```
/threat-model {prompt}
├── skill: "threat-modeling-orchestrator"     # Core skill manages flow
│
├── SCOPE SELECTION (AskUserQuestion)
│      User selects: full | component | incremental
│
├── Phase 1: SEQUENTIAL business context discovery
│      Orchestrator reads business-context-discovery skill
│      → CHECKPOINT (user approval required)
│
├── Phase 2: AUTOMATIC codebase sizing
│      Orchestrator reads codebase-sizing skill
│      (NO CHECKPOINT - deterministic, auto-progresses)
│
├── Phase 3: DYNAMIC PARALLEL agents for mapping
│      Task("codebase-mapper", component)  # Agent count from Phase 2
│      → CHECKPOINT (user approval required)
│
├── Phase 4: BATCHED PARALLEL agents for controls
│      Task("security-controls-mapper", concern)  # Batched by severity
│      → CHECKPOINT (user approval required)
│
├── Phase 5: SEQUENTIAL skill application
│      Orchestrator reads threat-modeling skill (CVSS 4.0 scoring)
│      → CHECKPOINT (user approval required)
│
├── Phase 6: SEQUENTIAL skill application
│      Orchestrator reads security-test-planning skill
│      → CHECKPOINT (user approval required)
│
└── FINAL REPORT GENERATION
       Output: Markdown + JSON + SARIF
```

### File Organization

```
.claude/
├── commands/
│   └── threat-model.md                      # Router: skill: "threat-modeling-orchestrator"
│
├── skills/
│   └── threat-modeling-orchestrator/        # Core skill (~600 lines)
│       ├── SKILL.md
│       └── references/
│           ├── handoff-protocol.md
│           ├── parallel-execution-and-error-handling.md
│           ├── phase-2-codebase-sizing-workflow.md
│           ├── phase-3-codebase-mapping-workflow.md
│           ├── phase-4-batched-execution.md
│           ├── phase-5-threat-modeling-workflow.md
│           ├── phase-6-test-planning-workflow.md
│           └── report-templates.md
│
├── skill-library/
│   └── security/
│       ├── business-context-discovery/      # Phase 1 methodology
│       │   └── SKILL.md
│       ├── codebase-sizing/                 # Phase 2 methodology
│       │   └── SKILL.md
│       ├── codebase-mapping/                # Phase 3 methodology
│       │   └── SKILL.md
│       ├── security-controls-mapping/       # Phase 4 methodology
│       │   └── SKILL.md
│       ├── threat-modeling/                 # Phase 5 methodology (CVSS 4.0)
│       │   ├── SKILL.md
│       │   └── references/
│       │       ├── cvss-scoring-integration.md
│       │       ├── output-schemas.md
│       │       └── phase-1-integration.md
│       └── security-test-planning/          # Phase 6 methodology
│           └── SKILL.md
│
└── agents/
    └── security/                            # Lean agents for parallel work
        ├── codebase-mapper.md               # ~200 lines
        └── security-controls-mapper.md      # ~200 lines
```

---

## Tool Requirements (MVP)

### Required Tools for Agents

| Agent                          | Tools Needed                                                    |
| ------------------------------ | --------------------------------------------------------------- |
| `threat-modeling-orchestrator` | Read, Write, Bash, Task, TodoWrite, Glob, Grep, AskUserQuestion |
| `codebase-mapper`              | Read, Glob, Grep, Write                                         |
| `security-controls-mapper`     | Read, Glob, Grep, Write                                         |

---

## Implementation Roadmap

### MVP (v1.0) - Phase 1-6 Complete

**Status**: All 6 phases implemented with CVSS 4.0 integration

**MVP Components (Phases 1-6)**:

- [x] Create `business-context-discovery` skill (Phase 1)
  - Location: `.claude/skill-library/security/business-context-discovery/`
  - Type: Process/Pattern (PASTA Stage 1)
  - Produces: 7 required output files + summary.md
  - Gateway integrated: gateway-security
  - Drives all subsequent phases with business context

- [x] Create `codebase-sizing` skill (Phase 2)
  - Location: `.claude/skill-library/security/codebase-sizing/`
  - Automatic, no checkpoint
  - Produces: sizing-report.json with parallelization strategy
  - Configures Phase 3 agent count dynamically

- [x] Create `codebase-mapping` skill (Phase 3)
  - Location: `.claude/skill-library/security/codebase-mapping/`
  - Dynamic parallel agent execution (from Phase 2)
  - Uses Phase 1 crown jewels for prioritization
  - Gateway integrated: gateway-security

- [x] Create `codebase-mapper` agent
  - Location: `.claude/agents/analysis/codebase-mapper.md`
  - Type: analysis, Permission: plan, Model: opus
  - Tools: Bash, Glob, Grep, Read, TodoWrite, Write
  - Skills: gateway-security (routes to codebase-mapping)

- [x] Create `security-controls-mapping` skill (Phase 4)
  - Location: `.claude/skill-library/security/security-controls-mapping/`
  - Batched execution by severity (CRITICAL → HIGH → MEDIUM → LOW)
  - Evaluates against Phase 1 compliance requirements
  - Gateway integrated: gateway-security

- [x] Create `security-controls-mapper` agent
  - Location: `.claude/agents/analysis/security-controls-mapper.md`
  - Type: analysis, Permission: plan, Model: opus
  - One agent per security concern, batched by severity

- [x] Create `threat-modeling` skill (Phase 5)
  - Location: `.claude/skill-library/security/threat-modeling/`
  - CVSS 4.0 scoring with Environmental scores from Phase 1
  - Uses threat actor profiles and business impact
  - Gateway integrated: gateway-security

- [x] Create `security-test-planning` skill (Phase 6)
  - Location: `.claude/skill-library/security/security-test-planning/`
  - Produces: 7 required output files (JSON + summary.md)
  - Tests prioritized by CVSS Environmental scores
  - Gateway integrated: gateway-security

- [x] Create `threat-modeling-orchestrator` skill
  - Location: `.claude/skills/threat-modeling-orchestrator/`
  - ~600 lines (core skill, process/pattern type)
  - Features:
    - Scope selection flow (full/component/incremental)
    - Human checkpoints for phases 1, 3, 4, 5, 6 (Phase 2 auto-progresses)
    - Handoff protocol with state persistence + Phase 1 summary
    - Dynamic parallel agent coordination (from Phase 2 sizing)
    - Session directory management (.claude/.output/threat-modeling/)
    - Final report generation (MD + JSON + SARIF) with business context
    - CVSS 4.0 integration throughout workflow

- [x] Create `/threat-model` command
  - Location: `.claude/commands/threat-model.md`
  - Router Pattern: invokes threat-modeling-orchestrator

---

## Future Enhancements

### Phase 7: Automated Test Execution (v2.0)

Execute the security test plan with automated tools:

```
Phase 7: Security Test Execution
├── SAST execution (semgrep, codeql)
├── SCA execution (trivy, npm audit)
├── Secret scanning (gitleaks)
├── Finding consolidation
├── False positive analysis
└── Remediation prioritization
```

**Tools to integrate**:

| Tool     | Type    | Purpose                        |
| -------- | ------- | ------------------------------ |
| semgrep  | SAST    | Pattern-based static analysis  |
| trivy    | SCA     | Dependency vulnerabilities     |
| gitleaks | Secrets | Hardcoded secrets detection    |
| nuclei   | DAST    | API security testing           |
| codeql   | SAST    | Semantic code analysis         |

### CI/CD Integration (v2.0)

- PR-based threat model delta analysis
- GitHub Actions / GitLab CI integration
- Automated threat model updates on code changes
- Blocking PRs on critical threat introduction
- Integration with security dashboards

### Token/Time Budget Management (v2.0)

- Configurable time limits per phase
- Auto-checkpoint at token thresholds
- Smart sampling for very large codebases
- Progress estimation and ETA

### External Tool Integration (v2.0)

- Import from OWASP Threat Dragon
- Import from Microsoft Threat Modeling Tool
- Export to security ticketing systems (Jira, Linear)
- Integration with vulnerability management platforms

### Advanced Threat Intelligence (v2.0)

- CVE correlation for dependencies
- Known attack pattern matching
- Industry-specific threat libraries
- Compliance mapping (SOC2, PCI-DSS, etc.)

---

## References

### Internal

- `docs/SKILLS-ARCHITECTURE.md` - Skill design patterns
- `docs/AGENT-ARCHITECTURE.md` - Lean agent pattern
- `docs/CLAUDE-ARCHITECTURE-OPEN-QUESTIONS.md` - Cross-agent handoff patterns

### Methodologies

- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [Microsoft STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [PASTA Threat Modeling](https://versprite.com/blog/what-is-pasta-threat-modeling/)
- [Microsoft SDL Threat Modeling](https://www.microsoft.com/en-us/securityengineering/sdl/threatmodeling)
- [DFD-Based Threat Modeling](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-feature-overview)

### Output Formats

- [SARIF Specification](https://sarifweb.azurewebsites.net/)

---

## Changelog

| Date       | Change                                              | Author              |
| ---------- | --------------------------------------------------- | ------------------- |
| 2026-01-10 | Aligned documentation to Phase 1-6 numbering        | Claude (Opus 4.5)   |
| 2026-01-10 | Added Phase 2 (Codebase Sizing) documentation       | Claude (Opus 4.5)   |
| 2026-01-10 | Updated all directory paths to .claude/.output/     | Claude (Opus 4.5)   |
| 2026-01-10 | Added CVSS 4.0 scoring to methodology               | Claude (Opus 4.5)   |
| 2026-01-10 | Split into 6-document suite                         | Claude (Opus 4.5)   |
| 2024-12-18 | Phase 1 Business Context - orchestrator updated     | Claude (Opus 4.5)   |
| 2024-12-18 | Created `business-context-discovery` skill          | Claude (Sonnet 4.5) |
| 2024-12-17 | Created all initial skills and agents               | Claude (mixed)      |
| Dec 2024   | Initial architecture design                         | Claude (Opus 4.5)   |

---

**End of Document 6 of 6**

**Return to**: [00-INDEX.md](00-INDEX.md) for complete documentation index
