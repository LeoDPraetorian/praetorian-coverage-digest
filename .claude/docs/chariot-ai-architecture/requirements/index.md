[ Back to Overview](../OVERVIEW.md)

# Requirements Index

This index provides a categorized overview of all requirements for the Chariot AI Architecture platform.

## Implementation Status Summary

Based on codebase analysis (Jan 2026):

| Category               | Complete | Partial | Not Started |
| ---------------------- | -------- | ------- | ----------- |
| Testing (REQ-TEST)     | 1        | 1       | 1           |
| Agents (REQ-AGENT)     | 3        | 5       | 7           |
| Workflow (REQ-WF)      | 0        | 0       | 10          |
| UI (REQ-UI)            | 12       | 3       | 2           |
| Data (REQ-MODEL/QURY)  | 4        | 2       | 8           |
| Capabilities (REQ-CAP) | 8        | 5       | 8           |
| Performance (REQ-PERF) | 0        | 2       | 3           |
| Zero-Day (REQ-ZDAY)    | 0        | 0       | 4           |

### Status Legend

- Complete - Implemented and operational
- Partial - Some implementation exists
- Not Started - No implementation found
- Planned - Scheduled for future quarter

## Critical Gaps

These requirements block key platform goals:

| REQ ID       | Requirement          | Blocks                           |
| ------------ | -------------------- | -------------------------------- |
| REQ-WF-\*    | Workflow Engine      | Operator-defined attack chains   |
| REQ-ZDAY-\*  | Zero-Day Discovery   | Q2FY26 "Hunt for Zero-Days"      |
| REQ-PERF-\*  | ML Pipeline          | "Proprietary Intelligence" tenet |
| REQ-GRAPH-\* | Attack Graph Service | Strategic attack planning        |

## Requirements by Category

### Testing Requirements (REQ-TEST-\*)

| REQ ID                                  | Status      | Requirement                                                  |
| --------------------------------------- | ----------- | ------------------------------------------------------------ |
| [REQ-TEST-001](testing.md#req-test-001) | Not Started | Automated Testing & Self-Healing Framework                   |
| [REQ-TEST-002](testing.md#req-test-002) | Not Started | Implement Proactive Integration Health Monitoring & Alerting |
| [REQ-TEST-003](testing.md#req-test-003) | Not Started | Comprehensive Monitoring of Deployments                      |

### Data Model Requirements (REQ-MODEL-\*)

| REQ ID                                 | Status   | Requirement                        |
| -------------------------------------- | -------- | ---------------------------------- |
| [REQ-MODEL-001](data.md#req-model-001) | Complete | Computationally Intelligent Models |
| [REQ-MODEL-002](data.md#req-model-002) | Complete | Automatic Relationship Linking     |

### Query & Data Requirements (REQ-QURY-_, REQ-DATA-_, REQ-PIPE-\*)

| REQ ID                               | Status      | Requirement                                      |
| ------------------------------------ | ----------- | ------------------------------------------------ |
| [REQ-QURY-001](data.md#req-qury-001) | Incomplete  | Query Builder                                    |
| [REQ-DATA-001](data.md#req-data-001) | Complete    | Structured Findings Storage                      |
| [REQ-DATA-002](data.md#req-data-002) | Not Started | Raw Capability Telemetry Storage                 |
| [REQ-DATA-003](data.md#req-data-003) | Not Started | Migrate ML Pipeline to AWS SageMaker             |
| [REQ-DATA-004](data.md#req-data-004) | Not Started | Agent & Task Interaction Logging                 |
| [REQ-DATA-005](data.md#req-data-005) | Not Started | Track Workflow Execution State                   |
| [REQ-PIPE-001](data.md#req-pipe-001) | Complete    | Data Pipeline for Model Training                 |
| [REQ-PIPE-002](data.md#req-pipe-002) | Not Started | Performance Feedback Data Pipeline               |
| [REQ-PIPE-003](data.md#req-pipe-003) | Not Started | Train Proprietary CVE Signature Generation Model |
| [REQ-PIPE-004](data.md#req-pipe-004) | Not Started | Planner Model Feedback Pipeline                  |

### Agent Requirements (REQ-AGENT-\*)

| REQ ID                                   | Status      | Requirement                                  |
| ---------------------------------------- | ----------- | -------------------------------------------- |
| [REQ-AGENT-001](agents.md#req-agent-001) | Not Started | Integration via Model Context Protocol (MCP) |
| [REQ-AGENT-002](agents.md#req-agent-002) | Not Started | Planner Agent MVP with Hardcoded Workflows   |
| [REQ-AGENT-003](agents.md#req-agent-003) | Not Started | Specialized Account Takeover (ATO) Agent     |
| [REQ-AGENT-004](agents.md#req-agent-004) | Not Started | Specialized SQL Injection Sub Agent          |
| [REQ-AGENT-005](agents.md#req-agent-005) | Not Started | CVE Generator Agent                          |
| [REQ-AGENT-006](agents.md#req-agent-006) | Not Started | Context Aware Semgrep Rule Generator Agent   |
| [REQ-AGENT-007](agents.md#req-agent-007) | Not Started | Asset Scoring & Prioritization Engine        |
| [REQ-AGENT-008](agents.md#req-agent-008) | Not Started | Enhance the Planner Agent's Initial Logic    |
| [REQ-AGENT-009](agents.md#req-agent-009) | Not Started | AutoTriage Integration                       |
| [REQ-AGENT-010](agents.md#req-agent-010) | Not Started | Planner Agent Validator Integration          |
| [REQ-AGENT-011](agents.md#req-agent-011) | Not Started | Enhance MCP for Multi-Agent Communication    |
| [REQ-AGENT-012](agents.md#req-agent-012) | Not Started | Planner Agent Performance Metrics            |
| [REQ-AGENT-013](agents.md#req-agent-013) | Not Started | Integrate RAG into Agent Orchestration Layer |
| [REQ-AGENT-014](agents.md#req-agent-014) | Not Started | Implement External Memory Mechanisms         |
| [REQ-AGENT-015](agents.md#req-agent-015) | Not Started | Incorporate Reinforcement Learning           |

### Workflow Requirements (REQ-WF-\*)

| REQ ID                               | Status      | Requirement                                             |
| ------------------------------------ | ----------- | ------------------------------------------------------- |
| [REQ-WF-001](workflow.md#req-wf-001) | Not Started | Sequential Workflow Execution                           |
| [REQ-WF-002](workflow.md#req-wf-002) | Not Started | Workflow Transform Engine                               |
| [REQ-WF-003](workflow.md#req-wf-003) | Not Started | Workflow Input Parameterization                         |
| [REQ-WF-004](workflow.md#req-wf-004) | Not Started | Develop Asset Reconciliation Workflow                   |
| [REQ-WF-005](workflow.md#req-wf-005) | Not Started | Manual Finding Feedback Loop                            |
| [REQ-WF-006](workflow.md#req-wf-006) | Not Started | Bug Bounty Human Review & Submission Workflow           |
| [REQ-WF-007](workflow.md#req-wf-007) | Not Started | Registry-Backed Routing                                 |
| [REQ-WF-008](workflow.md#req-wf-008) | Not Started | Advanced Operator-Defined Workflow Engine               |
| [REQ-WF-009](workflow.md#req-wf-009) | Not Started | Develop Autonomous Nuclei Signature Validation Workflow |
| [REQ-WF-010](workflow.md#req-wf-010) | Not Started | Automate Registration of Generated Signatures           |

### UI Requirements (REQ-UI-\*)

| REQ ID                         | Status      | Requirement                                         |
| ------------------------------ | ----------- | --------------------------------------------------- |
| [REQ-UI-001](ui.md#req-ui-001) | Not Started | Engagement & Subscription Management UI             |
| [REQ-UI-002](ui.md#req-ui-002) | Not Started | Visualize Environmental Context in Graph Explorer   |
| [REQ-UI-003](ui.md#req-ui-003) | Not Started | Context Specific Asset and Vulnerability Sub Tables |
| [REQ-UI-004](ui.md#req-ui-004) | Not Started | Workflow UI Builder                                 |
| [REQ-UI-005](ui.md#req-ui-005) | Not Started | Workflow Run History                                |
| [REQ-UI-006](ui.md#req-ui-006) | Not Started | Deliver Planner Agent CLI Interaction Tool          |
| [REQ-UI-007](ui.md#req-ui-007) | Not Started | Deliver Planner Agent GUI Interaction Tool          |
| [REQ-UI-008](ui.md#req-ui-008) | Not Started | Refine Burp Plugin UI                               |
| [REQ-UI-009](ui.md#req-ui-009) | Not Started | Build Asset Discovery Gap Dashboard                 |
| [REQ-UI-010](ui.md#req-ui-010) | Not Started | Define & Manage Attack Chains                       |
| [REQ-UI-011](ui.md#req-ui-011) | Not Started | Implement Attack Path Visualization                 |
| [REQ-UI-012](ui.md#req-ui-012) | Not Started | Build Vulnerability Discovery Gap Dashboard         |
| [REQ-UI-013](ui.md#req-ui-013) | Not Started | Signature Review & Test Interface                   |
| [REQ-UI-014](ui.md#req-ui-014) | Not Started | AI Performance Dashboard                            |
| [REQ-UI-015](ui.md#req-ui-015) | Not Started | Interactive Attack Path Visualization               |
| [REQ-UI-016](ui.md#req-ui-016) | Not Started | MITRE ATT&CK Coverage Navigator                     |
| [REQ-UI-017](ui.md#req-ui-017) | Not Started | MITRE D3FEND Coverage Navigator                     |

### Capability Requirements (REQ-CAP-_, REQ-AEGS-_, REQ-PLEX-\*)

| REQ ID                                       | Status      | Requirement                                    |
| -------------------------------------------- | ----------- | ---------------------------------------------- |
| [REQ-CAP-001](capabilities.md#req-cap-001)   | Complete    | Native Go Capability (Janus) Integration       |
| [REQ-CAP-002](capabilities.md#req-cap-002)   | Complete    | External Tool (Janus) Integration              |
| [REQ-CAP-003](capabilities.md#req-cap-003)   | Not Started | Intelligent Back-off Capability                |
| [REQ-CAP-004](capabilities.md#req-cap-004)   | Not Started | Add Login Attack Capabilities                  |
| [REQ-CAP-005](capabilities.md#req-cap-005)   | Not Started | Asset Deduplication Capability                 |
| [REQ-CAP-006](capabilities.md#req-cap-006)   | Not Started | Comprehensive Multi-Protocol Scanning Workflow |
| [REQ-CAP-007](capabilities.md#req-cap-007)   | Not Started | Evergreen Capability Development               |
| [REQ-AEGS-001](capabilities.md#req-aegs-001) | Complete    | Internal Tool (Aegis) Integration              |
| [REQ-AEGS-002](capabilities.md#req-aegs-002) | Incomplete  | Aegis <-> Chariot E2E Capabilities Execution   |
| [REQ-AEGS-003](capabilities.md#req-aegs-003) | Incomplete  | Integrate Network Capability Backlog           |
| [REQ-AEGS-004](capabilities.md#req-aegs-004) | Not Started | Aegis Agent Installer                          |
| [REQ-AEGS-005](capabilities.md#req-aegs-005) | Not Started | Integrate Aegis Tunneling                      |
| [REQ-AEGS-006](capabilities.md#req-aegs-006) | Not Started | Aegis Agent Quality of Life Improvements       |
| [REQ-PLEX-001](capabilities.md#req-plex-001) | Incomplete  | PlexTrac Integration                           |

### Performance Metrics Requirements (REQ-PERF-\*)

| REQ ID                                              | Status      | Requirement               |
| --------------------------------------------------- | ----------- | ------------------------- |
| [REQ-PERF-001](performance-metrics.md#req-perf-001) | Not Started | Measure AI Effectiveness  |
| [REQ-PERF-002](performance-metrics.md#req-perf-002) | Not Started | Measure AI Efficiency     |
| [REQ-PERF-003](performance-metrics.md#req-perf-003) | Not Started | Measure AI Stability      |
| [REQ-PERF-004](performance-metrics.md#req-perf-004) | Not Started | Measure AI Safety         |
| [REQ-PERF-005](performance-metrics.md#req-perf-005) | Not Started | Measure AI Generalization |

### Zero-Day & BAS Requirements (REQ-ZDAY-_, REQ-BAS-_)

| REQ ID                                   | Status      | Requirement                                     |
| ---------------------------------------- | ----------- | ----------------------------------------------- |
| [REQ-ZDAY-001](zero-day.md#req-zday-001) | Not Started | Zero-Day Discovery Agent Team                   |
| [REQ-ZDAY-002](zero-day.md#req-zday-002) | Not Started | Hypothesis Generation Capability                |
| [REQ-ZDAY-003](zero-day.md#req-zday-003) | Not Started | Vulnerability Class Expertise                   |
| [REQ-ZDAY-004](zero-day.md#req-zday-004) | Not Started | Finding Synthesis                               |
| [REQ-BAS-001](zero-day.md#req-bas-001)   | Not Started | EDR & SIEM Integration for Detection Monitoring |
| [REQ-BAS-002](zero-day.md#req-bas-002)   | Not Started | Detection Correlation Engine                    |
| [REQ-BAS-003](zero-day.md#req-bas-003)   | Not Started | MITRE ATT&CK Mapping                            |
| [REQ-BAS-004](zero-day.md#req-bas-004)   | Not Started | MITRE D3FEND Mapping                            |

### Non-Functional Requirements (NFR-\*)

| REQ ID                                           | Status | Requirement                        |
| ------------------------------------------------ | ------ | ---------------------------------- |
| [NFR-OBS-001](non-functional.md#nfr-obs-001)     | -      | Observability (Metrics & Tracing)  |
| [NFR-SEC-001](non-functional.md#nfr-sec-001)     | -      | Audit Logging                      |
| [NFR-SEC-002](non-functional.md#nfr-sec-002)     | -      | External Tool Security Lifecycle   |
| [NFR-SEC-003](non-functional.md#nfr-sec-003)     | -      | VPC-Restricted Administrative APIs |
| [NFR-PERF-001](non-functional.md#nfr-perf-001)   | -      | Performance Targets                |
| [NFR-DR-001](non-functional.md#nfr-dr-001)       | -      | Disaster Recovery                  |
| [NFR-SCALE-001](non-functional.md#nfr-scale-001) | -      | Scalability                        |
| [NFR-DATA-001](non-functional.md#nfr-data-001)   | -      | Data Contract Definition           |
| [NFR-DATA-002](non-functional.md#nfr-data-002)   | -      | Data Lake Schema Evolution         |

### Architecture Requirements (REQ-ARCH-\*)

| REQ ID                                         | Status      | Requirement                                             |
| ---------------------------------------------- | ----------- | ------------------------------------------------------- |
| [REQ-ARCH-001](non-functional.md#req-arch-001) | Complete    | Janus Service Architecture                              |
| [REQ-ARCH-002](non-functional.md#req-arch-002) | Not Started | External IP Allocation for Specific Services            |
| [REQ-ARCH-003](non-functional.md#req-arch-003) | Not Started | Prometheus Agent Orchestration Service                  |
| [REQ-ARCH-004](non-functional.md#req-arch-004) | Not Started | Multi-Region Deployment Capability                      |
| [REQ-ARCH-005](non-functional.md#req-arch-005) | Not Started | Single-Tenant Deployment Model                          |
| [REQ-ARCH-006](non-functional.md#req-arch-006) | Not Started | Agent and Operator Requests Run on "Fast Path" Pipeline |
| [REQ-ARCH-007](non-functional.md#req-arch-007) | Not Started | Distributed Execution Framework                         |
| [REQ-ARCH-008](non-functional.md#req-arch-008) | Incomplete  | Container-Based Microservice Architecture               |

## Quick Navigation

- [Testing Requirements](testing.md) Partial - Automated testing, integration health, deployment monitoring
- [Agent Requirements](agents.md) Partial - Agent architecture, sub-agents, learning/RL
- [Workflow Requirements](workflow.md) Not Started - Workflow engine, operator-defined workflows
- [UI Requirements](ui.md) Mostly Complete - Dashboard, attack path visualization, MITRE navigators
- [Data Requirements](data.md) Partial - Data model, query builder, telemetry/logging
- [Capability Requirements](capabilities.md) Mostly Complete - Capability development, Aegis, PlexTrac
- [Performance Metrics](performance-metrics.md) Partial - AI effectiveness, stability, safety metrics
- [Zero-Day & BAS](zero-day.md) Not Started - Zero-day discovery, breach & attack simulation
- [Non-Functional Requirements](non-functional.md) Partial - Scalability, security, performance
