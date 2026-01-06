# Code Components and PoC References

[<- Back to Overview](../OVERVIEW.md)

This document catalogs external code repositories, frameworks, and proof-of-concept implementations referenced in the Chariot AI Architecture.

---

## Policy and Governance

### Open Policy Agent (OPA)

- **Repository**: [github.com/open-policy-agent/opa](https://github.com/open-policy-agent/opa)
- **Documentation**: [openpolicyagent.org/docs/latest/policy-language](https://www.openpolicyagent.org/docs/latest/policy-language/)

**Chariot Integration**:
OPA provides the policy-as-code foundation for Chariot's governance layer. Used to define and enforce:

- Agent execution permissions and boundaries
- Capability access control policies
- Workflow approval gates
- Human-in-the-loop (HITL) decision points

---

## Observability and Telemetry

### OpenTelemetry

- **Repository**: [github.com/open-telemetry](https://github.com/open-telemetry)

**Chariot Integration**:
Standardized telemetry collection across the platform:

- Agent execution tracing and span propagation
- Capability performance metrics
- Workflow latency measurements
- Data Lake ingestion for AI model training
- Platform-wide observability for debugging multi-agent workflows

---

## Agent Frameworks

### Google Agent Development Kit (ADK)

- **Documentation**: [google.github.io/adk-docs](https://google.github.io/adk-docs/)

**Chariot Integration**:
Reference implementation for the Agent Framework Abstraction Layer. ADK provides:

- Structured agent definition patterns
- Tool binding and execution semantics
- Multi-agent coordination primitives
- Model-agnostic agent orchestration

The abstraction layer ensures Chariot can adopt improved frameworks without major rewrites.

---

## Workflow Orchestration

### Temporal

- **Repository**: [github.com/temporalio/temporal](https://github.com/temporalio/temporal)

**Chariot Integration**:
Durable workflow execution engine for the Workflow Engine component:

- Multi-step attack chain orchestration
- Failure recovery and retry logic
- Long-running workflow state management
- Human approval checkpoints
- Audit trail and execution history

---

## Data Infrastructure

### Apache Iceberg (Go Implementation)

- **Repository**: [github.com/apache/iceberg-go](https://github.com/apache/iceberg-go)

**Chariot Integration**:
Table format for the Interaction & Telemetry Data Lake:

- Time-travel queries for historical analysis
- Schema evolution without data rewrites
- Efficient partitioning for security event data
- Integration with S3 storage layer
- Support for AI/ML training data pipelines

---

## Security Research and Validation

### XBOW Validation Benchmarks

- **Repository**: [github.com/xbow-engineering/validation-benchmarks](https://github.com/xbow-engineering/validation-benchmarks/)

**Chariot Integration**:
Benchmark suite for validating Chariot's autonomous security capabilities:

- Standardized vulnerability detection tests
- Exploitation success rate measurement
- Comparison against industry baselines
- Regression testing for agent updates

---

### CAI (Cybersecurity AI)

- **Repository**: [github.com/aliasrobotics/cai](https://github.com/aliasrobotics/cai/tree/main)

**Chariot Integration**:
Reference implementation for cybersecurity AI patterns:

- Attack technique categorization
- Security context encoding
- Vulnerability classification schemas
- Threat modeling automation

---

### Incalmo

- **Repository**: [github.com/bsinger98/Incalmo](https://github.com/bsinger98/Incalmo?tab=readme-ov-file)

**Chariot Integration**:
Research codebase for autonomous penetration testing:

- Multi-stage attack chain patterns
- Agent decision-making strategies
- Exploitation workflow templates
- Post-exploitation automation

---

## Internal Chariot Components

The following are internal codenames mapped to Chariot repositories:

| Codename            | Repository Path                       | Description                           |
| ------------------- | ------------------------------------- | ------------------------------------- |
| **Janus**           | `modules/janus/`                      | External target execution engine      |
| **Janus Framework** | `modules/janus-framework/`            | Go library for security tool chains   |
| **Aegis**           | `modules/chariot-aegis-capabilities/` | Internal network agent (Velociraptor) |
| **Tabularium**      | `modules/tabularium/`                 | Universal data schema and models      |
| **Nebula**          | `modules/nebula/`                     | Multi-cloud security scanning         |
| **Praetorian CLI**  | `modules/praetorian-cli/`             | Python CLI and SDK                    |

---

## Agent Types Reference

The architecture identifies three primary agent types requiring different implementation approaches:

| Agent Type         | Description                                        | Implementation Pattern          |
| ------------------ | -------------------------------------------------- | ------------------------------- |
| **Parsing Agent**  | Extracts structured data from unstructured sources | BAML-based structured output    |
| **Decision Agent** | Evaluates conditions and selects actions           | BAML-based decision logic       |
| **Action Agent**   | Executes multi-step tasks                          | Claude Code / Codex CLI pattern |

Examples:

- **Parsing**: Extracting form fields from unknown web pages (user, username, email variations)
- **Decision**: Selecting capabilities for a given asset type
- **Action**: Writing and executing scripts, code review workflows

---

## Framework Selection Criteria

The architecture emphasizes being "Easy to Change" (ETC) with framework choices:

**Constants (Unlikely to Change)**:

- System Prompt / Initial prompts (agent base configuration)
- MCP (Model Context Protocol) - industry standard

**Variables (Will Change Frequently)**:

- Model selection (daily improvements)
- Tool implementations (continuous optimization)
- Workflow patterns (research-driven improvements)

This drives the Agent Framework Abstraction Layer design.
