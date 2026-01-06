[ Back to Overview](../OVERVIEW.md)

# Data Requirements

This document contains all data-related requirements for the Chariot AI Architecture platform, including data model requirements, query builder, and telemetry/logging.

## Summary

| Status      | Count  |
| ----------- | ------ |
| Complete    | 4      |
| Incomplete  | 1      |
| Not Started | 9      |
| **Total**   | **14** |

---

## Data Model Requirements

### REQ-MODEL-001

**Computationally Intelligent Models**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Refactor and evolve the core Go data types (pkg/model) used internally by Janus to include computed properties (e.g., different username formats for Actor) and methods representing intrinsic logic, where appropriate.

**Rationale:**

Ensures consistent data interpretation, reduces logic duplication, provides richer context (aligns with RFC). Necessary evolution from current static models.

---

### REQ-MODEL-002

**Automatic Relationship Linking**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Implement mechanisms (e.g., hooks within model creation/update logic, post-processing in Janus tasks) to automatically identify and establish links between related entities (e.g., Email to Domain) within the Neo4j graph.

**Rationale:**

Builds a richer, more accurate graph representation of the attack surface automatically (aligns with RFC).

---

## Query & Search

### REQ-QURY-001

**Query Builder**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Query Builder will enable Chariot users to create, save, and share advanced, flexible queries across all major data entities. The feature will support both a visual builder and raw Cypher input, allowing users of all technical backgrounds to extract insights, automate actions, and collaborate more effectively.

**Rationale:**

Empowers technical and non-technical users to extract complex insights efficiently, reduces time on data searching and filtering.

---

## Data Storage

### REQ-DATA-001

**Structured Findings Storage**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Task results, represented using the intelligent models, must be reliably stored and related within the Neo4j Graph Database.

**Rationale:**

Centralized, queryable storage of actionable findings.

---

### REQ-DATA-002

**Raw Capability Telemetry Storage**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Underlying capabilities executed as part of Janus tasks should log raw output/telemetry as Parquet files to AWS S3.

**Rationale:**

Troubleshooting, compliance, efficient data source for ML/Analytics on AWS.

---

### REQ-DATA-003

**Migrate ML Pipeline to AWS SageMaker**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Port the existing model fine-tuning scripts and processes from GCP to run on AWS SageMaker, ensuring they can consume feedback data from the Chariot S3 data lake.

**Rationale:**

Consolidates the MLOps lifecycle on the primary cloud platform (AWS), reducing operational complexity and creating a seamless data flow from the S3 data lake to AI models.

---

### REQ-DATA-004

**Agent & Task Interaction Logging**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

The Agent Orchestration Layer and Janus Service must log detailed records of agent interactions and task execution details as Parquet files to AWS S3.

**Rationale:**

Provide data necessary for analyzing agent/task performance, debugging, and training proprietary AI models.

---

### REQ-DATA-005

**Track Workflow Execution State**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

1. **Define Workflow State Models:** In tabularium, define the new models to track a workflow, e.g., an ExecutionTrace (the overall session) and a TaskRecord (each step within the session)

2. **Upgrade the Janus Task API:** Modify the gRPC task handlers (e.g., IdentifyAndScreenshotLoginPortal, TryDefaultCredentials) to accept an execution_trace_id. The handlers are now responsible for creating and updating TaskRecords in Neo4j (e.g., status from PENDING to SUCCESS)

3. **Implement Structured Logging:** Add JSON logging to the Janus handlers for the S3 data lake (as defined previously)

**Rationale:**

This builds the complete data foundation. We're not just storing the results of an action, but the intent and status of the workflow itself.

---

## Data Pipelines

### REQ-PIPE-001

**Data Pipeline for Model Training**

| Field        | Value    |
| ------------ | -------- |
| **Status**   | Complete |
| **Priority** | High     |

**Description:**

Establish data pipelines using AWS SageMaker to process and prepare data stored in the S3/Parquet Data Lake for use in training/fine-tuning machine learning models.

**Rationale:**

This is the crucial "transform" step that bridges raw data collection and model training. It operationalizes the data lake by making its contents usable for our ML platform.

---

### REQ-PIPE-002

**Performance Feedback Data Pipeline**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Formalize the data pipeline from the S3 data lake into AWS SageMaker for the Data Team to analyze agent traces and create "reinforced models".

**Rationale:**

Transforms the platform into a learning system, turning raw operational data into actionable intelligence for improving the agent's core reasoning model.

---

### REQ-PIPE-003

**Train Proprietary CVE Signature Generation Model**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Using the dataset of human-approved signatures captured via the Review Interface, fine-tune a specialized model that is purpose-built for generating high-quality Nuclei templates from CVEs.

**Rationale:**

To transform the human-assisted suggestion engine into a highly accurate, autonomous capability. This proprietary model is the core intellectual property and competitive differentiator of this entire initiative.

---

### REQ-PIPE-004

**Planner Model Feedback Pipeline**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Establish an automated process that leverages the metrics from the agent dashboard. This pipeline will process analyzed agent traces to identify suboptimal plans or frequently failing strategies, creating a structured dataset suitable for systematic prompt engineering or future fine-tuning of the Planner Agent's model.

**Rationale:**

Closes the loop on strategic intelligence. While other data pipelines improve the AutoTriage model, this one is critical for improving the Planner Agent itself, ensuring the platform's core strategic capabilities evolve over time based on real-world performance data.

---

## Schema Requirements

### REQ-SCH-001

**Standardized I/O Schemas**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Define and enforce standardized schemas using Protobuf for gRPC Task API inputs/parameters and outputs/results.

**Rationale:**

Interoperability, consistent data handling, reliable agent interaction, performance.

---

### REQ-SCH-002

**Evolve Schema for Environmental Metadata**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Evolve the tabularium models to represent environmental metadata (e.g., Active Directory Groups, AWS IAM Roles, Web Sitemaps, etc.) for both agent context enrichment and visualization purposes.

**Rationale:**

The agent's intelligence is limited by its understanding of the environment. Expanding the universal schema to include rich contextual metadata is the foundational first step to enabling more sophisticated, context-aware planning and attack path visualization.

---

### REQ-SCH-003

**Implement Capabilities for Ingesting Expanded Metadata**

| Field        | Value      |
| ------------ | ---------- |
| **Status**   | Incomplete |
| **Target**   | Q3FY25     |
| **Priority** | High       |

**Description:**

Implement app, network, and cloud capabilities responsible for fetching, parsing, and linking this metadata into the Neo4j graph.

**Rationale:**

A schema is useless without data. This capability operationalizes the new schema by actively populating the graph with environmental context, directly enriching the agent's "world model" and enabling it to make smarter decisions based on real-world configurations.

---

## Related Requirements

- [REQ-AGENT-013](agents.md#req-agent-013) - Integrate RAG into Agent Orchestration Layer
- [REQ-UI-002](ui.md#req-ui-002) - Visualize Environmental Context in Graph Explorer
- [NFR-DATA-001](non-functional.md#nfr-data-001) - Data Contract Definition
- [NFR-DATA-002](non-functional.md#nfr-data-002) - Data Lake Schema Evolution
