---
name: persisting-agent-outputs
description: Use when agents need to persist work outputs to files - defines directory discovery protocol, file naming conventions, MANIFEST.yaml structure, and JSON metadata format for feature workflow coordination
allowed-tools: Write, Edit, Bash, Read, Grep
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

1. **WHERE** - Directory structure (`.claude/features/{timestamp}-{slug}/`)
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

feature_directory: ".claude/features/2025-12-30-143022-tanstack-migration"

This ensures all agents write to the same location.
```

---

## Directory Structure

```
.claude/features/{YYYY-MM-DD-HHMMSS}-{feature-slug}/
├── MANIFEST.yaml
├── {agent-name}-{output-type}.md
├── {agent-name}-{output-type}.md
└── ...
```

**Example:**

```
.claude/features/2025-12-30-143022-tanstack-migration/
├── MANIFEST.yaml
├── frontend-lead-architecture-review.md
├── frontend-developer-implementation.md
├── frontend-tester-test-plan.md
└── frontend-reviewer-code-review.md
```

---

## Discovery Protocol

**Agents determine the feature directory using this priority:**

### 1. Explicit Parameter (PREFERRED)

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
find .claude/features -name "MANIFEST.yaml" -mmin -60
```

- **Exactly ONE found** → use it
- **Multiple found** → read each MANIFEST.yaml, select best match by feature_name/description
- **None found** → create new directory (you are the first agent)

### 3. Create New Directory

```bash
# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")

# Generate slug from task description
# Examples: tanstack-migration, user-auth-refactor, asset-table-virtualization
SLUG="feature-slug-from-task"

# Create directory
mkdir -p .claude/features/${TIMESTAMP}-${SLUG}
```

**For complete discovery algorithm, see:** [references/discovery-protocol.md](references/discovery-protocol.md)

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
  "feature_directory": ".claude/features/2025-12-30-143022-tanstack-migration",
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
  2. Check for recent .claude/features/*/MANIFEST.yaml
  3. None found → create new directory
  4. Generate slug: "tanstack-migration"
  5. Create: .claude/features/2025-12-30-143022-tanstack-migration/
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
  1. Create: .claude/features/2025-12-30-143022-tanstack-migration/
  2. Write initial MANIFEST.yaml
  3. Spawn frontend-lead WITH feature_directory
  4. Spawn frontend-developer WITH feature_directory
  5. Spawn frontend-tester WITH feature_directory
  → All agents write to same directory
```

**For complete workflow examples, see:** [references/workflow-examples.md](references/workflow-examples.md)

---

## Gateway Integration

This skill is MANDATORY in all gateways:

- `gateway-frontend` → Tier 1 (always invoke)
- `gateway-backend` → Tier 1 (always invoke)
- `gateway-testing` → Tier 1 (always invoke)
- `gateway-security` → Tier 1 (always invoke)

Agents invoke via: `skill: "persisting-agent-outputs"`

---

## Related Skills

- `writing-plans` - Creates implementation plans (uses this skill for output)
- `orchestrating-feature-development` - Feature orchestrator (passes feature_directory to agents)
- `using-todowrite` - Task tracking (separate concern from file persistence)
- `verifying-before-completion` - Ensures artifacts were actually written

---

## References

**Detailed documentation:**

- [Discovery Protocol](references/discovery-protocol.md) - Complete algorithm
- [MANIFEST Structure](references/manifest-structure.md) - YAML format and examples
- [Metadata Format](references/metadata-format.md) - JSON field definitions
- [Slug Generation](references/slug-generation.md) - Algorithm and examples
- [Workflow Examples](references/workflow-examples.md) - Complete scenarios
- [Troubleshooting](references/troubleshooting.md) - Common issues and fixes
