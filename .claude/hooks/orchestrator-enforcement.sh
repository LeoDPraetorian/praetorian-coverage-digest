#!/bin/bash
# Orchestrator Skill Enforcement Hook
#
# UserPromptSubmit hook that injects agent/skill decision guidance.
# Uses full JSON format with all required fields.

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract user_prompt from JSON input
user_prompt=$(echo "$input" | jq -r '.prompt // .user_prompt // ""' 2>/dev/null || echo "")

# Convert to lowercase for matching
lower_prompt=$(echo "$user_prompt" | tr '[:upper:]' '[:lower:]')

# Check if prompt contains task-like keywords
should_inject=false

for keyword in analyze review audit assess examine evaluate \
               implement create build develop write \
               fix debug investigate diagnose \
               refactor optimize improve \
               test design architect plan; do
    if echo "$lower_prompt" | grep -q "$keyword"; then
        should_inject=true
        break
    fi
done

# If no trigger keywords found, exit silently
if [ "$should_inject" = false ]; then
    exit 0
fi

# Build the context content (will be JSON-escaped)
read -r -d '' CONTEXT_CONTENT << 'CONTENT_EOF' || true
<orchestrator-skill-enforcement>
## BEHAVIOR CHECK (BEFORE ANYTHING ELSE)

Will you use the Read tool on a code file (.ts, .tsx, .js, .go, .py, .rs, .java)?

YES → STOP. Spawn an agent instead. Do NOT read the file yourself.
NO → Continue to intent check below.

This is binary. No judgment. No "it's just one file." No "I'll just take a quick look."

---

## INTENT CHECK

Does the task involve ANALYZING, REVIEWING, ARCHITECTING, IMPLEMENTING, EXPLAINING, or TESTING code?

YES → Spawn an agent.
NO → Handle directly.

"Explain this code" IS code analysis. "Look at this file" IS code analysis.
Do not reinterpret these as something else.

---

## AGENT SELECTION (use THESE agents, not general-purpose ones)

- MCP wrappers, TypeScript tooling, .claude/tools/ → mcp-tool-lead, mcp-tool-developer, mcp-tool-reviewer
- Backend, backend APIs, Lambda, AWS, Go services → backend-lead, backend-developer, backend-reviewer, backend-security
- React UI, frontend components → frontend-lead, frontend-developer, frontend-reviewer, frontend-security
- Test strategy, test quality, test coverage → test-lead
- Security strategy, security quality, security coverage → security-lead
- Security scanners, capabilities, fingerprintx, VQL, Nuclei → capability-lead, capability-developer, capability-reviewer, capability-tester

Do NOT use general-purpose agents (Explore, etc.) when a specialized agent exists.
Specialized agents have domain knowledge. Use them.
Exception: For Phase 2 Discovery in orchestration skills, Explore IS the correct agent.

---

## MULTI-AGENT CHECK (before spawning 2+ agents)

Does the task involve 2+ of: architecture, implementation, testing, review?

YES → Use an ORCHESTRATION SKILL, not direct agent spawning:

| Task Type | Skill to Invoke |
|-----------|-----------------|
| Complete feature (design + implement + review +test) | `orchestrating-feature-development` or `/feature` command |
| Execute existing plan | `developing-with-subagents` |
| Research across sources | `orchestrating-research` or `/research` command |
| Capability/scanner development | `orchestrating-capability-development` or `/capability` command |
| Fingerprintx module | `orchestrating-fingerprintx-development` or `/fingerprintx` command |

NO → Single-agent task, spawn directly per protocol below.

**Why skills, not direct spawning?** Skills run in main conversation and guide the full workflow.
Direct multi-agent spawning without orchestration skill misses: effort scaling, output persistence, progress tracking.

### BEFORE Multi-Agent Orchestration

Invoke these skills FIRST:
1. `orchestrating-multi-agent-workflows` - effort scaling, when to orchestrate vs delegate
2. `persisting-agent-outputs` - set up output directory structure

### ALL Spawned Agents Must Be Told

Include in EVERY Task prompt for orchestrated workflows:

```
OUTPUT_DIRECTORY: [path from persisting-agent-outputs]
MANDATORY SKILLS: persisting-agent-outputs (for output files)
```

---

## ONLY Handle Directly When:
- Factual question (no code reading required)
- Documentation lookup
- No matching agent exists

---

## IF Handling Directly: Use Skills

1. Check which skills apply (per using-skills guidance already in context)
2. Invoke relevant core skills via Skill tool
3. Check gateways for applicable library skills
4. No agent spawning needed

---

## IF Spawning an Agent: Full Protocol

### BEFORE Calling Task Tool

1. Identify the agent you will spawn
2. Read the agent's definition file (.claude/agents/...) - EVERY TIME, no exceptions
3. Copy ALL Step 1 mandatory skills from the definition - do NOT pick a subset

WARNING: "This task is simpler so fewer skills" is a rationalization trap.
ALL Step 1 skills are mandatory. No exceptions. No judgment calls.

### WHEN Calling Task Tool

Include explicit skill requirements in the Task prompt:

[Your task description]

MANDATORY SKILLS (invoke ALL before completing):
- skill-1: [why needed]
- skill-2: [why needed]

COMPLIANCE: Document invoked skills in output metadata. I will verify.

### AFTER Agent Returns

1. Check the output file (not just the response summary)
2. Read metadata.skills_invoked array
3. Compare against your mandatory list
4. Report discrepancies - if agent claimed skills it didn't list in metadata, note this

---

## Why This Protocol Exists

Subagents don't receive SessionStart hook injection. They see their agent definition
but may rationalize skipping skills. Explicit prompt-level requirements + verification
creates accountability that definition-level instructions alone don't provide.
</orchestrator-skill-enforcement>
CONTENT_EOF

# Escape the content for JSON using jq
ESCAPED_CONTENT=$(echo "$CONTEXT_CONTENT" | jq -Rs '.')

# Output full JSON structure required by UserPromptSubmit
cat << EOF
{
  "continue": true,
  "stopReason": "",
  "suppressOutput": false,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $ESCAPED_CONTENT
  }
}
EOF

exit 0
