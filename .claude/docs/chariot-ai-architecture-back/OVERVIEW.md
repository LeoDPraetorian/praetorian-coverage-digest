# Chariot AI Architecture - Gateway Document

**Version:** 3.1
**Date:** July 20, 2025
**Status:** Active PRD
**Source:** `chariot-ai-architecture.md`
**Implementation Review:** January 2026

---

## Quick Navigation

| Section                   | Path                                                                           | Description                                                       |
| ------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Architecture**          |                                                                                |                                                                   |
| Core Principles           | [architecture/core-principles.md](architecture/core-principles.md)             | Task-based abstraction, executor agnosticism, capability registry |
| Interface Layer           | [architecture/interface-layer.md](architecture/interface-layer.md)             | GUI, CLI, Burp plugin, Cursor/MCP, Platform APIs                  |
| **Orchestration Pattern** | [architecture/orchestration-pattern.md](architecture/orchestration-pattern.md) | **Event-driven registry-based orchestration (IMPLEMENTED)**       |
| Agent Orchestration       | [architecture/agent-orchestration.md](architecture/agent-orchestration.md)     | Prometheus layer, planner agent, specialized sub-agents           |
| Workflow Engine           | [architecture/workflow-engine.md](architecture/workflow-engine.md)             | Event-driven (complete) + explicit workflows (planned)            |
| Execution Layer           | [architecture/execution-layer.md](architecture/execution-layer.md)             | Janus Service, Aegis Service, Match(), Job.Send()                 |
| Data Layer                | [architecture/data-layer.md](architecture/data-layer.md)                       | Neo4j, Parquet/S3, ML Platform, Vector DB                         |
| Shared Services           | [architecture/shared-services.md](architecture/shared-services.md)             | Agora (Capability Registry), GetTargetTasks(), ESS, AGS           |
| **Roadmap**               |                                                                                |                                                                   |
| Overview                  | [roadmap/overview.md](roadmap/overview.md)                                     | Year-long strategic vision and major milestones                   |
| Q3FY25                    | [roadmap/q3fy25.md](roadmap/q3fy25.md)                                         | Core AI Orchestrator Infrastructure                               |
| Q4FY25                    | [roadmap/q4fy25.md](roadmap/q4fy25.md)                                         | Bring Threat Intelligence In-House                                |
| Q1FY26                    | [roadmap/q1fy26.md](roadmap/q1fy26.md)                                         | Disrupt Vulnerability Management                                  |
| Q2FY26                    | [roadmap/q2fy26.md](roadmap/q2fy26.md)                                         | Launch ASM Community Edition                                      |
| **Requirements**          |                                                                                |                                                                   |
| Requirements Index        | [requirements/index.md](requirements/index.md)                                 | Functional and non-functional requirements                        |
| **Development Guides**    |                                                                                |                                                                   |
| Agent Development         | [agent-development.md](agent-development.md)                                   | How to create security agents at scale                            |
| **References**            |                                                                                |                                                                   |
| Glossary                  | [references/glossary.md](references/glossary.md)                               | Term definitions and acronyms                                     |
| Academic Papers           | [references/academic-papers.md](references/academic-papers.md)                 | Research citations and foundations                                |
| Code Components           | [references/code-components.md](references/code-components.md)                 | PoC references and implementations                                |

---

## Implementation Status (as of Jan 2026)

| Layer                          | Status          | Completeness |
| ------------------------------ | --------------- | ------------ |
| Interface Layer                | Mostly Complete | 85%          |
| **Event-Driven Orchestration** | **Complete**    | **95%**      |
| Agent Orchestration (AI)       | Partial         | 35%          |
| Workflow Engine (Explicit)     | Not Started     | 5%           |
| Execution Layer                | Mostly Complete | 80%          |
| Data Layer                     | Mostly Complete | 75%          |
| Shared Services                | Partial         | 55%          |

**Overall**: ~60% of PRD implemented

> **Important Clarification**: The "Workflow Engine" status refers to **explicit workflow definitions** (Temporal.io, operator-defined attack chains). Chariot has a fully implemented **event-driven orchestration** system that provides automatic capability chaining. See [orchestration-pattern.md](architecture/orchestration-pattern.md) for details.

> **Note**: This document describes both the specification (PRD) and current implementation reality. Status indicators throughout show what is complete (), partial (), or not started ().

---

## Executive Summary

### Vision

Chariot is the foundation of Praetorian's transformation from consultancy to technology company, delivering offensive security at scale. The platform creates a continuously operating, semi-autonomous offensive security system that acts as an AI-powered "exoskeleton" for security professionals, automating complex multi-step attack sequences through a planner-and-sub-agent hierarchy while retaining human oversight.

### Key Tenets

1. **Autonomous Operation** - Gradually reducing human intervention through task-based execution triggered by AI analysis of findings
2. **Intelligent Orchestration** - AI agents reason about attack surfaces, interpret findings, prioritize actions via high-level task APIs
3. **Proprietary Intelligence** - Capturing operational telemetry to train specialized models that outperform general-purpose LLMs
4. **Scalability & Efficiency** - Go-based execution layer with efficient data formats (Parquet) on robust AWS infrastructure
5. **Unified Platform** - Integrating internal capabilities and wrapped tools into a cohesive system
6. **Cross-Domain Synergy** - Leveraging all access points (source code, cloud, network) as an integrated whole

### Goals

- Automate multi-step attack sequences via agent-driven task requests
- Handle continuous high-volume operations efficiently on AWS
- Enable operator-defined workflows alongside AI-driven planning
- Implement fine-grained safety controls within execution layer
- Capture telemetry for training specialized AI models
- Establish metrics for AI agent effectiveness and feedback-driven improvement

---

## Architecture at a Glance

```
+------------------------------------------------------------------+
|                       INTERFACE LAYER   (85%)                   |
|  [GUI ] [CLI ] [Burp Plugin ] [Cursor/MCP ] [APIs ]      |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|         AGENT ORCHESTRATION LAYER (Prometheus)   (35%)         |
|  +------------------+  +-------------------------------------+   |
|  | Planner Agent  |  | Specialized Sub-Agents              |   |
|  | - Goal breakdown |  | - N-Day Exploitation              |   |
|  | - Task discovery |  | - Zero-Day Discovery (HPTSA)      |   |
|  | - Context aware  |  | - Vulnerability Signature Gen     |   |
|  +------------------+  +-------------------------------------+   |
|              [Framework Abstraction Layer]                      |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|          EVENT-DRIVEN ORCHESTRATION   (95%) [IMPLEMENTED]       |
|  +------------------+  +------------------+  +----------------+   |
|  | Match()        |  | spawnAll()     |  | GetTargetTasks |   |
|  | Pre-exec gate    |  | Auto-chaining    |  |  Registry    |   |
|  +------------------+  +------------------+  +----------------+   |
|  +------------------+  +------------------+                       |
|  | Job.Send()     |  | LocalProcessor |   See:                |
|  | Kinesis stream   |  | Result handler   |   orchestration-     |
|  +------------------+  +------------------+   pattern.md          |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|              EXPLICIT WORKFLOW ENGINE   (5%) [PLANNED]          |
|  Phase 0: PoC     | Phase 2: Temporal  | Phase 3: UI        |
|  Phase 4: Advanced Logic-Driven Orchestration                   |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                      EXECUTION LAYER   (80%)                    |
|  +------------------+  +------------------+  +----------------+   |
|  | Janus Service  |  | Aegis Service  |  | Auth Engine  |   |
|  | (External)       |  | (Internal)       |  | (Replay)       |   |
|  | - Task API     |  | - VQL Artifacts  |  | - Token Mgmt   |   |
|  | - Go Capabilities|  | - Agent Fleet    |  | - Access Broker|   |
|  +------------------+  +------------------+  +----------------+   |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                        DATA LAYER   (75%)                       |
|  [Neo4j ]  [S3/Parquet ]  [SageMaker ]  [Vector DB ]      |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                    SHARED SERVICES   (55%)                      |
|  [Agora Registry ]  [ESS ]  [AGS - Attack Graph ]           |
+------------------------------------------------------------------+
```

**Legend**: Complete | Partial | Not Started

### Layer Descriptions

| Layer                          | Purpose                                         | Key Components                                                                            |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Interface**                  | Human and system interaction points             | Web GUI, chariot-cli, Burp Suite plugin, Cursor/MCP integration, REST APIs                |
| **Agent Orchestration**        | AI-driven planning and task decomposition       | Planner Agent, specialized sub-agents (Recon, SQLi, XSS, Zero-Day), framework abstraction |
| **Event-Driven Orchestration** | Automatic capability chaining via type matching | Match(), Job.Send(), spawnAll(), LocalProcessor, GetTargetTasks()                         |
| **Explicit Workflow Engine**   | Operator-defined attack chains (future)         | Temporal.io, visual builder, workflow transform engine                                    |
| **Execution**                  | Direct target interaction                       | Janus (external), Aegis (internal/VQL), Authentication Engine                             |
| **Data**                       | Persistent storage and ML infrastructure        | Neo4j for structured data, Parquet/S3 for telemetry, SageMaker for model training         |
| **Shared Services**            | Cross-cutting platform capabilities             | Agora (capability registry), ESS (attack surface state), AGS (attack path planning)       |

---

## Core Architectural Principles

| Principle                      | Description                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Task-Based Abstraction**     | Agents request high-level offensive tasks (e.g., PerformReconnaissance) via well-defined APIs                |
| **Capability Registry**        | Central metadata catalog (Agora) defines what each capability does, where it runs, and under what conditions |
| **Executor Agnosticism**       | Planning layer requests actions by intent; platform routes to appropriate executor                           |
| **Capability-Based Execution** | High-level tasks are fulfilled by orchestrating sequences of atomic capabilities                             |
| **Dual Orchestration**         | Supports both AI-driven dynamic planning and operator-defined deterministic workflows                        |

---

## Roadmap Overview

| Quarter    | Major Milestone                     | Focus                                                  | Status      |
| ---------- | ----------------------------------- | ------------------------------------------------------ | ----------- |
| **Q3FY25** | Core AI Orchestrator Infrastructure | Planner Agent MVP, PS onboarding, PlexTrac integration | Partial     |
| **Q4FY25** | Bring Threat Intelligence In-House  | Bug bounty deployment, internal exploit feed           | In Progress |
| **Q1FY26** | Disrupt Vulnerability Management    | Autonomous signature generation from CVEs              | Not Started |
| **Q2FY26** | Launch ASM Community Edition        | Freemium offering, user data flywheel                  | Not Started |
| **Q3FY26** | Disrupt BAS Market                  | EDR/SIEM integration, ATT&CK dashboards                | Not Started |
| **Q4FY26** | Hunt for Zero-Days                  | Hierarchical agent teams, hypothesis testing           | Not Started |

**Roadmap Status Notes**:

- Q3FY25: Interface Layer (), Execution Layer (), Agent basic infrastructure ()
- Q4FY25: Workflow Engine prerequisites not yet met
- Q1FY26+: Depends on Workflow Engine and AGS implementation

---

## Key Implementation Notes

The following deviations from the PRD specification are intentional architectural choices:

| Spec Says             | Implementation Uses         | Rationale                                                      |
| --------------------- | --------------------------- | -------------------------------------------------------------- |
| Google ADK            | AWS Bedrock + Claude        | Native AWS integration, equivalent capabilities                |
| gRPC Task API         | REST over API Gateway       | Better Lambda compatibility, easier debugging                  |
| Pinecone/Qdrant       | pgvector on Aurora          | Single-vendor AWS architecture, reduced operational complexity |
| Parquet data format   | GOB binary format           | Current choice; Parquet migration planned for ML pipeline      |
| Explicit OPA policies | Intensity-based constraints | Simpler implementation, meets current operational needs        |
| Temporal.io workflows | Event-driven orchestration  | Type-based routing via registry; more flexible for discovery   |

**Key Insight - Orchestration Paradigm**:

Chariot does NOT lack workflow orchestration - it implements a **different paradigm**:

- **Event-Driven Orchestration** (IMPLEMENTED): Capabilities declare input/output types; system automatically chains based on type matching via `Match()`, `Job.Send()`, and `spawnAll()`
- **Explicit Workflows** (PLANNED): Operator-defined attack chains using Temporal.io for deterministic, multi-step procedures

See [orchestration-pattern.md](architecture/orchestration-pattern.md) for the complete event-driven system documentation.

**Critical Gaps for PRD Vision**:

1. **Explicit Workflow Engine** - Not yet built; blocks operator-defined attack chains (event-driven orchestration handles discovery workflows)
2. **SageMaker ML Pipeline** - Not started; blocks "Proprietary Intelligence" tenet
3. **Attack Graph Service (AGS)** - Not started; blocks strategic attack path planning
4. **Zero-Day Discovery Agents** - Not started; blocks "Hunt for Zero-Days" milestone

---

## How to Use This Document

> **Note**: This document describes both the PRD specification AND current implementation reality. Look for status indicators ( ) throughout to understand what is available today versus planned.

| If you need to...                       | Read this file                                                             |
| --------------------------------------- | -------------------------------------------------------------------------- |
| Understand the overall vision and goals | This document (OVERVIEW.md)                                                |
| Learn core architectural principles     | [architecture/core-principles.md](architecture/core-principles.md)         |
| Understand user-facing interfaces       | [architecture/interface-layer.md](architecture/interface-layer.md)         |
| Design agent interactions               | [architecture/agent-orchestration.md](architecture/agent-orchestration.md) |
| Build workflow automation               | [architecture/workflow-engine.md](architecture/workflow-engine.md)         |
| Integrate with execution services       | [architecture/execution-layer.md](architecture/execution-layer.md)         |
| Work with data storage/ML               | [architecture/data-layer.md](architecture/data-layer.md)                   |
| Use shared platform services            | [architecture/shared-services.md](architecture/shared-services.md)         |
| Plan feature development timing         | [roadmap/overview.md](roadmap/overview.md)                                 |
| Implement specific quarter features     | [roadmap/q3fy25.md](roadmap/q3fy25.md), etc.                               |
| Check requirement specifications        | [requirements/index.md](requirements/index.md)                             |
| Look up terminology                     | [references/glossary.md](references/glossary.md)                           |
| Find academic foundations               | [references/academic-papers.md](references/academic-papers.md)             |
| Reference code implementations          | [references/code-components.md](references/code-components.md)             |

---

## Key Terminology

| Term           | Definition                                                                   |
| -------------- | ---------------------------------------------------------------------------- |
| **Prometheus** | Agent Orchestration Layer - the AI planning and coordination system          |
| **Agora**      | Capability Registry - central metadata catalog for all platform capabilities |
| **Janus**      | Execution service for external targets (Go-based, Task API)                  |
| **Aegis**      | Execution service for internal targets (VQL-based, Velociraptor agents)      |
| **ESS**        | Environment State Service - read-only API for attack surface context         |
| **AGS**        | Attack Graph Service - attack path planning and reasoning                    |
| **HPTSA**      | Hierarchical Planning and Task-Specific Agents pattern                       |

---

## Related Resources

- **Source Document:** `/chariot-ai-architecture.md` (full PRD)
- **Module Documentation:** `/modules/chariot/CLAUDE.md`
- **Backend Architecture:** `/modules/chariot/backend/CLAUDE.md`
- **Skill Library:** `/.claude/skill-library/`

---

_This is a gateway document for progressive disclosure. For detailed specifications, navigate to the linked subdocuments._
