# Roadmap Overview

[ Back to Overview](../OVERVIEW.md)

This document provides a high-level summary of the Chariot AI Platform roadmap spanning Q3FY25 through Q2FY26, outlining the strategic evolution from foundational infrastructure to advanced autonomous offensive security capabilities.

---

## Implementation Status Legend

| Symbol | Meaning                     |
| ------ | --------------------------- |
|        | Complete or mostly complete |
|        | Partial implementation      |
|        | Not started                 |
|        | Planned (future work)       |

**Last Updated**: 2026-01-04 | **Overall Platform Maturity**: ~55% of PRD specification implemented

---

## Table of Contents

- [Strategic Vision](#strategic-vision)
- [Timeline Visualization](#timeline-visualization)
- [Quarterly Summaries](#quarterly-summaries)
- [Major Milestones](#major-milestones)
- [Consolidation Strategy](#consolidation-strategy)

---

## Strategic Vision

Over the next year, Chariot will be built into an AI-driven offensive security platform with the objective of automating security operations at a scale and speed impossible to achieve with human effort alone.

The strategy progressively consolidates the functionality of multiple point solutions:

- Attack Surface Management (ASM)
- Cyber Threat Intelligence (CTI)
- Vulnerability Management (VM)
- Breach & Attack Simulation (BAS)

These capabilities serve as inputs to the core continuous offensive engine, unified into a single platform.

---

## Timeline Visualization

```
Q3FY25          Q4FY25          Q1FY26          Q2FY26          Q3FY26          Q4FY26
   |               |               |               |               |               |
   v               v               v               v               v               v
+-------------+ +-------------+ +-------------+ +-------------+ +-------------+ +-------------+
| Core AI     | | Threat      | | Disrupt     | | ASM         | | Disrupt     | | Hunt for    |
| Orchestrator| | Intelligence| | Vulnerability| | Community   | | BAS Market  | | Zero-Days   |
| Infra       | | In-House    | | Management  | | Edition     | |             | |             |
+-------------+ +-------------+ +-------------+ +-------------+ +-------------+ +-------------+
```

---

## Quarterly Summaries

| Quarter    | Theme                                   | Status  | Key Deliverables                                                                |
| ---------- | --------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| **Q3FY25** | Foundational Stability & Agentification | Partial | PS Onboarding, Prometheus Launch, Workflow Engine, Planner Agent MVP            |
| **Q4FY25** | Bug Bounty Ready                        | Partial | Threat Intel Feed, Validator Framework, Live Bug Bounty Testing, Learning Loops |
| **Q1FY26** | Human-Machine Collaboration             | Planned | Operator Workflow Builder, Attack Graph Service, Enterprise Hardening           |
| **Q2FY26** | Market Disruption                       | Planned | ASM Community Edition, BAS Module, Zero-Day Discovery R&D                       |

### Implementation Status Summary

| Layer               | Completeness | Notes                                                        |
| ------------------- | ------------ | ------------------------------------------------------------ |
| Interface Layer     | 85%          | GUI, CLI, MCP complete; Burp plugin not started              |
| Agent Orchestration | 35%          | Basic ReAct agent; no hierarchical multi-agent               |
| Workflow Engine     | 5%           | Job execution exists; formal workflows not implemented       |
| Execution Layer     | 80%          | Janus (87 capabilities) + Aegis production-ready             |
| Data Layer          | 75%          | Neo4j + pgvector complete; SageMaker ML pipeline not started |
| Shared Services     | 55%          | Agora complete; AGS not started                              |

---

## Major Milestones

### Q3FY25: Core AI Orchestrator Infrastructure Partial

Deliver foundational stability and tooling for Professional Services onboarding while launching the first wave of intelligent agents. The primary focus is creating a Planner Agent MVP that can orchestrate specialized sub-agents for high-impact risks.

**Key Outcomes:**

- End-to-end agentic loop (goal execution result) - Basic agent exists, not hierarchical
- PlexTrac integration finalized - Complete
- Burp plugin launched - Not started (only skill template exists)
- Engagement management UIs delivered - Complete

### Q4FY25: Bring Threat Intelligence In-House Partial

Deploy Chariot to compete on a live bug bounty program - the ultimate benchmark. Build internal exploit intelligence feed to replace third-party vendors, beginning the consolidation strategy.

**Key Outcomes:**

- Internal exploit intelligence feed (displaces VulnCheck) - Partial (CTI ingestion exists)
- Live bug bounty program deployment - Planned
- Validator Framework for high-precision findings - Partial
- Performance feedback data pipeline activated - Not started (requires SageMaker)

### Q1FY26: Disrupt Vulnerability Management Planned

Launch AI-autonomous vulnerability signature generation directly from newly published CVEs. Features that other companies sell as standalone products serve as automated inputs to the Chariot engine.

**Key Outcomes:**

- Autonomous Nuclei template generation from CVEs - Planned
- Operator Workflow Builder (drag-and-drop) - Planned (requires Workflow Engine)
- Attack Graph Service implementation - Planned (not started)
- Enterprise-grade observability and audit trails - Planned

### Q2FY26: Launch ASM Community Edition Planned

Launch a public, freemium version of Chariot to drive massive user adoption and create a powerful data flywheel. The community edition commoditizes the ASM market.

**Key Outcomes:**

- Public freemium ASM offering - Planned
- BAS module with EDR/SIEM integration - Planned
- MITRE ATT&CK/D3FEND dashboards - Planned
- Zero-Day Discovery R&D initiative launched - Planned (requires HPTSA which is not built)

### Q3FY26: Disrupt Breach & Attack Simulation Market Planned

Integrate with major EDRs and SIEMs to correlate attack actions with observed defensive outcomes. Deliver MITRE-aligned dashboards for visualizing offensive capabilities and defensive gaps.

### Q4FY26: Hunt for Zero-Days Planned

Launch formal R&D into the ultimate goal of offensive AI: hunting for zero-days. Build foundational elements including hierarchical teams of specialized agents for hypothesis generation and exploratory testing.

**Critical Dependencies**: Requires HPTSA (Hierarchical Planning and Task-Specific Agents) pattern, SageMaker ML pipeline, and Workflow Engine - none of which are currently implemented.

---

## Consolidation Strategy

The platform progressively consolidates point solutions:

| Solution Category          | Integration Timeline | Replacement              |
| -------------------------- | -------------------- | ------------------------ |
| Attack Surface Management  | Q3FY25 (Foundation)  | Native ASM capabilities  |
| Cyber Threat Intelligence  | Q4FY25               | VulnCheck displacement   |
| Vulnerability Management   | Q1FY26               | CVE signature generation |
| Breach & Attack Simulation | Q2FY26+              | Native BAS module        |

---

## Quarterly Detail Documents

- [Q3FY25 Roadmap](./q3fy25.md) - Foundational Stability & PS Onboarding
- [Q4FY25 Roadmap](./q4fy25.md) - Bug Bounty & Threat Intelligence
- [Q1FY26 Roadmap](./q1fy26.md) - Enterprise Readiness & Human-Machine Team
- [Q2FY26 Roadmap](./q2fy26.md) - ASM Community Edition & Zero-Day Discovery

---

## Development Acceleration

The ambitious timeline is achievable through leveraging AI as a co-pilot to accelerate development velocity. Claude Code integration and the skill system provide significant productivity multipliers for the engineering team.
