[ Back to Overview](../OVERVIEW.md)

# Non-Functional Requirements

This document contains all non-functional requirements (NFRs) for the Chariot AI Architecture platform, including scalability, security, performance, and architecture requirements.

## Summary

| Category          | Count  |
| ----------------- | ------ |
| Observability     | 1      |
| Security          | 3      |
| Performance       | 1      |
| Disaster Recovery | 1      |
| Scalability       | 1      |
| Data Management   | 2      |
| Architecture      | 8      |
| **Total**         | **17** |

---

## Observability

### NFR-OBS-001

**Observability (Metrics & Tracing)**

| Field        | Value         |
| ------------ | ------------- |
| **Category** | Observability |
| **Priority** | High          |

**Description:**

The Janus Service and Agent Layer interactions must expose key operational metrics and support distributed tracing. Consider OpenTelemetry as the mechanism for doing this.

**Rationale:**

Enable monitoring, performance analysis, and debugging.

---

## Security

### NFR-SEC-001

**Audit Logging**

| Field        | Value    |
| ------------ | -------- |
| **Category** | Security |
| **Priority** | High     |

**Description:**

Critical actions, decisions, task executions, and constraint enforcements must be logged to a secure, tamper-evident audit trail.

**Rationale:**

Security monitoring, incident response, compliance.

---

### NFR-SEC-002

**External Tool Security Lifecycle**

| Field        | Value    |
| ------------ | -------- |
| **Category** | Security |
| **Priority** | High     |

**Description:**

Define and implement a process for securely updating wrapped external tools and verifying constraints. Requires defined cadence, e.g., quarterly, and integration testing.

**Rationale:**

Mitigate risks introduced by third-party tool updates.

---

### NFR-SEC-003

**VPC-Restricted Administrative APIs**

| Field        | Value    |
| ------------ | -------- |
| **Category** | Security |
| **Priority** | High     |

**Description:**

All internal, Praetorian-only administrative API endpoints must be architecturally configured to only accept traffic originating from within a designated Praetorian-only Virtual Private Cloud (VPC).

This network-level control is a distinct security layer, enforced in addition to standard application-level authentication and authorization checks. This applies to services like the Freemium Admin Dashboard, Engagement & Subscription Management, and any other internal system monitoring or configuration interfaces.

**Rationale:**

As the platform prepares to launch a public-facing Community Edition, it is critical to proactively minimize the attack surface. By ensuring that sensitive administrative functions can only be accessed from a trusted internal network, we architecturally eliminate the risk of external attackers discovering or exploiting potential vulnerabilities in these high-privilege APIs. This defense-in-depth approach provides a fundamental security guarantee that goes beyond application-level permissions.

---

## Performance

### NFR-PERF-001

**Performance Targets**

| Field        | Value       |
| ------------ | ----------- |
| **Category** | Performance |
| **Priority** | High        |

**Description:**

Define specific Service Level Objectives (SLOs) for task execution latencies and system throughput.

**Rationale:**

Provide concrete goals for optimization efforts.

---

## Disaster Recovery

### NFR-DR-001

**Disaster Recovery**

| Field        | Value             |
| ------------ | ----------------- |
| **Category** | Disaster Recovery |
| **Priority** | Medium            |

**Description:**

Define RTO/RPO. Implement basic DR strategy. (Full multi-region is future consideration).

**Rationale:**

Ensure business continuity.

---

## Scalability

### NFR-SCALE-001

**Scalability**

| Field        | Value       |
| ------------ | ----------- |
| **Category** | Scalability |
| **Priority** | Medium      |

**Description:**

Consider and plan for the potential scaling challenges of the Neo4j graph database as data volume grows. Evaluate strategies like sharding or managed graph services for future phases.

**Rationale:**

Proactively address potential bottlenecks.

---

## Data Management

### NFR-DATA-001

**Data Contract Definition**

| Field        | Value           |
| ------------ | --------------- |
| **Category** | Data Management |
| **Priority** | High            |

**Description:**

Define and maintain a clear contract outlining authoritative data stores, ownership, retention policies, and field mappings between stores (e.g., smart model fields to Neo4j/Parquet) for key entities.

**Rationale:**

Avoid duplicate storage, ensure data lineage, clarify responsibilities.

---

### NFR-DATA-002

**Data Lake Schema Evolution**

| Field        | Value           |
| ------------ | --------------- |
| **Category** | Data Management |
| **Priority** | High            |

**Description:**

Select and implement a strategy for managing schema evolution for Parquet data in S3 (e.g., evaluating Delta Lake, Iceberg, or schema registry patterns).

**Rationale:**

Prevent breaking downstream consumers (Athena, SageMaker).

---

## Architecture Requirements

### REQ-ARCH-001

**Janus Service Architecture**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Refactor the Janus codebase from a library/CLI into a long-running service that exposes a Task API and contains internal logic for executing high-level offensive tasks.

**Rationale:**

Fundamental shift required to meet the vision of agent-driven task execution and provide a stable API.

---

### REQ-ARCH-002

**External IP Allocation for Specific Services**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Develop infrastructure capability to allocate dedicated external IPs to specific capabilities when required for external communication.

**Rationale:**

Essential for components like the Burp plugin backend and Praetorian collaborator server that require direct external accessibility while maintaining isolation and security.

---

### REQ-ARCH-003

**Prometheus Agent Orchestration Service**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Implement the formal, long-running "Prometheus Service" for the Agent Orchestration Layer, which will host the iterative planning loop for agents.

**Rationale:**

Transforms the single-shot agent PoC into a durable, scalable service, which is essential for continuous, autonomous operations and pays off the architectural vision from the PRD.

---

### REQ-ARCH-004

**Multi-Region Deployment Capability**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

The platform's infrastructure-as-code and deployment pipelines must be enhanced to support provisioning a complete Chariot stack into multiple, specified AWS regions (e.g., us-east-1, eu-central-1).

This requires:

1. Parameterizing IaC templates to handle region-specific resource names and availability (e.g., different instance types)
2. Ensuring all service configurations and application logic are region-aware and do not contain hardcoded regional dependencies
3. Validating that a stack deployed in one region remains fully isolated and does not transfer data to another region

**Rationale:**

This is a fundamental requirement for selling to international customers and achieving compliance with regional data residency laws like GDPR. By enabling deployment into specific geographic regions (e.g., a European data center), we can guarantee that customer data remains within their designated jurisdiction.

---

### REQ-ARCH-005

**Single-Tenant Deployment Model**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Develop and document the infrastructure-as-code (e.g., Terraform, CloudFormation) necessary to provision a complete, isolated Chariot stack for a single customer.

This includes:

1. A dedicated database instance (Neo4j)
2. Dedicated application services (Janus, Prometheus, etc.)
3. Dedicated data storage (S3 buckets for telemetry and logs)

CI/CD pipelines and configuration management must also be updated to support deploying to and managing these standalone environments.

**Rationale:**

To meet the stringent security, data residency, and compliance requirements of enterprise customers, particularly in the financial services sector, who are unable to use a shared multi-tenant architecture. This provides complete data isolation at the infrastructure level.

---

### REQ-ARCH-006

**Agent and Operator Requests Run on "Fast Path" Pipeline**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | Medium      |

**Description:**

Prioritize operators and agents on the fast path for execution using the existing persistent workers. Ensure the request routing layer can transparently handle requests and direct them to either the "Fast Path" for low-latency tasks or the existing "Scaled Path" for asynchronous bulk jobs.

**Rationale:**

Operators care about Chariot for scale, not for being faster than their machine. Prioritize developing agent/capability interaction using the existing queuing mechanisms and then evaluate performance. Possible solutions when the time comes:

- Back to back execution on the same machine
- Batching within workflows
- Orchestrator decides whether or not to farm out jobs
- Separate instances for agentic execution

---

### REQ-ARCH-007

**Distributed Execution Framework**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Design and implement the task decomposition logic, dispatching services (e.g., SQS/Lambda), and Fargate worker infrastructure to enable massive parallelization of tasks.

**Rationale:**

A strategic architectural enhancement to enable the scaling of offensive operations, improve throughput, and proactively evade simple IP-based blocking, which is essential for tackling large-scope bug bounty programs.

---

### REQ-ARCH-008

**Container-Based Microservice Architecture**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Implement a containerized microservice architecture that deploys capabilities as isolated containers within a managed cluster, rather than on persistent compute instances.

**Rationale:**

Ensures strong data isolation between engagements, improves security posture, enables efficient resource utilization, and provides clean state for each deployment without data leakage concerns.

---

## Agent Framework Abstraction

### REQ-ABST-001

**Framework Agnostic Agent Schema**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | TBD         |
| **Priority** | Medium      |

**Description:**

Define a standardized, framework-independent schema (e.g., using YAML, Pydantic models, or Go structs) for defining agents. This schema must capture core attributes like prompts, metadata, configuration, and tool specifications in a structured format.

**Rationale:**

Creates the single source of truth for agent behavior, shielding core business logic from framework-specific implementation details. This is the foundational prerequisite for the entire abstraction strategy.

---

### REQ-ABST-002

**Unified Tool Interface**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | TBD         |
| **Priority** | Medium      |

**Description:**

Design and implement an interface that allows tools to be defined once and used by any agent, regardless of the underlying framework's native limitations (e.g., ADK's constraints on mixing built-in and function tools). This will likely involve a wrapper or adapter layer for framework-specific tool-handling mechanisms.

**Rationale:**

Solves a known framework pain point (ADK tool mixing) from day one, improves developer experience, and ensures that tool definitions are portable.

---

### REQ-ABST-003

**Abstract Workflow Pattern Translator**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | TBD         |
| **Priority** | Medium      |

**Description:**

Define framework-agnostic patterns for common workflows (e.g., Sequential, Parallel, Loop). The compiler must be enhanced to translate these abstract patterns into the corresponding framework-specific implementations (e.g., ADK's SequentialAgent, LoopAgent).

**Rationale:**

Ensures that complex, multi-step business logic can be defined portably. This prevents the need to rewrite entire orchestration flows when migrating or testing new frameworks.

---

### REQ-ABST-004

**Framework Adapter Interface**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | TBD         |
| **Priority** | Medium      |

**Description:**

Define a clear, pluggable interface for "Framework Adapters". Create the first implementation of this interface for Google ADK. This formalizes how the compiler interacts with a specific framework's bindings.

**Rationale:**

This makes the system extensible. When a new agent framework needs to be supported, a new adapter can be created that implements this interface, without requiring a rewrite of the core agent definitions or the compiler logic.

---

## Related Requirements

- [REQ-TEST-003](testing.md#req-test-003) - Comprehensive Monitoring of Deployments
- [REQ-PERF-001](performance-metrics.md#req-perf-001) - Measure AI Effectiveness
- [REQ-DATA-002](data.md#req-data-002) - Raw Capability Telemetry Storage
