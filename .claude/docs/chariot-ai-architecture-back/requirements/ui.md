[ Back to Overview](../OVERVIEW.md)

# UI Requirements

This document contains all user interface requirements for the Chariot AI Architecture platform, including dashboard requirements, attack path visualization, and MITRE Navigator views.

## Summary

| Status      | Count  |
| ----------- | ------ |
| Not Started | 17     |
| **Total**   | **17** |

---

## Administrative UI

### REQ-UI-001

**Engagement & Subscription Management UI**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Design and implement a new administrative UI section for managing customer engagements (for Professional Services) and subscriptions (for Managed Services).

This interface must provide the core functionality to:

1. Create new engagement or subscription instances for customers
2. Assign users (both Praetorian engineers and customer contacts) to a specific engagement/subscription
3. View and manage a list of all active engagements/subscriptions and their assigned users
4. This Dashboard will also be used to manage community/freemium users later on

**Rationale:**

This is a critical prerequisite for successfully onboarding the Professional Services team as outlined in the capstone. It replaces the current backend-only, API-driven process with a user-friendly interface, removing a significant operational bottleneck for administrators and engagement managers.

---

## Graph & Visualization

### REQ-UI-002

**Visualize Environmental Context in Graph Explorer**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Enhance the existing graph explorer UI to visualize the new environmental metadata.

1. **Rendering New Node Types:** The graph must correctly display new entity types like IAM_Role, AD_Group, Security_Group, etc. with appropriate icons and styling
2. **Displaying Relationships:** The graph must clearly visualize the relationships between these new entities and existing assets (e.g., an EC2 instance node connected to an IAM Role node)
3. **Updating Detail Panes:** When an operator clicks on one of these new nodes, the details pane must show the relevant metadata for that entity

**Rationale:**

Collecting rich environmental data is only half the battle; operators must be able to see and understand this context to make informed decisions. This enhancement transforms the graph explorer from a simple asset map into a true attack path visualization tool.

---

### REQ-UI-003

**Context Specific Asset and Vulnerability Sub Tables**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

1. **Implement Vulnerability Sub-Pages:** Create distinct views for different vulnerability categories (e.g., Network, Cloud, Code). Each view will show a tailored set of columns relevant to that category
2. **Implement Asset Sub-Pages:** Apply the same pattern to the asset inventory, creating specialized views for different asset types (e.g., Network Host, Cloud Resource, Code Repository)

**Rationale:**

As the platform ingests more diverse data sources in this phase, the "one-size-fits-all" table view becomes cluttered and degrades the user experience. By displaying only relevant information, we make it vastly easier for operators to analyze assets and triage vulnerabilities efficiently.

---

## Workflow UI

### REQ-UI-004

**Workflow UI Builder**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Deliver a simple, list-based UI where operators can create a named workflow by selecting and ordering capabilities from the Agora registry. This is the V1 of "Define & Manage Attack Chains", focusing on sequential execution.

**Rationale:**

This is the core interface for operator empowerment. A simple, functional UI in Q3 is a higher priority than a perfect drag-and-drop one later.

---

### REQ-UI-005

**Workflow Run History**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Create a UI view that shows a historical list of all workflow executions. Each entry must show the workflow name, status (e.g., Succeeded, Failed, Running), start time, and triggering user. Users must be able to click on a run to see the status of its individual steps.

**Rationale:**

Provides fundamental visibility and audibility. Operators need to know what ran, when it ran, and whether it worked. This is the user-facing component of REQ-DATA-005.

---

### REQ-UI-010

**Define & Manage Attack Chains**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

The Operator Interface must provide functionality for users to create, view, edit, delete, and manage named, reusable sequences of high-level tasks ("attack chains" or "workflows"). This includes specifying the sequence of tasks, their parameters (potentially allowing variables), and basic control flow logic where applicable.

**Rationale:**

Enables standardization of common procedures, testing specific attack patterns, and operator-driven orchestration.

---

## Agent Interaction Tools

### REQ-UI-006

**Deliver Planner Agent CLI Interaction Tool**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Build a simple Go CLI tool (chariot-cli) that allows an operator to:

- Launch a workflow: `chariot agent run --goal "..."`
- Monitor a workflow: `chariot agent status <trace_id>`

This CLI will use the Workflow Management API. The UI for the CLI should mirror Blayne's demo tool that leverages Textual where you have windows that show a chat that allows the operator to interact with a planner agent.

**Rationale:**

The CLI provides the first tool for Operator-driven Execution.

---

### REQ-UI-007

**Deliver Planner Agent GUI Interaction Tool**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

It should perform in a similar way that Cursor does with prompting, thinking, and execution.

**Rationale:**

The GUI provides the sizzle for customers to see the power we are starting to create with this new architecture.

---

### REQ-UI-008

**Refine Burp Plugin UI**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | Medium      |

**Description:**

We need to create a UI/UX design for the Burp plugin prototype.

**Rationale:**

While the Burp plugin is functional, the design is not intuitive from a UX standpoint. We want it to have the same quality and feel as the Chariot core UI.

---

## Dashboards

### REQ-UI-009

**Build Asset Discovery Gap Dashboard**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Create a new dashboard in the UI that consumes the output of the reconciliation workflow and presents a prioritized list of true discovery gaps, categorized by probable cause.

**Rationale:**

This closes the loop by turning the raw analysis into actionable intelligence. It provides the development team with a precise, data-driven backlog of where to focus their efforts to improve Chariot's native discovery capabilities.

---

### REQ-UI-012

**Build Vulnerability Discovery Gap Dashboard**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Create a new dashboard in the UI that consumes the output of the vulnerability reconciliation workflow. The dashboard must present a prioritized list of true vulnerability detection gaps, categorized by source (e.g., Qualys, Nessus) by CVE, CWE, etc.

**Rationale:**

This closes the loop on vulnerability management, turning raw correlation data into actionable intelligence. It provides the security research and development teams with a precise, data-driven backlog for signature creation and capability enhancement.

---

### REQ-UI-013

**Signature Review & Test Interface**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Create a dedicated UI for security researchers where they can view the agent's suggested signatures, edit them, and trigger a test run in a sandboxed environment. The UI must capture the final, human-approved signature.

**Rationale:**

To enable the crucial Human-in-the-Loop (HITL) workflow and the primary mechanism for generating the feedback data needed to train our proprietary model.

---

### REQ-UI-014

**AI Performance Dashboard**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Create a simple dashboard to track the AutoTriage model's precision and recall against human judgments over time, allowing us to measure the impact of fine-tuning.

**Rationale:**

What gets measured gets improved. This makes the value of our AI tangible and allows us to track our progress toward state-of-the-art performance.

---

## Attack Path Visualization

### REQ-UI-011

**Implement Attack Path Visualization**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Deliver a graphical interface that visualizes the agent's progress and decisions in real-time on a graph, showing compromised nodes and paths taken.

**Rationale:**

Makes the AI's "thinking" transparent and auditable. It provides clear reporting for operators and customers and facilitates a deeper understanding of engagement outcomes.

---

### REQ-UI-015

**Interactive Attack Path Visualization**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Low         |

**Description:**

Taking inspiration from the provided mockups and MITRE ATT&CK Flow, enhance the existing Attack Path UI to be interactive and overlay the correlated detection status on each step of the attack, showing if a technique was undetected, alerted, or blocked.

**Rationale:**

This directly addresses the user's need to see the "story" of an attack. It makes the results of a BAS run immediately understandable to operators and executives, showing not just what we did, but how the defenses responded at each point in the chain.

---

## MITRE Navigator Views

### REQ-UI-016

**MITRE ATT&CK Coverage Navigator**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Low         |

**Description:**

Create a new UI dashboard, inspired by the mockups and the MITRE ATT&CK Navigator, that visualizes the platform's overall coverage. It will display the full ATT&CK matrix and color-code TTPs based on whether they are available in Chariot, have been tested, and their historical detection status.

**Rationale:**

Provides a strategic, at-a-glance view of the platform's capabilities and security posture gaps. This helps operators plan assessments and allows security leaders to track improvements in their defense coverage over time.

---

### REQ-UI-017

**MITRE D3FEND Coverage Navigator**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Low         |

**Description:**

Create a new UI dashboard that visualizes the effectiveness of defensive measures using the D3FEND matrix. The dashboard will color-code defensive techniques based on which ones were successfully triggered by Chariot's attacks, highlighting both effective controls and defensive gaps where a countermeasure was expected but did not fire.

**Rationale:**

This provides a "Blue Team" view of security posture. While the ATT&CK Navigator shows our offensive coverage, this dashboard shows the client's defensive coverage. It makes it easy to identify which specific types of security controls are working effectively and where investment may be needed.

---

## Related Requirements

- [REQ-WF-001](workflow.md#req-wf-001) - Sequential Workflow Execution
- [REQ-AGENT-002](agents.md#req-agent-002) - Planner Agent MVP
- [REQ-BAS-001](zero-day.md#req-bas-001) - EDR & SIEM Integration
- [REQ-DATA-005](data.md#req-data-005) - Track Workflow Execution State
