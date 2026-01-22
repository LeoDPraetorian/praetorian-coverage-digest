---
name: persisting-agent-outputs
description: Use when agents need to persist work outputs to files - defines directory discovery protocol, file naming conventions, MANIFEST.yaml structure, and JSON metadata format for feature workflow coordination
allowed-tools: Write, Edit, Bash, Read
---

# Persisting Agent Outputs

**Standardizes how ALL agents persist their work outputs to files.**

## Problem

Without this skill, agents:

- Write outputs to scattered locations
- Invent their own file naming schemes
- Can't discover "the current feature directory"
- Claim to create "artifacts" without writing files

## Solution

This skill defines:

1. **WHERE** - Directory from orchestrator context OR fallback to `.claude/.output/agents/{timestamp}-{slug}/`
2. **HOW** - File naming (`{agent-name}-{output-type}.md`)
3. **WHAT** - JSON metadata block format
4. **DISCOVERY** - Protocol for finding/creating feature directories

## Quick Start

### For Agents (You)

**YOU MUST use TodoWrite before starting** to track all file persistence steps.

```markdown
## Before writing any output:

1. Invoke this skill: `skill: "persisting-agent-outputs"`
2. Follow discovery protocol (check for feature_directory parameter)
3. Write file to discovered/created directory
4. Update MANIFEST.yaml
5. Return actual file path in artifacts array
```

### For Orchestrators (Main Claude)

```markdown
## When spawning agents:

Pass feature_directory in the task prompt:

feature_directory: ".claude/.output/agents/2025-12-30-143022-tanstack-migration"

This ensures all agents write to the same location.
```

---

## Directory Structure

**Orchestrated contexts** (directory provided by orchestrator):

```
.claude/.output/features/{timestamp}-{name}/      # Feature development
.claude/.output/research/{timestamp}-{topic}/     # Research tasks
.claude/.output/capabilities/{timestamp}-{name}/  # Capability development
.claude/.output/mcp-wrappers/{timestamp}-{service}/ # MCP wrapper development
.claude/.output/threat-modeling/{timestamp}-{target}/ # Threat modeling
```

**Standalone context** (agent creates when no orchestrator):

```
.claude/.output/agents/{timestamp}-{slug}/
├── MANIFEST.yaml
├── {agent-name}-{output-type}.md
└── ...
```

**Example:**

```
.claude/.output/agents/2025-12-30-143022-tanstack-migration/
├── MANIFEST.yaml
├── frontend-lead-architecture-review.md
├── frontend-developer-implementation.md
├── frontend-tester-test-plan.md
└── frontend-reviewer-code-review.md
```

---

## Discovery Protocol

**Agents determine the feature directory using this priority:**

### 0. Parse Orchestrator-Provided Path (HIGHEST PRIORITY)

Check your task prompt for ANY of these patterns:

| Pattern                     | Example                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `OUTPUT_DIRECTORY: {path}`  | `OUTPUT_DIRECTORY: .claude/.output/features/2026-01-04-asset-filter/`  |
| `Save to: {path}`           | `Save to: .claude/.output/features/2026-01-04/architecture.md`         |
| `Write output to: {path}`   | `Write output to: .claude/.output/mcp-wrappers/linear/architecture.md` |
| `feature_directory: {path}` | `feature_directory: .claude/.output/agents/2026-01-04-task/`           |

**If pattern found:**

1. Extract the path
2. If path ends with `.md` (includes filename):
   - Directory = path up to last /
   - Filename = the .md file specified
3. If path is directory only (ends with /):
   - Directory = the path
   - Filename = your agent's **Primary output:** OR fallback to `{agent-name}-{output-type}.md`

**Example parsing:**

| Prompt Contains                                                | Directory                                 | Filename                    |
| -------------------------------------------------------------- | ----------------------------------------- | --------------------------- |
| `Save to: .claude/.output/features/2026-01-04/architecture.md` | `.claude/.output/features/2026-01-04/`    | `architecture.md`           |
| `OUTPUT_DIRECTORY: .claude/.output/mcp-wrappers/linear/`       | `.claude/.output/mcp-wrappers/linear/`    | Agent's **Primary output:** |
| `feature_directory: .claude/.output/agents/2026-01-04-task/`   | `.claude/.output/agents/2026-01-04-task/` | Agent's **Primary output:** |

**If orchestrator path found → SKIP Steps 1-2, go directly to writing output.**

### 1. Explicit feature_directory Parameter (Legacy)

```typescript
// If caller provides feature_directory in task prompt:
if (taskPrompt.includes("feature_directory:")) {
  useProvidedDirectory();
}
```

### 2. Recent Directory Fallback

If no parameter provided:

```bash
# Find MANIFEST.yaml files modified in last 60 minutes
find .claude/.output/agents -name "MANIFEST.yaml" -mmin -60
```

- **Exactly ONE found** → use it
- **Multiple found** → read each MANIFEST.yaml, select best match by feature_name/description
- **None found** → create new directory (you are the first agent)

### 3. Create Standalone Directory (No Orchestrator Context)

**Only use this if:**

- No orchestrator path found in prompt (Step 0)
- No feature_directory parameter (Step 1)
- No recent MANIFEST.yaml found (Step 2)

This creates a standalone output directory for ad-hoc agent tasks:

**YOU MUST run the actual `date` command — DO NOT approximate or invent timestamps.**

```bash
# Step 1: Get EXACT timestamp by running this command
date +"%Y-%m-%d-%H%M%S"
# Example output: 2026-01-03-115247

# Step 2: Generate slug from task description (lowercase, hyphenated)
# Examples: serena-pool-analysis, tanstack-migration, user-auth-refactor

# Step 3: Create directory with EXACT timestamp from Step 1
mkdir -p ".claude/.output/agents/2026-01-03-115247-your-slug-here"
```

**WRONG:** Guessing `113000` (rounded to 11:30:00)
**RIGHT:** Using actual output like `115247` (11:52:47)

**One-liner alternative:**

```bash
SLUG="your-feature-slug" && mkdir -p ".claude/.output/agents/$(date +%Y-%m-%d-%H%M%S)-${SLUG}"
```

**For complete discovery algorithm, see:** [references/discovery-protocol.md](references/discovery-protocol.md)

---

## Filename Resolution

**Priority order for determining output filename:**

| Priority | Source                                         | Example                                                           |
| -------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| 1        | Orchestrator specifies full path with filename | `Save to: .../architecture.md` → `architecture.md`                |
| 2        | Agent's **Primary output:** in Output Format   | `**Primary output:** architecture.md` → `architecture.md`         |
| 3        | Skill's naming convention                      | `{agent-name}-{output-type}.md` → `mcp-lead-architecture-plan.md` |

**Agents should define their Primary output in their Output Format section:**

```markdown
## Output Format

Follow `persisting-agent-outputs` skill for directory discovery.

**Primary output:** `architecture.md`
```

When orchestrated, the orchestrator may override with a specific filename. When standalone, the agent uses its Primary output or falls back to the skill's naming convention.

---

## File Naming Convention

**Pattern:** `{agent-name}-{output-type}.md`

| Agent Type     | Example Filename                          |
| -------------- | ----------------------------------------- |
| Architecture   | `frontend-lead-architecture-review.md`    |
| Implementation | `frontend-developer-implementation.md`    |
| Testing        | `frontend-tester-test-plan.md`            |
| Review         | `frontend-reviewer-code-review.md`        |
| Security       | `frontend-security-vulnerability-scan.md` |

**Agent name:** From agent definition `name:` field
**Output type:** Descriptive (architecture-review, implementation, test-plan, code-review)

---

## MANIFEST.yaml Structure

**Every feature directory has a MANIFEST.yaml:**

```yaml
feature_name: "TanStack Ecosystem Migration"
feature_slug: "tanstack-migration"
created_at: "2025-12-30T14:30:22Z"
created_by: "frontend-lead"
description: |
  Migration from React Router v7 to TanStack Router,
  standardizing tables with TanStack Table, and
  removing PII from URL paths.

status: "in-progress" # in-progress | complete | blocked

agents_contributed:
  - agent: "frontend-lead"
    artifact: "frontend-lead-architecture-review.md"
    timestamp: "2025-12-30T14:30:22Z"
    status: "complete"

artifacts:
  - path: "frontend-lead-architecture-review.md"
    type: "architecture-review"
    agent: "frontend-lead"
```

**Agents MUST update MANIFEST.yaml when writing an artifact.**

**For complete YAML structure and examples, see:** [references/manifest-structure.md](references/manifest-structure.md)

### Two-Layer State Management

This skill defines a **two-layer metadata system**:

**Layer 1: Per-Agent Metadata** (Embedded in each agent's output file)

- JSON metadata block at end of each `.md` file
- Contains: agent, status, skills_invoked, source_files_verified, handoff
- Defined in [references/metadata-format.md](references/metadata-format.md)

**Layer 2: Directory Metadata** (MANIFEST.yaml tracks all agents)

- YAML file tracking agents_contributed and artifacts arrays
- Contains: feature_name, status, agents, artifacts
- **OPTIONAL**: orchestration state (phases, verification, current_phase)
- Defined in [references/manifest-structure.md](references/manifest-structure.md)

**When orchestration skills are active:**

- MANIFEST.yaml is the SINGLE source of truth for workflow state
- Orchestrators MUST NOT create separate metadata.json or progress.json files
- Use MANIFEST.yaml optional fields (phases, verification) for orchestration tracking

**When agents run without orchestration:**

- Agents write output file with embedded JSON metadata (Layer 1)
- Agents update MANIFEST.yaml agents_contributed array (Layer 2)
- The phases/verification sections remain empty (not applicable)

---

## JSON Metadata Block

**Every agent output file ends with a JSON metadata block:**

````markdown
... agent's content here ...

---

## Metadata

```json
{
  "agent": "frontend-lead",
  "output_type": "architecture-review",
  "timestamp": "2025-12-30T14:30:22Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": ["enforcing-evidence-based-analysis", "gateway-frontend"],
  "library_skills_read": [".claude/skill-library/path/to/skill.md"],
  "source_files_verified": ["src/state/auth.tsx:490-590"],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Implement according to plan"
  }
}
```
````

When `status` is `blocked`, include `blocked_reason` and `attempted` fields. See [references/metadata-format.md](references/metadata-format.md) for blocked example. For routing logic to determine `handoff.next_agent` based on `blocked_reason`, see [references/blocked-agent-routing.md](references/blocked-agent-routing.md).

**For complete field definitions, see:** [references/metadata-format.md](references/metadata-format.md)

---

## Slug Generation Rules

**Who generates the slug:**

| Scenario                         | Who Generates                             |
| -------------------------------- | ----------------------------------------- |
| `/feature` orchestrated workflow | Orchestrator generates at workflow start  |
| Ad-hoc terminal (first agent)    | First agent derives from task description |
| Ad-hoc terminal (subsequent)     | Discover existing directory via protocol  |

**Slug format:**

- Lowercase, hyphenated, descriptive
- Derived from core task/feature
- Good: `tanstack-migration`, `user-auth-refactor`
- Bad: `review`, `task-1`, `temp`

**For slug generation algorithm, see:** [references/slug-generation.md](references/slug-generation.md)

---

## Anti-Patterns (DO NOT DO THIS)

### ❌ "I'll just respond with text"

**WRONG.** Files persist. Responses vanish. Your work product MUST be in a file.

### ❌ "The response IS the artifact"

**WRONG.** `"artifacts": ["This response"]` is not an artifact. Write an actual file.

### ❌ "I don't know the feature directory"

**WRONG.** Follow the discovery protocol. If no directory exists, create one.

### ❌ "I'll let the orchestrator handle it"

**WRONG.** YOU write the file. YOU update the MANIFEST. Don't delegate persistence.

### ❌ "I'll create a new directory" (when one exists)

**WRONG.** Check for existing directories first. Multiple directories for the same feature = chaos.

### ❌ "The MANIFEST is optional"

**WRONG.** MANIFEST.yaml is MANDATORY. It's the audit trail for the entire feature workflow.

---

## Workflow Examples

### Ad-Hoc Terminal Workflow

```
User: "have frontend-lead review the tanstack migration plan"

frontend-lead:
  1. No feature_directory provided
  2. Check for recent .claude/.output/agents/*/MANIFEST.yaml
  3. None found → create new directory
  4. Generate slug: "tanstack-migration"
  5. Create: .claude/.output/agents/2025-12-30-143022-tanstack-migration/
  6. Write MANIFEST.yaml
  7. Write frontend-lead-architecture-review.md
  8. Return feature_directory in output

---

User: "now have frontend-developer implement phase 0"

Main Claude:
  Passes feature_directory to frontend-developer

frontend-developer:
  1. feature_directory provided → use it
  2. Read MANIFEST.yaml for context
  3. Write frontend-developer-implementation.md
  4. Update MANIFEST.yaml with new entry
```

### Orchestrated Workflow (/feature)

```
User: "/feature implement tanstack migration"

Orchestrator:
  1. Create: .claude/.output/agents/2025-12-30-143022-tanstack-migration/
  2. Write initial MANIFEST.yaml
  3. Spawn frontend-lead WITH feature_directory
  4. Spawn frontend-developer WITH feature_directory
  5. Spawn frontend-tester WITH feature_directory
  → All agents write to same directory
```

**For complete workflow examples, see:** [references/workflow-examples.md](references/workflow-examples.md)

---

## Integration

### Called By

- All domain agents (frontend-_, backend-_, tool-_, capability-_)
- `orchestrating-feature-development` (LIBRARY) - `Read(".claude/skill-library/development/orchestrating-feature-development/SKILL.md")` (Phase 1 - provides OUTPUT_DIRECTORY)
- `orchestrating-capability-development` (Phase 1 - provides OUTPUT_DIRECTORY)
- `orchestrating-integration-development` (Phase 1 - provides OUTPUT_DIRECTORY)
- `orchestrating-multi-agent-workflows` (before spawning agents)
- `orchestrating-fingerprintx-development` (Phase 1 - provides OUTPUT_DIRECTORY)

### Requires (invoke before starting)

None - this is a foundational skill invoked early in agent workflows

### Calls (during execution)

None - terminal skill that performs file I/O operations

### Pairs With (conditional)

- **`verifying-before-completion`** (CORE) - After writing output files
  - Purpose: Verify files actually written
  - `skill: "verifying-before-completion"`

- **`orchestrating-multi-agent-workflows`** (CORE) - Multi-agent context
  - Purpose: Coordinates shared output directory
  - `skill: "orchestrating-multi-agent-workflows"`

---

## Gateway Integration

This skill is MANDATORY in all gateways:

- `gateway-frontend` → Tier 1 (always invoke)
- `gateway-backend` → Tier 1 (always invoke)
- `gateway-testing` → Tier 1 (always invoke)
- `gateway-security` → Tier 1 (always invoke)

Agents invoke via: `skill: "persisting-agent-outputs"`

---

## References

**Detailed documentation:**

- [Blocked Agent Routing](references/blocked-agent-routing.md) - Routing table for blocked agents by domain and reason
- [Discovery Protocol](references/discovery-protocol.md) - Complete algorithm
- [MANIFEST Structure](references/manifest-structure.md) - YAML format and examples
- [Metadata Format](references/metadata-format.md) - JSON field definitions
- [Slug Generation](references/slug-generation.md) - Algorithm and examples
- [Workflow Examples](references/workflow-examples.md) - Complete scenarios
- [Troubleshooting](references/troubleshooting.md) - Common issues and fixes
