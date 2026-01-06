# Data Layer

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :white_check_mark: MOSTLY COMPLETE (75%)
>
> - Neo4j: :white_check_mark: Complete - multi-tenant isolation, batch processing, 200+ queryable fields
> - Vector DB: :white_check_mark: Complete - uses pgvector on Aurora PostgreSQL (not Pinecone/Qdrant)
> - S3: :warning: Partial - uses GOB binary format (not Parquet as spec'd)
> - SageMaker: :x: NOT IMPLEMENTED - no ML training pipeline (critical gap for "Proprietary Intelligence")
> - Tabularium: :white_check_mark: Complete - universal schema, code generation
> - Integration Service: :warning: Partial - distributed handlers, not centralized service
> - Telemetry: :warning: Partial - Kinesis to S3 works, no Prometheus
>
> **Alternative Approaches**:
>
> - pgvector vs Pinecone/Qdrant: Single-vendor AWS architecture, no extra service to manage
> - GOB vs Parquet: May need conversion for future ML training

The Data Layer provides the persistent storage and data management infrastructure for the Chariot platform. It combines graph database capabilities for structured attack surface data with a scalable data lake for telemetry and machine learning training data.

## Table of Contents

- [Overview](#overview)
- [Neo4j Graph Database](#neo4j-graph-database)
- [S3 Parquet Data Lake](#s3-parquet-data-lake)
- [ML Platform (AWS SageMaker)](#ml-platform-aws-sagemaker)
- [Integration Service](#integration-service)

---

## Overview

The Data Layer serves multiple critical functions across the platform, from real-time attack surface queries to long-term model training.

```

                       Data Layer



                   Neo4j Graph Database
             (Structured Findings & Assets)


                            Query/Update
                           v

                Integration Service
          (Schema & Execution Boundary)


                            Stream
                           v

             S3 Parquet Data Lake
      (Telemetry, Interactions, Training Data)


                            Training
                           v

             ML Platform (AWS SageMaker)
           (Model Training & Fine-Tuning)



```

---

## Neo4j Graph Database

The primary structured data store for findings, asset relationships, and the attack surface model.

### Purpose

| Function                  | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| **Attack Surface Model**  | Interconnected representation of assets and relationships  |
| **Findings Storage**      | Structured vulnerability and risk data                     |
| **Relationship Tracking** | Asset dependencies, network paths, credential associations |
| **Agent Context**         | Rich queryable context for agent planning                  |

### Data Model

```

                       Scope


                            HAS_ASSET
                           v

 Credential  >   Asset     <  Finding




              v            v            v

         Service   Technology  Endpoint

```

### Key Entities

| Entity           | Description               | Examples                        |
| ---------------- | ------------------------- | ------------------------------- |
| **Asset**        | External-facing resources | Domains, IPs, applications      |
| **Finding**      | Security vulnerabilities  | SQLi, XSS, misconfigurations    |
| **Credential**   | Authentication data       | Discovered passwords, tokens    |
| **Service**      | Running services          | HTTP, SSH, databases            |
| **Technology**   | Detected tech stack       | Frameworks, libraries, versions |
| **Relationship** | Entity connections        | Hosts, exposes, authenticates   |

### Query Patterns

```cypher
// Find assets with critical findings
MATCH (a:Asset)-[:HAS_FINDING]->(f:Finding)
WHERE f.severity = 'CRITICAL'
RETURN a, f

// Discover attack paths
MATCH path = (start:Asset {type: 'external'})
              -[:CONNECTS_TO*1..5]->
              (end:Asset {type: 'database'})
RETURN path

// Get agent context for target
MATCH (a:Asset {domain: $target})
OPTIONAL MATCH (a)-[:HAS_SERVICE]->(s:Service)
OPTIONAL MATCH (a)-[:USES_TECHNOLOGY]->(t:Technology)
RETURN a, collect(s) as services, collect(t) as tech
```

### Access Control

- **Agents**: Query via Environment State Service (ESS) only
- **Direct Access**: Disallowed for agents to prevent unbounded queries
- **Operators**: Full query access through Query Builder UI

---

## S3 Parquet Data Lake

> **[Implementation Differs]**: Currently uses GOB binary format instead of Parquet. May need conversion for future ML training data pipelines.

Stores raw logs, capability telemetry, detailed agent interactions, and user feedback for analysis and model training.

### Data Categories

| Category                 | Content                              | Purpose                           |
| ------------------------ | ------------------------------------ | --------------------------------- |
| **Capability Telemetry** | Tool execution logs, timing, outputs | Performance analysis, debugging   |
| **Agent Interactions**   | Plans, tool selections, reasoning    | Model training, behavior analysis |
| **Task Records**         | Parameters, outcomes, errors         | Workflow optimization             |
| **User Feedback**        | Manual triage, corrections           | Supervised learning data          |

### Pipeline Architecture

```

                   Data Pipeline



   Janus Service


     >  CloudWatch
   Prometheus           Log Groups


                 v
   Aegis Service
           Kinesis
                             Firehose


                                     Buffer + Convert
                                    v

                             S3 Bucket
                             (Parquet)



```

### Data Schema

```json
{
  "trace_id": "uuid",
  "timestamp": "iso8601",
  "service": "janus|prometheus|aegis",
  "event_type": "task_start|task_complete|agent_decision",
  "engagement_id": "uuid",
  "customer_id": "uuid",
  "data": {
    "capability": "nuclei-scan",
    "parameters": {...},
    "outputs": {...},
    "duration_ms": 12500,
    "status": "success"
  },
  "metadata": {
    "allow_ai_training": true,
    "version": "1.0"
  }
}
```

### Privacy Controls

The platform provides explicit, enforceable mechanisms for customer data AI training opt-out:

| Control             | Implementation                                            |
| ------------------- | --------------------------------------------------------- |
| **Schema Flag**     | `allow_ai_training` field per engagement (default: false) |
| **UI Control**      | Subscription Settings toggle                              |
| **Pipeline Filter** | Automatic exclusion of opted-out data from training       |

---

## ML Platform (AWS SageMaker)

> **[Not Implemented]**: SageMaker ML pipeline is not built. This is a critical gap that blocks the "Proprietary Intelligence" tenet from the PRD.

Utilizes AWS SageMaker for processing data from the S3/Parquet data lake and training/fine-tuning proprietary models.

### Training Pipeline

```

 S3 Data Lake    >  Data Processing >  Model Training
 (Parquet)            (SageMaker)          (Fine-tuning)


                                                      v

                                               Model Registry
                                               (Versioned)


                                                      v

                                               Model Serving
                                               (Inference)

```

### Model Types

| Model                    | Purpose                 | Training Data                         |
| ------------------------ | ----------------------- | ------------------------------------- |
| **Vulnerability Scorer** | Risk prioritization     | Historical findings + triage feedback |
| **Attack Planner**       | Strategy optimization   | Agent interactions + outcomes         |
| **Signature Generator**  | Template creation       | CVEs + Nuclei templates               |
| **Parameter Tuner**      | Capability optimization | Telemetry + success rates             |

---

## Integration Service

Acts as the intermediary between planning components and the execution layer, enforcing platform-wide schema validation, task-level safety policies, and centralized telemetry logging.

### Responsibilities

| Function              | Description                                 |
| --------------------- | ------------------------------------------- |
| **Schema Validation** | Enforce platform-wide schema compliance     |
| **Safety Policies**   | Apply task-level safety constraints         |
| **Telemetry Logging** | Centralized capture of all interactions     |
| **Request Routing**   | Route to appropriate executor (Janus/Aegis) |

### Request Flow

```
Agent/Workflow Request

         v

               Integration Service


  1. Validate against Agora schema definitions
  2. Apply task-level safety policies
  3. Log to telemetry pipeline
  4. Route to appropriate executor




         v                  v

      Janus            Aegis

```

### Schema Consumption

The Integration Service dynamically consumes capability and schema definitions from the Capability Registry (Agora), allowing the system to remain decoupled from specific executor implementations while ensuring:

- **Consistency**: Uniform data formats across all components
- **Traceability**: Complete audit trail of all operations
- **Policy Enforcement**: Centralized safety and compliance controls
