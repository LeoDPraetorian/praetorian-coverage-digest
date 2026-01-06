[ Back to Overview](../OVERVIEW.md)

# Zero-Day Discovery & BAS Requirements

This document contains all zero-day discovery and Breach & Attack Simulation (BAS) requirements for the Chariot AI Architecture platform.

## Summary

| Status      | Count |
| ----------- | ----- |
| Not Started | 8     |
| **Total**   | **8** |

---

## Zero-Day Discovery

### REQ-ZDAY-001

**Zero-Day Discovery Agent Team**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

Implement a hierarchical team of specialized agents following the HPTSA pattern for zero-day vulnerability discovery.

**Rationale:**

Research by Zhu et al. (2025) demonstrates significantly higher success rates for zero-day discovery using specialized agent teams.

---

### REQ-ZDAY-002

**Hypothesis Generation Capability**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

Develop capability for agents to formulate vulnerability hypotheses based on reconnaissance data and test them systematically.

**Rationale:**

Fang et al. (2024a) showed hypothesis generation is the critical gap between N-day and zero-day capabilities.

---

### REQ-ZDAY-003

**Vulnerability Class Expertise**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

Develop specialized agents with deep expertise in specific vulnerability classes (SQLi, XSS, SSRF, etc.) that can be dispatched by supervisor agents.

**Rationale:**

Zhu et al. (2025) demonstrated that specialized expertise significantly improves discovery rates for specific vulnerability types.

---

### REQ-ZDAY-004

**Finding Synthesis**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

Create capabilities for correlating and synthesizing multiple test results into coherent vulnerability findings.

**Rationale:**

Complex zero-day vulnerabilities often involve multiple components and require synthesis of disparate observations.

---

## Breach & Attack Simulation (BAS)

### REQ-BAS-001

**EDR & SIEM Integration for Detection Monitoring**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

1. Develop Janus capabilities to connect to the APIs of major EDRs (CrowdStrike, MS Defender, SentinelOne) and SIEMs (Splunk) to ingest security alerts and event logs
2. These capabilities will be triggered during or after an attack workflow to gather detection evidence

**Rationale:**

This is the foundational data-gathering requirement. To provide any BAS insights, we must first have access to the raw telemetry from the client's security stack where detections (or lack thereof) are recorded.

---

### REQ-BAS-002

**Detection Correlation Engine**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

1. Implement a mechanism to tag all outbound Chariot actions with a unique, traceable correlation_id
2. Develop a backend service that processes ingested EDR/SIEM logs, searching for these IDs to link a Chariot TaskRecord to one or more external security events
3. Create logic to normalize the raw event data into a structured defense outcome (e.g., Logged, Alerted, Blocked, Prevented) and store this correlation in Neo4j

**Rationale:**

This is the architectural core of the BAS offering. It transforms disconnected attack logs and defense alerts into a single, cohesive story, enabling us to prove whether a specific action was caught or missed. Without this, the UI visualizations are impossible.

---

### REQ-BAS-003

**MITRE ATT&CK Mapping**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

Enhance the Agora capability schema in tabularium to include a mitre_attack_ttp field, mapping each offensive capability to its corresponding ATT&CK technique(s). This metadata must be populated for all relevant capabilities.

**Rationale:**

Provides the standardized language required for classifying our offensive actions. This enables the Attack Path and Navigator UIs to accurately display which TTPs are being tested, aligning our operations with industry-standard threat modeling.

---

### REQ-BAS-004

**MITRE D3FEND Mapping**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Medium      |

**Description:**

Enhance the normalized outcome model to include mapping the observed defense actions (e.g., an EDR alert for process creation) to the corresponding defensive techniques in the MITRE D3FEND framework.

**Rationale:**

This allows us to classify how a client's security controls responded using a standard defensive framework. It provides a more sophisticated level of analysis, moving beyond a simple "detected/blocked" status to describe the specific type of countermeasure that was triggered.

---

## Attack Graph Service

### REQ-GRAPH-001

**Attack Graph Service API**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Define and implement an API for the Attack Graph Service that enables agents to query for potential attack paths, evaluate path feasibility, and identify high-value targets.

**Rationale:**

Enables intelligent, goal-directed attack planning aligned with Singer et al. (2025) research.

---

### REQ-GRAPH-002

**Attack Graph Binding**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

The Attack Graph Service must consume data from ESS/Neo4j and maintain a dynamically updated graph representation of the attack surface, including potential transitions between states.

**Rationale:**

Ensures the attack graph remains current with discovered information.

---

## Related UI Requirements

| REQ ID                         | Requirement                           | Status      |
| ------------------------------ | ------------------------------------- | ----------- |
| [REQ-UI-011](ui.md#req-ui-011) | Implement Attack Path Visualization   | Not Started |
| [REQ-UI-015](ui.md#req-ui-015) | Interactive Attack Path Visualization | Not Started |
| [REQ-UI-016](ui.md#req-ui-016) | MITRE ATT&CK Coverage Navigator       | Not Started |
| [REQ-UI-017](ui.md#req-ui-017) | MITRE D3FEND Coverage Navigator       | Not Started |

---

## Academic References

The zero-day discovery and BAS requirements are informed by recent academic research:

| Year | Reference                                                                                    |
| ---- | -------------------------------------------------------------------------------------------- |
| 2025 | Zhu, Y., et al. "Teams of LLM Agents can Exploit Zero-Day Vulnerabilities"                   |
| 2025 | Singer, B., et al. "On the Feasibility of Using LLMs to Execute Multistage Network Attacks"  |
| 2025 | Dawson A., et al. "AIRTBench: Measuring Autonomous AI Red Teaming Capabilities"              |
| 2024 | Fang, R., et al. "LLM Agents can Autonomously Exploit One-day Vulnerabilities"               |
| 2024 | Gioacchini, L. et al. "AutoPenBench: Benchmarking Generative Agents for Penetration Testing" |

---

## Related Requirements

- [REQ-AGENT-003](agents.md#req-agent-003) - Specialized Account Takeover (ATO) Agent
- [REQ-AGENT-004](agents.md#req-agent-004) - Specialized SQL Injection Sub Agent
- [REQ-PERF-001](performance-metrics.md#req-perf-001) - Measure AI Effectiveness
- [REQ-PERF-005](performance-metrics.md#req-perf-005) - Measure AI Generalization
