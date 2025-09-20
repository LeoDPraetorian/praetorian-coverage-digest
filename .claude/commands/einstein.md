---
description: Complete Einstein feature development pipeline - Design, Implement, Security Review, Quality Review, and Testing
model: claude-opus-4-1-20250805
---

# Einstein Complete Feature Development Pipeline

You are orchestrating the **complete Einstein feature development pipeline**. Your goal is to take a feature description through systematic design, implementation, security validation, quality assurance, and comprehensive testing to produce production-ready code.

**Feature Request or Feature ID**: $ARGUMENTS

## Pipeline Overview

The Einstein system implements a systematic **11-phase feature development pipeline** with quality gates:

🎯 **Design Phase** (Phases 1-7): `/design` command  
⚙️ **Implementation Phase** (Phase 8): `/implement` command  
📊 **Quality Review Phase** (Phase 9): `/quality-review` command  
🛡️ **Security Review Phase** (Phase 10): `/security-review` command  
🧪 **Testing Phase** (Phase 11): `/test` command
🚀 **DeploymentPhase** (Phase 12): `/deploy` command

**Quality Gates**: Each phase includes validation checkpoints ensuring systematic quality assurance.

## Pipeline Execution Strategy

### Step 1: Determine Execution Mode

```bash
# Detect if this is a new feature or resuming existing work
if [[ "$ARGUMENTS" =~ ^[a-z0-9-]+_[0-9]{8}_[0-9]{6}$ ]]; then
    # Feature ID provided - resume from specific point
    FEATURE_ID="$ARGUMENTS"
    EXECUTION_MODE="resume"
    echo "🔄 Resume Mode: ${FEATURE_ID}"
else
    # Feature description provided - start new pipeline
    FEATURE_DESCRIPTION="$ARGUMENTS"
    EXECUTION_MODE="new"
    echo "🚀 New Pipeline: ${FEATURE_DESCRIPTION}"
fi

# Initialize pipeline tracking
PIPELINE_DIR=".claude/pipeline"
mkdir -p "${PIPELINE_DIR}"
PIPELINE_LOG="${PIPELINE_DIR}/einstein-pipeline-$(date +%Y%m%d_%H%M%S).log"

echo "=== Einstein Pipeline Started ===" | tee "${PIPELINE_LOG}"
echo "Mode: ${EXECUTION_MODE}" | tee -a "${PIPELINE_LOG}"
echo "Arguments: $ARGUMENTS" | tee -a "${PIPELINE_LOG}"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "${PIPELINE_LOG}"
echo "===============================" | tee -a "${PIPELINE_LOG}"

# Critical tool validation
if ! command -v jq >/dev/null 2>&1; then
    echo "❌ Error: jq is required but not installed" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

if ! command -v date >/dev/null 2>&1; then
    echo "❌ Error: date command is required but not available" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Validate pipeline directory creation
if ! mkdir -p "${PIPELINE_DIR}"; then
    echo "❌ Error: Failed to create pipeline directory: ${PIPELINE_DIR}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

### Step 2: Pipeline State Detection

```bash
# Determine current pipeline state
if [ "${EXECUTION_MODE}" = "resume" ]; then
    # Resuming existing feature - detect current phase
    FEATURE_DIR=".claude/features/${FEATURE_ID}"

    if [ ! -d "${FEATURE_DIR}" ]; then
        echo "❌ Feature workspace not found: ${FEATURE_DIR}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    # Read current status from metadata
    CURRENT_STATUS=$(cat "${FEATURE_DIR}/metadata.json" | jq -r '.status')

    echo "📍 Current Status: ${CURRENT_STATUS}" | tee -a "${PIPELINE_LOG}"

    # Determine next phase
    case "${CURRENT_STATUS}" in
        "design_completed")
            NEXT_PHASE="implement"
            echo "➡️  Next Phase: Implementation" | tee -a "${PIPELINE_LOG}"
            ;;
        "implementation_completed")
            NEXT_PHASE="quality-review"
            echo "➡️  Next Phase: Quality Review" | tee -a "${PIPELINE_LOG}"
            ;;
        "quality_review_completed")
            NEXT_PHASE="security-review"
            echo "➡️  Next Phase: Security Review" | tee -a "${PIPELINE_LOG}"
            ;;
        "security_review_completed")
            NEXT_PHASE="test"
            echo "➡️  Next Phase: Testing" | tee -a "${PIPELINE_LOG}"
            ;;
        "test_completed")
            NEXT_PHASE="deploy"
            echo "🎉 Pipeline Complete!" | tee -a "${PIPELINE_LOG}"
            ;;
        *)
            NEXT_PHASE="design"
            echo "➡️  Starting from: Design Phase" | tee -a "${PIPELINE_LOG}"
            ;;
    esac
else
    # New feature - start from design
    NEXT_PHASE="design"
    echo "🎯 Starting new pipeline with Design Phase" | tee -a "${PIPELINE_LOG}"
fi
```

## Phase Execution Pipeline

### Step 3: Execute Design Phase

```bash
if [ "${NEXT_PHASE}" = "design" ] || [ "${EXECUTION_MODE}" = "new" ]; then
    echo "🎯 Phase 1-5: DESIGN PHASE" | tee -a "${PIPELINE_LOG}"

    # Create feature workspace for new features
    if [ "${EXECUTION_MODE}" = "new" ]; then
        FEATURE_NAME=$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        FEATURE_ID="${FEATURE_NAME}_${TIMESTAMP}"

        # Create feature workspace
        mkdir -p .claude/features/${FEATURE_ID}/{context,research,output,logs,architecture}

        # Save feature metadata
        cat > .claude/features/${FEATURE_ID}/metadata.json << EOF
{
  "id": "${FEATURE_ID}",
  "description": "$ARGUMENTS",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "design_in_progress",
  "phase": "design",
  "pipeline": "einstein"
}
EOF

        echo "FEATURE_ID=${FEATURE_ID}" > .claude/features/current_feature.env
        echo "📁 Feature workspace created: ${FEATURE_ID}" | tee -a "${PIPELINE_LOG}"
    fi

    DESIGN_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Design started: ${DESIGN_START}" | tee -a "${PIPELINE_LOG}"
fi
```

**Execute Design Phase Using Internal Agents:**

**Phase 1: JIRA Preprocessing**

Execute intent analysis to structure the feature request:

#### Jira Reference Preprocessing

First, check if the feature description contains Jira ticket references:

```bash
# Check for Jira ticket patterns (e.g., CHA-1232, PROJ-123)
if echo "$ARGUMENTS" | grep -qE '\b[A-Z]{2,10}-[0-9]+\b'; then
    echo "🎫 Jira references detected in feature description"
    echo "Resolving ticket details before analysis..."

    # Create preprocessing output file
    JIRA_RESOLVED_FILE=".claude/features/${FEATURE_ID}/context/jira-resolved.md"
    echo "Jira resolution output: ${JIRA_RESOLVED_FILE}"

    # Wait for jira-reader completion before proceeding
    echo "⏳ Waiting for Jira resolution to complete..."
```

Tell the jira-reader (if Jira references detected):
"Resolve all Jira ticket references in this feature request: $ARGUMENTS

Use your preprocessing mode to:

1. Detect all Jira ticket references (CHA-1232, PROJ-123, etc.)
2. Fetch full ticket details using Atlassian MCP tools
3. Replace references with structured ticket content
4. Save the enriched feature description to: ${JIRA_RESOLVED_FILE}"

Wait for jira-reader to complete, then validate and prepare content for intent analysis:

```bash
# Determine which content to use for intent analysis (single validation point)
if [ -f "${JIRA_RESOLVED_FILE}" ] && [ -s "${JIRA_RESOLVED_FILE}" ]; then
    echo "✓ Jira references resolved successfully"
    ENHANCED_ARGUMENTS=$(grep -A 1000 "## Final Enhanced Description" "${JIRA_RESOLVED_FILE}" | tail -n +2)

    if [ -z "${ENHANCED_ARGUMENTS}" ]; then
        echo "⚠️  Failed to extract enhanced description, using original"
        ENHANCED_ARGUMENTS="$ARGUMENTS"
    else
        echo "Using enhanced content with resolved Jira tickets"
    fi
else
    ENHANCED_ARGUMENTS="$ARGUMENTS"
    echo "Using original arguments (no Jira resolution or resolution failed)"
fi

echo "Content prepared for intent analysis"
echo "Enhanced arguments length: $(echo "${ENHANCED_ARGUMENTS}" | wc -c) characters"
```

**Phase 2: Intent Analysis**

Use the `intent-translator` subagent to parse and structure the feature request.

Instruct the intent-translator:
"Analyze this feature request: ${ENHANCED_ARGUMENTS}

Save your analysis as JSON to: .claude/features/${FEATURE_ID}/context/requirements.json

Your output should include:

- feature_name: short identifier
- user_stories: array of stories
- acceptance_criteria: array of criteria
- affected_systems: list of components
- constraints: technical constraints
- clarification_needed: any unclear requirements"

Wait for the intent-translator to complete, then verify:

```bash
REQUIREMENTS_FILE=".claude/features/${FEATURE_ID}/context/requirements.json"
if [ -f "${REQUIREMENTS_FILE}" ]; then
    echo "✓ Requirements analysis completed"
    cat "${REQUIREMENTS_FILE}" | jq '.feature_name'
else
    echo "✗ Requirements analysis failed"
fi
```

**Phase 3: Knowledge Synthesis**

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

Use the `knowledge-synthesizer` subagent to analyze requirements and recommend research approach.

Instruct the knowledge-synthesizer:
"ultrathink. Analyze the requirements and determine what research is needed for this feature.

**CRITICAL: Perform dynamic agent discovery first:**

1. Discover all available research agents from `.claude/agents/research/` directory
2. Only recommend agents that actually exist in your discovery results
3. Map research needs to discovered agent capabilities, not hardcoded agent names

Read the requirements from: ${INPUT_REQUIREMENTS}

Instead of spawning agents directly, create a research plan and save it to: ${SYNTHESIS_PLAN}

Your output should be a JSON file with this structure:

```json
{
  "research_needed": true,
  "rationale": "Explanation of why research is needed",
  "recommended_research": [
    {
      "agent": "AGENT_TYPE_TO_SELECT",
      "focus": "What specific information to gather",
      "priority": "high|medium|low",
      "reason": "Why this research is important",
      "output_file": "filename-for-research-output.md"
    }
  ],
  "synthesis_approach": "sequential|parallel",
  "expected_outputs": ["list of expected findings"]
}
```

CRITICAL: Use dynamic agent discovery to choose the optimal agent type for each research need:

**Dynamic Research Agent Discovery:**

Before making any agent recommendations, the knowledge-synthesizer will discover all available research agents from `.claude/agents/research/` directory and only recommend agents that actually exist.

**Capability-Based Agent Selection Guidelines:**

- **Third-party integrations, APIs, SDKs** → Look for agents with documentation/API research capabilities from discovered list
- **Library documentation and frameworks** → Look for agents specialized in documentation research from discovered list
- **Codebase patterns and implementations** → Look for agents with code analysis capabilities from discovered list
- **Industry best practices and tutorials** → Look for agents with web research capabilities from discovered list
- **Security architecture and threats** → Look for agents with security analysis capabilities from discovered list
- **Performance optimization** → Look for agents with performance analysis capabilities from discovered list

**Critical Rules:**

- ONLY recommend agents discovered dynamically from the research agents directory
- Match research needs to available agent capabilities, not hardcoded agent names
- Provide fallback strategies when preferred capability types aren't available
- Adapt recommendations based on what agents are actually discovered

Do NOT use biased examples - evaluate each research need independently and select from actually discovered agents based on their capabilities.

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

First, create the research directory structure:

```bash
source .claude/features/current_feature.env
RESEARCH_DIR=".claude/features/${FEATURE_ID}/research"
mkdir -p "${RESEARCH_DIR}"
echo "Created research directory: ${RESEARCH_DIR}"
```

**CRITICAL: Spawn ALL high-priority agents in a SINGLE MESSAGE for true parallel execution:**

1. Read the high-priority agents from the synthesis plan
2. In ONE message, use multiple Task tool calls to spawn ALL high-priority agents simultaneously
3. Provide each agent with:
   - Their specific focus from the plan
   - Their dedicated output file path in the research directory
   - Context from the feature requirements

**Example of correct parallel spawning:**

```bash
# Use research agents based on knowledge-synthesizer recommendations
# Example instruction pattern (not direct Task calls):

# Use the context7-search-specialist subagent for API documentation research
# Use the web-research-specialist subagent for security best practices
# Use the code-pattern-analyzer subagent for existing pattern analysis
```

After spawning agents, wait for them to complete before continuing.

Example spawning based on dynamic recommendations:

**CRITICAL: Use agents dynamically discovered by knowledge-synthesizer:**

- If documentation research agent is recommended with output_file "api-documentation.md":
  Tell the agent: "Research [SPECIFIC_API] official documentation.
  Focus on: [specific focus from synthesis plan].
  Save your complete findings to: ${RESEARCH_DIR}/[output_file from plan]"

- If web research agent is recommended with output_file "best-practices.md":
  Tell the agent: "Research [SPECIFIC_TOPIC] best practices and implementation patterns.
  Focus on: [specific focus from synthesis plan].
  Save your complete findings to: ${RESEARCH_DIR}/[output_file from plan]"

- If code analysis agent is recommended with output_file "code-patterns-analysis.md":
  Tell the agent: "Analyze our codebase for [specific patterns from synthesis plan].
  Look for reusable components related to [feature context].
  Save your complete analysis to: ${RESEARCH_DIR}/[output_file from plan]"

**Important:** Replace bracketed placeholders with actual values from the synthesis plan. The agent names and focus areas will be dynamically determined by knowledge-synthesizer based on discovered agents and feature requirements.

```bash
# Verify individual research files were created
echo "Checking individual research outputs..."
RESEARCH_FILES=$(find "${RESEARCH_DIR}" -name "*.md" -type f | wc -l)
if [ "$RESEARCH_FILES" -eq "0" ]; then
    echo "⚠️ No research files found. Ensure research agents have completed."
else
    echo "✓ Found ${RESEARCH_FILES} research output files:"
    ls -la "${RESEARCH_DIR}/"*.md
fi
```

DO NOT PROCEED TO PHASE 4 until all research agents are spawned and their tasking has completed.

**Phase 4: Complexity Assessment**

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

Instruct the complexity-assessor:
"ultrathink. Assess the complexity of implementing this feature.

Read context from:

1. The Requirements path shown above (ending with /requirements.json)
2. The Knowledge path shown above (ending with /knowledge-base.md)

Save your assessment to the Output path shown above (ending with /complexity-assessment.json).

Your assessment should include:
{
'level': 'Simple|Medium|Complex',
'factors': ['list of complexity factors'],
'affected_domains': ['frontend', 'backend', 'database', 'security', 'information'],
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

**Phase 5 Thinking Budget Optimization**

Optimize thinking budget allocation for architecture specialists:

```bash
source .claude/features/current_feature.env
COMPLEXITY_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
ARCH_THINKING_ALLOCATION=".claude/features/${FEATURE_ID}/context/architecture-thinking-allocation.json"

echo "=== Architecture Phase Thinking Budget Optimization ==="
echo "Complexity file: ${COMPLEXITY_FILE}"
echo "Thinking allocation output: ${ARCH_THINKING_ALLOCATION}"
```

Use the `thinking-budget-allocator` subagent to determine thinking assignment levels for architecture subagents.

Instruct the thinking-budget-allocator:
"ultrathink. Optimize thinking budget allocation for architecture phase agents.

Context:

- Complexity assessment: ${COMPLEXITY_FILE}
- Agent context: Architecture specialists will be spawned based on coordination plan
- User preference: balanced (can be overridden with --thinking=speed|quality)

Output allocation plan to: ${ARCH_THINKING_ALLOCATION}

Focus on:

- Architecture specialist thinking levels based on complexity
- Cost estimates for user transparency
- Alternative strategies for different cost/quality preferences

Generate thinking level recommendations for potential architecture agents:

- react-typescript-architect, go-backend-architect, security-architect, cloud-aws-architect, database-neo4j-architect, general-system-architect, information-architect

Save your thinking allocation recommendations to: ${ARCH_THINKING_ALLOCATION}"

```bash
# Validate thinking allocation exists
if [ -f "${ARCH_THINKING_ALLOCATION}" ]; then
    echo "✓ Architecture thinking allocation completed"
    cat "${ARCH_THINKING_ALLOCATION}" | jq -r '.cost_estimate'
else
    echo "✗ Architecture thinking allocation failed - using defaults"
fi
```

**Phase 6: Architecture Planning (If Complex)**

Check if architecture planning is needed:

```bash
source .claude/features/current_feature.env
ASSESSMENT_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
COMPLEXITY_LEVEL=$(cat "${ASSESSMENT_FILE}" | jq -r '.level' 2>/dev/null || echo "Unknown")

if [ "${COMPLEXITY_LEVEL}" = "Complex" ] || [ "${COMPLEXITY_LEVEL}" = "Medium" ]; then
    echo "=== Architecture Planning Required (${COMPLEXITY_LEVEL} complexity) ==="

    # Prepare architect context and directory
    CONTEXT_FILE=".claude/features/${FEATURE_ID}/context/architect-context.md"
    ARCHITECTURE_DIR=".claude/features/${FEATURE_ID}/architecture"
    COORDINATION_PLAN="${ARCHITECTURE_DIR}/coordination-plan.json"

    # Create architecture directory for individual architect outputs
    mkdir -p "${ARCHITECTURE_DIR}"

    # Create consolidated context for architects
    cat > "${CONTEXT_FILE}" << EOFA
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

If architecture planning is required, use the `architecture-coordinator`:

Instruct the architecture-coordinator:
"ultrathink. Analyze this complex feature and recommend an architecture approach.

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

        cat << EOF

## Architect Spawning

Based on the coordination plan above, spawn the recommended architects:

For each high-priority architect:
1. Use Task tool to spawn the specialized architect
2. Provide the architect context from: ${CONTEXT_FILE}
3. Include the specific focus from the coordination plan
4. Direct output to: ${ARCHITECTURE_DIR}/[architect-type]-architecture.md

The architects should work in parallel if the execution_strategy is 'parallel'.

EOF

    else
        echo "Architecture coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${COORDINATION_PLAN}" | jq -r '.rationale')"
    fi
else
    echo "No coordination plan found - using initial synthesis"
fi
```

**Phase 7: Implementation Planning**

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
"ultrathink. Create a detailed implementation plan for this feature.

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

**Validate design completion and create comprehensive summary:**

````bash
# Verify implementation plan exists in feature directory
SOURCE_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"

if [ -f "${SOURCE_PLAN}" ]; then
    echo "✓ Implementation plan created: ${SOURCE_PLAN}"
else
    echo "✗ Implementation plan not found at ${SOURCE_PLAN}"
    exit 1
fi

# Get complexity and effort information for summary
METADATA_FILE=".claude/features/${FEATURE_ID}/metadata.json"
FEATURE_DESC=$(cat "${METADATA_FILE}" | jq -r '.description')
COMPLEXITY=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.level' 2>/dev/null || echo "Unknown")
EFFORT=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.estimated_effort' 2>/dev/null || echo "Unknown")

# Create comprehensive design summary for implementation phase
DESIGN_SUMMARY=".claude/features/${FEATURE_ID}/output/design-summary.md"
cat > "${DESIGN_SUMMARY}" << EOFS
```
# 🎯 Design Phase Complete - Ready for Implementation

## Feature: ${FEATURE_DESC}
- **Feature ID**: ${FEATURE_ID}
- **Complexity**: ${COMPLEXITY}
- **Estimated Effort**: ${EFFORT}
- **Status**: Design Complete - Ready for Implementation

---

## 📋 Design Artifacts Generated

### ✅ Phase 1: Requirements Analysis
- **File**: `.claude/features/${FEATURE_ID}/context/requirements.json`
- **Contents**: Structured user stories, acceptance criteria, affected systems, constraints
- **Jira Integration**: $([ -f .claude/features/${FEATURE_ID}/context/jira-resolved.md ] && echo "✅ Jira tickets resolved and integrated" || echo "N/A - No Jira references")

### ✅ Phase 2: Knowledge Synthesis & Research
- **Knowledge Base**: `.claude/features/${FEATURE_ID}/context/knowledge-base.md`
- **Research Plan**: `.claude/features/${FEATURE_ID}/context/synthesis-plan.json`
- **Research Outputs**: `.claude/features/${FEATURE_ID}/research/`
- **Research Files**: $(find .claude/features/${FEATURE_ID}/research/ -name "*.md" -type f 2>/dev/null | wc -l) research documents

### ✅ Phase 3: Complexity Assessment
- **File**: `.claude/features/${FEATURE_ID}/context/complexity-assessment.json`
- **Level**: ${COMPLEXITY}
- **Risk Level**: $(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.risk_level' 2>/dev/null || echo "Unknown")
- **Effort**: ${EFFORT}

### ✅ Phase 4: Architecture Planning
$(if [ -d .claude/features/${FEATURE_ID}/architecture ]; then
    echo "- **Status**: Required for Complex feature"
    echo "- **Coordination Plan**: \`.claude/features/${FEATURE_ID}/architecture/coordination-plan.json\`"
    echo "- **Architecture Files**: $(find .claude/features/${FEATURE_ID}/architecture/ -name "*.md" -type f 2>/dev/null | wc -l) architecture documents"
else
    echo "- **Status**: Skipped (${COMPLEXITY} complexity)"
fi)

### ✅ Phase 5: Implementation Planning
- **Implementation Plan**: `.claude/features/${FEATURE_ID}/output/implementation-plan.md`
- **Planning Context**: `.claude/features/${FEATURE_ID}/context/planning-context.md`
- **Ready for**: Immediate implementation execution

---

## 🚀 Implementation Phase Readiness

### **For Implementation Phase (Phase 6) - All Context Available:**

**Key Context Files for Implementation Agents:**
```bash
# Requirements and user stories
.claude/features/${FEATURE_ID}/context/requirements.json

# Technical patterns and similar implementations found in codebase
.claude/features/${FEATURE_ID}/context/knowledge-base.md

# Complexity factors and estimated effort
.claude/features/${FEATURE_ID}/context/complexity-assessment.json

# Detailed implementation plan with agent assignments
.claude/features/${FEATURE_ID}/output/implementation-plan.md

# Research findings from specialized agents
.claude/features/${FEATURE_ID}/research/*.md

$(if [ -d .claude/features/${FEATURE_ID}/architecture ]; then
echo "# Architecture decisions and recommendations"
echo ".claude/features/${FEATURE_ID}/architecture/*.md"
fi)
````

### **Implementation Plan Summary:**

$(head -50 "${SOURCE_PLAN}" | grep -A 20 "## Implementation Overview" | head -15 || echo "See full plan in implementation-plan.md")

### **Critical Implementation Context:**

- **Affected Systems**: $(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.affected_systems[]' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
- **Primary Focus Areas**: $(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.affected_domains[]' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
- **Key Constraints**: $(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.constraints[]' 2>/dev/null | head -3 | tr '\n' '; ' | sed 's/;$//')

---

## 📊 Design Quality Metrics

- **Requirements Completeness**: ✅ Structured user stories and acceptance criteria
- **Research Depth**: ✅ $(find .claude/features/${FEATURE_ID}/research/ -name "\*.md" -type f 2>/dev/null | wc -l) specialized research outputs
- **Technical Context**: ✅ Existing patterns and implementations identified
- **Architecture Review**: $([ -d .claude/features/${FEATURE_ID}/architecture ] && echo "✅ Complex feature architecture planned" || echo "N/A - Simple/Medium complexity")
- **Implementation Readiness**: ✅ Detailed plan with specific agent assignments

---

## 🎯 Next Phase Continuation

**Ready for Phase 7 - Implementation:**

```bash
# Continue Einstein pipeline with implementation
/einstein "${FEATURE_ID}"

# Or run implementation phase directly
/implement "${FEATURE_ID}"
```

**Implementation phase will have access to:**

- Complete design context from all 5 design phases
- Detailed implementation plan with agent assignments
- Technical patterns and research findings
- Architecture decisions (if complex feature)
- Structured requirements and acceptance criteria

---

**🚀 Design Phase Successfully Completed - Ready for Implementation!**

EOFS

```bash
# Display the design summary
cat "${DESIGN_SUMMARY}"

# Update metadata with design completion
jq '.status = "design_completed" | .phase = "design_complete" | .design_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
   "${METADATA_FILE}" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "${METADATA_FILE}"

DESIGN_STATUS=$(cat "${METADATA_FILE}" | jq -r '.status')
if [ "${DESIGN_STATUS}" = "design_completed" ]; then
    echo "✅ Design Phase Complete" | tee -a "${PIPELINE_LOG}"
    NEXT_PHASE="implement"
else
    echo "❌ Design Phase Failed: ${DESIGN_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

**Phase 8 Execute Implementation**

```bash
if [ "${NEXT_PHASE}" = "implement" ]; then
    echo "⚙️ Phase 8: IMPLEMENTATION EXECUTION" | tee -a "${PIPELINE_LOG}"

    # Run mechanical setup operations
    SETUP_OUTPUT=$(.claude/scripts/phases/implementation/setup-implementation-phase.sh "${FEATURE_ID}")
    echo "${SETUP_OUTPUT}"

    # Extract file paths from setup output
    IMPL_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "IMPL_CONTEXT_FILE=" | cut -d'=' -f2)
    IMPL_DIR=$(echo "${SETUP_OUTPUT}" | grep "IMPL_DIR=" | cut -d'=' -f2)

    # Read the implementation plan created by implementation-planner
    IMPLEMENTATION_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"

    # Validate required files exist
    if [ ! -f "${IMPLEMENTATION_PLAN}" ]; then
        echo "❌ Implementation plan not found: ${IMPLEMENTATION_PLAN}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    if [ ! -f "${IMPL_CONTEXT_FILE}" ]; then
        echo "❌ Implementation context not found: ${IMPL_CONTEXT_FILE}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "✅ Implementation execution ready" | tee -a "${PIPELINE_LOG}"
    echo "📋 Implementation Plan: ${IMPLEMENTATION_PLAN}"
    echo "📄 Context File: ${IMPL_CONTEXT_FILE}"
fi
```

### Extract Agent Assignments from Implementation Plan

```bash
# Run agent extraction and coordination setup script
echo "=== Extracting Agent Assignments and Setting Up Coordination ==="

AGENT_OUTPUT=$(.claude/scripts/phases/implementation/extract-and-setup-agents.sh "${FEATURE_ID}")
echo "${AGENT_OUTPUT}"

# Extract key variables from script output
TOTAL_AGENTS=$(echo "${AGENT_OUTPUT}" | grep "TOTAL_AGENTS=" | cut -d'=' -f2)
PARALLEL_EXECUTION=$(echo "${AGENT_OUTPUT}" | grep "PARALLEL_EXECUTION=" | cut -d'=' -f2)
PRIMARY_AGENTS=$(echo "${AGENT_OUTPUT}" | grep "PRIMARY_AGENTS=" | cut -d'=' -f2)
SECONDARY_AGENTS=$(echo "${AGENT_OUTPUT}" | grep "SECONDARY_AGENTS=" | cut -d'=' -f2)
AGENT_ASSIGNMENTS=$(echo "${AGENT_OUTPUT}" | grep "AGENT_ASSIGNMENTS=" | cut -d'=' -f2)
COORDINATION_DIR=$(echo "${AGENT_OUTPUT}" | grep "COORDINATION_DIR=" | cut -d'=' -f2)

# Validate extraction was successful
if [ ! -f "${AGENT_ASSIGNMENTS}" ]; then
    echo "❌ Agent extraction failed - assignments file not found" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

if [ "${TOTAL_AGENTS}" -eq 0 ]; then
    echo "⚠️ No agents extracted from implementation plan" | tee -a "${PIPELINE_LOG}"
    echo "Implementation plan may need agent assignments added"
    exit 1
fi

echo "✅ Agent extraction and coordination setup complete"
```

### Intelligent Parallel Agent Spawning

```bash
# Spawn agents based on extracted assignments with intelligent parallelization
echo ""
echo "=== Spawning Development Agents ==="

if [ "${PARALLEL_EXECUTION}" = "true" ]; then
    echo "🚀 Executing parallel agent spawning strategy"

    # Get primary group agents (first wave - parallel execution)
    PRIMARY_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[] | select(.parallel_group == "primary") | .agent')
    SECONDARY_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[] | select(.parallel_group == "secondary") | .agent')

    echo ""
    echo "## Phase 1: Primary Agent Spawning (Parallel)"
    echo ""
    echo "Spawn these agents simultaneously using Claude Code's Task tool:"
    echo ""

    # Generate parallel spawning instructions for primary agents
    for agent in ${PRIMARY_AGENTS}; do
        echo "### Spawn ${agent}"
        echo ""
        echo "Use the \`${agent}\` subagent for implementation."
        echo ""
        echo "Instruct the ${agent}:"
        echo "\"Implement your assigned tasks from the implementation plan."
        echo ""
        echo "**Core Context:**"
        echo "- Implementation Plan: ${IMPLEMENTATION_PLAN}"
        echo "- Implementation Context: ${IMPL_CONTEXT_FILE}"
        echo "- Your assignments: Read implementation plan for specific tasks assigned to ${agent}"
        echo ""
        echo "**Your workspace:**"
        echo "- Code changes: ${IMPL_DIR}/code-changes/${agent}/"
        echo "- Progress tracking: ${IMPL_DIR}/agent-outputs/${agent}/"
        echo ""
        echo "**Instructions:**"
        echo "1. Read the implementation plan to find tasks specifically assigned to ${agent}"
        echo "2. Implement assigned features following established patterns"
        echo "3. Create necessary files and coordinate with other agents as needed"
        echo "4. Track progress in your designated workspace"
        echo "5. Follow success criteria defined in implementation plan\""
        echo ""
    done

    # Secondary agents (if any) spawn after primary completion
    if [ -n "${SECONDARY_AGENTS}" ]; then
        echo ""
        echo "## Phase 2: Secondary Agent Spawning (After Primary Completion)"
        echo ""
        echo "After primary agents complete their initial tasks, spawn these additional agents:"
        echo ""

        for agent in ${SECONDARY_AGENTS}; do
            echo "### Spawn ${agent} (Sequential)"
            echo ""
            echo "Use the \`${agent}\` subagent for implementation."
            echo ""
            echo "Instruct the ${agent}:"
            echo "\"Implement your assigned tasks, building on work completed by primary agents."
            echo ""
            echo "**Core Context:**"
            echo "- Implementation Plan: ${IMPLEMENTATION_PLAN}"
            echo "- Implementation Context: ${IMPL_CONTEXT_FILE}"
            echo "- Primary Agent Outputs: ${IMPL_DIR}/agent-outputs/"
            echo "- Your assignments: Read implementation plan for specific tasks assigned to ${agent}"
            echo ""
            echo "**Coordination:**"
            echo "- Review primary agent outputs before starting"
            echo "- Build upon existing implementations"
            echo "- Ensure integration with completed work\""
            echo ""
        done
    fi

else
    # Single agent execution
    SINGLE_AGENT=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[0].agent')

    echo "📍 Single Agent Execution"
    echo ""
    echo "## Implementation Agent Spawning"
    echo ""
    echo "Use the \`${SINGLE_AGENT}\` subagent for complete implementation."
    echo ""
    echo "Instruct the ${SINGLE_AGENT}:"
    echo "\"Implement the complete feature as specified in the implementation plan."
    echo ""
    echo "**Core Context:**"
    echo "- Implementation Plan: ${IMPLEMENTATION_PLAN}"
    echo "- Implementation Context: ${IMPL_CONTEXT_FILE}"
    echo ""
    echo "**Your workspace:**"
    echo "- Code changes: ${IMPL_DIR}/code-changes/"
    echo "- Progress tracking: ${IMPL_DIR}/agent-outputs/${SINGLE_AGENT}/"
    echo ""
    echo "**Instructions:**"
    echo "1. Read the complete implementation plan"
    echo "2. Implement all assigned features following established patterns"
    echo "3. Create necessary files and handle all aspects of the feature"
    echo "4. Follow success criteria and testing requirements from the plan"
    echo "5. Track progress and document your implementation approach\""
fi
```

### Implementation Completion

```bash
# Complete implementation phase using generic completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "implementation" "quality-review" "${FEATURE_ID}" "agents_spawned=${TOTAL_AGENTS}" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)

# Validate completion was successful
if [ "${COMPLETION_STATUS}" != "implementation_completed" ]; then
    echo "❌ Implementation phase completion failed"
    exit 1
fi

echo "🚀 ${TOTAL_AGENTS} development agents spawned based on implementation plan"
echo "✅ Ready for ${NEXT_PHASE} phase"
```

**Phase 9: Quality Review**

```bash
if [ "${NEXT_PHASE}" = "quality-review" ]; then
    echo "📊 Phase 9: QUALITY REVIEW PHASE" | tee -a "${PIPELINE_LOG}"

    # Run mechanical setup operations
    SETUP_OUTPUT=$(.claude/scripts/phases/quality-review/setup-quality-review-phase.sh "${FEATURE_ID}")
    echo "${SETUP_OUTPUT}"

    # Extract file paths from setup output
    QUALITY_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "QUALITY_CONTEXT_FILE=" | cut -d'=' -f2)
    QUALITY_COORDINATION_PLAN=$(echo "${SETUP_OUTPUT}" | grep "QUALITY_COORDINATION_PLAN=" | cut -d'=' -f2)
    QUALITY_STRATEGY=$(echo "${SETUP_OUTPUT}" | grep "QUALITY_STRATEGY=" | cut -d'=' -f2)
    FEEDBACK_LOOP_DIR=$(echo "${SETUP_OUTPUT}" | grep "FEEDBACK_LOOP_DIR=" | cut -d'=' -f2)
    FEEDBACK_ITERATION_TRACKER=$(echo "${SETUP_OUTPUT}" | grep "FEEDBACK_ITERATION_TRACKER=" | cut -d'=' -f2)

    # Extract implementation analysis from setup
    RISK_LEVEL=$(echo "${SETUP_OUTPUT}" | grep "RISK_LEVEL=" | cut -d'=' -f2)
    TECH_STACK=$(echo "${SETUP_OUTPUT}" | grep "TECH_STACK=" | cut -d'=' -f2)

    # Validate setup was successful
    if [ ! -f "${QUALITY_CONTEXT_FILE}" ]; then
        echo "❌ Quality review setup failed - context file not found" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "✅ Quality review workspace ready" | tee -a "${PIPELINE_LOG}"
    echo "📊 Risk Level: ${RISK_LEVEL}, Tech Stack: ${TECH_STACK}"
fi
```

### Delegate to Quality Review Coordinator

```bash
# Use quality-review-coordinator to analyze and recommend quality strategy
echo "=== Quality Review Coordination Analysis ==="
```

Instruct the quality-review-coordinator:
"ultrathink. Analyze this implementation and recommend a comprehensive quality review approach with feedback loops.

**Read quality context from:** ${QUALITY_CONTEXT_FILE}

**Also read these context sources:**

- Implementation outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Requirements (for validation): .claude/features/${FEATURE_ID}/context/requirements.json
- Architecture compliance: .claude/features/${FEATURE_ID}/architecture/\*.md

**Save your recommendations to:** ${QUALITY_COORDINATION_PLAN}

**Create quality strategy at:** ${QUALITY_STRATEGY}

**Output format for coordination plan:**

```json
{
  \"recommendation\": \"comprehensive_quality|focused_quality|basic_validation|skip_quality\",
  \"rationale\": \"Why this approach based on risk level and implementation scope\",
  \"implementation_analysis\": {
    \"complexity\": \"Simple|Medium|Complex\",
    \"risk_level\": \"Low|Medium|High|Critical\",
    \"affected_domains\": [\"backend\", \"frontend\", \"security\"],
    \"technology_stack\": [\"Go\", \"React\", \"Python\"],
    \"quality_priority\": \"critical|high|medium|low\"
  },
  \"suggested_quality_agents\": [
    {
      \"agent\": \"[ONLY FROM DISCOVERED AGENTS]\",
      \"reason\": \"Specific quality domain match justification\",
      \"quality_focus\": [\"Code review\", \"Security validation\"],
      \"priority\": \"critical|high|medium|low\",
      \"thinking_budget\": \"ultrathink|think|basic\",
      \"success_criteria\": [\"Measurable validation criteria\"]
    }
  ],
  \"quality_gates\": {
    \"critical_gates\": [\"Release blocker criteria\"],
    \"major_gates\": [\"Fix required criteria\"],
    \"minor_gates\": [\"Improvement opportunity criteria\"]
  },
  \"feedback_loop_strategy\": {
    \"max_iterations\": 3,
    \"remediation_agents\": [
      {
        \"quality_issue_type\": \"security-vulnerability\",
        \"remediation_agent\": \"golang-api-developer\",
        \"reason\": \"Backend security fixes require Go expertise\"
      }
    ]
  }
}
```

**Focus on:**

- Risk-appropriate quality depth (${RISK_LEVEL} risk level detected)
- Technology-specific quality agents (${TECH_STACK} stack detected)
- Measurable quality gates with clear pass/fail criteria
- Intelligent feedback loops for iterative improvement"

### Process Quality Coordinator Recommendations

```bash
# After quality-review-coordinator completes, process recommendations
if [ -f "${QUALITY_COORDINATION_PLAN}" ]; then
    RECOMMENDATION=$(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.recommendation')

    if [ "${RECOMMENDATION}" = "comprehensive_quality" ] || [ "${RECOMMENDATION}" = "focused_quality" ]; then
        echo "Quality coordinator recommends: ${RECOMMENDATION}"
        cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.suggested_quality_agents[] | "- \(.agent): \(.reason) [\(.priority)]"'
        echo ""
        echo "Based on the coordination plan, spawn the recommended quality agents using Task tool."

    else
        echo "Quality coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.rationale')"
        if [ "${RECOMMENDATION}" = "skip_quality" ]; then
            echo "Guidance: $(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.guidance // "Minimal quality validation required"')"
        fi
    fi

else
    echo "❌ Quality coordination failed - coordination plan not found"
    exit 1
fi
```

### Quality Review Feedback Loop

```bash
# Initialize feedback loop for iterative quality improvement
echo ""
echo "=== Quality Review Feedback Loop ==="

# Check if comprehensive quality review was recommended
RECOMMENDATION=$(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.recommendation')
if [ "${RECOMMENDATION}" = "comprehensive_quality" ] || [ "${RECOMMENDATION}" = "focused_quality" ]; then

    echo "🔄 Initiating quality feedback loop with universal coordinator"
    echo ""
    echo "After quality agents complete their analysis:"
    echo "1. Call feedback-loop-coordinator to analyze results and create iteration plan"
    echo "2. If iteration plan recommends 'spawn_remediation_agents', spawn the specified agents"
    echo "3. If iteration plan recommends 're_validate', re-run quality agents"
    echo "4. If iteration plan recommends 'complete', proceed to next phase"
    echo "5. If iteration plan recommends 'escalate', manual review required"

else
    echo "ℹ️ Basic validation - no feedback loop required"
fi
```

### Quality Feedback Loop Execution Pattern

After quality agents complete, Einstein executes this feedback loop pattern:

```bash
# Feedback Loop Execution (Einstein orchestrates, main Claude spawns)
ITERATION_COMPLETE=false
ITERATION_COUNT=0
MAX_ITERATIONS=3

while [ "${ITERATION_COMPLETE}" = false ] && [ ${ITERATION_COUNT} -lt ${MAX_ITERATIONS} ]; do
    ITERATION_COUNT=$((ITERATION_COUNT + 1))
    echo "🔄 Feedback Loop Iteration ${ITERATION_COUNT}/${MAX_ITERATIONS}"

    # Call feedback-loop-coordinator to analyze current state
    echo "Calling feedback-loop-coordinator to analyze results and create iteration plan..."

    # feedback-loop-coordinator outputs iteration plan
    ITERATION_PLAN=".claude/features/${FEATURE_ID}/quality-review/feedback-loop/iteration-${ITERATION_COUNT}-plan.json"

    # Process coordinator recommendation
    if [ -f "${ITERATION_PLAN}" ]; then
        ACTION=$(cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.action')

        case "${ACTION}" in
            "spawn_remediation_agents")
                echo "📝 Iteration plan recommends: Spawn remediation agents"
                cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.execution_summary'
                echo ""
                echo "Based on iteration plan, spawn the following remediation agents:"
                cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.spawning_details[] | "- \(.agent): \(.instruction)"'
                echo ""
                echo "After remediation agents complete, continue feedback loop..."
                ;;

            "re_run_validation")
                echo "🔍 Iteration plan recommends: Re-run quality validation"
                echo "Re-spawn quality agents to verify fixes were successful"
                ;;

            "complete")
                echo "✅ Iteration plan recommends: Quality validation complete"
                ITERATION_COMPLETE=true
                ;;

            "escalate")
                echo "🚨 Iteration plan recommends: Escalation required"
                echo "Reason: $(cat "${ITERATION_PLAN}" | jq -r '.iteration_management.escalation_reason')"
                ITERATION_COMPLETE=true
                ESCALATION_REQUIRED=true
                ;;
        esac
    else
        echo "❌ Iteration plan not found - ending feedback loop"
        ITERATION_COMPLETE=true
    fi
done

# Handle completion or escalation
if [ "${ESCALATION_REQUIRED}" = true ]; then
    echo "🚨 Quality review requires manual intervention"
    NEXT_PHASE="manual-quality-review"
elif [ "${ITERATION_COMPLETE}" = true ]; then
    echo "✅ Quality review feedback loop complete"
    NEXT_PHASE="deployment"
else
    echo "⚠️ Maximum iterations reached - escalating to manual review"
    NEXT_PHASE="manual-quality-review"
fi
```

### Quality Review Completion

```bash
# Complete quality review phase
QUALITY_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq '.status = "quality_review_completed" | .quality_review_completed = "'${QUALITY_END}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

echo "🎯 Quality review complete - proceeding to ${NEXT_PHASE}"
```

**Phase 10: Security Review**

```bash
if [ "${NEXT_PHASE}" = "security-review" ]; then
    echo "🔒 Phase 10: SECURITY REVIEW PHASE" | tee -a "${PIPELINE_LOG}"

    # Run mechanical setup operations
    SETUP_OUTPUT=$(.claude/scripts/phases/security-review/setup-security-review-phase.sh "${FEATURE_ID}")
    echo "${SETUP_OUTPUT}"

    # Extract file paths from setup output
    SECURITY_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "SECURITY_CONTEXT_FILE=" | cut -d'=' -f2)
    SECURITY_COORDINATION_PLAN=$(echo "${SETUP_OUTPUT}" | grep "SECURITY_COORDINATION_PLAN=" | cut -d'=' -f2)
    SECURITY_STRATEGY=$(echo "${SETUP_OUTPUT}" | grep "SECURITY_STRATEGY=" | cut -d'=' -f2)
    SECURITY_DIR=$(echo "${SETUP_OUTPUT}" | grep "SECURITY_DIR=" | cut -d'=' -f2)

    # Extract security analysis from setup
    RISK_LEVEL=$(echo "${SETUP_OUTPUT}" | grep "RISK_LEVEL=" | cut -d'=' -f2)
    COMPLEXITY_LEVEL=$(echo "${SETUP_OUTPUT}" | grep "COMPLEXITY_LEVEL=" | cut -d'=' -f2)
    AFFECTED_DOMAINS=$(echo "${SETUP_OUTPUT}" | grep "AFFECTED_DOMAINS=" | cut -d'=' -f2)
    TECH_STACK=$(echo "${SETUP_OUTPUT}" | grep "TECH_STACK=" | cut -d'=' -f2)

    # Validate setup was successful
    if [ ! -f "${SECURITY_CONTEXT_FILE}" ]; then
        echo "❌ Security review setup failed - context file not found" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "✅ Security review workspace ready" | tee -a "${PIPELINE_LOG}"
    echo "🔒 Risk Level: ${RISK_LEVEL}, Complexity: ${COMPLEXITY_LEVEL}, Domains: ${AFFECTED_DOMAINS}"
fi
```

### **Delegate to Security Review Coordinator**

```bash
# Use security-review-coordinator to analyze and recommend security strategy
echo "=== Security Review Coordination Analysis ==="
```

**Instruct the security-review-coordinator:**
"ultrathink. Analyze this feature implementation and recommend a comprehensive security review approach with threat assessment and appropriate security analysis agents.

**Read security context from:** ${SECURITY_CONTEXT_FILE}

**Also read these context sources:**

- Implementation outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Requirements (for threat modeling): .claude/features/${FEATURE_ID}/context/requirements.json
- Architecture context: .claude/features/${FEATURE_ID}/architecture/\*.md

**Save your recommendations to:** ${SECURITY_COORDINATION_PLAN}

**Create security strategy at:** ${SECURITY_STRATEGY}

**Output format for coordination plan:**

```json
{
  \"recommendation\": \"comprehensive_security|focused_security|basic_validation|skip_security\",
  \"rationale\": \"Why this approach based on risk level, attack surface, and available security agents\",
  \"security_assessment\": {
    \"risk_level\": \"Critical|High|Medium|Low\",
    \"attack_surface_changes\": [\"API endpoints\", \"Authentication\", \"Data handling\"],
    \"threat_vectors\": [\"Authentication\", \"Authorization\", \"Input Validation\"],
    \"technology_stack\": [\"Go\", \"React\", \"Python\"],
    \"security_priority\": \"critical|high|medium|low\"
  },
  \"suggested_security_agents\": [
    {
      \"agent\": \"[ONLY FROM DISCOVERED SECURITY AGENTS]\",
      \"reason\": \"Specific security domain/threat vector match justification\",
      \"security_focus\": [\"Authentication review\", \"Threat modeling\"],
      \"priority\": \"critical|high|medium|low\",
      \"thinking_budget\": \"ultrathink|think|basic\",
      \"estimated_effort\": \"high|medium|low\",
      \"threat_coverage\": [\"Specific threat vectors this agent addresses\"]
    }
  ],
  \"security_analysis_strategy\": {
    \"approach\": \"parallel|sequential|hybrid\",
    \"coordination_method\": \"threat-focused|technology-focused|risk-prioritized\",
    \"analysis_depth\": \"comprehensive|focused|basic\",
    \"threat_modeling_required\": true
  },
  \"security_gates\": {
    \"critical_blockers\": [\"Authentication bypass\", \"SQL injection\", \"RCE vulnerabilities\"],
    \"high_priority\": [\"XSS vulnerabilities\", \"Authorization flaws\", \"Data exposure\"],
    \"medium_priority\": [\"Configuration issues\", \"Information disclosure\", \"Input validation gaps\"]
  }
}
```

**Focus on:**

- Risk-appropriate security depth (${RISK_LEVEL} risk level detected)
- Technology-specific security agents (${TECH_STACK} stack detected)
- Threat vector coverage for affected domains (${AFFECTED_DOMAINS})
- Attack surface analysis based on implementation changes"

### **Process Coordinator Recommendations**

```bash
# After security-review-coordinator completes, process recommendations
if [ -f "${SECURITY_COORDINATION_PLAN}" ]; then
    RECOMMENDATION=$(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.recommendation')

    if [ "${RECOMMENDATION}" = "comprehensive_security" ] || [ "${RECOMMENDATION}" = "focused_security" ]; then
        echo "Security coordinator recommends: ${RECOMMENDATION}"
        cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.suggested_security_agents[] | "- \(.agent): \(.reason) [\(.priority)] - Threat Coverage: \(.threat_coverage | join(\", \"))"'

        echo ""
        echo "🔒 Security gates defined:"
        echo "Critical blockers: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.security_gates.critical_blockers | join(\", \")')"
        echo "High priority: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.security_gates.high_priority | join(\", \")')"
        echo ""
        echo "Based on the coordination plan, spawn the recommended security analysis agents using Task tool."

    else
        echo "Security coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.rationale')"
        if [ "${RECOMMENDATION}" = "skip_security" ]; then
            echo "Guidance: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.guidance // "Minimal security validation required"')"
        fi
    fi

else
    echo "❌ Security coordination failed - coordination plan not found"
    exit 1
fi
```

### **Security Review Feedback Loop**

```bash
# Initialize feedback loop for iterative security remediation
echo ""
echo "=== Security Review Feedback Loop ==="

# Check if comprehensive security review was recommended
RECOMMENDATION=$(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.recommendation')
if [ "${RECOMMENDATION}" = "comprehensive_security" ] || [ "${RECOMMENDATION}" = "focused_security" ]; then

    echo "🔒 Initiating security feedback loop with universal coordinator"
    echo ""
    echo "After security analysis agents complete their analysis:"
    echo "1. Call feedback-loop-coordinator to analyze security results and create remediation plan"
    echo "2. If remediation plan recommends 'spawn_remediation_agents', spawn the specified agents"
    echo "3. If remediation plan recommends 're_run_validation', re-run security analysis agents"
    echo "4. If remediation plan recommends 'complete', proceed to next phase"
    echo "5. If remediation plan recommends 'escalate', manual security review required"

else
    echo "ℹ️ Basic security validation - no feedback loop required"
fi
```

### **Feedback Loop Execution Pattern**

After security agents complete, Einstein executes this feedback loop pattern:

```bash
# Security Feedback Loop Execution (Einstein orchestrates, main Claude spawns)
ITERATION_COMPLETE=false
ITERATION_COUNT=0
MAX_ITERATIONS=2  # More conservative for security (vs 3 for quality)

while [ "${ITERATION_COMPLETE}" = false ] && [ ${ITERATION_COUNT} -lt ${MAX_ITERATIONS} ]; do
    ITERATION_COUNT=$((ITERATION_COUNT + 1))
    echo "🔒 Security Feedback Loop Iteration ${ITERATION_COUNT}/${MAX_ITERATIONS}"

    # Call feedback-loop-coordinator to analyze security results and create remediation plan
    echo "Calling feedback-loop-coordinator to analyze security vulnerabilities and create remediation plan..."

    # feedback-loop-coordinator outputs iteration plan for security phase
    ITERATION_PLAN=".claude/features/${FEATURE_ID}/security-review/feedback-loop/iteration-${ITERATION_COUNT}-plan.json"

    # Process coordinator recommendation
    if [ -f "${ITERATION_PLAN}" ]; then
        ACTION=$(cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.action')

        case "${ACTION}" in
            "spawn_remediation_agents")
                echo "🛠️  Iteration plan recommends: Spawn security remediation agents"
                cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.execution_summary'
                echo ""
                echo "Based on iteration plan, spawn the following security remediation agents:"
                cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.spawning_details[] | "- \(.agent): \(.instruction)"'
                echo ""
                echo "After security remediation agents complete, continue feedback loop..."
                ;;

            "re_run_validation")
                echo "🔍 Iteration plan recommends: Re-run security validation"
                echo "Re-spawn security analysis agents to verify vulnerabilities were resolved"
                ;;

            "complete")
                echo "✅ Iteration plan recommends: Security validation complete"
                echo "All critical and high-priority vulnerabilities resolved"
                ITERATION_COMPLETE=true
                ;;

            "escalate")
                echo "🚨 Iteration plan recommends: Security escalation required"
                echo "Reason: $(cat "${ITERATION_PLAN}" | jq -r '.iteration_management.escalation_reason')"
                ITERATION_COMPLETE=true
                ESCALATION_REQUIRED=true
                ;;
        esac
    else
        echo "❌ Security iteration plan not found - ending feedback loop"
        ITERATION_COMPLETE=true
    fi
done

# Handle security completion or escalation
if [ "${ESCALATION_REQUIRED}" = true ]; then
    echo "🚨 Security review requires manual security intervention"
    NEXT_PHASE="manual-security-review"
elif [ "${ITERATION_COMPLETE}" = true ]; then
    echo "✅ Security review feedback loop complete"
    NEXT_PHASE="quality-review"  # Proceed to quality review
else
    echo "⚠️ Maximum security iterations reached - escalating to manual review"
    NEXT_PHASE="manual-security-review"
fi
```

### Security Review Completion

```bash
# Complete security review phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "security-review" "quality-review" "${FEATURE_ID}" "" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)
  COMPLETION_TIME=$(echo "${COMPLETION_OUTPUT}" | grep "COMPLETION_TIME=" | cut -d'=' -f2)

# Validate completion
if [ "${COMPLETION_STATUS}" = "security_review_completed" ]; then
    echo "🔒 Security review ${COMPLETION_STATUS} at ${COMPLETION_TIME}"
    echo "➡️  Proceeding to ${NEXT_PHASE}"
else
    echo "❌ Security review completion failed: ${COMPLETION_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

**Phase 12: Deployment**

```bash
if [ "${NEXT_PHASE}" = "deploy" ]; then
    echo "🚀 Phase 12: DEPLOYMENT PHASE" | tee -a "${PIPELINE_LOG}"

    # Run mechanical setup operations (build, deploy, health checks)
    SETUP_OUTPUT=$(.claude/scripts/phases/deployment/setup-deployment-phase.sh "${FEATURE_ID}")
    echo "${SETUP_OUTPUT}"

    # Extract file paths and deployment status from setup output
    DEPLOY_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "DEPLOY_CONTEXT_FILE=" | cut -d'=' -f2)
    DEPLOY_COORDINATION_PLAN=$(echo "${SETUP_OUTPUT}" | grep "DEPLOY_COORDINATION_PLAN=" | cut -d'=' -f2)
    DEPLOY_STRATEGY=$(echo "${SETUP_OUTPUT}" | grep "DEPLOY_STRATEGY=" | cut -d'=' -f2)
    DEPLOY_WORKSPACE=$(echo "${SETUP_OUTPUT}" | grep "DEPLOY_WORKSPACE=" | cut -d'=' -f2)

    # Extract deployment analysis from setup
    DEPLOYMENT_RISK=$(echo "${SETUP_OUTPUT}" | grep "DEPLOYMENT_RISK=" | cut -d'=' -f2)
    BUILD_STATUS=$(echo "${SETUP_OUTPUT}" | grep "BUILD_STATUS=" | cut -d'=' -f2)
    DEPLOY_STATUS=$(echo "${SETUP_OUTPUT}" | grep "DEPLOY_STATUS=" | cut -d'=' -f2)
    PLATFORM_READY=$(echo "${SETUP_OUTPUT}" | grep "PLATFORM_READY=" | cut -d'=' -f2)
    API_HEALTH_STATUS=$(echo "${SETUP_OUTPUT}" | grep "API_HEALTH_STATUS=" | cut -d'=' -f2)

    # Validate deployment was successful
    if [ "${BUILD_STATUS}" != "success" ] || [ "${DEPLOY_STATUS}" != "success" ] || [ "${PLATFORM_READY}" != "true" ]; then
        echo "❌ Deployment setup failed - Build: ${BUILD_STATUS}, Deploy: ${DEPLOY_STATUS}, Platform: ${PLATFORM_READY}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "✅ Deployment completed successfully" | tee -a "${PIPELINE_LOG}"
    echo "🚀 Platform ready at https://localhost:3000"
    echo "📊 Deployment Risk: ${DEPLOYMENT_RISK}, API Health: ${API_HEALTH_STATUS}"
fi
```

### **Delegate to Deployment Coordinator**

```bash
# Use deployment-coordinator to analyze and recommend validation strategy
echo "=== Deployment Coordination Analysis ==="
```

**Instruct the deployment-coordinator:**
"ultrathink. Analyze this feature deployment and recommend a comprehensive validation approach with appropriate deployment validation agents.

**Read deployment context from:** ${DEPLOY_CONTEXT_FILE}

**Also read these context sources:**

- Quality validation results: .claude/features/${FEATURE_ID}/quality-review/ (if available)
- Security validation results: .claude/features/${FEATURE_ID}/security-review/ (if available)
- Implementation outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Requirements (for validation criteria): .claude/features/${FEATURE_ID}/context/requirements.json

**Save your recommendations to:** ${DEPLOY_COORDINATION_PLAN}

**Create deployment strategy at:** ${DEPLOY_STRATEGY}

**Output format for coordination plan:**

```json
{
  \"recommendation\": \"comprehensive_deployment|focused_deployment|basic_deployment|skip_deployment\",
  \"rationale\": \"Why this approach based on deployment risk, platform status, and available validation agents\",
  \"deployment_assessment\": {
    \"risk_level\": \"Critical|High|Medium|Low\",
    \"complexity_level\": \"Complex|Medium|Simple\",
    \"deployment_scope\": [\"Frontend changes\", \"Backend API changes\", \"Database migrations\"],
    \"technology_stack\": [\"Go\", \"React\", \"AWS\", \"Python\"],
    \"deployment_priority\": \"critical|high|medium|low\"
  },
  \"deployment_strategy\": {
    \"approach\": \"direct|staged|canary|blue_green\",
    \"justification\": \"Why this deployment approach is optimal\",
    \"rollback_plan\": \"immediate|staged|manual\",
    \"success_criteria\": [\"Measurable deployment success indicators\"]
  },
  \"suggested_validation_agents\": [
    {
      \"agent\": \"[ONLY FROM DISCOVERED AGENTS]\",
      \"reason\": \"Specific deployment validation domain match justification\",
      \"validation_focus\": [\"Production readiness\", \"Integration testing\"],
      \"priority\": \"critical|high|medium|low\",
      \"thinking_budget\": \"ultrathink|think|basic\",
      \"estimated_effort\": \"high|medium|low\",
      \"success_criteria\": [\"Specific validation requirements this agent addresses\"]
    }
  ],
  \"deployment_gates\": {
    \"pre_deployment\": [\"Build success\", \"Security cleared\", \"Quality approved\"],
    \"post_deployment\": [\"Health checks passed\", \"Integration validated\", \"Performance confirmed\"],
    \"rollback_triggers\": [\"Health failures\", \"Critical errors\", \"Performance degradation\"]
  }
}
```

**Focus on:**

- Risk-appropriate validation depth (${DEPLOYMENT_RISK} deployment risk detected)
- Platform status integration (Build: ${BUILD_STATUS}, Deploy: ${DEPLOY_STATUS}, Platform: ${PLATFORM_READY})
- Technology-specific validation agents based on implementation scope
- Production readiness validation based on quality and security results"

### **Process Coordinator Recommendations**

```bash
# After deployment-coordinator completes, process recommendations
if [ -f "${DEPLOY_COORDINATION_PLAN}" ]; then
    RECOMMENDATION=$(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.recommendation')

    if [ "${RECOMMENDATION}" = "comprehensive_deployment" ] || [ "${RECOMMENDATION}" = "focused_deployment" ]; then
        echo "Deployment coordinator recommends: ${RECOMMENDATION}"
        cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.suggested_validation_agents[] | "- \(.agent): \(.reason) [\(.priority)] - Validation: \(.validation_focus | join(\", \"))"'

        echo ""
        echo "🚀 Deployment gates defined:"
        echo "Pre-deployment: $(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.deployment_gates.pre_deployment | join(\", \")')"
        echo "Post-deployment: $(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.deployment_gates.post_deployment | join(\", \")')"
        echo "Rollback triggers: $(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.deployment_gates.rollback_triggers | join(\", \")')"
        echo ""
        echo "Based on the coordination plan, spawn the recommended validation agents using Task tool."

    else
        echo "Deployment coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.rationale')"
        if [ "${RECOMMENDATION}" = "skip_deployment" ]; then
            echo "Guidance: $(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.guidance // "Minimal deployment validation required"')"
        fi
    fi

else
    echo "❌ Deployment coordination failed - coordination plan not found"
    exit 1
fi
```

### **Deployment Validation Feedback Loop**

```bash
# Initialize feedback loop for deployment validation (if comprehensive validation)
echo ""
echo "=== Deployment Validation Feedback Loop ==="

RECOMMENDATION=$(cat "${DEPLOY_COORDINATION_PLAN}" | jq -r '.recommendation')
if [ "${RECOMMENDATION}" = "comprehensive_deployment" ] || [ "${RECOMMENDATION}" = "focused_deployment" ]; then

    echo "🚀 Initiating deployment validation with feedback loop coordination"
    echo ""
    echo "After validation agents complete their analysis:"
    echo "1. Call feedback-loop-coordinator to analyze validation results and create remediation plan"
    echo "2. If validation issues found, coordinate fixes with implementation agents"
    echo "3. If validation passes, mark deployment as successful"
    echo "4. If critical issues found, coordinate rollback procedures"

else
    echo "ℹ️ Basic deployment validation - minimal feedback loop"
fi
```

### **Deployment Completion**

```bash
# Complete deployment phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "deployment" "complete" "${FEATURE_ID}" "platform_deployed=true,platform_url=https://localhost:3000" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)
COMPLETION_TIME=$(echo "${COMPLETION_OUTPUT}" | grep "COMPLETION_TIME=" | cut -d'=' -f2)

# Validate completion
if [ "${COMPLETION_STATUS}" = "deployment_completed" ]; then
    echo "🚀 Deployment ${COMPLETION_STATUS} at ${COMPLETION_TIME}"
    echo "✅ Feature successfully deployed to production"
    echo "🌐 Platform available at: https://localhost:3000"
    echo "📊 Next phase: ${NEXT_PHASE}"
else
    echo "❌ Deployment completion failed: ${COMPLETION_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```
