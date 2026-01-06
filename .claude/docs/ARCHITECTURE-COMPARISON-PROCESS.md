# Architecture Comparison Process: Chariot AI vs External System

This document provides instructions for Claude to perform a comprehensive architectural comparison between Chariot AI and any external system/project.

---

## Overview

**Purpose**: Systematically analyze an external codebase and compare it against Chariot AI's architecture to identify overlap, novelty, and integration opportunities.

**Method**: Parallel Explore agents for efficient codebase analysis, followed by synthesis.

**Output**: Comprehensive markdown report saved to the master repo.

---

## Instructions for Claude

### Step 0: Receive Target Path

The user will provide:

```
TARGET_PATH: /path/to/external/project
TARGET_NAME: Name of the system being analyzed
```

### Step 1: Initialize Target Codebase

If the target is a git submodule that needs initialization:

```bash
# Check if directory is empty or needs submodule init
ls -la $TARGET_PATH

# If empty, initialize
cd $(dirname $TARGET_PATH) && git submodule update --init --recursive $(basename $TARGET_PATH)
```

### Step 2: Discover Target Structure

Run discovery commands to understand the codebase:

```bash
# Get directory structure
find $TARGET_PATH -type d | head -50

# Count files by type
find $TARGET_PATH -type f -name "*.py" | wc -l
find $TARGET_PATH -type f -name "*.go" | wc -l
find $TARGET_PATH -type f -name "*.rs" | wc -l
find $TARGET_PATH -type f -name "*.ts" | wc -l
find $TARGET_PATH -type f -name "*.md" | wc -l

# List key files
find $TARGET_PATH -type f \( -name "*.md" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) | head -50
```

### Step 3: Plan Parallel Agent Strategy

Based on discovery, identify 4-8 logical exploration domains. Common patterns:

| Agent | Focus                    | Example Targets                      |
| ----- | ------------------------ | ------------------------------------ |
| 1     | Documentation & Overview | README.md, docs/, architecture docs  |
| 2     | Core Engine/Logic        | src/, lib/, core/, main entry points |
| 3     | Configuration & Prompts  | config/, prompts/, templates/        |
| 4     | API/Protocol Layer       | api/, protocol/, server/             |
| 5     | UI/Interface Layer       | ui/, cli/, tui/, frontend/           |
| 6     | Data Layer               | models/, schema/, database/          |
| 7     | Testing & Validation     | tests/, validation/, triage/         |
| 8     | Integration/External     | integrations/, plugins/, external/   |

Adjust based on actual codebase structure discovered in Step 2.

### Step 4: Launch Parallel Explore Agents for Target

Create a TodoWrite entry to track progress:

```
TodoWrite:
1. [in_progress] Launch N parallel Explore agents for $TARGET_NAME codebase
2. [pending] Launch parallel agents for Chariot AI architecture docs
3. [pending] Synthesize $TARGET_NAME vs Chariot AI comparison
```

Launch agents with this pattern:

```
Task (subagent_type: Explore, run_in_background: true)
Description: "Explore $TARGET_NAME [domain]"
Prompt: |
  Thoroughly explore the $TARGET_NAME [domain]:

  TARGET: $TARGET_PATH/[subdirectory]

  Focus on:
  1. [file1]
  2. [file2]
  ...

  Extract and document:
  - [specific questions about this domain]
  - Architecture patterns
  - Key abstractions
  - Integration points

  Provide a comprehensive technical summary.
```

### Step 5: Wait for Target Analysis Completion

```
TaskOutput (block: true, timeout: 300000) for each agent
```

### Step 6: Launch Parallel Agents for Chariot AI Architecture

Launch 4 agents for Chariot AI docs:

**Agent 1: Overview & Architecture**

```
TARGET: /Users/nathansportsman/chariot-development-platform2/.claude/docs/chariot-ai-architecture/

Focus on:
- OVERVIEW.md
- architecture/core-principles.md
- architecture/interface-layer.md
- architecture/agent-orchestration.md
- architecture/workflow-engine.md
- architecture/execution-layer.md
- architecture/data-layer.md
- architecture/shared-services.md
```

**Agent 2: Roadmap**

```
TARGET: .claude/docs/chariot-ai-architecture/roadmap/

Focus on:
- overview.md
- q3fy25.md through q2fy26.md
```

**Agent 3: Requirements**

```
TARGET: .claude/docs/chariot-ai-architecture/requirements/

Focus on ALL 10 files:
- index.md, agents.md, workflow.md, testing.md
- data.md, capabilities.md, ui.md
- performance-metrics.md, zero-day.md, non-functional.md
```

**Agent 4: References**

```
TARGET: .claude/docs/chariot-ai-architecture/references/

Focus on:
- academic-papers.md
- glossary.md
- code-components.md
```

### Step 7: Wait for Chariot Analysis Completion

```
TaskOutput (block: true, timeout: 300000) for each agent
```

### Step 8: Synthesize Comparison

Update TodoWrite to mark synthesis in progress.

Create comparison document with this structure:

```markdown
# $TARGET_NAME vs Chariot AI: Comprehensive Architecture Comparison

**Generated**: [date]
**Analysis Method**: [N] parallel Explore agents across both codebases
**$TARGET_NAME Source**: `$TARGET_PATH`
**Chariot AI Source**: `.claude/docs/chariot-ai-architecture/`

---

## Executive Summary

[Side-by-side comparison table with key dimensions]

| Aspect          | $TARGET_NAME | Chariot AI |
| --------------- | ------------ | ---------- |
| Origin          |              |            |
| Maturity        |              |            |
| Core Language   |              |            |
| Agent Pattern   |              |            |
| Execution Model |              |            |
| Primary Focus   |              |            |

---

## Table of Contents

1. System Overviews
2. Architectural Comparison
3. Overlap: Shared Capabilities
4. Novelty: $TARGET_NAME Innovations
5. Novelty: Chariot AI Innovations
6. Implementation Status
7. Strategic Implications
8. Summary Matrix
9. Recommendations

---

## 1. System Overviews

### 1.1 $TARGET_NAME

[Architecture diagram in ASCII]
[Key stats]

### 1.2 Chariot AI

[Standard Chariot architecture from docs]

---

## 2. Architectural Comparison

### 2.1 Orchestration Layer

[Compare orchestration approaches]

### 2.2 Execution Layer

[Compare execution engines]

### 2.3 Data Layer

[Compare data storage and management]

### 2.4 Validation/Triage

[Compare validation approaches]

---

## 3. Overlap: Shared Capabilities

### 3.1 [Shared Capability 1]

### 3.2 [Shared Capability 2]

...

---

## 4. Novelty: $TARGET_NAME Innovations (Not in Chariot)

### 4.1 [Innovation 1]

[Description with code examples if applicable]
**Chariot Gap**: [What Chariot lacks]

### 4.2 [Innovation 2]

...

---

## 5. Novelty: Chariot AI Innovations (Not in $TARGET_NAME)

### 5.1 [Innovation 1]

**$TARGET_NAME Gap**: [What target lacks]

### 5.2 [Innovation 2]

...

---

## 6. Implementation Status Comparison

| Component             | $TARGET_NAME | Chariot AI |
| --------------------- | ------------ | ---------- |
| Core Execution        |              |            |
| Agent Orchestration   |              |            |
| Multi-Agent Hierarchy |              |            |
| Workflow Engine       |              |            |
| Vulnerability Triage  |              |            |
| MCP Integration       |              |            |
| UI/Dashboard          |              |            |
| ML Pipeline           |              |            |
| Zero-Day Discovery    |              |            |

---

## 7. Strategic Implications

### 7.1 $TARGET_NAME Strengths for Chariot Integration

1. [Strength 1]
2. [Strength 2]
   ...

### 7.2 Chariot Strengths for $TARGET_NAME Enhancement

1. [Strength 1]
2. [Strength 2]
   ...

### 7.3 Potential Synthesis Architecture

[ASCII diagram of merged architecture]

---

## 8. Summary Matrix

| Dimension     | $TARGET_NAME | Chariot | Notes |
| ------------- | :----------: | :-----: | ----- |
| [Dimension 1] |      //      |   //    |       |
| [Dimension 2] |              |         |       |

...

Legend: Complete/Strong | Partial | Missing

---

## 9. Recommendations

### 9.1 Immediate Actions

1. [Action 1]
2. [Action 2]

### 9.2 Short-Term Actions

3. [Action 3]
4. [Action 4]

### 9.3 Medium-Term Actions

5. [Action 5]
6. [Action 6]

### 9.4 Long-Term Vision

7. [Vision description]

---

## Appendix: File References

### $TARGET_NAME Codebase
```

$TARGET_PATH/
[directory structure]

```

### Chariot AI Documentation
```

.claude/docs/chariot-ai-architecture/
OVERVIEW.md
architecture/
roadmap/
requirements/
references/

```

```

### Step 9: Save Output

Save to master repo:

```
Write to: /Users/nathansportsman/chariot-development-platform2/CHARIOT-vs-$TARGET_NAME.md
```

---

## Quick Start Template

Copy this to start a new comparison:

```
I want to compare Chariot AI architecture against an external system.

TARGET_PATH: [/path/to/project]
TARGET_NAME: [System Name]

Please follow the Architecture Comparison Process documented in:
.claude/docs/ARCHITECTURE-COMPARISON-PROCESS.md

Use parallel Explore agents to analyze both systems, then synthesize a comprehensive comparison report.
```

---

## Example Usage

```
I want to compare Chariot AI architecture against an external system.

TARGET_PATH: /Users/nathansportsman/chariot-development-platform2/modules/ai-research/ARTEMIS
TARGET_NAME: ARTEMIS

Please follow the Architecture Comparison Process documented in:
.claude/docs/ARCHITECTURE-COMPARISON-PROCESS.md
```

---

## Key Comparison Dimensions

When analyzing any system against Chariot, evaluate these dimensions:

### Agent Architecture

- Single vs multi-agent
- Hierarchical vs flat
- Specialist routing mechanism
- Context management approach

### Execution Model

- Process-based vs service-based
- Sandboxing approach (OS-native, container, none)
- Approval/constraint model
- Tool integration pattern

### Data Management

- Primary storage (graph, relational, document, file)
- Session state persistence
- ML training data capture
- Deduplication strategy

### Security Domains

- Web vulnerabilities (SQLi, XSS, SSRF, etc.)
- Network enumeration
- Privilege escalation (Linux, Windows)
- Active Directory
- Cloud security
- Internal network testing

### Validation & Triage

- Multi-phase validation
- Severity assessment (CVSS)
- Deduplication
- Human-in-the-loop patterns

### Integration Points

- MCP protocol support
- API patterns (REST, gRPC)
- External tool wrapping
- Enterprise integrations

### Maturity Indicators

- Production readiness
- Documentation quality
- Test coverage
- Academic grounding

---

## Notes

- **Agent Count**: 4-8 agents per system is optimal. More agents = faster but higher API cost.
- **Timeout**: 300000ms (5 min) per agent is usually sufficient.
- **Background Execution**: Always use `run_in_background: true` for parallelism.
- **TodoWrite**: Use to track progress across the multi-step process.
- **Output Location**: Save to repo root as `CHARIOT-vs-[TARGET].md`.
