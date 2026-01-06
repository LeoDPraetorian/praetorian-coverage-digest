# Chariot Agent Development Guide

**Created**: 2026-01-04
**Status**: Reference document for building security agents at scale

---

## Table of Contents

1. [Agent Architecture Overview](#agent-architecture-overview)
2. [Current vs Proposed Agent Design](#current-vs-proposed-agent-design)
3. [Agent Definition Schema](#agent-definition-schema)
4. [Example: sqli-hunter Agent](#example-sqli-hunter-agent)
5. [Capability-Calling Flow](#capability-calling-flow)
6. [Research Findings](#research-findings)
7. [Roadmap Alignment](#roadmap-alignment)

---

## Agent Architecture Overview

Chariot agents are **markdown files with YAML frontmatter** that get compiled into executable security capabilities.

```
Agent Definition (YAML/markdown)

Tool Registry (7 tools: query, schema, capabilities, job, rag, etc.)

Job Tool  Agora Registry (87 capabilities)

Executor (Janus/Aegis/Agent)
```

### Key Insight

Chariot has its **own capability system** - it doesn't need MCP for internal operations. Agents call capabilities via the `job` tool, which routes through Agora to the appropriate executor.

### Location

```
modules/chariot/backend/pkg/lib/agent/agents/
 root.md           # Template with security workflow protocol
 query.md          # Query mode for data discovery
 agent.md          # Base agent (provides all tools)
 asset-analyzer.md # Current (flawed) security agent
 [new-agents].md   # Add new agents here
```

---

## Current vs Proposed Agent Design

### Analysis: Why the Current Agent Fails

| Aspect                 | Current `asset-analyzer`         | Proposed `sqli-hunter`          |
| ---------------------- | -------------------------------- | ------------------------------- |
| **Tools**              | `query, schema, capabilities`    | `query, capabilities, job`      |
| **Can execute scans?** | No `job` tool                    | Yes                             |
| **Match condition**    | `class: [anotrealclass]` (typo!) | `class: [webpage, api]`         |
| **Focus**              | Generic "security analysis"      | Specific vulnerability type     |
| **Timeout**            | 15 seconds (too short)           | 60 seconds                      |
| **Workflow**           | Unclear                          | 4-phase structured approach     |
| **Output format**      | Unspecified                      | Structured finding template     |
| **Indicators**         | None                             | Vulnerability-specific patterns |
| **Prioritization**     | None                             | High-risk endpoint focus        |

### The Critical Flaw

The current agent **cannot execute any scans**:

```yaml
# Current asset-analyzer - BROKEN
tools:
  - query #  Can read data
  - schema #  Can understand schema
  - capabilities #  Can LIST capabilities
  #  No job tool = CANNOT EXECUTE capabilities
```

It's like giving someone a menu but no way to order food.

### The Fix

```yaml
# Proposed design - WORKS
tools:
  - query # Find targets
  - capabilities # Find scans
  - job # EXECUTE scans
```

### Other Issues with Current Implementation

1. **`anotrealclass`** - Literal typo/placeholder that means agent never matches any real assets
2. **15 second timeout** - Security scans take time; agent dies before nuclei finishes
3. **Generic = useless** - "Comprehensive security analysis" gives LLM no direction
4. **No workflow** - Agent has no structured approach to finding vulnerabilities
5. **No output format** - Results are unstructured and inconsistent

---

## Agent Definition Schema

### Required Fields

```yaml
---
name: kebab-case-name # Unique identifier
title: Human Readable Title # Display name
description: What this agent does
parents:
  - agent # Inherit from base agent
capability: true # Register in Agora
target: asset # Entity type (asset, domain, port)
timeout: 60 # Seconds before timeout
max_tool_calls: 50 # Prevent infinite loops
---
```

### Optional Fields

```yaml
match:
  class: [webpage, api] # Only match specific asset classes
tools:
  - query # Override inherited tools
  - job
praetorian: false # Internal vs customer-facing
```

### Available Tools

| Tool           | Purpose                      | When to Include                      |
| -------------- | ---------------------------- | ------------------------------------ |
| `query`        | Search database for entities | Always                               |
| `schema`       | Understand data model        | When building queries                |
| `capabilities` | List available scans         | When selecting scans                 |
| `job`          | Execute a scan               | **Required to actually do anything** |
| `rag`          | Semantic search findings     | For context/history                  |
| `add_webpage`  | Add webpages to monitoring   | Web discovery                        |
| `link_webpage` | Link webpages to sources     | Web discovery                        |

### Parent Inheritance

```
agent.md (base)
   tools: query, schema, capabilities, job, add_webpage, link_webpage
   Comprehensive system prompt with security workflow

your-agent.md
   parents: [agent]   Inherits everything
   Adds specialized instructions
```

---

## Example: sqli-hunter Agent

### Full Implementation

````yaml
---
name: sqli-hunter
title: SQL Injection Hunter
description: Detects SQL injection vulnerabilities in web applications and APIs
parents:
  - agent
capability: true
target: asset
timeout: 60
max_tool_calls: 30
match:
  class: [webpage, api]
---

# SQL Injection Hunter

You are a SQL injection specialist. Your mission: find SQLi vulnerabilities in web targets.

## Tools Available

| Tool | Use For |
|------|---------|
| `query` | Get target details, find related assets |
| `capabilities` | Find SQLi-related scanning capabilities |
| `job` | Execute scans against the target |

## Detection Strategy

### Phase 1: Reconnaissance
First, understand your target:
- What technology stack? (PHP, Java, .NET = higher SQLi risk)
- What parameters exist? (forms, query strings, APIs)
- Any existing findings on this asset?

### Phase 2: Capability Selection
Find appropriate SQLi detection capabilities:
- nuclei with SQLi templates
- sqlmap-based detection
- error-based injection probes

### Phase 3: Execution
Run scans systematically:
```json
{
  "key": "<exact asset key from query>",
  "capability": "<selected capability name>"
}
````

### Phase 4: Analysis

After each scan:

- Check for confirmed SQLi findings
- Note error-based vs blind vs time-based
- Identify injection points (parameter names)
- Assess exploitability

## SQLi Indicators to Watch For

**Error-based**: Database errors in responses

- `SQL syntax error`
- `mysql_fetch`, `ORA-`, `ODBC`

**Blind**: Behavioral differences

- Response time variations (time-based)
- Content length changes (boolean-based)

**Out-of-band**: External interactions

- DNS lookups to attacker domain
- HTTP callbacks

## Prioritization

Focus on:

1. **Authentication endpoints** - Login forms, password resets
2. **Search functionality** - Often unsanitized
3. **Data filtering** - Sort, filter, pagination params
4. **APIs with dynamic queries** - REST endpoints with query params

## Output Format

Report findings as:

### SQLi Finding: [endpoint]

**Type**: Error-based / Blind / Time-based
**Parameter**: [vulnerable param]
**Evidence**: [response excerpt or timing data]
**Severity**: Critical / High
**Exploitability**: [assessment]

## Constraints

- Only test assets you're authorized to scan
- Don't attempt data exfiltration
- Report findings, don't exploit them
- If uncertain, flag for human review

````

### Deployment

```bash
# 1. Create the file
cat > modules/chariot/backend/pkg/lib/agent/agents/sqli-hunter.md << 'EOF'
[paste yaml+markdown above]
EOF

# 2. Rebuild (agents are embedded at compile time)
cd modules/chariot/backend && make build

# 3. Agent is now callable via Agora as "sqli-hunter" capability
````

---

## Capability-Calling Flow

### How Agents Execute Capabilities

```
1. User/System triggers agent with target asset

2. Agent loaded from markdown definition

3. LocalExecutor starts agentic loop

4. Agent calls `capabilities` tool
    Returns list of available scans from Agora

5. Agent selects appropriate capability

6. Agent calls `job` tool:
   {
     "key": "#asset#example.com#https://example.com/login",
     "capability": "nuclei"
   }

7. Job Tool validates:
   - Target exists
   - Capability exists in Agora
   - User has permission

8. Job Service routes to executor:
   - Janus (external targets)
   - Aegis (internal/VQL)
   - Agent (agent-as-capability)

9. Results return to agent conversation

10. Agent analyzes and reports findings
```

### Code Path

```
pkg/lib/agent/tools/job.go
   JobTool.Execute()
     Validates capability in PlannerCapabilities()
     job.NewService().Put(jobUpdate)
       Routes to Agora registry
         Executor invoked (Janus/Aegis/Agent)
```

---

## Research Findings

### Source: Agent SDK Patterns Synthesis (2026-01-04)

#### Key Insight for Chariot

> Your existing skill/agent infrastructure already implements patterns that are becoming industry standards. The path forward is **not** to rebuild for Claude Agent SDK specifically, but to ensure your capability system is well-designed and your agent orchestration is provider-agnostic.

#### Industry Standards Emerging

1. **MCP (Model Context Protocol)** - For external tool integration
   - Chariot uses its own capability system internally (better)
   - MCP useful for Cursor/external integrations (already implemented)

2. **Agent Skills Standard** - SKILL.md format
   - Chariot's agent markdown format is similar
   - Portable across LLM providers

#### Recommended Architecture

```

           Agent Definitions (Markdown/YAML)
  - Portable across providers
  - Declarative configuration

           Tool Registry (Current)
  - query, schema, capabilities, job, rag

           Agora Capability Registry (Current)
  - 87 security capabilities
  - Janus, Aegis, Agent executors

           LLM Provider (Bedrock/Claude)
  - Could swap to OpenAI, local models
  - Agent definitions remain unchanged

```

#### Security Agent Patterns (from HexStrike AI, HPTSA research)

**Hierarchical Planning Pattern**:

```
                    security-orchestrator



         detection    exploitation    recon
            team         team         team


        sqli xss ssrf  poc  chain  sub  tech
```

**Playbook-Driven Pattern**:

```yaml
playbook: sqli-detection
phases:
  - reconnaissance  recon-agent
  - discovery  sqli-hunter
  - exploitation  sqli-hunter (if authorized)
  - reporting  vuln-reporter
```

---

## Roadmap Alignment

### PRD Requirements vs Implementation

| PRD Requirement                    | Status      | Agent Needed                   |
| ---------------------------------- | ----------- | ------------------------------ |
| REQ-AGENT-005: Recon Agent         | Not Started | `recon-agent`                  |
| REQ-AGENT-006: SQLi Agent          | Not Started | `sqli-hunter`                  |
| REQ-AGENT-007: XSS Agent           | Not Started | `xss-hunter`                   |
| REQ-AGENT-008: Zero-Day (HPTSA)    | Not Started | `security-orchestrator` + team |
| REQ-AGENT-009: Signature Generator | Not Started | `signature-generator`          |

### Proposed Agent Roster

| Agent                   | Type          | Capabilities              | Priority |
| ----------------------- | ------------- | ------------------------- | -------- |
| `sqli-hunter`           | Detection     | nuclei-sqli, sqlmap       | High     |
| `xss-hunter`            | Detection     | nuclei-xss, dom-xss       | High     |
| `ssrf-hunter`           | Detection     | nuclei-ssrf               | High     |
| `recon-agent`           | Recon         | subdomain-enum, port-scan | High     |
| `tech-fingerprinter`    | Recon         | tech-detection            | Medium   |
| `exploit-generator`     | Exploitation  | poc-creation              | Medium   |
| `security-orchestrator` | Orchestration | (coordinates all)         | High     |
| `vuln-reporter`         | Reporting     | report-generation         | Medium   |

### Creating Agents at Scale

1. **Template-based**: Use sqli-hunter as template, swap vulnerability type
2. **Inherit from `agent`**: Get all tools automatically
3. **Specific focus**: One vuln class per agent
4. **Structured workflow**: 4-phase approach (Recon Select Execute Analyze)
5. **Clear output format**: Consistent finding structure

### Quick Creation Checklist

```markdown
Name follows kebab-case
Inherits from `agent` parent
Has `capability: true`
Has `job` in tools (critical!)
Has appropriate `match.class` filter
Has reasonable timeout (30-120s)
Has structured workflow (phases)
Has specific indicators to look for
Has output format template
Has constraints/ethical boundaries
```

---

## Quick Reference

### Create a New Agent

```bash
# 1. Write definition
cat > modules/chariot/backend/pkg/lib/agent/agents/my-agent.md << 'EOF'
---
name: my-agent
title: My Agent
description: Does X
parents: [agent]
capability: true
target: asset
timeout: 60
max_tool_calls: 30
---
# My Agent
[Instructions...]
EOF

# 2. Rebuild
cd modules/chariot/backend && make build

# 3. Done - agent is now in Agora
```

### Test an Agent

```bash
# Via CLI
chariot agent run --capability my-agent --target "#asset#example.com#..."

# Via API
POST /api/v1/jobs
{
  "key": "#asset#...",
  "capabilities": ["my-agent"]
}
```

---

_This document synthesizes analysis from 2026-01-04 comparing current agent implementation with proposed improvements, informed by industry research on agent SDK patterns._
