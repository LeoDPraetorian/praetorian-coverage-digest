[ Back to Overview](../OVERVIEW.md)

# Workflow Requirements

This document contains all workflow-related requirements for the Chariot AI Architecture platform, including the workflow engine and operator-defined workflows.

## Summary

| Status      | Count  |
| ----------- | ------ |
| Not Started | 10     |
| **Total**   | **10** |

---

## Core Workflow Engine

### REQ-WF-001

**Sequential Workflow Execution**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Build the core backend service that takes a saved workflow definition and reliably executes its capabilities in sequence. This engine is responsible for invoking the correct capability via Janus/Aegis and handling success/failure states.

**Rationale:**

This is the heart of the workflow system. Without a reliable executor, nothing else functions. It's the primary engine for all deterministic automation.

---

### REQ-WF-002

**Workflow Transform Engine**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Develop a service that can map and transform the output of one capability to the required input schema of a subsequent capability in a workflow.

**Rationale:**

Enables the composition of heterogenous capabilities into a single, seamless workflow by resolving data mismatches, which is core to building complex attack chains.

---

### REQ-WF-003

**Workflow Input Parameterization**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

The workflow engine must support workflow-level input parameters. Operators must be able to define an input (e.g., target_domain) when starting a workflow, and have that value be injectable into the parameters of the individual capabilities within it.

**Rationale:**

Prevents hardcoding values and makes workflows reusable. An operator can define a "Domain Recon" workflow once and run it against any target by simply changing the input parameter.

---

## Workflow Reconciliation & Feedback

### REQ-WF-004

**Develop Asset Reconciliation Workflow**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

1. Build a new "Asset Reconciliation Engine" as a recurring Janus task
2. This engine compares ExternalAsset lists against Chariot's own discovered assets, enriches them with context (e.g., public vs. private IPs), and flags confirmed "missed" assets

**Rationale:**

This is the core automation engine of the feedback loop. It replaces the painful manual process of comparing spreadsheets and provides the crucial context needed to distinguish a true discovery gap from an internal-only asset.

---

### REQ-WF-005

**Manual Finding Feedback Loop**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Implement a ManualFindingCreated event trigger in the UI that captures context from manual findings and creates a structured ticket in the development backlog.

**Rationale:**

Creates a closed-loop system where manual discoveries from human experts are automatically fed back into the development process, ensuring continuous improvement.

---

### REQ-WF-006

**Bug Bounty Human Review & Submission Workflow**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

1. Enhance the GUI (or CLI) with an ability to send Open Vulnerability to bug bounty programs
2. Implement a simple workflow where a human analyst gives a final "thumbs up" before the finding is formatted and submitted to the bug bounty platform. This satisfies platform rules against fully automated submissions

This should be no different than how our Pending/Triage state works today with vulnerabilities identified from capabilities.

**Rationale:**

XBOW's security team reviewed findings pre-submission to comply with policies. This workflow implements that critical human oversight step, ensuring we operate ethically and within program rules.

---

## Advanced Workflow Features

### REQ-WF-007

**Registry-Backed Routing**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

The platform must support routing of capability execution requests to Aegis or Janus based on declared executor metadata in the registry. Failures or unsupported engines must be logged and surfaced to the orchestrator.

**Rationale:**

Formalises engine selection, enables fallback, ensures clarity.

---

### REQ-WF-008

**Advanced Operator-Defined Workflow Engine**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

The Workflow Engine must support event-driven execution of capabilities based on upstream results or triggers. The executor (Aegis or Janus) must be selected dynamically based on metadata from the Capability Registry.

This is the critical backend counterpart to the advanced, drag-and-drop Operator Workflow Builder also planned for this phase. It represents the V2 evolution of the simple sequential engine built in Q3, transforming it from a "script runner" into a true orchestration engine that supports conditional logic (if/then/else).

**Rationale:**

This enhancement is what allows an operator to build and execute sophisticated, real-world attack logic (e.g., "if a port scan finds port 22 open, run an SSH brute force; otherwise, run a web scan"), dramatically increasing the power and intelligence of the automations they can create. A drag-and-drop UI that allows for branching is useless without an engine that can execute those branches.

---

## Signature & Validation Workflows

### REQ-WF-009

**Develop Autonomous Nuclei Signature Validation Workflow**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Orchestrate the end-to-end Generate -> Test -> Validate cycle. This workflow will provision a sandboxed test environment, execute the newly generated signature, and use the Validator Framework to confirm its correctness.

**Rationale:**

To create the fully automated "factory" for producing and validating new signatures at machine speed. This workflow removes the human from the testing loop, allowing the platform to react to new vulnerabilities autonomously.

---

### REQ-WF-010

**Automate Registration of Generated Signatures**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Implement the final step of the validation workflow to automatically register a new, successfully validated signature into the Agora Capability Registry.

**Rationale:**

To close the loop on the entire process. This makes newly created, machine-vetted signatures immediately available to the rest of the Chariot platform, continuously and automatically expanding its defensive and offensive arsenal.

---

## Control & Safety Requirements

### REQ-CTRL-001

**Task Execution Constraints**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

The task execution layer, during the execution of high-level tasks, must enforce constraints defined via configuration or task parameters. (Implementation may leverage a policy engine like OPA/Rego).

**Rationale:**

Ensure safety and prevent unintended consequences.

---

### REQ-CTRL-002

**Scope Validation**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Janus Task execution logic must validate that the requested task and its targets fall within the authorized scope of engagement provided in the task request.

**Rationale:**

Prevent autonomous actions from exceeding authorized boundaries.

---

### REQ-CTRL-003

**Workflow Cancellation Control**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

1. Add a POST /workflows/{trace_id}/cancel endpoint to the Workflow Management API
2. The Prometheus service must listen for this and gracefully terminate the agent's planning loop
3. The Janus Task API must be enhanced to respect cancellation signals for long-running tasks

**Rationale:**

A critical operational control. It is irresponsible to build a system that can run in a long-lived, iterative loop without providing operators a reliable mechanism to terminate it. This ensures safety, control, and prevents runaway resource consumption.

---

### REQ-CTRL-004

**Customer Data AI Training Opt-Out Control**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

The platform must provide an explicit, enforceable mechanism to prevent a customer's data from being used for AI model training.

1. **Schema Update:** The Subscription/Engagement model must be enhanced to include a non-default allow_ai_training flag (defaulting to false for maximum safety)
2. **UI Control:** The Subscription Settings Page must expose a control for administrators to set this flag per engagement
3. **Pipeline Enforcement:** The data pipelines feeding the S3 data lake and consuming from it for model training must filter out and exclude any records associated with engagements where allow_ai_training is false

**Rationale:**

This is a critical contractual and privacy requirement for many enterprise customers. Providing an explicit, auditable mechanism for customers to opt-out of having their data used for AI model training is essential for building trust, meeting legal obligations, and closing key deals.

---

## Related Requirements

- [REQ-AGENT-002](agents.md#req-agent-002) - Planner Agent MVP with Hardcoded Workflows
- [REQ-UI-004](ui.md#req-ui-004) - Workflow UI Builder
- [REQ-UI-005](ui.md#req-ui-005) - Workflow Run History
- [REQ-DATA-005](data.md#req-data-005) - Track Workflow Execution State
