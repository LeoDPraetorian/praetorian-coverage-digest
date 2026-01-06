[ Back to Overview](../OVERVIEW.md)

# Capability Requirements

This document contains all capability-related requirements for the Chariot AI Architecture platform, including capability development, Aegis integration, and PlexTrac integration.

## Summary

| Status      | Count  |
| ----------- | ------ |
| Complete    | 3      |
| Incomplete  | 4      |
| Not Started | 14     |
| **Total**   | **21** |

---

## Native Capability Integration

### REQ-CAP-001

**Native Go Capability (Janus) Integration**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Janus task execution logic should leverage refactored native Go capabilities (evolved from current Links) for underlying actions.

**Rationale:**

Performance, maintainability, code reuse within the Go execution engine.

---

### REQ-CAP-002

**External Tool (Janus) Integration**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Janus task execution logic should leverage refactored external tool execution mechanisms (evolved from YAMLLink, using YAML internally) for underlying actions.

**Rationale:**

Leverage existing open-source tools without rewriting as components of tasks.

---

## Adaptive Capabilities

### REQ-CAP-003

**Intelligent Back-off Capability**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Enhance scanning tasks to monitor for blocking/rate-limiting and automatically re-trigger the task with more conservative parameters from a new IP.

**Rationale:**

Builds immediate resilience into core discovery capabilities, allowing agents to adapt to target defenses instead of failing.

---

### REQ-CAP-004

**Add Login Attack Capabilities**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Add new capabilities for attacking login portals, such as TryDefaultCredentials, CheckForOpenRegistration, LeverageCustomerGeneratedCredentials, AttemptCredentialStuffing, etc.

**Rationale:**

This expands the agent's "vocabulary" with a focused set of offensive actions, allowing it to perform a complete, meaningful attack sequence against login portals.

---

### REQ-CAP-005

**Asset Deduplication Capability**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Implement a Janus task that uses techniques like SimHash on page content and ImageHash on screenshots to identify and group visually or functionally similar assets.

**Rationale:**

Prevents wasting resources by repeatedly testing cloned or staging environments, improving efficiency in large-scale programs.

---

### REQ-CAP-006

**Comprehensive Multi-Protocol Scanning Workflow (Nuclei+)**

| Field        | Value           |
| ------------ | --------------- |
| **Status**   | Not Started     |
| **Target**   | Q3FY25 - Q2FY26 |
| **Priority** | High            |

**Description:**

1. Develop/enhance discrete Janus capabilities for Port Scanning (nmap), Service Fingerprinting (fingerprintx), and Targeted Nuclei Scanning
2. Implement the HTTP/2 support check as a dynamic helper function for Nuclei templates
3. Define a new ComprehensivePortScan workflow in the Prometheus engine that orchestrates the Discover -> Fingerprint -> Scan sequence
4. Design the underlying protocol expansion capabilities as a plugin framework to encourage future open-source contributions

**Rationale:**

Dramatically increases our vulnerability detection coverage beyond HTTP(S), bringing us closer to parity with commercial scanners like Nessus. This is a critical step in expanding our attack surface to find more material risks.

---

### REQ-CAP-007

**Evergreen Capability Development**

| Field        | Value           |
| ------------ | --------------- |
| **Status**   | Not Started     |
| **Target**   | Q3FY25 - Q4FY26 |
| **Priority** | Medium          |

**Description:**

Time permitting, continue to develop a prioritized set of new network, cloud, and application capabilities into Janus and Aegis, based on ProServ and MS needs.

**Rationale:**

Continuously increases the platform's core value by expanding its ability to find material risks in key environments.

---

## Aegis Integration

### REQ-AEGS-001

**Internal Tool (Aegis) Integration**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Aegis task execution logic must leverage a standardized, configuration-driven mechanism for defining and running internal assessment capabilities (e.g., VQL queries, host-based scripts).

**Rationale:**

This establishes Aegis as the primary executor for internal network and host-based tasks. It ensures that the diverse set of internal tools can be consistently registered with Agora.

---

### REQ-AEGS-002

**Aegis <-> Chariot E2E Capabilities Execution**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Establish end-to-end connectivity between Aegis and Chariot to enable seamless execution of Aegis capabilities within the Chariot platform.

**Rationale:**

Provides a unified platform experience by integrating Aegis' automated discovery and execution capabilities directly into Chariot workflows, reducing silos and enhancing efficiency for operators managing internal networks and agents.

---

### REQ-AEGS-003

**Integrate Network Capability Backlog**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Complete the integration and registration for all outstanding internal capabilities identified at the end of Q2.

**Rationale:**

Expands the set of tools available to all workflows and agents.

---

### REQ-AEGS-004

**Aegis Agent Installer**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Incorporate the agent installer process into Chariot. Today, Customers download the Aegis agent out of band. The agent can be used on MacOS, Windows, or Linux.

It's possible that customers will need to download one, a combination, or all types. In addition to the different downloads, each OS will require basic information on how to install the agent on their systems.

**Rationale:**

Streamlines the deployment process and improves customer onboarding experience.

---

### REQ-AEGS-005

**Integrate Aegis Tunneling**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Incorporate the existing Aegis tunneling functionality directly into the Chariot platform.

1. **Backend Capability:** Develop a new capability, StartAegisTunnel, that can be invoked via the Unified Capability API. This capability will command a target Aegis agent to establish a secure tunnel to a specified internal host and port

2. **UI Integration:** Add a "Start Tunnel" control within the Chariot UI, allowing an operator to easily initiate a tunnel to an asset discovered by an Aegis agent

3. **Operator Feedback:** The UI must clearly communicate the status of the tunnel and provide the operator with the local address and port to connect to for manual validation

**Rationale:**

This is a must-have feature for Q3 to successfully onboard the MSP and PS teams. It bridges the critical gap between automated discovery and manual validation, allowing operators to seamlessly investigate findings on internal networks without leaving the Chariot workflow.

---

### REQ-AEGS-006

**Aegis Agent Quality of Life Improvements**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | Medium      |

**Description:**

Aegis Agent Quality of Life Improvements:

- Interactive mode support
- Autocompletion support
- Built-in SSH support
- Bulk capability execution
- Large data transfers

**Rationale:**

Clears existing technical debt and quality of life issues.

---

## PlexTrac Integration

### REQ-PLEX-001

**PlexTrac Integration**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Finalize the data mapping and API integration to allow seamless, one-click submission of validated Chariot findings into PlexTrac reports.

**Rationale:**

A critical requirement to streamline workflows for the Professional Services team and improve reporting efficiency.

---

## Task & API Requirements

### REQ-TASK-001

**High-Level Task Execution**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

The Janus Service must implement and execute high-level offensive tasks (e.g., PerformReconnaissance, AchieveInitialAccess, ExecuteLateralMovement) requested via its API, leveraging the intelligent models. These tasks must be dynamically registered with the Capability Registry (Agora) at service startup, including comprehensive metadata about parameters, constraints, and execution requirements.

**Rationale:**

Provides effective abstraction for LLM agents, simplifies agent planning.

---

### REQ-TASK-002

**Agora Dynamic Capabilities/Task Registration**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Enable Janus and Aegis to dynamically register their available tasks and capabilities with the Capability Registry at startup.

**Rationale:**

Ensures the registry accurately reflects available capabilities without manual configuration.

---

### REQ-TASK-003

**Rich Task Metadata**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Store comprehensive metadata for each task including parameters, constraints, examples, and relevant vulnerability mappings.

**Rationale:**

Enables agents to make informed decisions about task selection and proper invocation.

---

### REQ-TASK-004

**Task Recommendation Engine**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Implement a recommendation system within the Task Discovery API that suggests relevant tasks based on context, target type, and goals.

**Rationale:**

Enhances agent planning by guiding them toward appropriate tasks for specific scenarios.

---

### REQ-API-001

**Implement the Unified Capability API**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Deliver the set of APIs required for clients (agents, operators) to discover, execute, and manage all platform capabilities. This system includes:

1. **Discovery:** A way to discover and query all available capabilities (tools, workflows, and sub-agents) and their metadata from Agora, including execution routing rules

2. **Execution:** A way for a client to request the execution of any capability by its ID. The backend must be responsible for transparently routing the request to the correct execution engine (e.g., Janus, Aegis, a workflow orchestrator)

3. **MCP Protocol:** Adhere to a descriptive, machine-readable contract. The API must be high-level and well-documented, making it suitable for consumption by LLM-based agents

4. **Lifecycle Management:** A way for human operators to create, configure, manage, and monitor the history of complex, user-defined capabilities like workflows and sub-agents

**Rationale:**

This requirement establishes a single, consistent system for all platform interactions. It completely decouples the agents from the underlying infrastructure, simplifying their design and enabling greater platform flexibility.

---

## Configuration & Validation

### REQ-CFG-001

**Flexible Internal YAML Config**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

The internal mechanism for configuring external tool execution within Janus tasks must support dynamic inputs and defining constraints.

**Rationale:**

Enable complex workflows, enforce safety rules during task execution.

---

### REQ-VAL-001

**Validator Capability Framework**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Create a new class of Janus capability (ValidatorCapability) designed to programmatically confirm an existing Risk by re-running the attack logic.

**Rationale:**

Automates the triage process by building "second opinions" for high-confidence findings, freeing up human experts to focus on more complex issues.

---

### REQ-VAL-002

**High-Impact Attack & Validation Packages**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Develop bundled Janus capabilities for high-impact attacks (e.g., SQL Injection, SSRF) that include both the attack task and its corresponding ValidatorCapability.

**Rationale:**

Expands the platform's offensive arsenal while ensuring that all new capabilities produce high-confidence, low-noise results from day one.

---

## Related Requirements

- [REQ-AGENT-002](agents.md#req-agent-002) - Planner Agent MVP
- [REQ-WF-001](workflow.md#req-wf-001) - Sequential Workflow Execution
- [REQ-ZDAY-003](zero-day.md#req-zday-003) - Vulnerability Class Expertise
