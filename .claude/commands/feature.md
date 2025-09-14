---
description: Transform feature description into actionable implementation plan
model: claude-opus-4-1-20250805
---

# Feature Implementation Workflow

You are orchestrating a multi-phase feature planning workflow. Your goal is to transform the user's feature description into a comprehensive, actionable implementation plan.

**Feature Request**: $ARGUMENTS

## Context Management Strategy

### Step 1: Create Feature-Specific Workspace

First, generate a unique identifier for this feature:

```bash
# Extract key words from feature description and create slug
FEATURE_NAME=$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FEATURE_ID="${FEATURE_NAME}_${TIMESTAMP}"

# Create feature-specific directory structure
mkdir -p .claude/features/${FEATURE_ID}/{context,output,logs,architecture}

# Save feature metadata
cat > .claude/features/${FEATURE_ID}/metadata.json << EOF
{
  "id": "${FEATURE_ID}",
  "description": "$ARGUMENTS",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "in_progress"
}
EOF

# Export for use throughout workflow
echo "Feature workspace created: .claude/features/${FEATURE_ID}"
echo "FEATURE_ID=${FEATURE_ID}" > .claude/features/current_feature.env

# Display the full paths that will be used
echo "=== Feature Workspace Paths ==="
echo "Requirements: .claude/features/${FEATURE_ID}/context/requirements.json"
echo "Knowledge Base: .claude/features/${FEATURE_ID}/context/knowledge-base.md"
echo "Complexity: .claude/features/${FEATURE_ID}/context/complexity-assessment.json"
echo "Architecture Dir: .claude/features/${FEATURE_ID}/architecture/"
echo "Plan Output: .claude/features/${FEATURE_ID}/output/implementation-plan.md"
echo "=============================="
```

Throughout this workflow, you will create intermediate files in the feature-specific directory. Each phase will generate artifacts that subsequent phases can read.

## Workflow Execution

### Phase 1: Intent Analysis

Get the workspace paths for this phase:

```bash
source .claude/features/current_feature.env
REQUIREMENTS_FILE=".claude/features/${FEATURE_ID}/context/requirements.json"
echo "Requirements will be saved to: ${REQUIREMENTS_FILE}"
```

Use the `intent-translator` subagent to parse and structure the feature request.

Tell the intent-translator:
"Analyze this feature request: $ARGUMENTS

Save your analysis as JSON to the file path shown above (the one that ends with /requirements.json).

Your output should include:

- feature_name: short identifier
- user_stories: array of stories
- acceptance_criteria: array of criteria
- affected_systems: list of components
- constraints: technical constraints"

Wait for the intent-analyzer to complete, then verify:

```bash
if [ -f "${REQUIREMENTS_FILE}" ]; then
    echo "✓ Requirements analysis completed"
    cat "${REQUIREMENTS_FILE}" | jq '.feature_name'
else
    echo "✗ Requirements analysis failed"
fi
```

### Phase 2: Knowledge Synthesis

Get the paths for knowledge synthesis:

```bash
source .claude/features/current_feature.env
INPUT_REQUIREMENTS=".claude/features/${FEATURE_ID}/context/requirements.json"
OUTPUT_KNOWLEDGE=".claude/features/${FEATURE_ID}/context/knowledge-base.md"
SYNTHESIS_PLAN=".claude/features/${FEATURE_ID}/context/synthesis-plan.json"

echo "=== Knowledge Synthesizer Paths ==="
echo "Input: ${INPUT_REQUIREMENTS}"
echo "Output: ${OUTPUT_KNOWLEDGE}"
echo "Synthesis Plan: ${SYNTHESIS_PLAN}"
echo "==================================="

# Show requirements summary for context
echo "Requirements Summary:"
cat "${INPUT_REQUIREMENTS}" | jq -r '.feature_name, .affected_systems[]' 2>/dev/null || echo "Requirements not found"
```

Use the `knowledge-synthesizer2` subagent to analyze requirements and recommend research approach.

Instruct the knowledge-synthesizer:
"Analyze the requirements and determine what research is needed for this feature.

Read the requirements from: ${INPUT_REQUIREMENTS}

Instead of spawning agents directly, create a research plan and save it to: ${SYNTHESIS_PLAN}

Your output should be a JSON file with this structure:

```json
{
  "research_needed": true,
  "rationale": "Explanation of why research is needed",
  "recommended_research": [
    {
      "agent": "web-research-specialist",
      "focus": "What specific information to gather",
      "priority": "high|medium|low",
      "reason": "Why this research is important"
    },
    {
      "agent": "code-pattern-analyzer",
      "focus": "What patterns to look for in codebase",
      "priority": "high",
      "reason": "Need to find existing implementations"
    }
  ],
  "synthesis_approach": "sequential|parallel",
  "expected_outputs": ["list of expected findings"]
}
```

Also create your initial knowledge synthesis and save to: ${OUTPUT_KNOWLEDGE}"

Check synthesis plan and execute recommended research:

```bash
if [ -f "${SYNTHESIS_PLAN}" ]; then
    echo "📋 Knowledge synthesizer recommendations:"
    cat "${SYNTHESIS_PLAN}" | jq -r '.recommended_research[] | "- \(.agent): \(.focus) [\(.priority)]"'

    RESEARCH_NEEDED=$(cat "${SYNTHESIS_PLAN}" | jq -r '.research_needed')

    if [ "${RESEARCH_NEEDED}" = "true" ]; then
        echo "Knowledge synthesizer recommends additional research."
        echo "Based on the synthesis plan above, I'll now spawn the recommended research agents:"
    fi
else
    echo "No synthesis plan found - proceeding with initial knowledge base"
fi
```

#### Research Agent Spawning

**Based on the synthesis plan generated above, spawn the recommended research agents:**

For each agent in the synthesis plan with priority "high":

1. Read the high-priority agents from the synthesis plan
2. Use the Task tool to spawn each high-priority agent concurrently
3. Provide each agent with:
   - Their specific focus from the plan
   - The path to append findings: ${OUTPUT_KNOWLEDGE}
   - Context from the feature requirements

After spawning agents, wait for them to complete before continuing.

Example spawning based on recommendations:

- If "web-research-specialist" is recommended for "React 18 best practices":
  Tell the agent: "Research current React 18 concurrent features best practices.
  Focus on: [specific focus from plan]. Append findings to: [knowledge base path]"

- If "code-pattern-analyzer" is recommended for "existing patterns":
  Tell the agent: "Analyze our codebase for [specific patterns from plan].
  Look for reusable components related to [feature]. Document findings in: [path]"

DO NOT PROCEED TO PHASE 3 until all research agents are spawned and their tasking has completed.

```bash
# Verify research was conducted
echo "Checking if research agents have appended to knowledge base..."
KNOWLEDGE_SIZE_AFTER=$(wc -l < "${OUTPUT_KNOWLEDGE}" 2>/dev/null || echo "0")
if [ "$KNOWLEDGE_SIZE_AFTER" -le "50" ]; then
    echo "⚠️ Knowledge base appears incomplete. Ensure research agents have completed."
fi
```

### Phase 3: Complexity Assessment

Prepare paths and context:

```bash
source .claude/features/current_feature.env
REQUIREMENTS_PATH=".claude/features/${FEATURE_ID}/context/requirements.json"
KNOWLEDGE_PATH=".claude/features/${FEATURE_ID}/context/knowledge-base.md"
ASSESSMENT_OUTPUT=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"

echo "=== Complexity Assessor Paths ==="
echo "Requirements: ${REQUIREMENTS_PATH}"
echo "Knowledge: ${KNOWLEDGE_PATH}"
echo "Output: ${ASSESSMENT_OUTPUT}"
echo "================================="

# Show summary of what was found
echo "Knowledge Summary:"
grep -A 3 "## Similar Patterns Found" "${KNOWLEDGE_PATH}" 2>/dev/null | head -10 || echo "No knowledge base found"
```

Use the `complexity-assessor` subagent to evaluate implementation complexity.

Tell the complexity-assessor:
"Assess the complexity of implementing this feature.

Read context from:

1. The Requirements path shown above (ending with /requirements.json)
2. The Knowledge path shown above (ending with /knowledge-base.md)

Save your assessment to the Output path shown above (ending with /complexity-assessment.json).

Your assessment should include:
{
'level': 'Simple|Medium|Complex',
'factors': ['list of complexity factors'],
'affected_domains': ['frontend', 'backend', 'database', 'security'],
'estimated_effort': 'hours or days',
'risk_level': 'Low|Medium|High',
'justification': 'explanation of assessment'
}"

Check the complexity level:

```bash
source .claude/features/current_feature.env
ASSESSMENT_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
if [ -f "${ASSESSMENT_FILE}" ]; then
    COMPLEXITY_LEVEL=$(cat "${ASSESSMENT_FILE}" | jq -r '.level')
    echo "✓ Complexity assessed as: ${COMPLEXITY_LEVEL}"
else
    echo "✗ Complexity assessment failed"
    COMPLEXITY_LEVEL="Unknown"
fi
```

### Phase 4: Architecture Planning (If Complex)

Check if architecture planning is needed:

```bash
source .claude/features/current_feature.env
ASSESSMENT_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
COMPLEXITY_LEVEL=$(cat "${ASSESSMENT_FILE}" | jq -r '.level' 2>/dev/null || echo "Unknown")

if [ "${COMPLEXITY_LEVEL}" = "Complex" ]; then
    echo "=== Architecture Planning Required ==="

    # Prepare architect context and directory
    CONTEXT_FILE=".claude/features/${FEATURE_ID}/context/architect-context.md"
    ARCHITECTURE_DIR=".claude/features/${FEATURE_ID}/architecture"
    COORDINATION_PLAN="${ARCHITECTURE_DIR}/coordination-plan.json"

    # Create architecture directory for individual architect outputs
    mkdir -p "${ARCHITECTURE_DIR}"

    # Create consolidated context for architects
    cat > "${CONTEXT_FILE}" << 'EOFA'
# Architecture Context

## Feature
$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description')

## Requirements Summary
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]' 2>/dev/null)

## Affected Components
$(grep -A 20 "## Component Dependencies" .claude/features/${FEATURE_ID}/context/knowledge-base.md 2>/dev/null || echo "No dependencies found")

## Current Implementation Patterns
$(grep -A 30 "## Similar Patterns Found" .claude/features/${FEATURE_ID}/context/knowledge-base.md 2>/dev/null || echo "No patterns found")

## Complexity Factors
$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.factors[]' 2>/dev/null)

## Affected Domains
$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.affected_domains[]' 2>/dev/null)
EOFA

    echo "Context prepared at: ${CONTEXT_FILE}"
    echo "Architecture outputs will be saved to: ${ARCHITECTURE_DIR}/"
    echo "Coordination plan will be saved to: ${COORDINATION_PLAN}"

    # Show affected domains for architect selection
    echo "Affected domains requiring architects:"
    cat "${ASSESSMENT_FILE}" | jq -r '.affected_domains[]' 2>/dev/null
else
    echo "=== Architecture Planning Skipped (${COMPLEXITY_LEVEL} complexity) ==="
fi
```

If architecture planning is required, use the `architecture-coordinator2`:

Instruct the architecture-coordinator:
"Analyze this complex feature and recommend an architecture approach.

Read context from: ${CONTEXT_FILE}

Also read the full knowledge base from: ${KNOWLEDGE_PATH}

Instead of spawning architects directly, save your recommendations to: ${COORDINATION_PLAN}

Output format:

```json
{
  "recommendation": "spawn_architects|single_architect|skip_architecture",
  "rationale": "Why this approach is best",
  "suggested_agents": [
    {
      "agent": "frontend-architect",
      "reason": "UI components need redesign",
      "context": "Focus on responsive design patterns",
      "priority": "high"
    }
  ],
  "execution_strategy": "parallel|sequential",
  "integration_points": ["List of systems that need coordination"]
}
```

Also create your initial architecture synthesis at: ${ARCHITECTURE_DIR}/architecture-synthesis.md"

After architecture-coordinator completes:

```bash
# Check coordination plan and process recommendations
if [ -f "${COORDINATION_PLAN}" ]; then
    RECOMMENDATION=$(cat "${COORDINATION_PLAN}" | jq -r '.recommendation')

    if [ "${RECOMMENDATION}" = "spawn_architects" ]; then
        echo "Architecture coordinator recommends specialized architects:"
        cat "${COORDINATION_PLAN}" | jq -r '.suggested_agents[] | "- \(.agent): \(.reason) [\(.priority)]"'

        echo "
## Architect Spawning

Based on the coordination plan above, spawn the recommended architects:

For each high-priority architect:
1. Use Task tool to spawn the specialized architect
2. Provide the architect context from: ${CONTEXT_FILE}
3. Include the specific focus from the coordination plan
4. Direct output to: ${ARCHITECTURE_DIR}/[architect-type]-architecture.md

The architects should work in parallel if the execution_strategy is 'parallel'.
"
    else
        echo "Architecture coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${COORDINATION_PLAN}" | jq -r '.rationale')"
    fi
else
    echo "No coordination plan found - using initial synthesis"
fi
```

### Phase 5: Implementation Planning

Prepare the final planning context:

```bash
source .claude/features/current_feature.env
PLANNING_CONTEXT=".claude/features/${FEATURE_ID}/context/planning-context.md"
FINAL_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"

# Get all relevant information
FEATURE_DESC=$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description')
COMPLEXITY=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.level' 2>/dev/null || echo "Unknown")
EFFORT=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.estimated_effort' 2>/dev/null || echo "Unknown")
RISK=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.risk_level' 2>/dev/null || echo "Unknown")

# Create comprehensive planning context
cat > "${PLANNING_CONTEXT}" << EOFP
# Implementation Planning Context

## Feature Information
- ID: ${FEATURE_ID}
- Description: ${FEATURE_DESC}
- Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Requirements
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]' 2>/dev/null | sed 's/^/- /')

## Technical Context
$(grep -A 50 "## Similar Patterns Found" .claude/features/${FEATURE_ID}/context/knowledge-base.md 2>/dev/null || echo "No patterns found")

## Complexity Assessment
- Level: ${COMPLEXITY}
- Effort: ${EFFORT}
- Risk: ${RISK}

## Architecture Decisions
$(if [ -d .claude/features/${FEATURE_ID}/architecture ]; then
    echo "### Architecture Recommendations Summary"
    for file in .claude/features/${FEATURE_ID}/architecture/*.md; do
        if [ -f "$file" ]; then
            basename_no_ext=$(basename "$file" .md)
            title=$(echo "$basename_no_ext" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
            echo "#### $title"
            head -20 "$file" | grep -v "^#" | grep -v "^$" | head -5
            echo "... [See full recommendations in architecture/$basename_no_ext.md]"
            echo ""
        fi
    done
else
    echo "N/A - Not a complex feature"
fi)
EOFP

echo "=== Implementation Planner Paths ==="
echo "Context: ${PLANNING_CONTEXT}"
echo "Output: ${FINAL_PLAN}"
echo "==================================="
```

Use the `implementation-planner` subagent to create the final plan.

Instruct the implementation-planner:
"Create a detailed implementation plan for this feature.

Read the complete context from the Context path shown above (ending with /planning-context.md).

Generate a comprehensive plan and save it to the Output path shown above (ending with /implementation-plan.md).

Your plan must include:

1. Phased implementation approach with specific tasks
2. File references from the knowledge base
3. Assigned subagents for each task
4. Testing strategy
5. Success criteria
6. Rollback procedures

Make sure to reference the specific patterns and files identified in the technical context section."

## Output Generation

Finalize the feature workflow:

```bash
source .claude/features/current_feature.env

# Generate safe filename
SAFE_NAME=$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50)

# Verify implementation plan exists in feature directory
SOURCE_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"

if [ -f "${SOURCE_PLAN}" ]; then
    echo "✓ Implementation plan created: ${SOURCE_PLAN}"
else
    echo "✗ Implementation plan not found at ${SOURCE_PLAN}"
fi

# Update feature status
METADATA_FILE=".claude/features/${FEATURE_ID}/metadata.json"
jq '.status = "completed"' "${METADATA_FILE}" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "${METADATA_FILE}"

# Create summary
SUMMARY_FILE=".claude/features/${FEATURE_ID}/output/summary.md"
cat > "${SUMMARY_FILE}" << EOFS
# Feature Planning Summary

## Feature: $ARGUMENTS
- **Workspace**: .claude/features/${FEATURE_ID}
- **Complexity**: ${COMPLEXITY}
- **Estimated Effort**: ${EFFORT}
- **Status**: Completed

## Generated Artifacts
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Knowledge Base: .claude/features/${FEATURE_ID}/context/knowledge-base.md
- Complexity Assessment: .claude/features/${FEATURE_ID}/context/complexity-assessment.json
- Architecture Decisions: .claude/features/${FEATURE_ID}/context/architecture-decisions.md
- Implementation Plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md

## Next Steps
1. Review the implementation plan at: .claude/features/${FEATURE_ID}/output/implementation-plan.md
2. Create feature branch: git checkout -b feature/${SAFE_NAME}
3. Begin implementation with assigned subagents
EOFS

# Display summary
cat "${SUMMARY_FILE}"
```

## Feature Workspace Management

### Listing Previous Features

```bash
# Show all features with status
find .claude/features -name "metadata.json" -exec sh -c 'echo "=== $(dirname {}) ===" && jq -r "[.id, .status, .description] | @tsv" {}' \; | sort -r

# Find a specific feature workspace
find .claude/features -name "metadata.json" -exec grep -l "dark mode" {} \; | xargs dirname
```

### Resuming a Feature

```bash
# To resume work on a previous feature
FEATURE_ID="dark-mode-toggle_20250114_142530"
echo "FEATURE_ID=${FEATURE_ID}" > .claude/features/current_feature.env

# Access all context
ls -la .claude/features/${FEATURE_ID}/context/
```

### Cleaning Up Old Features

```bash
# Archive completed features older than 30 days
find .claude/features -name "metadata.json" -mtime +30 -exec sh -c '
  if jq -e ".status == \"completed\"" {} > /dev/null; then
    DIR=$(dirname {})
    tar -czf ${DIR}.tar.gz ${DIR} && rm -rf ${DIR}
  fi
' \;
```

## Error Handling

Throughout the workflow, verify critical files exist:

```bash
# Function to check phase completion
check_phase() {
    local phase_name=$1
    local file_path=$2
    if [ -f "${file_path}" ]; then
        echo "✓ ${phase_name} completed successfully"
        return 0
    else
        echo "✗ ${phase_name} failed - missing ${file_path}"
        echo "Please check the subagent execution and retry"
        return 1
    fi
}

# Use after each phase:
# check_phase "Requirements Analysis" "${REQUIREMENTS_FILE}"
```

Remember: Each feature gets its own isolated workspace, enabling parallel development, historical reference, and clean context separation.
