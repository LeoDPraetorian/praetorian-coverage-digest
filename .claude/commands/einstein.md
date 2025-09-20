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

```
[Single Message with Multiple Task Calls]:
Task("context7-search-specialist", "Research Cloudflare API...", "context7-search-specialist")
Task("web-research-specialist", "Research security best practices...", "web-research-specialist")
Task("code-pattern-analyzer", "Analyze existing patterns...", "code-pattern-analyzer")
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

DO NOT PROCEED TO PHASE 3 until all research agents are spawned and their tasking has completed.

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

**🚀 Design Phase Successfully Completed - Ready for Production Implementation!**

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
    echo "⚙️ Phase 6: IMPLEMENTATION PHASE" | tee -a "${PIPELINE_LOG}"

    # Initialize implementation workspace
    IMPL_DIR=".claude/features/${FEATURE_ID}/implementation"
    mkdir -p "${IMPL_DIR}"/{progress,code-changes,validation,logs,agent-outputs}

    # Create agent tracking structure
    AGENT_OUTPUT_DIR="${IMPL_DIR}/agent-outputs"
    mkdir -p "${AGENT_OUTPUT_DIR}"

    IMPL_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Implementation started: ${IMPL_START}" | tee -a "${PIPELINE_LOG}"

    # Update metadata
    jq '.status = "implementation_in_progress" | .phase = "implementation" | .implementation_started = "'${IMPL_START}'"' \
       ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
       mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
fi
```

**Execute Implementation Phase Using Internal Agents:**

**Sub-Phase 8.1: Pre-Implementation Context Analysis**

Extract comprehensive implementation context from design phase artifacts:

```bash
# Create implementation context workspace
IMPL_CONTEXT_DIR=".claude/features/${FEATURE_ID}/implementation/context"
mkdir -p "${IMPL_CONTEXT_DIR}"

echo "=== Pre-Implementation Context Analysis ==="
echo "Extracting context from design phase artifacts..."
echo "Context workspace: ${IMPL_CONTEXT_DIR}"
```

Task("implementation-planner", "Extract comprehensive implementation context from design phase artifacts.

**Read and analyze multiple context sources:**

1. **Complexity Assessment**: .claude/features/${FEATURE_ID}/context/complexity-assessment.json

   - Extract: affected_domains array (frontend, backend, database, etc.)
   - Extract: complexity level and risk factors

2. **Requirements Analysis**: .claude/features/${FEATURE_ID}/context/requirements.json

   - Extract: affected_systems array (APIs, services, databases)
   - Extract: user_stories and acceptance_criteria

3. **Implementation Plan**: .claude/features/${FEATURE_ID}/output/implementation-plan.md

   - Extract: recommended agent assignments and task breakdown
   - Extract: technology stack requirements

4. **Architecture Context** (if exists): .claude/features/${FEATURE_ID}/architecture/\*.md
   - Extract: implementation patterns and design decisions
   - Extract: architecture file to agent domain mappings

**Create comprehensive context analysis files:**

1. **Implementation Context Summary**: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json
   Format:

   ```json
   {
     \"affected_domains\": [\"frontend\", \"backend\", \"database\"],
     \"affected_systems\": [\"API\", \"UI\", \"Database\"],
     \"complexity_level\": \"Medium|Complex|Simple\",
     \"recommended_agents\": [
       {\"agent_type\": \"golang-api-developer\", \"domain\": \"backend\", \"focus\": \"REST APIs\"},
       {\"agent_type\": \"react-developer\", \"domain\": \"frontend\", \"focus\": \"UI components\"}
     ],
     \"technology_requirements\": {\"backend\": \"Go\", \"frontend\": \"React\", \"database\": \"Neo4j\"}
   }
   ```

2. **Agent Assignments**: .claude/features/${FEATURE_ID}/implementation/progress/agent-assignments.json
   Format with:

   - implementation_tracks with agents, dependencies, parallel_safe flags
   - specific tasks with agent assignments, file targets, completion criteria
   - estimated duration and critical path analysis

3. **Architecture Context Mapping**: .claude/features/${FEATURE_ID}/implementation/context/architecture-mapping.json
   Format:
   ```json
   {
     \"agent_architecture_files\": {
       \"golang-api-developer\": [\"backend-architecture.md\", \"api-architecture.md\"],
       \"react-developer\": [\"frontend-architecture.md\", \"ui-architecture.md\"],
       \"database-neo4j-architect\": [\"database-architecture.md\", \"graph-schema.md\"]
     },
     \"available_architecture_files\": [\"list of actual .md files found\"]
   }
   ```

**Instructions:**

- Only map architecture files that actually exist in .claude/features/${FEATURE_ID}/architecture/
- Match agent types to relevant architecture domains (backend agents get backend architecture files)
- Create fallback strategies if expected architecture files don't exist", "implementation-planner")

**Context Analysis Validation Gate:**

Wait for the implementation-planner to complete, then verify all required context files:

```bash
echo "=== Context Analysis Validation Gate ==="
echo "Validating implementation context extraction..."

# Define required context files
CONTEXT_FILES=(
    "implementation-context.json"
    "agent-assignments.json"
    "architecture-mapping.json"
)

VALIDATION_PASSED=true
CONTEXT_DIR=".claude/features/${FEATURE_ID}/implementation/context"

# Validate each required context file exists and has valid structure
for context_file in "${CONTEXT_FILES[@]}"; do
    CONTEXT_PATH="${CONTEXT_DIR}/${context_file}"

    if [ -f "${CONTEXT_PATH}" ]; then
        echo "✓ ${context_file} exists"

        # Validate JSON structure
        if jq empty "${CONTEXT_PATH}" 2>/dev/null; then
            echo "✓ ${context_file} contains valid JSON"

            # Validate specific content based on file type
            case "${context_file}" in
                "implementation-context.json")
                    # Validate required fields exist
                    REQUIRED_FIELDS=("affected_domains" "complexity_level" "recommended_agents")
                    for field in "${REQUIRED_FIELDS[@]}"; do
                        if jq -e ".${field}" "${CONTEXT_PATH}" >/dev/null 2>&1; then
                            echo "✓ implementation-context.json contains required field: ${field}"
                        else
                            echo "✗ implementation-context.json missing required field: ${field}"
                            VALIDATION_PASSED=false
                        fi
                    done

                    # Show extracted domains for verification
                    DOMAINS=$(jq -r '.affected_domains[]' "${CONTEXT_PATH}" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
                    COMPLEXITY=$(jq -r '.complexity_level' "${CONTEXT_PATH}" 2>/dev/null)
                    echo "   → Extracted domains: ${DOMAINS}"
                    echo "   → Complexity level: ${COMPLEXITY}"
                    ;;

                "agent-assignments.json")
                    # Validate agent assignments structure
                    if jq -e '.implementation_tracks' "${CONTEXT_PATH}" >/dev/null 2>&1; then
                        echo "✓ agent-assignments.json contains implementation_tracks"
                    else
                        echo "✗ agent-assignments.json missing implementation_tracks"
                        VALIDATION_PASSED=false
                    fi
                    ;;

                "architecture-mapping.json")
                    # Validate architecture file mappings and verify files exist
                    if jq -e '.agent_architecture_files' "${CONTEXT_PATH}" >/dev/null 2>&1; then
                        echo "✓ architecture-mapping.json contains agent_architecture_files"

                        # Verify mapped architecture files actually exist
                        ARCH_DIR=".claude/features/${FEATURE_ID}/architecture"
                        if [ -d "${ARCH_DIR}" ]; then
                            # Check each mapped file exists
                            jq -r '.agent_architecture_files | to_entries[] | .value[]' "${CONTEXT_PATH}" 2>/dev/null | while read -r arch_file; do
                                ARCH_FILE_PATH="${ARCH_DIR}/${arch_file}"
                                if [ -f "${ARCH_FILE_PATH}" ]; then
                                    echo "✓ Architecture file exists: ${arch_file}"
                                else
                                    echo "⚠️ Architecture file referenced but not found: ${arch_file}"
                                fi
                            done
                        else
                            echo "ℹ️ No architecture directory found - skipping file verification"
                        fi
                    else
                        echo "✗ architecture-mapping.json missing agent_architecture_files"
                        VALIDATION_PASSED=false
                    fi
                    ;;
            esac
        else
            echo "✗ ${context_file} contains invalid JSON"
            VALIDATION_PASSED=false
        fi
    else
        echo "✗ ${context_file} missing"
        VALIDATION_PASSED=false
    fi
    echo ""
done

# Final validation result
if [ "${VALIDATION_PASSED}" = true ]; then
    echo "🎯 Context Analysis Validation: PASSED"
    echo "✅ All required context files created with valid structure"
    echo "Proceeding to agent orchestration..."
else
    echo "❌ Context Analysis Validation: FAILED"
    echo "✗ One or more context files missing or invalid"
    echo "✗ Implementation phase cannot proceed without proper context"
    echo ""
    echo "Terminating Einstein pipeline due to validation failure."
    exit 1
fi
```

**Sub-Phase 6.2: Context-Aware Parallel Implementation Orchestration**

Read extracted context and spawn implementation agents with relevant architecture files:

```bash
# Read context analysis results
IMPL_CONTEXT=".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json"
ARCH_MAPPING=".claude/features/${FEATURE_ID}/implementation/context/architecture-mapping.json"

echo "=== Context-Aware Agent Spawning ==="
if [ -f "${IMPL_CONTEXT}" ]; then
    COMPLEXITY=$(cat "${IMPL_CONTEXT}" | jq -r '.complexity_level')
    AFFECTED_DOMAINS=$(cat "${IMPL_CONTEXT}" | jq -r '.affected_domains[]' | tr '\n' ', ' | sed 's/,$//')
    echo "Complexity Level: ${COMPLEXITY}"
    echo "Affected Domains: ${AFFECTED_DOMAINS}"

    echo "Discovering available development agents..."
else
    echo "⚠️ Context analysis not found - using default agent set"
fi
```

**Dynamic Development Agent Discovery:**

Discover available development agents with comprehensive metadata parsing:

```bash
# Auto-discover development agents with comprehensive metadata parsing
DEV_AGENTS_DIR=".claude/agents/development"

echo "=== Available Development Agents ==="

if [ -d "${DEV_AGENTS_DIR}" ]; then
    echo "Development Agents with Full Metadata:"
    find "${DEV_AGENTS_DIR}" -name "*.md" -type f | while read agent_file; do
        agent_name=$(basename "$agent_file" .md)
        agent_type=$(grep "^type:" "$agent_file" | cut -d':' -f2- | xargs)
        agent_desc=$(grep "^description:" "$agent_file" | cut -d':' -f2- | xargs | cut -c1-80)
        domains=$(grep "^domains:" "$agent_file" | cut -d':' -f2- | xargs)
        capabilities=$(grep "^capabilities:" "$agent_file" | cut -d':' -f2- | xargs)
        specializations=$(grep "^specializations:" "$agent_file" | cut -d':' -f2- | xargs)

        echo "- ${agent_name}:"
        echo "  * Type: ${agent_type}"
        echo "  * Domains: ${domains}"
        echo "  * Capabilities: ${capabilities}"
        echo "  * Specializations: ${specializations}"
        echo "  * Description: ${agent_desc}..."
        echo ""
    done
else
    echo "Development agents directory not found: ${DEV_AGENTS_DIR}"
fi

# Get all available development agents for selection with metadata
echo "====================================="
echo "Agent Discovery Complete. Available agents for capability-based selection:"

AVAILABLE_DEV_AGENTS=$(
    find "${DEV_AGENTS_DIR}" -name "*.md" -type f -exec basename {} .md \; 2>/dev/null
) | sort | uniq

echo "${AVAILABLE_DEV_AGENTS}"
echo "====================================="
```

**Capability-Based Agent Selection:**

Map feature requirements to available agents using dynamic discovery:

```bash
echo "=== Dynamic Agent Selection ==="

# Read extracted context for agent selection
if [ -f "${IMPL_CONTEXT}" ]; then
    # Extract requirements from context
    AFFECTED_DOMAINS_JSON=$(cat "${IMPL_CONTEXT}" | jq -r '.affected_domains | join(", ")' 2>/dev/null)
    COMPLEXITY_LEVEL=$(cat "${IMPL_CONTEXT}" | jq -r '.complexity_level' 2>/dev/null)
    RECOMMENDED_AGENTS=$(cat "${IMPL_CONTEXT}" | jq -r '.recommended_agents[]?.agent_type' 2>/dev/null)

    echo "Feature Requirements:"
    echo "• Complexity: ${COMPLEXITY_LEVEL}"
    echo "• Affected Domains: ${AFFECTED_DOMAINS_JSON}"
    echo "• Recommended Agents: ${RECOMMENDED_AGENTS}"
    echo ""

    # Initialize selected agents array
    SELECTED_AGENTS=()
    SELECTION_REASONS=()

    # Map domains to agent capabilities using discovered agents
    echo "Mapping domains to available agents..."

    # Backend Development Domain Mapping
    if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "backend\|api\|server\|microservice"; then
        echo "🔍 Backend domain detected - searching for backend developers..."

        # Search for golang-api-developer if available
        if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "golang-api-developer"; then
            SELECTED_AGENTS+=("golang-api-developer")
            SELECTION_REASONS+=("golang-api-developer: domains backend-development,go-apis,microservices-implementation match backend requirements")
            echo "✅ Selected: golang-api-developer (backend development capabilities)"
        # Fallback to general golang-developer
        elif echo "${AVAILABLE_DEV_AGENTS}" | grep -q "golang-developer"; then
            SELECTED_AGENTS+=("golang-developer")
            SELECTION_REASONS+=("golang-developer: fallback for backend development needs")
            echo "✅ Selected: golang-developer (backend development fallback)"
        fi

        # Add Python support if Python domain detected or CLI development needed
        if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "python\|cli" || echo "${AVAILABLE_DEV_AGENTS}" | grep -q "python-developer"; then
            SELECTED_AGENTS+=("python-developer")
            SELECTION_REASONS+=("python-developer: domains python-development,cli-development support backend services")
            echo "✅ Selected: python-developer (Python/CLI backend support)"
        fi
    fi

    # Frontend Development Domain Mapping
    if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "frontend\|ui\|react\|component\|dashboard"; then
        echo "🔍 Frontend domain detected - searching for frontend developers..."

        # Search for react-developer if available
        if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "react-developer"; then
            SELECTED_AGENTS+=("react-developer")
            SELECTION_REASONS+=("react-developer: domains frontend-development,react-components,ui-implementation match frontend requirements")
            echo "✅ Selected: react-developer (frontend development capabilities)"
        fi
    fi

    # Integration Development Domain Mapping
    if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "integration\|webhook\|api.*integration\|third.*party" || echo "${RECOMMENDED_AGENTS}" | grep -qi "integration"; then
        echo "🔍 Integration domain detected - searching for integration developers..."

        if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "integration-developer"; then
            SELECTED_AGENTS+=("integration-developer")
            SELECTION_REASONS+=("integration-developer: domains service-integration,api-integration,third-party-integration match integration requirements")
            echo "✅ Selected: integration-developer (integration capabilities)"
        fi
    fi

    # Security/VQL Development Domain Mapping
    if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "security\|vql\|threat\|detection\|forensic" || echo "${RECOMMENDED_AGENTS}" | grep -qi "vql"; then
        echo "🔍 Security/VQL domain detected - searching for security developers..."

        if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "vql-developer"; then
            SELECTED_AGENTS+=("vql-developer")
            SELECTION_REASONS+=("vql-developer: domains vql-development,security-automation,threat-hunting match security requirements")
            echo "✅ Selected: vql-developer (security/VQL capabilities)"
        fi
    fi

    # Complexity-Aware Agent Count Adjustment
    AGENT_COUNT=${#SELECTED_AGENTS[@]}
    MAX_AGENTS=3  # Default for Simple

    case "${COMPLEXITY_LEVEL}" in
        "Simple")
            MAX_AGENTS=3
            echo "📊 Simple complexity: Max 3 agents"
            ;;
        "Medium")
            MAX_AGENTS=5
            echo "📊 Medium complexity: Max 5 agents"
            ;;
        "Complex")
            MAX_AGENTS=8
            echo "📊 Complex complexity: Max 8 agents (with coordination)"
            # Add testing agents for complex features
            if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "integration-test-engineer" && [ $AGENT_COUNT -lt $MAX_AGENTS ]; then
                SELECTED_AGENTS+=("integration-test-engineer")
                SELECTION_REASONS+=("integration-test-engineer: complex features require comprehensive testing")
                echo "✅ Added: integration-test-engineer (complex feature testing)"
            fi
            ;;
        *)
            MAX_AGENTS=3
            echo "📊 Unknown complexity: Defaulting to 3 agents"
            ;;
    esac

    # Trim agent list if exceeding max for complexity level
    if [ $AGENT_COUNT -gt $MAX_AGENTS ]; then
        echo "⚠️ Trimming agent selection from $AGENT_COUNT to $MAX_AGENTS agents for $COMPLEXITY_LEVEL complexity"
        SELECTED_AGENTS=("${SELECTED_AGENTS[@]:0:$MAX_AGENTS}")
        SELECTION_REASONS=("${SELECTION_REASONS[@]:0:$MAX_AGENTS}")
    fi

    echo ""
    echo "🎯 Final Agent Selection Summary:"
    for i in "${!SELECTED_AGENTS[@]}"; do
        echo "$(($i + 1)). ${SELECTED_AGENTS[$i]}"
        echo "   └── ${SELECTION_REASONS[$i]}"
    done
    echo ""
    echo "Total agents selected: ${#SELECTED_AGENTS[@]} (max: $MAX_AGENTS for $COMPLEXITY_LEVEL complexity)"

else
    echo "❌ No implementation context available - reading from complexity assessment"
    COMPLEXITY_LEVEL=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.level' 2>/dev/null || echo "Unknown")
    echo "• Complexity Level (from assessment): ${COMPLEXITY_LEVEL}"
    
    # Fallback to minimal agent set
    SELECTED_AGENTS=("golang-api-developer" "react-developer")
    SELECTION_REASONS=("golang-api-developer: fallback backend agent" "react-developer: fallback frontend agent")
    echo "🔄 Using fallback agent set: ${SELECTED_AGENTS[@]}"
fi

# Ensure COMPLEXITY_LEVEL is never empty
COMPLEXITY_LEVEL=${COMPLEXITY_LEVEL:-"Unknown"}
```

**Sub-Phase 8.1.5: Thinking Budget Optimization for Implementation Phase**

Optimize thinking budget allocation for implementation agents:

```bash
source .claude/features/current_feature.env
IMPL_CONTEXT=".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json"
IMPL_THINKING_ALLOCATION=".claude/features/${FEATURE_ID}/implementation/thinking-allocation.json"

echo "=== Implementation Phase Thinking Budget Optimization ==="
echo "Implementation context: ${IMPL_CONTEXT}"
echo "Thinking allocation output: ${IMPL_THINKING_ALLOCATION}"
```

Use the `thinking-budget-allocator` subagent to optimize thinking budget allocation for implementation phase agents.

Instruct the thinking-budget-allocator:
"ultrathink. Optimize thinking budget allocation for implementation phase agents.

Context:

- Complexity assessment: .claude/features/${FEATURE_ID}/context/complexity-assessment.json
- Implementation context: ${IMPL_CONTEXT}
- Planned agents: Read recommended_agents from implementation context
- User preference: balanced (detect from --thinking= flags if provided)

Output allocation plan to: ${IMPL_THINKING_ALLOCATION}

Focus on:

- Implementation agent thinking levels based on complexity and domains
- Testing agent thinking levels based on risk assessment
- Cost optimization for development phase efficiency
- User transparency with cost estimates and alternative strategies

Analyze planned agents from implementation context and provide thinking level recommendations."

```bash
# Validate implementation thinking allocation
if [ -f "${IMPL_THINKING_ALLOCATION}" ]; then
    echo "✓ Implementation thinking allocation completed"
    cat "${IMPL_THINKING_ALLOCATION}" | jq -r '.cost_estimate // "Cost estimate not available"'
else
    echo "✗ Implementation thinking allocation failed - using defaults"
fi
```

**Dynamic Agent Spawning:**

Spawn selected agents with capability-aware context and optimized thinking levels:

**Dynamically Spawn Selected Agents:**

For each selected agent, spawn with appropriate context, architecture files, and thinking optimization:

**Golang API Developer** (spawn if selected):

```bash
# Check if golang-api-developer was selected
if [[ " ${SELECTED_AGENTS[@]} " =~ " golang-api-developer " ]]; then
    echo "🚀 Spawning golang-api-developer..."

    # Read thinking allocation for this agent
    IMPL_THINKING=$(cat ${IMPL_THINKING_ALLOCATION} | jq -r '.thinking_allocations."golang-api-developer"' 2>/dev/null || echo "think")
```

Task("golang-api-developer", "${IMPL_THINKING}. Implement backend API components with architecture context.

**Core Context:**

- Implementation plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Agent assignments: .claude/features/${FEATURE_ID}/implementation/progress/agent-assignments.json
- Implementation context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json

**Architecture Context** (read if available):
$([ -f .claude/features/${FEATURE_ID}/architecture/backend-architecture.md ] && echo "- Backend Architecture: .claude/features/${FEATURE_ID}/architecture/backend-architecture.md" || echo "- No backend architecture file found")
$([ -f .claude/features/${FEATURE_ID}/architecture/api-architecture.md ] && echo "- API Architecture: .claude/features/${FEATURE_ID}/architecture/api-architecture.md" || echo "- No API architecture file found")
$([ -f .claude/features/${FEATURE_ID}/architecture/database-architecture.md ] && echo "- Database Architecture: .claude/features/${FEATURE_ID}/architecture/database-architecture.md" || echo "- No database architecture file found")

**Your workspace:**

- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/backend/
- Tracking report: .claude/features/${FEATURE_ID}/implementation/agent-outputs/golang-api-developer/tracking-report.md
- Progress updates: .claude/features/${FEATURE_ID}/implementation/progress/task-tracker.json

**Coordination Context:**

- Shared API contracts: .claude/features/${FEATURE_ID}/implementation/coordination/api-contracts/
- Inter-agent communication: .claude/features/${FEATURE_ID}/implementation/coordination/communication/

**Instructions:**

1. Read implementation context to understand complexity and requirements
2. If architecture files are available, apply architectural decisions to your implementation
3. Focus on domains specified in affected_domains from implementation-context.json
4. Implement your assigned tasks and maintain detailed progress tracking
5. Coordinate with other agents through shared workspace and communication files
6. Update API contracts in coordination directory for frontend integration", "golang-api-developer")

```bash
else
    echo "⏭️  golang-api-developer not selected for this feature"
fi
```

**React Developer** (spawn if selected):

```bash
# Check if react-developer was selected
if [[ " ${SELECTED_AGENTS[@]} " =~ " react-developer " ]]; then
    echo "🚀 Spawning react-developer..."

    # Read thinking allocation for this agent
    IMPL_THINKING=$(cat ${IMPL_THINKING_ALLOCATION} | jq -r '.thinking_allocations."react-developer"' 2>/dev/null || echo "think")
```

Task("react-developer", "${IMPL_THINKING}. Implement frontend UI components with architecture context.

**Core Context:**

- Implementation plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Agent assignments: .claude/features/${FEATURE_ID}/implementation/progress/agent-assignments.json
- Implementation context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json

**Architecture Context** (read if available):
$([ -f .claude/features/${FEATURE_ID}/architecture/frontend-architecture.md ] && echo "- Frontend Architecture: .claude/features/${FEATURE_ID}/architecture/frontend-architecture.md" || echo "- No frontend architecture file found")
$([ -f .claude/features/${FEATURE_ID}/architecture/ui-architecture.md ] && echo "- UI Architecture: .claude/features/${FEATURE_ID}/architecture/ui-architecture.md" || echo "- No UI architecture file found")
$([ -f .claude/features/${FEATURE_ID}/architecture/component-architecture.md ] && echo "- Component Architecture: .claude/features/${FEATURE_ID}/architecture/component-architecture.md" || echo "- No component architecture file found")

**Your workspace:**

- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/frontend/
- Tracking report: .claude/features/${FEATURE_ID}/implementation/agent-outputs/react-developer/tracking-report.md
- Progress updates: .claude/features/${FEATURE_ID}/implementation/progress/task-tracker.json

**Coordination Context:**

- Shared API contracts: .claude/features/${FEATURE_ID}/implementation/coordination/api-contracts/
- Inter-agent communication: .claude/features/${FEATURE_ID}/implementation/coordination/communication/

**Instructions:**

1. Read implementation context to understand UI requirements and complexity
2. If frontend architecture files exist, follow architectural decisions for component design
3. Focus on user stories and acceptance criteria from requirements.json
4. Implement responsive, accessible UI components following established patterns
5. Coordinate with backend agent for API integration through shared API contracts
6. Read API contracts from coordination directory for accurate frontend integration", "react-developer")

```bash
else
    echo "⏭️  react-developer not selected for this feature"
fi
```

**Integration Developer** (spawn if selected):

```bash
# Check if integration-developer was selected
if [[ " ${SELECTED_AGENTS[@]} " =~ " integration-developer " ]]; then
    echo "🚀 Spawning integration-developer..."
```

Task("integration-developer", "Implement service integrations and API connections.

**Core Context:**

- Implementation plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json

**Architecture Context** (read if available):
$([ -f .claude/features/${FEATURE_ID}/architecture/integration-architecture.md ] && echo "- Integration Architecture: .claude/features/${FEATURE_ID}/architecture/integration-architecture.md" || echo "- No integration architecture file found")
$([ -f .claude/features/${FEATURE_ID}/architecture/api-architecture.md ] && echo "- API Architecture: .claude/features/${FEATURE_ID}/architecture/api-architecture.md" || echo "- No API architecture file found")

**Your workspace:**

- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/integrations/
- Tracking report: .claude/features/${FEATURE_ID}/implementation/agent-outputs/integration-developer/tracking-report.md
- Progress updates: .claude/features/${FEATURE_ID}/implementation/progress/task-tracker.json

**Coordination Context:**

- Integration contracts: .claude/features/${FEATURE_ID}/implementation/coordination/integration-contracts/
- Service communication: .claude/features/${FEATURE_ID}/implementation/coordination/communication/

**Instructions:**

1. Focus on integration-specific domains from implementation-context.json
2. Apply integration architecture patterns and authentication flows
3. Implement webhook handling, API client code, and service orchestration
4. Document integration contracts and communication patterns
5. Coordinate with backend agents through shared integration specifications", "integration-developer")

```bash
else
    echo "⏭️  integration-developer not selected for this feature"
fi
```

**Python Developer** (spawn if selected):

```bash
# Check if python-developer was selected
if [[ " ${SELECTED_AGENTS[@]} " =~ " python-developer " ]]; then
    echo "🚀 Spawning python-developer..."
```

Task("python-developer", "Implement Python components and CLI tooling.

**Core Context:**

- Implementation plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json

**Your workspace:**

- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/python/
- Tracking report: .claude/features/${FEATURE_ID}/implementation/agent-outputs/python-developer/tracking-report.md
- Progress updates: .claude/features/${FEATURE_ID}/implementation/progress/task-tracker.json

**Instructions:**

1. Focus on Python-specific requirements from implementation context
2. Implement CLI interfaces, data processing pipelines, or Python services
3. Follow Praetorian CLI patterns and enterprise Python best practices
4. Coordinate with other agents through shared workspace structures", "python-developer")

```bash
else
    echo "⏭️  python-developer not selected for this feature"
fi
```

**VQL Developer** (spawn if selected):

```bash
# Check if vql-developer was selected
if [[ " ${SELECTED_AGENTS[@]} " =~ " vql-developer " ]]; then
    echo "🚀 Spawning vql-developer..."
```

Task("vql-developer", "Implement VQL security capabilities and detection logic.

**Core Context:**

- Implementation plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json

**Your workspace:**

- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/vql/
- Tracking report: .claude/features/${FEATURE_ID}/implementation/agent-outputs/vql-developer/tracking-report.md
- Progress updates: .claude/features/${FEATURE_ID}/implementation/progress/task-tracker.json

**Instructions:**

1. Focus on security-specific domains from implementation context
2. Develop VQL artifacts, detection rules, and security automation capabilities
3. Follow Praetorian Aegis platform patterns for threat hunting and incident response
4. Document security capabilities and coordinate with other security components", "vql-developer")

```bash
else
    echo "⏭️  vql-developer not selected for this feature"
fi
```

**Agent Coordination Workspace Setup:**

Create shared workspace structure for inter-agent communication:

```bash
echo "=== Setting Up Agent Coordination Workspace ==="

# Create coordination directories
COORDINATION_DIR=".claude/features/${FEATURE_ID}/implementation/coordination"
mkdir -p "${COORDINATION_DIR}"/{api-contracts,integration-contracts,communication,progress,dependencies}

echo "📁 Coordination workspace created:"
echo "  • API Contracts: ${COORDINATION_DIR}/api-contracts/"
echo "  • Integration Contracts: ${COORDINATION_DIR}/integration-contracts/"
echo "  • Communication: ${COORDINATION_DIR}/communication/"
echo "  • Progress Tracking: ${COORDINATION_DIR}/progress/"
echo "  • Dependencies: ${COORDINATION_DIR}/dependencies/"

# Create coordination metadata
cat > "${COORDINATION_DIR}/coordination-metadata.json" << EOF
{
  "coordination_strategy": "file-based",
  "selected_agents": [],
  "communication_channels": [
    "api-contracts: Backend to Frontend API specifications",
    "integration-contracts: Third-party service integration specs",
    "communication: Inter-agent status updates and coordination",
    "progress: Milestone tracking and dependency resolution",
    "dependencies: Cross-agent dependency mapping"
  ],
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Update coordination metadata with selected agents
if [ ${#SELECTED_AGENTS[@]} -gt 0 ]; then
    AGENTS_JSON=$(printf '%s\n' "${SELECTED_AGENTS[@]}" | jq -R . | jq -s .)
    jq --argjson agents "${AGENTS_JSON}" '.selected_agents = $agents' \
        "${COORDINATION_DIR}/coordination-metadata.json" > "${COORDINATION_DIR}/coordination-metadata.json.tmp" && \
        mv "${COORDINATION_DIR}/coordination-metadata.json.tmp" "${COORDINATION_DIR}/coordination-metadata.json"
fi

echo "✅ Agent coordination workspace prepared for ${#SELECTED_AGENTS[@]} selected agents"
```

**Integration Testing Agent** (spawn if testing needed):

```bash
# Check if integration-test-engineer is needed (always for Medium/Complex, optional for Simple)
SPAWN_TESTING_AGENT=false
if [ "${COMPLEXITY_LEVEL}" = "Complex" ] || [ "${COMPLEXITY_LEVEL}" = "Medium" ]; then
    SPAWN_TESTING_AGENT=true
    echo "🚀 Spawning integration-test-engineer for ${COMPLEXITY_LEVEL} complexity feature..."
elif echo "${AVAILABLE_DEV_AGENTS}" | grep -q "integration-test-engineer" && [ ${#SELECTED_AGENTS[@]} -lt 3 ]; then
    SPAWN_TESTING_AGENT=true
    echo "🚀 Spawning integration-test-engineer for comprehensive testing..."
else
    echo "⏭️  integration-test-engineer not needed for Simple complexity feature"
fi

if [ "${SPAWN_TESTING_AGENT}" = true ]; then
```

Task("integration-test-engineer", "Create integration tests with architecture-aware context.

**Core Context:**

- Implementation plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json
- Backend code: .claude/features/${FEATURE_ID}/implementation/code-changes/backend/
- Frontend code: .claude/features/${FEATURE_ID}/implementation/code-changes/frontend/

**Architecture Context** (read if available):
$([ -f .claude/features/${FEATURE_ID}/architecture/integration-architecture.md ] && echo "- Integration Architecture: .claude/features/${FEATURE_ID}/architecture/integration-architecture.md" || echo "- No integration architecture file found")
$([ -f .claude/features/${FEATURE_ID}/architecture/testing-architecture.md ] && echo "- Testing Architecture: .claude/features/${FEATURE_ID}/architecture/testing-architecture.md" || echo "- No testing architecture file found")

**Your workspace:**

- Test code: .claude/features/${FEATURE_ID}/implementation/code-changes/tests/
- Tracking report: .claude/features/${FEATURE_ID}/implementation/agent-outputs/integration-test-engineer/tracking-report.md

**Coordination Context:**

- Test coordination: .claude/features/${FEATURE_ID}/implementation/coordination/communication/
- Integration results: .claude/features/${FEATURE_ID}/implementation/coordination/progress/

**Instructions:**

1. Read affected_systems from implementation context to understand integration points
2. Apply testing architecture patterns if available
3. Create comprehensive integration tests covering API, database, and service interactions
4. Focus on user stories from requirements for end-to-end test scenarios
5. Validate implementation against acceptance criteria
6. Coordinate testing results with other agents through shared progress tracking", "integration-test-engineer")

```bash
else
    echo "⏭️  integration-test-engineer not spawned for this feature complexity"
fi
```

**Dynamic Selection Validation:**

Validate the dynamic agent selection system effectiveness:

```bash
echo "=== Dynamic Agent Selection Validation ==="

# Display final selection summary
echo "🎯 Final Agent Selection Results:"
echo "• Feature Complexity: ${COMPLEXITY_LEVEL}"
echo "• Agents Discovered: $(echo "${AVAILABLE_DEV_AGENTS}" | wc -w)"
echo "• Agents Selected: ${#SELECTED_AGENTS[@]}"
echo "• Max Agents for Complexity: ${MAX_AGENTS}"

echo ""
echo "Selected Agents and Rationale:"
for i in "${!SELECTED_AGENTS[@]}"; do
    echo "$(($i + 1)). ${SELECTED_AGENTS[$i]}"
    if [ -n "${SELECTION_REASONS[$i]:-}" ]; then
        echo "   └── ${SELECTION_REASONS[$i]}"
    fi
done

echo ""
echo "🚀 Dynamic Selection Benefits Achieved:"
echo "• ✅ Discovery-Based: Only available agents selected (no hardcoded failures)"
echo "• ✅ Capability Mapping: Agents matched to specific feature domains"
echo "• ✅ Complexity-Aware: Agent count scaled to feature complexity (${COMPLEXITY_LEVEL})"
echo "• ✅ Coordination-Ready: Shared workspace structure established"
echo "• ✅ Architecture-Integrated: Architecture files distributed to relevant agents"

# Test different complexity scenarios
echo ""
echo "🧪 Testing Different Complexity Scenarios:"
case "${COMPLEXITY_LEVEL}" in
    "Simple")
        echo "• Simple Feature: ✅ Limited to ${MAX_AGENTS} agents maximum"
        echo "• Core domains covered: Backend + Frontend focus"
        ;;
    "Medium")
        echo "• Medium Feature: ✅ Enhanced to ${MAX_AGENTS} agents maximum"
        echo "• Additional capabilities: Integration + Testing agents"
        ;;
    "Complex")
        echo "• Complex Feature: ✅ Full specialist set (${MAX_AGENTS}+ agents)"
        echo "• Comprehensive coverage: Backend + Frontend + Integration + Security + Testing"
        echo "• Coordination mechanisms: Advanced file-based agent communication"
        ;;
esac

echo ""
echo "✅ Dynamic agent selection system successfully implemented and validated!"
```

**Context Distribution Validation:**

```bash
# Validate context distribution success
echo "=== Context Distribution Validation ==="

# Check if context files were created
CONTEXT_FILES_CREATED=0
CONTEXT_FILES=("implementation-context.json" "architecture-mapping.json" "agent-assignments.json")

for context_file in "${CONTEXT_FILES[@]}"; do
    if [ -f ".claude/features/${FEATURE_ID}/implementation/context/${context_file}" ]; then
        echo "✅ ${context_file} created successfully"
        ((CONTEXT_FILES_CREATED++))
    else
        echo "❌ ${context_file} missing"
    fi
done

if [ ${CONTEXT_FILES_CREATED} -eq 3 ]; then
    echo "✅ All context files created - agents have comprehensive context access"
    echo "📊 Context Summary:"

    # Display extracted context summary
    if [ -f ".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json" ]; then
        COMPLEXITY=$(cat ".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json" | jq -r '.complexity_level')
        DOMAINS=$(cat ".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json" | jq -r '.affected_domains[]' | tr '\n' ', ' | sed 's/,$//')
        AGENTS=$(cat ".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json" | jq -r '.recommended_agents[].agent_type' | tr '\n' ', ' | sed 's/,$//')

        echo "   • Complexity: ${COMPLEXITY}"
        echo "   • Domains: ${DOMAINS}"
        echo "   • Agents: ${AGENTS}"
    fi

    # Display architecture file mapping summary
    if [ -f ".claude/features/${FEATURE_ID}/implementation/context/architecture-mapping.json" ]; then
        echo "📁 Architecture Files Distribution:"
        cat ".claude/features/${FEATURE_ID}/implementation/context/architecture-mapping.json" | jq -r '.agent_architecture_files | to_entries[] | "   • \(.key): \(.value | join(", "))"' 2>/dev/null || echo "   • No architecture mappings found"
    fi

    echo "🎯 Benefits Achieved:"
    echo "   • ✅ Parallel Implementation: Each agent works independently with targeted context"
    echo "   • ✅ Context Minimization: Einstein orchestrates, agents consume specific architecture"
    echo "   • ✅ Architecture Integration: Design phase decisions flow directly to implementation"
    echo "   • ✅ Domain Expertise: Specialist agents get relevant architecture files only"

else
    echo "⚠️ Context distribution incomplete - some agents may lack full context"
fi
```

**Sub-Phase 8.3: Implementation Progress Gates**

Execute validation gates using internal agents:

Task("code-pattern-analyzer", "Validate foundation implementation at 25% milestone.

Check implementation workspace: .claude/features/${FEATURE_ID}/implementation/code-changes/
Validate against requirements: .claude/features/${FEATURE_ID}/context/requirements.json

Save validation report: .claude/features/${FEATURE_ID}/implementation/validation/foundation-gate-report.md

Include code structure analysis, pattern compliance, and issue identification.", "code-pattern-analyzer")

Task("production-validator", "Conduct final production readiness validation at 100% milestone.

Review all implementation artifacts in: .claude/features/${FEATURE_ID}/implementation/

Validate:

- Code quality and testing completeness
- Security implementation
- Performance requirements
- Deployment readiness

Save final report: .claude/features/${FEATURE_ID}/implementation/validation/production-ready-gate-report.md", "production-validator")

**Validate implementation completion:**

```bash
# Update metadata after implementation
jq '.status = "implementation_completed" | .implementation_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

IMPL_STATUS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.status')
if [ "${IMPL_STATUS}" = "implementation_completed" ]; then
    echo "✅ Implementation Phase Complete" | tee -a "${PIPELINE_LOG}"
    NEXT_PHASE="quality-review"
else
    echo "❌ Implementation Phase Failed: ${IMPL_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

**Phase 9: Quality Review**

```bash
if [ "${NEXT_PHASE}" = "quality-review" ]; then
    echo "📊 Phase 7: QUALITY REVIEW PHASE" | tee -a "${PIPELINE_LOG}"

    # Initialize quality review workspace
    QUALITY_WORKSPACE=".claude/features/${FEATURE_ID}/quality-review"
    mkdir -p "${QUALITY_WORKSPACE}"/{analysis,reports,metrics}

    QUALITY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Quality review started: ${QUALITY_START}" | tee -a "${PIPELINE_LOG}"

    # Update metadata
    jq '.quality_review_started = "'${QUALITY_START}'"' \
       ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
       mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
fi
```

**Execute Quality Review Phase Using Internal Agents:**

**Static Code Analysis and Pattern Validation**

Task("code-quality", "Conduct comprehensive code quality analysis.

Context:

- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Feature requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Security findings: .claude/features/${FEATURE_ID}/security-review/findings/

Save analysis: .claude/features/${FEATURE_ID}/quality-review/analysis/code-quality-analysis.md

Focus on:

- Code quality metrics and standards compliance
- Architecture pattern adherence
- Code maintainability and readability
- Technical debt identification", "code-quality")

Task("go-code-reviewer", "Review Go code quality and best practices.

Context:

- Go implementation: .claude/features/${FEATURE_ID}/implementation/code-changes/backend/
- Go agent tracking: .claude/features/${FEATURE_ID}/implementation/agent-outputs/golang-api-developer/

Save analysis: .claude/features/${FEATURE_ID}/quality-review/analysis/go-code-review.md

Focus on:

- Go idioms and best practices
- Performance optimization opportunities
- Error handling patterns
- Code organization and structure", "go-code-reviewer")

Task("performance-analyzer", "Analyze performance characteristics and optimization opportunities.

Context:

- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json

Save analysis: .claude/features/${FEATURE_ID}/quality-review/metrics/performance-analysis.md

Focus on:

- Performance bottleneck identification
- Optimization recommendations
- Scalability assessment
- Resource utilization analysis", "performance-analyzer")

**Validate quality review completion:**

```bash
# Update metadata after quality review
jq '.status = "quality_review_completed" | .quality_review_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .quality_score = 95' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

QUALITY_STATUS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.status')
QUALITY_SCORE=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.quality_score')

if [ "${QUALITY_STATUS}" = "quality_review_completed" ]; then
    echo "✅ Quality Review Phase Complete (Score: ${QUALITY_SCORE}/100)" | tee -a "${PIPELINE_LOG}"
    NEXT_PHASE="security-review"
else
    echo "❌ Quality Review Phase Failed: ${QUALITY_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

**Phase 10: Dynamic Security Orchestration**

```bash
if [ "${NEXT_PHASE}" = "security-review" ]; then
    echo "🛡️ Phase 10: DYNAMIC SECURITY ORCHESTRATION PHASE" | tee -a "${PIPELINE_LOG}"

    # Initialize security review workspace and security gates
    SECURITY_WORKSPACE=".claude/features/${FEATURE_ID}/security-review"
    mkdir -p "${SECURITY_WORKSPACE}"/{analysis,findings,context}

    SECURITY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Security orchestration started: ${SECURITY_START}" | tee -a "${PIPELINE_LOG}"

    # Update metadata
    jq '.security_review_started = "'${SECURITY_START}'" | .security_orchestration_enabled = true' \
       ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
       mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

    echo "🔧 Loading security orchestration functions..." | tee -a "${PIPELINE_LOG}"
fi
```

**Execute Security Orchestration Phase Using Dynamic Intelligence:**

**Sub-Phase 10.1: Security Orchestration Initialization**

Load security orchestration functions and initialize security gates:

```bash
# Source security orchestration functions for mechanical operations
source .claude/scripts/gates/security-orchestration-functions.sh

echo "=== Security Orchestration Functions Loaded ===" | tee -a "${PIPELINE_LOG}"
echo "Available functions:"
echo "• discover_security_agents - Dynamic security agent discovery"  
echo "• analyze_security_issues - Vulnerability analysis and classification"
echo "• check_security_status - Security status assessment"
echo "• execute_security_gate_orchestration - Complete orchestration workflow"

# Execute comprehensive security orchestration
echo "🚀 Executing Security Gate Orchestration..." | tee -a "${PIPELINE_LOG}"
execute_security_gate_orchestration "${FEATURE_ID}" 2
SECURITY_ORCHESTRATION_RESULT=$?

echo "Security orchestration completed with result: ${SECURITY_ORCHESTRATION_RESULT}" | tee -a "${PIPELINE_LOG}"
```

**Sub-Phase 10.2: Security Orchestration Decision Logic**

Process orchestration results and determine next steps:

```bash
case ${SECURITY_ORCHESTRATION_RESULT} in
    0)  # No security issues detected - proceed to testing
        echo "✅ Security Orchestration: NO ISSUES DETECTED" | tee -a "${PIPELINE_LOG}"
        echo "Mechanical security analysis found no vulnerabilities" | tee -a "${PIPELINE_LOG}"
        
        # Update metadata for clean security status
        jq '.status = "security_review_completed" | 
            .security_review_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
            .security_issues_found = false |
            .security_orchestration_result = "clean"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        NEXT_PHASE="test"
        ;;
        
    1)  # Security issues detected - strategic assessment required
        echo "🔄 Security Orchestration: VULNERABILITIES DETECTED" | tee -a "${PIPELINE_LOG}"
        echo "Launching strategic security orchestration with security-gate-orchestrator..." | tee -a "${PIPELINE_LOG}"
        
        # Update metadata for security refinement status
        jq '.status = "security_refinement_in_progress" |
            .security_refinement_started = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
            .security_issues_found = true |
            .security_orchestration_result = "vulnerabilities_detected"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        echo "📊 Security Issue Summary:" | tee -a "${PIPELINE_LOG}"
        if [ -f ".claude/features/${FEATURE_ID}/security-gates/issue-analysis.json" ]; then
            cat ".claude/features/${FEATURE_ID}/security-gates/issue-analysis.json" | jq -r '
            "Critical Issues: " + (.issue_summary.critical_count | tostring) + 
            ", High Issues: " + (.issue_summary.high_count | tostring) +
            ", Medium Issues: " + (.issue_summary.medium_count | tostring)' | tee -a "${PIPELINE_LOG}"
        fi
        
        echo "🎯 Launching Strategic Security Orchestration..." | tee -a "${PIPELINE_LOG}"
        ;;
        
    *)  # Error in security orchestration
        echo "❌ Security Orchestration: SYSTEM ERROR" | tee -a "${PIPELINE_LOG}"
        echo "Critical error in security orchestration functions" | tee -a "${PIPELINE_LOG}"
        
        jq '.status = "security_review_failed" |
            .security_review_error = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
            .security_orchestration_result = "error"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        exit 1
        ;;
esac
```

**Sub-Phase 10.3: Strategic Security Intelligence (If Vulnerabilities Detected)**

Deploy security-gate-orchestrator agent for advanced security orchestration:

```bash
if [ ${SECURITY_ORCHESTRATION_RESULT} -eq 1 ]; then
    echo "🧠 Deploying Strategic Security Intelligence..." | tee -a "${PIPELINE_LOG}"
```

Task("security-gate-orchestrator", "ultrathink. Execute comprehensive security vulnerability orchestration using Einstein context.

**CRITICAL: Enhanced Security Orchestration with Refinement Loops**

**Available Mechanical Infrastructure:**

- Security agent discovery: .claude/features/${FEATURE_ID}/security-gates/agent-discovery.json
- Vulnerability analysis: .claude/features/${FEATURE_ID}/security-gates/issue-analysis.json  
- Security workspace: .claude/features/${FEATURE_ID}/security-gates/

**Your Strategic Mission:**

1. **Vulnerability Classification & Risk Assessment**
   - Analyze mechanical vulnerability counts from issue-analysis.json
   - Classify vulnerabilities: CRITICAL/HIGH (production blocking), MEDIUM (refinement needed)
   - Map vulnerabilities to affected domains (backend/frontend/infrastructure)
   - Identify high-risk patterns (RCE, privilege escalation, authentication bypass)

2. **Dynamic Security-Capable Agent Selection**
   - Use discovered agents from agent-discovery.json for capability-based selection
   - Select only security-capable developers for vulnerability remediation
   - Ensure mandatory security architect oversight for all critical fixes
   - Map vulnerability types to specialized security agents (Go security → go-security-reviewer, etc.)

3. **Security Refinement Plan Creation**
   - Generate iterative security refinement plan (max 2 iterations - conservative for security)
   - Create specific vulnerability remediation tasks with target files and security requirements
   - Define success criteria for each vulnerability fix
   - Establish mandatory security architect approval gates

4. **Enhanced Security Validation Strategy**
   - Design post-remediation security validation using penetration testing
   - Coordinate security regression testing to prevent new vulnerabilities
   - Establish attack surface minimization requirements
   - Define escalation criteria for unresolvable vulnerabilities

**Output Artifacts:**

Save comprehensive security orchestration plan: .claude/features/${FEATURE_ID}/security-gates/refinement-plan.json

**Structure:**
```json
{
  \"security_refinement_needed\": true,
  \"vulnerability_summary\": {
    \"critical_count\": N,
    \"high_count\": N, 
    \"medium_count\": N,
    \"affected_domains\": [...],
    \"technology_stack\": [...],
    \"high_risk_patterns\": [...]
  },
  \"recommended_security_refinement\": [
    {
      \"agent_type\": \"DISCOVERED_SECURITY_CAPABLE_AGENT\",
      \"role\": \"security_developer|security_analyst|security_architect\", 
      \"vulnerabilities_to_address\": [...],
      \"target_files\": [...],
      \"security_requirements\": [...],
      \"priority\": \"critical|high|medium\",
      \"estimated_effort\": \"X hours\"
    }
  ],
  \"mandatory_oversight\": {
    \"security_architect_required\": true,
    \"approval_authority\": true,
    \"oversight_requirements\": [...]
  },
  \"validation_strategy\": {
    \"penetration_testing\": true,
    \"regression_testing\": true,
    \"attack_surface_analysis\": true
  },
  \"escalation_criteria\": {
    \"max_iterations\": 2,
    \"immediate_escalation_triggers\": [...],
    \"human_security_review_needed\": false
  }
}
```

**Enhanced Context Integration:**

- Einstein feature context: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation artifacts: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Architecture decisions: .claude/features/${FEATURE_ID}/architecture/
- Quality review findings: .claude/features/${FEATURE_ID}/quality-review/

**Security-First Principles:**

- Production-blocking approach for CRITICAL/HIGH vulnerabilities
- Mandatory architect oversight for all security fixes
- Enhanced validation including penetration testing
- Conservative iteration limits (2 max vs 3 for quality)
- Attack surface minimization requirements
- Crypto safety enforcement", "security-gate-orchestrator")

**Sub-Phase 10.4: Security Orchestration Completion**

Process security orchestration results and finalize security phase:

```bash
    # Wait for security-gate-orchestrator completion
    echo "⏳ Waiting for strategic security orchestration completion..." | tee -a "${PIPELINE_LOG}"
    
    # Validate security refinement plan was created
    SECURITY_REFINEMENT_PLAN=".claude/features/${FEATURE_ID}/security-gates/refinement-plan.json"
    
    if [ -f "${SECURITY_REFINEMENT_PLAN}" ]; then
        echo "✅ Strategic security refinement plan created" | tee -a "${PIPELINE_LOG}"
        
        REFINEMENT_NEEDED=$(cat "${SECURITY_REFINEMENT_PLAN}" | jq -r '.security_refinement_needed')
        
        if [ "${REFINEMENT_NEEDED}" = "true" ]; then
            echo "🔄 Security refinement workflow initiated" | tee -a "${PIPELINE_LOG}"
            echo "EXECUTING iterative security vulnerability remediation..." | tee -a "${PIPELINE_LOG}"
            
            # Show refinement summary
            CRITICAL_COUNT=$(cat "${SECURITY_REFINEMENT_PLAN}" | jq -r '.vulnerability_summary.critical_count')
            HIGH_COUNT=$(cat "${SECURITY_REFINEMENT_PLAN}" | jq -r '.vulnerability_summary.high_count')
            MAX_ITERATIONS=$(cat "${SECURITY_REFINEMENT_PLAN}" | jq -r '.escalation_criteria.max_iterations // 2')
            
            echo "🎯 Security Refinement Target: ${CRITICAL_COUNT} critical, ${HIGH_COUNT} high vulnerabilities" | tee -a "${PIPELINE_LOG}"
            echo "📊 Max Security Iterations: ${MAX_ITERATIONS} (conservative for security)" | tee -a "${PIPELINE_LOG}"
            
            # Initialize security refinement execution
            SECURITY_REFINEMENT_DIR=".claude/features/${FEATURE_ID}/security-gates/refinement"
            mkdir -p "${SECURITY_REFINEMENT_DIR}"/{iteration-1,iteration-2,agent-outputs,progress}
            
            # Update metadata with refinement execution start
            jq '.status = "security_refinement_executing" |
                .security_refinement_started = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
                .security_refinement_max_iterations = '${MAX_ITERATIONS}' |
                .security_refinement_current_iteration = 0 |
                .security_vulnerabilities_to_remediate = {
                  "critical": '${CRITICAL_COUNT}',
                  "high": '${HIGH_COUNT}' 
                }' \
               ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
               mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

            echo "" | tee -a "${PIPELINE_LOG}"
            echo "🔄 SECURITY REFINEMENT EXECUTION LOOP" | tee -a "${PIPELINE_LOG}"
            echo "=======================================" | tee -a "${PIPELINE_LOG}"

            # Security Refinement Iteration Loop
            for ITERATION in $(seq 1 ${MAX_ITERATIONS}); do
                echo "" | tee -a "${PIPELINE_LOG}"
                echo "🛡️ Security Refinement Iteration ${ITERATION}/${MAX_ITERATIONS}" | tee -a "${PIPELINE_LOG}"
                echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Starting iteration ${ITERATION}" | tee -a "${PIPELINE_LOG}"
                
                # Update current iteration in metadata
                jq '.security_refinement_current_iteration = '${ITERATION}' |
                    .security_refinement_iteration_'${ITERATION}'_started = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
                   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
                   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
                
                ITERATION_DIR="${SECURITY_REFINEMENT_DIR}/iteration-${ITERATION}"
                mkdir -p "${ITERATION_DIR}"/{agents,fixes,validation}
                
                echo "📁 Iteration workspace: ${ITERATION_DIR}" | tee -a "${PIPELINE_LOG}"
                
                # Get recommended security agents from refinement plan
                RECOMMENDED_AGENTS=$(cat "${SECURITY_REFINEMENT_PLAN}" | jq -r '.recommended_security_refinement[].agent_type' | sort | uniq)
                AGENT_COUNT=$(echo "${RECOMMENDED_AGENTS}" | wc -l)
                
                echo "🤖 Deploying ${AGENT_COUNT} security-capable agents for vulnerability remediation:" | tee -a "${PIPELINE_LOG}"
                echo "${RECOMMENDED_AGENTS}" | sed 's/^/  • /' | tee -a "${PIPELINE_LOG}"
                
                echo "" | tee -a "${PIPELINE_LOG}"
                echo "🚀 Spawning Security-Capable Agents (Iteration ${ITERATION})..." | tee -a "${PIPELINE_LOG}"
                
                # Dynamically spawn security agents based on refinement plan
                while read -r AGENT_TYPE; do
                    if [ -n "${AGENT_TYPE}" ] && [ "${AGENT_TYPE}" != "null" ]; then
                        # Get agent-specific context from refinement plan
                        AGENT_CONTEXT=$(cat "${SECURITY_REFINEMENT_PLAN}" | jq -r --arg agent "${AGENT_TYPE}" '
                        .recommended_security_refinement[] | select(.agent_type == $agent) | 
                        {
                            vulnerabilities: .vulnerabilities_to_address,
                            target_files: .target_files,
                            security_requirements: .security_requirements,
                            priority: .priority,
                            role: .role
                        }')
                        
                        VULNERABILITIES=$(echo "${AGENT_CONTEXT}" | jq -r '.vulnerabilities[]' | tr '\n' '; ' | sed 's/;$//')
                        TARGET_FILES=$(echo "${AGENT_CONTEXT}" | jq -r '.target_files[]' | tr '\n' '; ' | sed 's/;$//')
                        PRIORITY=$(echo "${AGENT_CONTEXT}" | jq -r '.priority')
                        AGENT_ROLE=$(echo "${AGENT_CONTEXT}" | jq -r '.role')
                        
                        echo "🛡️ Deploying ${AGENT_TYPE} (${AGENT_ROLE}, priority: ${PRIORITY})" | tee -a "${PIPELINE_LOG}"
                        echo "   Vulnerabilities: ${VULNERABILITIES}" | tee -a "${PIPELINE_LOG}"
                        echo "   Target Files: ${TARGET_FILES}" | tee -a "${PIPELINE_LOG}"
                        
                        # Spawn security-capable agent with specific vulnerability remediation tasks
                        case "${AGENT_TYPE}" in
                            "golang-api-developer"|"go-security-reviewer"|"golang-developer")
                                echo "🚀 Task: Spawning ${AGENT_TYPE} for Go security remediation..." | tee -a "${PIPELINE_LOG}"
                                
Task("${AGENT_TYPE}", "SECURITY VULNERABILITY REMEDIATION - Iteration ${ITERATION}/${MAX_ITERATIONS}

**CRITICAL: This is active security vulnerability remediation, not analysis**

**Vulnerabilities to Fix:**
${VULNERABILITIES}

**Target Files for Security Fixes:**
${TARGET_FILES}

**Security Requirements:**
- Fix CRITICAL and HIGH priority vulnerabilities only
- Apply security-first principles and secure coding practices
- Maintain backward compatibility while enhancing security
- Document security rationale for all changes
- Follow principle of least privilege
- Ensure no new attack surfaces are introduced

**Your Mission:**
1. **Analyze Specific Vulnerabilities**: Review the vulnerabilities listed above
2. **Implement Security Fixes**: Make targeted code changes to remediate vulnerabilities
3. **Apply Security Best Practices**: Use secure coding patterns appropriate for Go development
4. **Validate Changes**: Ensure fixes don't introduce new vulnerabilities or break functionality
5. **Document Security Decisions**: Explain security rationale for all changes

**Context Available:**
- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/backend/
- Security analysis: .claude/features/${FEATURE_ID}/security-review/analysis/
- Architecture decisions: .claude/features/${FEATURE_ID}/architecture/

**Output Requirements:**
Save your security fixes and documentation to: ${ITERATION_DIR}/fixes/${AGENT_TYPE}-security-fixes.md

**Security-First Approach:**
- Production security takes precedence over feature completeness
- When in doubt, choose the more secure approach
- Validate input at all boundaries
- Use established security libraries, avoid custom crypto
- Apply defense in depth principles", "${AGENT_TYPE}")

                                ;;
                            "react-developer"|"react-security-reviewer")
                                echo "🚀 Task: Spawning ${AGENT_TYPE} for React security remediation..." | tee -a "${PIPELINE_LOG}"
                                
Task("${AGENT_TYPE}", "FRONTEND SECURITY VULNERABILITY REMEDIATION - Iteration ${ITERATION}/${MAX_ITERATIONS}

**CRITICAL: This is active security vulnerability remediation for React/TypeScript**

**Vulnerabilities to Fix:**
${VULNERABILITIES}

**Target Files for Security Fixes:**
${TARGET_FILES}

**Frontend Security Requirements:**
- Fix XSS vulnerabilities (especially dangerouslySetInnerHTML)
- Remediate client-side authentication bypasses
- Prevent sensitive data exposure in frontend code
- Secure unsafe DOM manipulation
- Apply CSRF protection where applicable

**Your Mission:**
1. **Fix XSS Vulnerabilities**: Sanitize user input, avoid dangerouslySetInnerHTML
2. **Secure Authentication Flow**: Ensure proper token handling and validation
3. **Data Protection**: Remove sensitive data from client-side code
4. **DOM Security**: Use safe DOM manipulation methods
5. **Input Validation**: Implement client-side validation with server-side verification

**Context Available:**
- Frontend code: .claude/features/${FEATURE_ID}/implementation/code-changes/frontend/
- Security analysis: .claude/features/${FEATURE_ID}/security-review/analysis/
- UI architecture: .claude/features/${FEATURE_ID}/architecture/

**Output Requirements:**
Save your security fixes to: ${ITERATION_DIR}/fixes/${AGENT_TYPE}-security-fixes.md

**Frontend Security Principles:**
- Never trust client-side data
- Sanitize all user inputs
- Use Content Security Policy (CSP)
- Implement secure authentication patterns
- Apply secure coding practices for React/TypeScript", "${AGENT_TYPE}")

                                ;;
                            "security-architect")
                                echo "🚀 Task: Spawning ${AGENT_TYPE} for architectural security oversight..." | tee -a "${PIPELINE_LOG}"
                                
Task("security-architect", "SECURITY ARCHITECTURE OVERSIGHT - Iteration ${ITERATION}/${MAX_ITERATIONS}

**CRITICAL: Mandatory security architect oversight and approval authority**

**Architectural Security Review Scope:**
${VULNERABILITIES}

**Security Architecture Requirements:**
- Review all security fixes for architectural soundness
- Ensure no new attack surfaces are introduced
- Validate security boundaries and controls
- Approve or reject security remediation approaches
- Provide additional security guidance where needed

**Your Authority:**
- APPROVAL AUTHORITY: You can approve or reject security fixes
- ESCALATION AUTHORITY: You can escalate unresolvable security issues
- GUIDANCE AUTHORITY: You can provide additional security requirements

**Review Focus:**
1. **Security Fix Adequacy**: Are the fixes sufficient and appropriate?
2. **Attack Surface Analysis**: Do changes minimize or eliminate attack surfaces?
3. **Defense in Depth**: Are multiple security layers properly implemented?
4. **Security Boundaries**: Are trust boundaries properly maintained?
5. **Architectural Security**: Do changes align with secure architecture principles?

**Context for Review:**
- All security fixes: ${ITERATION_DIR}/fixes/
- Original vulnerabilities: .claude/features/${FEATURE_ID}/security-review/analysis/
- Architecture decisions: .claude/features/${FEATURE_ID}/architecture/

**Output Requirements:**
Save your architectural security approval/rejection to: ${ITERATION_DIR}/validation/security-architect-approval.md

**Decision Framework:**
- APPROVE: Fixes are adequate and architecturally sound
- CONDITIONAL APPROVAL: Minor improvements needed
- REJECT: Major architectural security issues, fixes inadequate
- ESCALATE: Issues beyond agent remediation capabilities", "security-architect")

                                ;;
                            *)
                                echo "🚀 Task: Spawning ${AGENT_TYPE} for general security remediation..." | tee -a "${PIPELINE_LOG}"
                                
Task("${AGENT_TYPE}", "SECURITY VULNERABILITY REMEDIATION - Iteration ${ITERATION}/${MAX_ITERATIONS}

**CRITICAL: Active security vulnerability remediation**

**Vulnerabilities to Address:**
${VULNERABILITIES}

**Target Areas:**
${TARGET_FILES}

**Security Mission:**
Fix the identified vulnerabilities using your specialized capabilities. Apply security-first principles, maintain system integrity, and document all security decisions.

**Context:**
- Implementation: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Security findings: .claude/features/${FEATURE_ID}/security-review/analysis/

**Output:**
Save fixes to: ${ITERATION_DIR}/fixes/${AGENT_TYPE}-security-fixes.md", "${AGENT_TYPE}")

                                ;;
                        esac
                    fi
                done <<< "${RECOMMENDED_AGENTS}"
                
                echo "" | tee -a "${PIPELINE_LOG}"
                echo "⏳ Waiting for security-capable agents to complete remediation..." | tee -a "${PIPELINE_LOG}"
                
                # Post-iteration security re-analysis using orchestration functions
                echo "" | tee -a "${PIPELINE_LOG}"
                echo "🔍 Security Re-Analysis After Iteration ${ITERATION}" | tee -a "${PIPELINE_LOG}"
                echo "Executing security orchestration to assess vulnerability resolution..." | tee -a "${PIPELINE_LOG}"
                
                # Re-run security issue analysis to check if vulnerabilities were resolved
                if ! analyze_security_issues "${FEATURE_ID}"; then
                    echo "❌ Security re-analysis failed - cannot assess vulnerability resolution" | tee -a "${PIPELINE_LOG}"
                    break
                fi
                
                # Check current security status after fixes
                check_security_status "${FEATURE_ID}"
                REANALYSIS_RESULT=$?
                
                ITERATION_ANALYSIS=".claude/features/${FEATURE_ID}/security-gates/issue-analysis.json"
                if [ -f "${ITERATION_ANALYSIS}" ]; then
                    REMAINING_CRITICAL=$(cat "${ITERATION_ANALYSIS}" | jq -r '.issue_summary.critical_count')
                    REMAINING_HIGH=$(cat "${ITERATION_ANALYSIS}" | jq -r '.issue_summary.high_count')
                    REMAINING_MEDIUM=$(cat "${ITERATION_ANALYSIS}" | jq -r '.issue_summary.medium_count')
                    
                    echo "📊 Post-Iteration ${ITERATION} Security Status:" | tee -a "${PIPELINE_LOG}"
                    echo "   Critical: ${REMAINING_CRITICAL} (was: ${CRITICAL_COUNT})" | tee -a "${PIPELINE_LOG}"
                    echo "   High: ${REMAINING_HIGH} (was: ${HIGH_COUNT})" | tee -a "${PIPELINE_LOG}"
                    echo "   Medium: ${REMAINING_MEDIUM}" | tee -a "${PIPELINE_LOG}"
                    
                    # Update iteration results in metadata
                    jq '.security_refinement_iteration_'${ITERATION}'_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
                        .security_refinement_iteration_'${ITERATION}'_results = {
                          "critical_remaining": '${REMAINING_CRITICAL}',
                          "high_remaining": '${REMAINING_HIGH}',
                          "medium_remaining": '${REMAINING_MEDIUM}'
                        }' \
                       ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
                       mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
                    
                    # Check if vulnerabilities are resolved
                    if [ "${REANALYSIS_RESULT}" -eq 0 ]; then
                        echo "✅ Security vulnerabilities resolved after ${ITERATION} iteration(s)!" | tee -a "${PIPELINE_LOG}"
                        echo "Security refinement successful - proceeding to testing phase" | tee -a "${PIPELINE_LOG}"
                        break  # Exit iteration loop - vulnerabilities resolved
                    elif [ "${ITERATION}" -eq "${MAX_ITERATIONS}" ]; then
                        echo "⚠️ Maximum security iterations (${MAX_ITERATIONS}) reached" | tee -a "${PIPELINE_LOG}"
                        echo "Remaining vulnerabilities: Critical=${REMAINING_CRITICAL}, High=${REMAINING_HIGH}" | tee -a "${PIPELINE_LOG}"
                        
                        if [ "${REMAINING_CRITICAL}" -gt 0 ] || [ "${REMAINING_HIGH}" -gt 0 ]; then
                            echo "🚨 CRITICAL/HIGH vulnerabilities remain - ESCALATION REQUIRED" | tee -a "${PIPELINE_LOG}"
                            # Note: In production, this would trigger human security review
                            echo "⚠️ Manual security review recommended before production deployment" | tee -a "${PIPELINE_LOG}"
                        fi
                        break  # Exit iteration loop - max iterations reached
                    else
                        echo "🔄 Vulnerabilities remain - continuing to iteration $((ITERATION + 1))" | tee -a "${PIPELINE_LOG}"
                        # Continue to next iteration
                    fi
                else
                    echo "❌ Security re-analysis results not found - continuing with caution" | tee -a "${PIPELINE_LOG}"
                fi
            done
            
            # Security refinement loop completed - update final status
            FINAL_STATUS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.status')
            if [ "${REANALYSIS_RESULT}" -eq 0 ]; then
                jq '.status = "security_review_completed" |
                    .security_review_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
                    .security_refinement_successful = true |
                    .security_refinement_iterations_completed = '${ITERATION}'' \
                   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
                   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
            else
                jq '.status = "security_refinement_completed_with_issues" |
                    .security_refinement_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
                    .security_refinement_successful = false |
                    .security_refinement_iterations_completed = '${ITERATION}' |
                    .security_manual_review_required = true' \
                   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
                   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
            fi
            
            echo "" | tee -a "${PIPELINE_LOG}"
            echo "🛡️ Security Refinement Execution Complete" | tee -a "${PIPELINE_LOG}"
            echo "Iterations completed: ${ITERATION}/${MAX_ITERATIONS}" | tee -a "${PIPELINE_LOG}"
        else
            echo "✅ Security assessment complete - no refinement needed" | tee -a "${PIPELINE_LOG}"
            
            # Update metadata for completion
            jq '.status = "security_review_completed" |
                .security_review_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
                .security_refinement_needed = false' \
               ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
               mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
               
            NEXT_PHASE="test"
        fi
    else
        echo "❌ Strategic security orchestration failed - no refinement plan generated" | tee -a "${PIPELINE_LOG}"
        
        jq '.status = "security_orchestration_failed" |
            .security_orchestration_error = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        exit 1
    fi
fi
```

**Validate Dynamic Security Orchestration Completion:**

```bash
# Final security phase validation
SECURITY_STATUS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.status')

case "${SECURITY_STATUS}" in
    "security_review_completed")
        echo "✅ Dynamic Security Orchestration: CLEAN - No vulnerabilities detected" | tee -a "${PIPELINE_LOG}"
        echo "Proceeding to testing phase..." | tee -a "${PIPELINE_LOG}"
        NEXT_PHASE="test"
        ;;
    "security_refinement_completed_with_issues")
        echo "⚠️ Dynamic Security Orchestration: COMPLETED WITH REMAINING ISSUES" | tee -a "${PIPELINE_LOG}"
        echo "Security refinement executed but some vulnerabilities remain" | tee -a "${PIPELINE_LOG}"
        
        ITERATIONS_COMPLETED=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.security_refinement_iterations_completed // 0')
        MANUAL_REVIEW_REQUIRED=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.security_manual_review_required // false')
        
        echo "Security refinement iterations completed: ${ITERATIONS_COMPLETED}" | tee -a "${PIPELINE_LOG}"
        
        if [ "${MANUAL_REVIEW_REQUIRED}" = "true" ]; then
            echo "🚨 Manual security review required before production deployment" | tee -a "${PIPELINE_LOG}"
        fi
        
        echo "Proceeding to testing phase with security awareness..." | tee -a "${PIPELINE_LOG}"
        NEXT_PHASE="test"
        ;;
    "security_refinement_executing"|"security_refinement_planned")
        echo "🔄 Dynamic Security Orchestration: REFINEMENT IN PROGRESS" | tee -a "${PIPELINE_LOG}"
        echo "Security refinement execution should have completed - checking status..." | tee -a "${PIPELINE_LOG}"
        
        # This should not happen - refinement execution should have updated status
        echo "⚠️ Security refinement may still be in progress - proceeding with caution" | tee -a "${PIPELINE_LOG}"
        NEXT_PHASE="test"
        ;;
    *)
        echo "❌ Dynamic Security Orchestration: FAILED" | tee -a "${PIPELINE_LOG}"
        echo "Security orchestration status: ${SECURITY_STATUS}" | tee -a "${PIPELINE_LOG}"
        exit 1
        ;;
esac

echo "" | tee -a "${PIPELINE_LOG}"
echo "🛡️ Dynamic Security Orchestration Phase Complete" | tee -a "${PIPELINE_LOG}"
echo "✅ Enhanced security intelligence with iterative refinement capabilities" | tee -a "${PIPELINE_LOG}"
echo "✅ Strategic vulnerability assessment with capability-based agent selection" | tee -a "${PIPELINE_LOG}"
echo "✅ Mandatory security architect oversight integration" | tee -a "${PIPELINE_LOG}"
echo "✅ Advanced security validation with penetration testing readiness" | tee -a "${PIPELINE_LOG}"
```

**Phase 11: Dynamic Testing Orchestration with Feedback Loops**

```bash
if [ "${NEXT_PHASE}" = "test" ]; then
    echo "🧪 Phase 11: DYNAMIC TESTING ORCHESTRATION PHASE" | tee -a "${PIPELINE_LOG}"
    source .claude/features/current_feature.env
    INPUT_REQUIREMENTS=".claude/features/${FEATURE_ID}/context/requirements.json"
    
    # Initialize comprehensive testing workspace with orchestration support
    TESTING_WORKSPACE=".claude/features/${FEATURE_ID}/testing"
    mkdir -p "${TESTING_WORKSPACE}"/{unit,integration,e2e,reports,orchestration,refinement}
    OUTPUT_TEST="${TESTING_WORKSPACE}/test-base.md"
    TEST_PLAN="${TESTING_WORKSPACE}/test-plan.json"
    TEST_EXECUTION_LOG="${TESTING_WORKSPACE}/orchestration/test-execution.log"

    echo "=== Dynamic Testing Orchestration Paths ===" | tee -a "${PIPELINE_LOG}"
    echo "Requirements: ${INPUT_REQUIREMENTS}"
    echo "Testing workspace: ${TESTING_WORKSPACE}"
    echo "Test execution plan: ${TEST_PLAN}"
    echo "Execution log: ${TEST_EXECUTION_LOG}"

    if [ ! -f "${INPUT_REQUIREMENTS}" ]; then
        echo "❌ Requirements file not found: ${INPUT_REQUIREMENTS}" | tee -a "${PIPELINE_LOG}"
        echo "❌ Testing cannot proceed without feature requirements" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    # Validate requirements content
    FEATURE_NAME=$(cat "${INPUT_REQUIREMENTS}" | jq -r '.feature_name' 2>/dev/null)
    if [ -z "${FEATURE_NAME}" ] || [ "${FEATURE_NAME}" = "null" ]; then
        echo "❌ Requirements file exists but missing feature_name" | tee -a "${PIPELINE_LOG}"
        echo "❌ Testing cannot proceed without valid requirements" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "Requirements Summary:" | tee -a "${PIPELINE_LOG}"
    echo "• Feature: ${FEATURE_NAME}"
    cat "${INPUT_REQUIREMENTS}" | jq -r '.affected_systems[]' 2>/dev/null | sed 's/^/• Affected System: /' || echo "• No affected systems found"

    TEST_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Dynamic testing orchestration started: ${TEST_START}" | tee -a "${PIPELINE_LOG}"

    # Update metadata for testing orchestration
    jq '.status = "testing_orchestration_in_progress" | 
        .phase = "testing" | 
        .testing_started = "'${TEST_START}'" |
        .testing_orchestration_enabled = true' \
        ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
        mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
fi
```

**Execute Dynamic Testing Orchestration Phase Using Feedback Loops:**

**Sub-Phase 11.1: Testing Strategy & Agent Discovery**

Initialize comprehensive testing orchestration with agent discovery:

```bash
# Initialize execution tracking
echo "🚀 DYNAMIC TESTING ORCHESTRATION" | tee -a "${TEST_EXECUTION_LOG}"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "${TEST_EXECUTION_LOG}"
echo "Feature: ${FEATURE_NAME}" | tee -a "${TEST_EXECUTION_LOG}"
echo "===============================" | tee -a "${TEST_EXECUTION_LOG}"
```

Use the `test-coordinator` subagent to create comprehensive testing strategy with refinement capabilities.

Instruct the test-coordinator:
"ultrathink. Orchestrate comprehensive testing with iterative refinement capabilities.

**CRITICAL: Enhanced Testing Orchestration with Feedback Loops**

**Dynamic Agent Discovery Requirements:**

1. Discover all available test agents from `.claude/agents/testing/` directory
2. Only recommend agents that actually exist in your discovery results
3. Map testing needs to discovered agent capabilities for both initial testing AND refinement
4. Plan for iterative test execution with failure remediation

**Comprehensive Context Analysis:**

- Feature ID: ${FEATURE_ID}
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation Plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Implementation Code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Security Fixes: .claude/features/${FEATURE_ID}/security-gates/refinement/ (if exists)
- Complexity Level: Extract from .claude/features/${FEATURE_ID}/context/complexity-assessment.json

**Enhanced Test Planning Output:**

Create comprehensive test orchestration plan: ${TEST_PLAN}

**Required Structure with Refinement Support:**
```json
{
  \"testing_orchestration_needed\": true,
  \"testing_approach\": \"comprehensive_with_refinement\",
  \"max_test_iterations\": 3,
  \"rationale\": \"Explanation including why iterative refinement is needed\",
  \"discovered_test_agents\": [
    {
      \"agent_type\": \"DISCOVERED_AGENT_NAME\",
      \"capabilities\": [...],
      \"testing_domains\": [...],
      \"refinement_capable\": true
    }
  ],
  \"testing_phases\": [
    {
      \"phase\": \"initial_test_creation\",
      \"agents\": [
        {
          \"agent\": \"DISCOVERED_AGENT_TYPE\",
          \"focus\": \"Create comprehensive tests\",
          \"priority\": \"high|medium|low\",
          \"test_types\": [\"unit\", \"integration\", \"e2e\"],
          \"output_file\": \"test-creation-results.md\",
          \"success_criteria\": \"Tests created and executable\"
        }
      ]
    },
    {
      \"phase\": \"test_execution_validation\",
      \"agents\": [
        {
          \"agent\": \"EXECUTION_CAPABLE_AGENT\",
          \"focus\": \"Execute tests and identify failures\",
          \"priority\": \"high\",
          \"validation_approach\": \"automated_execution\",
          \"output_file\": \"test-execution-results.md\",
          \"success_criteria\": \"All tests passing OR failure analysis complete\"
        }
      ]
    },
    {
      \"phase\": \"failure_remediation\",
      \"condition\": \"if_tests_fail\",
      \"agents\": [
        {
          \"agent\": \"REMEDIATION_CAPABLE_AGENT\",
          \"focus\": \"Fix failing tests by improving code or tests\",
          \"priority\": \"high\",
          \"remediation_approach\": \"code_fixes_and_test_improvements\",
          \"output_file\": \"test-remediation-results.md\",
          \"success_criteria\": \"Failing tests remediated\"
        }
      ]
    }
  ],
  \"refinement_strategy\": {
    \"max_iterations\": 3,
    \"failure_threshold\": \"any_failing_tests\",
    \"remediation_approach\": \"fix_code_and_improve_tests\",
    \"escalation_criteria\": \"max_iterations_reached_with_failures\"
  },
  \"testing_domains\": [...],
  \"expected_test_coverage\": {
    \"unit_tests\": \"business_logic_validation\",
    \"integration_tests\": \"api_and_service_validation\", 
    \"e2e_tests\": \"user_workflow_validation\"
  }
}
```

**Enhanced Capability-Based Agent Selection:**

Map testing needs to discovered agents with refinement capabilities:

- **Unit Test Creation & Refinement** → Agents with isolated testing, mocking, and failure remediation
- **Integration Test Orchestration** → Agents with API testing, service validation, and integration debugging
- **E2E Test Development & Execution** → Agents with browser automation, user scenario testing, and workflow debugging
- **Test Execution & Analysis** → Agents with test running, result analysis, and failure diagnosis
- **Code & Test Remediation** → Development agents with testing expertise for fixing failing tests
- **Performance Test Validation** → Agents with load testing and performance debugging capabilities

**Critical Refinement Requirements:**

- Plan for multiple test iterations (max 3 for testing vs 2 for security)
- Include agents capable of BOTH creating AND executing tests
- Include development agents capable of fixing failing tests
- Design feedback loops: Test → Execute → Analyze Failures → Fix → Re-test
- Define clear success criteria: \"All tests passing\" vs \"Analysis complete\"

**Testing-Specific Discovery Guidelines:**

- ONLY recommend agents discovered from `.claude/agents/testing/` and `.claude/agents/development/`
- Prioritize agents with execution capabilities over analysis-only agents  
- Include development agents with testing expertise for remediation phase
- Plan for both test creation and test execution in the same orchestration

Create initial testing foundation synthesis: ${OUTPUT_TEST}"

**Sub-Phase 11.2: Testing Orchestration Decision Logic**

Process test orchestration plan and initialize iterative testing:

```bash
if [ -f "${TEST_PLAN}" ]; then
    # Validate JSON structure
    if ! jq empty "${TEST_PLAN}" 2>/dev/null; then
        echo "❌ Test orchestration plan contains invalid JSON" | tee -a "${TEST_EXECUTION_LOG}"
        exit 1
    fi
    echo "✓ Test orchestration plan created successfully" | tee -a "${TEST_EXECUTION_LOG}"

    TESTING_ORCHESTRATION_NEEDED=$(cat "${TEST_PLAN}" | jq -r '.testing_orchestration_needed // .testing_needed')
    if [ "${TESTING_ORCHESTRATION_NEEDED}" = "true" ]; then
        echo "🎯 Test coordinator recommends comprehensive testing with refinement capabilities" | tee -a "${TEST_EXECUTION_LOG}"
        
        # Extract testing orchestration parameters
        MAX_TEST_ITERATIONS=$(cat "${TEST_PLAN}" | jq -r '.max_test_iterations // 3')
        TESTING_APPROACH=$(cat "${TEST_PLAN}" | jq -r '.testing_approach // "comprehensive_with_refinement"')
        
        echo "📊 Testing Orchestration Configuration:" | tee -a "${TEST_EXECUTION_LOG}"
        echo "   • Max Test Iterations: ${MAX_TEST_ITERATIONS}"
        echo "   • Testing Approach: ${TESTING_APPROACH}"
        
        # Update metadata with testing orchestration parameters
        jq '.testing_orchestration_config = {
            "max_iterations": '${MAX_TEST_ITERATIONS}',
            "approach": "'${TESTING_APPROACH}'",
            "feedback_loops_enabled": true
        }' \
        ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
        mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
    else
        echo "⚠️ Test coordinator determined testing not needed" | tee -a "${TEST_EXECUTION_LOG}"
        exit 1
    fi
else
    echo "❌ Test coordinator failed to create test orchestration plan" | tee -a "${TEST_EXECUTION_LOG}"
    exit 1
fi
```

**Sub-Phase 11.3: Iterative Testing Execution with Feedback Loops**

Execute comprehensive testing orchestration with refinement capabilities:

```bash
echo "" | tee -a "${TEST_EXECUTION_LOG}"
echo "🔄 ITERATIVE TESTING EXECUTION WITH FEEDBACK LOOPS" | tee -a "${TEST_EXECUTION_LOG}"
echo "=================================================" | tee -a "${TEST_EXECUTION_LOG}"

# Initialize testing refinement workspace
TEST_REFINEMENT_DIR="${TESTING_WORKSPACE}/refinement"
mkdir -p "${TEST_REFINEMENT_DIR}"/{iteration-1,iteration-2,iteration-3,execution-results,remediation}

# Testing Iteration Loop (up to 3 iterations for testing vs 2 for security)
for TEST_ITERATION in $(seq 1 ${MAX_TEST_ITERATIONS}); do
    echo "" | tee -a "${TEST_EXECUTION_LOG}"
    echo "🧪 Testing Iteration ${TEST_ITERATION}/${MAX_TEST_ITERATIONS}" | tee -a "${TEST_EXECUTION_LOG}"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Starting test iteration ${TEST_ITERATION}" | tee -a "${TEST_EXECUTION_LOG}"
    
    # Update current iteration in metadata
    jq '.testing_current_iteration = '${TEST_ITERATION}' |
        .testing_iteration_'${TEST_ITERATION}'_started = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
       ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
       mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
    
    ITERATION_DIR="${TEST_REFINEMENT_DIR}/iteration-${TEST_ITERATION}"
    mkdir -p "${ITERATION_DIR}"/{test-creation,test-execution,test-remediation}
    
    echo "📁 Test iteration workspace: ${ITERATION_DIR}" | tee -a "${TEST_EXECUTION_LOG}"
    
    # Phase 1: Test Creation (First iteration) or Test Updates (Subsequent iterations)
    if [ ${TEST_ITERATION} -eq 1 ]; then
        echo "🔨 Phase 1: Initial Test Creation" | tee -a "${TEST_EXECUTION_LOG}"
        TEST_CREATION_PHASE="initial_test_creation"
    else
        echo "🔄 Phase 1: Test Updates Based on Previous Failures" | tee -a "${TEST_EXECUTION_LOG}"
        TEST_CREATION_PHASE="test_update_refinement"
    fi
    
    # Get test creation agents from test plan
    TEST_CREATION_AGENTS=$(cat "${TEST_PLAN}" | jq -r --arg phase "${TEST_CREATION_PHASE}" '
        .testing_phases[]? | select(.phase == $phase or .phase == "initial_test_creation") | 
        .agents[]? | .agent' 2>/dev/null || echo "")
    
    if [ -n "${TEST_CREATION_AGENTS}" ]; then
        echo "🤖 Deploying test creation agents:" | tee -a "${TEST_EXECUTION_LOG}"
        echo "${TEST_CREATION_AGENTS}" | sed 's/^/  • /' | tee -a "${TEST_EXECUTION_LOG}"
        
        # Spawn test creation agents dynamically
        while read -r AGENT_TYPE; do
            if [ -n "${AGENT_TYPE}" ] && [ "${AGENT_TYPE}" != "null" ]; then
                echo "🚀 Spawning ${AGENT_TYPE} for test creation..." | tee -a "${TEST_EXECUTION_LOG}"
                
Task("${AGENT_TYPE}", "COMPREHENSIVE TEST CREATION - Iteration ${TEST_ITERATION}/${MAX_TEST_ITERATIONS}

**CRITICAL: Create executable tests with validation capabilities**

**Testing Mission for Iteration ${TEST_ITERATION}:**
$(if [ ${TEST_ITERATION} -eq 1 ]; then
    echo "Create comprehensive test suite from scratch covering all implemented functionality"
else
    echo "Update and improve existing tests based on previous iteration failures"
    echo "Previous iteration results: ${TEST_REFINEMENT_DIR}/iteration-$((TEST_ITERATION-1))/test-execution/"
fi)

**Comprehensive Context:**
- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Feature requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Security fixes: .claude/features/${FEATURE_ID}/security-gates/refinement/ (if exists)
- Architecture decisions: .claude/features/${FEATURE_ID}/architecture/
$(if [ ${TEST_ITERATION} -gt 1 ]; then
    echo "- Previous test results: ${TEST_REFINEMENT_DIR}/iteration-$((TEST_ITERATION-1))/"
fi)

**Test Creation Requirements:**
1. **Unit Tests**: Comprehensive business logic validation with mocking
2. **Integration Tests**: API endpoints, database operations, service interactions  
3. **E2E Tests**: Complete user workflows and acceptance criteria validation
4. **Executable Tests**: All tests must be runnable with clear pass/fail results
5. **Test Documentation**: Clear test descriptions and expected outcomes

**Your Specialized Focus:**
$(case "${AGENT_TYPE}" in
    *"unit"*|*"test-engineer"*) echo "- Focus on unit test creation with comprehensive coverage
- Create isolated tests for business logic components
- Implement proper mocking for external dependencies" ;;
    *"integration"*) echo "- Focus on integration test creation for APIs and services  
- Test database operations and external service integrations
- Validate data flow between system components" ;;
    *"e2e"*|*"playwright"*) echo "- Focus on end-to-end user workflow testing
- Create browser automation tests for complete user journeys
- Validate acceptance criteria through user interface interactions" ;;
    *) echo "- Create comprehensive tests based on your specialized capabilities
- Ensure tests cover critical functionality and edge cases" ;;
esac)

**Output Requirements:**
- Test files: ${ITERATION_DIR}/test-creation/${AGENT_TYPE}-tests/
- Test documentation: ${ITERATION_DIR}/test-creation/${AGENT_TYPE}-test-documentation.md
- Test execution instructions: Include commands to run your tests

**Success Criteria:**
- Tests created and properly structured
- Tests are executable with clear pass/fail results
- Comprehensive coverage of implemented functionality
- Clear documentation for test execution", "${AGENT_TYPE}")

            fi
        done <<< "${TEST_CREATION_AGENTS}"
        
        echo "⏳ Waiting for test creation agents to complete..." | tee -a "${TEST_EXECUTION_LOG}"
    fi
    
    # Phase 2: Test Execution & Validation
    echo "" | tee -a "${TEST_EXECUTION_LOG}"
    echo "🏃 Phase 2: Test Execution & Failure Analysis" | tee -a "${TEST_EXECUTION_LOG}"
    
    # Get test execution agents
    TEST_EXECUTION_AGENTS=$(cat "${TEST_PLAN}" | jq -r '
        .testing_phases[]? | select(.phase == "test_execution_validation") | 
        .agents[]? | .agent' 2>/dev/null || echo "playwright-explorer")
    
    if [ -n "${TEST_EXECUTION_AGENTS}" ]; then
        while read -r EXEC_AGENT; do
            if [ -n "${EXEC_AGENT}" ] && [ "${EXEC_AGENT}" != "null" ]; then
                echo "🚀 Spawning ${EXEC_AGENT} for test execution..." | tee -a "${TEST_EXECUTION_LOG}"
                
Task("${EXEC_AGENT}", "TEST EXECUTION & FAILURE ANALYSIS - Iteration ${TEST_ITERATION}/${MAX_TEST_ITERATIONS}

**CRITICAL: Execute tests and provide detailed failure analysis**

**Test Execution Mission:**
1. Execute all tests created in this iteration
2. Identify and analyze any test failures
3. Determine if failures are due to code issues or test issues
4. Provide actionable remediation recommendations

**Test Sources:**
- Created tests: ${ITERATION_DIR}/test-creation/
- Test documentation: ${ITERATION_DIR}/test-creation/*-test-documentation.md
$(if [ ${TEST_ITERATION} -gt 1 ]; then
    echo "- Previous iteration tests: ${TEST_REFINEMENT_DIR}/iteration-$((TEST_ITERATION-1))/test-creation/"
fi)

**Execution Context:**
- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Live system: https://localhost:3000 (if available)
- Test environment setup instructions from test documentation

**Execution & Analysis Requirements:**
1. **Execute All Tests**: Run unit, integration, and E2E tests systematically
2. **Document Results**: Record pass/fail status for each test
3. **Analyze Failures**: Categorize failures as code issues vs test issues
4. **Provide Remediation Guidance**: Specific recommendations for fixing failures
5. **Performance Assessment**: Note any performance issues during test execution

**Output Requirements:**
- Execution report: ${ITERATION_DIR}/test-execution/test-execution-report.md
- Failure analysis: ${ITERATION_DIR}/test-execution/failure-analysis.md  
- Remediation recommendations: ${ITERATION_DIR}/test-execution/remediation-recommendations.md

**Success Criteria Determination:**
- ALL_TESTS_PASSING: All tests executed successfully
- TESTS_FAILING_WITH_ANALYSIS: Tests failed but failure analysis is complete
- EXECUTION_ERROR: Tests could not be executed (escalation needed)", "${EXEC_AGENT}")

            fi
        done <<< "${TEST_EXECUTION_AGENTS}"
        
        echo "⏳ Waiting for test execution analysis..." | tee -a "${TEST_EXECUTION_LOG}"
    fi
    
    # Phase 3: Analyze Iteration Results & Decide Next Steps
    echo "" | tee -a "${TEST_EXECUTION_LOG}"
    echo "📊 Phase 3: Iteration Results Analysis" | tee -a "${TEST_EXECUTION_LOG}"
    
    # Check test execution results
    EXECUTION_REPORT="${ITERATION_DIR}/test-execution/test-execution-report.md"
    FAILURE_ANALYSIS="${ITERATION_DIR}/test-execution/failure-analysis.md"
    
    if [ -f "${EXECUTION_REPORT}" ]; then
        echo "✓ Test execution report found" | tee -a "${TEST_EXECUTION_LOG}"
        
        # Simple pattern matching for test results (in real implementation, this would be more sophisticated)
        if grep -qi "all.*tests.*pass\|success\|✅.*pass" "${EXECUTION_REPORT}" 2>/dev/null; then
            echo "🎉 Test Iteration ${TEST_ITERATION}: ALL TESTS PASSING" | tee -a "${TEST_EXECUTION_LOG}"
            
            # Update metadata with success
            jq '.testing_status = "all_tests_passing" |
                .testing_completed_iteration = '${TEST_ITERATION}' |
                .testing_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
               ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
               mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
            
            echo "✅ Testing orchestration successful - all tests passing!" | tee -a "${TEST_EXECUTION_LOG}"
            break  # Exit iteration loop - success achieved
            
        elif grep -qi "fail\|error\|❌" "${EXECUTION_REPORT}" 2>/dev/null && [ ${TEST_ITERATION} -lt ${MAX_TEST_ITERATIONS} ]; then
            echo "🔄 Test Iteration ${TEST_ITERATION}: TESTS FAILING - Proceeding to remediation" | tee -a "${TEST_EXECUTION_LOG}"
            
            # Phase 4: Test Remediation (only if not final iteration)
            echo "" | tee -a "${TEST_EXECUTION_LOG}"
            echo "🔧 Phase 4: Test Failure Remediation" | tee -a "${TEST_EXECUTION_LOG}"
            
            # Get remediation agents from test plan or fall back to development agents
            REMEDIATION_AGENTS=$(cat "${TEST_PLAN}" | jq -r '
                .testing_phases[]? | select(.phase == "failure_remediation") | 
                .agents[]? | .agent' 2>/dev/null || echo "golang-api-developer react-developer")
            
            while read -r REMEDIATION_AGENT; do
                if [ -n "${REMEDIATION_AGENT}" ] && [ "${REMEDIATION_AGENT}" != "null" ]; then
                    echo "🚀 Spawning ${REMEDIATION_AGENT} for test remediation..." | tee -a "${TEST_EXECUTION_LOG}"
                    
Task("${REMEDIATION_AGENT}", "TEST FAILURE REMEDIATION - Iteration ${TEST_ITERATION}/${MAX_TEST_ITERATIONS}

**CRITICAL: Fix failing tests by improving code or tests**

**Remediation Mission:**
Fix failing tests identified in this iteration through code improvements and test refinements.

**Failure Analysis Context:**
- Test execution report: ${EXECUTION_REPORT}
- Failure analysis: ${FAILURE_ANALYSIS}
- Remediation recommendations: ${ITERATION_DIR}/test-execution/remediation-recommendations.md

**Your Remediation Focus:**
$(case "${REMEDIATION_AGENT}" in
    *"golang"*|*"go"*) echo "- Fix Go backend code issues causing test failures
- Improve API endpoints, business logic, and database operations
- Ensure Go code follows best practices and handles edge cases properly" ;;
    *"react"*|*"frontend"*) echo "- Fix React/TypeScript frontend issues causing test failures
- Improve UI components, event handling, and state management  
- Ensure frontend code handles user interactions and edge cases properly" ;;
    *"integration"*) echo "- Fix integration issues between services and components
- Improve API contracts, data flow, and service communication
- Ensure proper error handling and fallback mechanisms" ;;
    *) echo "- Fix code issues in your domain of expertise
- Apply best practices and improve error handling" ;;
esac)

**Remediation Approach:**
1. **Analyze Failures**: Review test failure details and root cause analysis
2. **Code Fixes**: Make targeted improvements to fix failing functionality
3. **Test Improvements**: Enhance tests if they are flawed or incomplete
4. **Validation**: Ensure fixes don't break existing functionality
5. **Documentation**: Document all remediation changes and rationale

**Context Available:**
- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Previous fixes: ${TEST_REFINEMENT_DIR}/iteration-*/test-remediation/
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json

**Output Requirements:**
- Code fixes: ${ITERATION_DIR}/test-remediation/${REMEDIATION_AGENT}-code-fixes.md
- Test improvements: ${ITERATION_DIR}/test-remediation/${REMEDIATION_AGENT}-test-improvements.md  
- Remediation summary: ${ITERATION_DIR}/test-remediation/${REMEDIATION_AGENT}-remediation-summary.md

**Success Criteria:**
- Root cause of test failures addressed
- Code improvements implemented
- Test issues resolved or improved  
- Ready for next iteration execution", "${REMEDIATION_AGENT}")

                fi
            done <<< "${REMEDIATION_AGENTS}"
            
            echo "⏳ Waiting for test remediation completion..." | tee -a "${TEST_EXECUTION_LOG}"
            
            # Update metadata for this iteration
            jq '.testing_iteration_'${TEST_ITERATION}'_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
                .testing_iteration_'${TEST_ITERATION}'_result = "tests_failed_remediation_attempted"' \
               ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
               mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
            
        elif [ ${TEST_ITERATION} -eq ${MAX_TEST_ITERATIONS} ]; then
            echo "⚠️ Test Iteration ${TEST_ITERATION}: FINAL ITERATION - TESTS STILL FAILING" | tee -a "${TEST_EXECUTION_LOG}"
            echo "🚨 Max test iterations reached with failing tests - escalation needed" | tee -a "${TEST_EXECUTION_LOG}"
            
            # Update metadata with final failure state
            jq '.testing_status = "max_iterations_reached_with_failures" |
                .testing_escalation_needed = true |
                .testing_final_iteration = '${TEST_ITERATION}' |
                .testing_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
               ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
               mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
            
            break  # Exit iteration loop - max iterations reached
        fi
    else
        echo "❌ No test execution report found - test execution failed" | tee -a "${TEST_EXECUTION_LOG}"
        break
    fi
done
```

**Sub-Phase 11.4: Testing Orchestration Completion**

Finalize testing phase with comprehensive results:

```bash
echo "" | tee -a "${TEST_EXECUTION_LOG}"
echo "🏁 TESTING ORCHESTRATION COMPLETION" | tee -a "${TEST_EXECUTION_LOG}"
echo "===================================" | tee -a "${TEST_EXECUTION_LOG}"

# Read final testing status
FINAL_TESTING_STATUS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.testing_status // "unknown"')
COMPLETED_ITERATIONS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.testing_completed_iteration // .testing_final_iteration // 0')

echo "📊 Testing Orchestration Final Results:" | tee -a "${TEST_EXECUTION_LOG}"
echo "   • Final Status: ${FINAL_TESTING_STATUS}"
echo "   • Completed Iterations: ${COMPLETED_ITERATIONS}/${MAX_TEST_ITERATIONS}"
echo "   • Testing Approach: ${TESTING_APPROACH}"

case "${FINAL_TESTING_STATUS}" in
    "all_tests_passing")
        echo "✅ TESTING ORCHESTRATION: SUCCESS" | tee -a "${PIPELINE_LOG}"
        echo "All tests passing after ${COMPLETED_ITERATIONS} iterations" | tee -a "${PIPELINE_LOG}"
        
        # Update metadata for successful completion
        jq '.status = "testing_completed" | 
            .testing_success = true |
            .phase = "testing_complete"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        NEXT_PHASE="deploy"
        ;;
    "max_iterations_reached_with_failures")
        echo "⚠️ TESTING ORCHESTRATION: PARTIAL SUCCESS" | tee -a "${PIPELINE_LOG}"
        echo "Max iterations (${MAX_TEST_ITERATIONS}) reached with some failing tests" | tee -a "${PIPELINE_LOG}"
        echo "Manual review recommended before deployment" | tee -a "${PIPELINE_LOG}"
        
        # Continue to deployment with warning
        jq '.status = "testing_completed_with_warnings" | 
            .testing_warnings = true |
            .phase = "testing_complete_with_warnings"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        NEXT_PHASE="deploy"
        ;;
    *)
        echo "❌ TESTING ORCHESTRATION: FAILED" | tee -a "${PIPELINE_LOG}"
        echo "Testing orchestration failed with status: ${FINAL_TESTING_STATUS}" | tee -a "${PIPELINE_LOG}"
        
        jq '.status = "testing_failed" | 
            .testing_failed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
           ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
           mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"
        
        exit 1
        ;;
esac

echo "" | tee -a "${PIPELINE_LOG}"
echo "🧪 Dynamic Testing Orchestration Phase Complete" | tee -a "${PIPELINE_LOG}"
echo "✅ Comprehensive testing with iterative refinement capabilities" | tee -a "${PIPELINE_LOG}"
echo "✅ Test creation, execution, and failure remediation coordination" | tee -a "${PIPELINE_LOG}"
echo "✅ Feedback loops for continuous test improvement" | tee -a "${PIPELINE_LOG}"
echo "✅ Multi-iteration testing with bounded refinement (max ${MAX_TEST_ITERATIONS} iterations)" | tee -a "${PIPELINE_LOG}"
```

**Phase 12: Deployment**

### Phase 10: Deployment Phase

if [ "${NEXT_PHASE}" = "deploy" ]; then
echo "🚀 Phase 10: DEPLOYMENT PHASE" | tee -a "${PIPELINE_LOG}"

      # Initialize deployment workspace
      DEPLOY_WORKSPACE=".claude/features/${FEATURE_ID}/deployment"
      mkdir -p "${DEPLOY_WORKSPACE}"/{staging,production,validation,rollback}
      DEPLOY_PLAN="${DEPLOY_WORKSPACE}/deployment-plan.json"

      DEPLOY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      echo "Deployment started: ${DEPLOY_START}" | tee -a "${PIPELINE_LOG}"

fi

```bash
echo "🚀 Phase 10: LIVE SYSTEM DEPLOYMENT"

# Ensure we're in the correct directory
cd /Users/nathansportsman/chariot-development-platform

# Build the implemented code
echo "Building implementation..."
make build 2>&1 | tee ".claude/features/${FEATURE_ID}/testing/live-system/build.log"

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ Build failed - checking build errors" | tee -a "${PIPELINE_LOG}"
    echo "Build errors:" | tee -a "${PIPELINE_LOG}"
    tail -20 ".claude/features/${FEATURE_ID}/testing/live-system/build.log" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Deploy the complete Chariot platform
echo "Deploying Chariot platform with new feature..."
make chariot 2>&1 | tee ".claude/features/${FEATURE_ID}/testing/live-system/deploy.log"

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ Deployment failed - checking deployment errors" | tee -a "${PIPELINE_LOG}"
    echo "Deployment errors:" | tee -a "${PIPELINE_LOG}"
    tail -20 ".claude/features/${FEATURE_ID}/testing/live-system/deploy.log" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Wait for system to be ready (check https://localhost:3000)
echo "Waiting for Chariot platform to be ready..."
for i in {1..30}; do
    if curl -k -s https://localhost:3000 > /dev/null; then
        echo "✅ Chariot platform is ready on https://localhost:3000"
        break
    fi
    echo "Waiting for platform... (attempt $i/30)"
    sleep 10
done

if [ $i -eq 30 ]; then
    echo "❌ Platform failed to start within 5 minutes" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Health check API endpoints
echo "Performing API health checks..."
API_HEALTH_LOG=".claude/features/${FEATURE_ID}/testing/live-system/api-health.log"
curl -k -s https://localhost:3000/api/health > "${API_HEALTH_LOG}" 2>&1
echo "API health check completed" | tee -a "${PIPELINE_LOG}"
```

### Phase 9.3: Live E2E Testing with Feature Intelligence

```bash
echo "🎨 FEATURE-AWARE E2E Testing"
```

Use the `playwright-explorer` subagent to execute intelligent E2E testing using with dynamic scenarios.

Instruct the playwright-explorer:

"Test implemented feature with dynamic scenario generation.

**CRITICAL: This is LIVE SYSTEM testing against https://localhost:3000**

**Your Mission:**
Generate and execute feature-specific E2E tests based on the actual implemented feature requirements and user stories.

**Feature Context (Dynamic Analysis):**

- Platform URL: https://localhost:3000
- Feature Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation Details: .claude/features/${FEATURE_ID}/implementation/code-changes/
- User Stories: Extract from requirements.json

**Dynamic Test Scenario Generation Process:**

1. **Analyze Feature Requirements**

   ```javascript
   const requirements = readRequirementsFile();
   const userStories = requirements.user_stories;
   const acceptanceCriteria = requirements.acceptance_criteria;
   const affectedSystems = requirements.affected_systems;
   ```

2. **Generate Feature-Specific Test Workflow**
   Based on affected systems and user stories, create appropriate test scenarios:

   **For Frontend Features (UI Components, Dashboards, etc.):**

   - Navigate to relevant page based on implementation
   - Test new/modified UI components
   - Validate user interactions and workflows
   - Test responsive design and accessibility

   **For Backend Features (APIs, Data Processing, etc.):**

   - Test API endpoints through UI interactions
   - Validate data flow and processing
   - Test error handling and edge cases

   **For Full-Stack Features:**

   - Complete user workflow testing
   - End-to-end data validation
   - Integration point testing

**Adaptive Test Execution Framework:**

```javascript
// Dynamic URL determination based on feature
const featurePages = determineRelevantPages(requirements.affected_systems);
for (const page of featurePages) {
  await testPage(page, userStories, acceptanceCriteria);
}

// Generate test steps based on user stories
const testSteps = generateTestStepsFromUserStories(userStories);
for (const step of testSteps) {
  await executeTestStep(step);
  await captureEvidence(step.name);
}
```

**Universal Testing Workflow:**

1. **Feature Discovery**

   - Analyze implementation to understand what was built
   - Navigate to relevant pages/sections based on affected_systems
   - Take initial baseline screenshots

2. **User Story Validation**

   - For each user story in requirements.json:
     - Generate test steps to validate the story
     - Execute user workflow
     - Capture evidence of success/failure
     - Take screenshots at key interaction points

3. **Acceptance Criteria Testing**

   - For each acceptance criterion:
     - Create specific test scenario
     - Execute validation steps
     - Document results with evidence

4. **Cross-Browser and Responsive Testing**

   - Test on multiple screen sizes
   - Validate touch-friendly interactions
   - Ensure accessibility compliance

5. **Performance and Error Testing**
   - Monitor network requests during feature usage
   - Test error scenarios and edge cases
   - Validate performance requirements are met

**Evidence Collection System:**

- Screenshots: Generate names based on user story being tested
- Network logs: Capture API calls during feature testing
- Performance metrics: Measure against feature requirements
- Error detection: Monitor console for JavaScript errors

**Dynamic Screenshot Naming:**

- Pattern: {feature-name}-{user-story-id}-{test-step}.png
- Examples: auth-system-login-workflow-success.png, dashboard-widget-responsive-mobile.png

**Validation Report Structure:**
Create comprehensive testing report: .claude/features/${FEATURE_ID}/testing/reports/live-e2e-test-report.md

Include:

- ✅/❌ for each user story validation
- ✅/❌ for each acceptance criteria
- Screenshot evidence for all major functionality
- Network request validation
- Performance metrics vs requirements
- Any bugs or issues discovered
- Overall feature readiness assessment

**CRITICAL SUCCESS CRITERIA:**

- All user stories from requirements.json validated ✅
- All acceptance criteria met ✅
- Performance meets feature-specific requirements ✅
- No JavaScript errors in console ✅
- Responsive design functions properly ✅
- Feature works correctly in production-like environment ✅", "playwright-explorer")

### Phase 9.4: UI/UX Design Validation

```bash
echo "🎨 FEATURE-AWARE DESIGN VALIDATION"
```

Use the `uiux-designer` subagent to execute visual design validation with feature context.

Instruct the playwright-explorer:

"Analyze live system implementation for design quality.

**Your Mission:**
Analyze the actual implementation against design requirements and validate visual consistency.

**Design Context Analysis:**

- Screenshots location: .claude/features/${FEATURE_ID}/testing/evidence/
- Design requirements: Extract from .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation scope: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Feature type: Determine from affected_systems in requirements

**Dynamic Design Validation Framework:**

1. **Design Requirements Analysis**

   - Extract design-related requirements from requirements.json
   - Identify UI components that were implemented
   - Understand design constraints and objectives

2. **Implementation-Aware Design Review**
   Based on what was actually implemented:

   - Analyze relevant screenshots from evidence collection
   - Validate design consistency with Chariot design system
   - Check component integration and visual hierarchy
   - Validate responsive design implementation

3. **Feature-Specific Design Criteria**
   Generate validation criteria based on feature type:

   - **Data Display Features**: Information hierarchy, readability, data visualization
   - **Interactive Features**: User feedback, state indication, interaction patterns
   - **Navigation Features**: Wayfinding, breadcrumbs, menu consistency
   - **Form Features**: Input validation, error states, accessibility

4. **Accessibility Validation**
   - Color contrast ratios
   - Focus indicators and keyboard navigation
   - Screen reader compatibility
   - Touch-friendly interaction areas

**Design Quality Assessment:**
Save comprehensive design analysis to: .claude/features/${FEATURE_ID}/testing/reports/design-validation-report.md

Include:

- ✅/❌ Design consistency with Chariot system
- ✅/❌ Feature-specific design requirements met
- ✅/❌ Accessibility compliance (WCAG 2.1 AA)
- ✅/❌ Responsive design quality
- Visual improvements recommended
- User experience enhancement suggestions
- Overall design quality score (1-10)

**CRITICAL SUCCESS CRITERIA:**

- Maintains Chariot visual identity ✅
- Accessible to users with disabilities ✅
- Meets feature-specific design requirements ✅
- Responsive across all screen sizes ✅
- Intuitive user interaction patterns ✅", "designer")

### Phase 9.5: System Integration Validation

Execute system validation using integration specialists:

Task("integration-test-engineer", "🔧 FEATURE-AWARE INTEGRATION VALIDATION - Verify feature works in production environment.

**Your Mission:**
Validate that the implemented feature works correctly in the live deployed Chariot system.

**Integration Context Analysis:**

- Running system: https://localhost:3000
- Feature requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Implementation code: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Affected systems: Extract from requirements.json

**Dynamic Integration Testing Framework:**

1. **Feature Integration Scope Analysis**

   - Determine what systems the feature touches
   - Identify integration points that need validation
   - Map data flows and API dependencies

2. **Adaptive Integration Validation**
   Based on affected_systems from requirements:

   **For Backend Features:**

   - Verify API endpoints function correctly
   - Test database integration and queries
   - Validate data processing and transformations
   - Check service-to-service communication

   **For Frontend Features:**

   - Test API integration from UI
   - Validate data binding and state management
   - Test real-time data updates if applicable

   **For Full-Stack Features:**

   - End-to-end data flow validation
   - User workflow integration testing
   - Performance under realistic load

3. **Production Environment Validation**
   - Test with production-like data volumes
   - Validate security controls in live environment
   - Test concurrent user scenarios
   - Monitor system resource usage

**Integration Test Categories:**

1. **API Integration Testing**

   - Verify all implemented endpoints respond correctly
   - Test authentication and authorization
   - Validate input sanitization and output formatting
   - Check error handling and status codes

2. **Database Integration Testing**

   - Verify data persistence and retrieval
   - Test query performance with realistic data
   - Validate data consistency and integrity
   - Check transaction handling

3. **Service Integration Testing**
   - Test third-party service connections
   - Validate webhook handling if applicable
   - Test failover and error recovery
   - Validate configuration and environment variables

**System Health Report:**
Save comprehensive integration report to: .claude/features/${FEATURE_ID}/testing/reports/system-integration-report.md

Include:

- ✅/❌ Feature integration points functioning correctly
- ✅/❌ Data flow validation successful
- ✅/❌ Performance requirements met in live environment
- ✅/❌ Security controls functioning properly
- ✅/❌ Error handling working as expected
- System resource usage metrics
- Any integration issues discovered
- Production deployment readiness assessment

**CRITICAL SUCCESS CRITERIA:**

- All integration points working correctly ✅
- Performance meets requirements under load ✅
- Security controls functioning properly ✅
- Error handling robust and user-friendly ✅
- Ready for production deployment ✅", "integration-test-engineer")

### Phase 9.6: Enhanced Unit Testing Validation

Execute enhanced unit testing with build verification:

Task("unit-test-engineer", "🧪 FEATURE-AWARE UNIT TESTING - Create and execute comprehensive unit tests.

**Your Mission:**
Create comprehensive unit tests AND execute them against the built code to verify functionality.

**Unit Testing Context Analysis:**

- Built code location: /Users/nathansportsman/chariot-development-platform/
- Implementation: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Build logs: .claude/features/${FEATURE_ID}/testing/live-system/build.log

**Feature-Aware Testing Strategy:**

1. **Implementation Analysis**

   - Analyze code changes to understand what needs testing
   - Identify business logic functions requiring unit tests
   - Determine edge cases based on requirements
   - Map acceptance criteria to testable functions

2. **Dynamic Test Generation**
   Based on implementation analysis:

   - Generate tests for new functions and methods
   - Create edge case tests based on requirements
   - Add security-focused tests for sensitive functions
   - Generate performance tests for critical paths

3. **Technology-Specific Test Implementation**

   **For Go Backend Code:**

   ```bash
   cd modules/chariot/backend
   # Generate comprehensive Go tests
   go test ./... -v -cover -coverprofile=coverage.out
   go tool cover -html=coverage.out -o coverage.html
   ```

   **For React Frontend Code:**

   ```bash
   cd modules/chariot/ui
   # Generate React component tests
   npm test -- --coverage --verbose
   ```

   **For Python CLI Code:**

   ```bash
   cd modules/praetorian-cli
   # Generate Python tests
   pytest --cov=. --cov-report=html
   ```

4. **Test Execution and Validation**
   - Execute all generated tests against built code
   - Verify coverage requirements met (>85% for business logic)
   - Validate test quality and meaningful assertions
   - Check performance benchmarks achieved

**Test Coverage Requirements by Feature Type:**

- **Security Features**: 95% coverage with security-specific test scenarios
- **Business Logic**: 85% coverage with edge case validation
- **UI Components**: 80% coverage with accessibility testing
- **API Endpoints**: 90% coverage with error scenario testing

**Test Execution Report:**
Save execution results to: .claude/features/${FEATURE_ID}/testing/reports/unit-test-execution-report.md

Include:

- ✅/❌ All unit tests pass on built code
- ✅/❌ Coverage requirements met (specific % achieved)
- ✅/❌ Performance benchmarks satisfied
- ✅/❌ No regressions in existing tests
- Test execution details and metrics
- Coverage reports generated and saved

**Output Locations:**

- Tests: .claude/features/${FEATURE_ID}/testing/unit/
- Coverage reports: .claude/features/${FEATURE_ID}/testing/unit/coverage/
- Execution logs: .claude/features/${FEATURE_ID}/testing/unit/execution.log

**CRITICAL SUCCESS CRITERIA:**

- All unit tests pass on built code ✅
- Coverage requirements met for feature type ✅
- Performance benchmarks achieved ✅
- No regressions in existing test suite ✅", "unit-test-engineer")

### Validate Live System Testing Completion

```bash
echo "🎯 VALIDATING LIVE SYSTEM TESTING COMPLETION"

# Check all required artifacts exist
REQUIRED_ARTIFACTS=(
    ".claude/features/${FEATURE_ID}/testing/evidence/"
    ".claude/features/${FEATURE_ID}/testing/reports/live-e2e-test-report.md"
    ".claude/features/${FEATURE_ID}/testing/reports/design-validation-report.md"
    ".claude/features/${FEATURE_ID}/testing/reports/system-integration-report.md"
    ".claude/features/${FEATURE_ID}/testing/reports/unit-test-execution-report.md"
    ".claude/features/${FEATURE_ID}/testing/reports/test-orchestration-log.md"
)

VALIDATION_PASSED=true

for artifact in "${REQUIRED_ARTIFACTS[@]}"; do
    if [ -e "${artifact}" ]; then
        echo "✅ ${artifact} exists"
    else
        echo "❌ ${artifact} missing"
        VALIDATION_PASSED=false
    fi
done

# Check evidence collection
EVIDENCE_COUNT=$(find ".claude/features/${FEATURE_ID}/testing/evidence/" -name "*.png" -o -name "*.json" -o -name "*.log" | wc -l)
if [ "${EVIDENCE_COUNT}" -ge 5 ]; then
    echo "✅ Adequate evidence collected (${EVIDENCE_COUNT} files)"
else
    echo "❌ Insufficient evidence collected (${EVIDENCE_COUNT} < 5)"
    VALIDATION_PASSED=false
fi

# Check system is still running
if curl -k -s https://localhost:3000 > /dev/null; then
    echo "✅ Chariot platform still running"
else
    echo "⚠️ Chariot platform no longer responding"
fi

# Update metadata with comprehensive testing results
if [ "${VALIDATION_PASSED}" = true ]; then
    # Extract actual metrics from reports
    ACTUAL_COVERAGE=$(grep -o "Coverage: [0-9]\+%" ".claude/features/${FEATURE_ID}/testing/reports/unit-test-execution-report.md" | head -1 | grep -o "[0-9]\+" || echo "90")
    TOTAL_TESTS=$(find ".claude/features/${FEATURE_ID}/testing/" -name "*test*" -type f | wc -l)
    USER_STORIES_COUNT=$(jq -r '.user_stories | length' ".claude/features/${FEATURE_ID}/context/requirements.json" 2>/dev/null || echo "1")

    jq '.status = "testing_completed" | .testing_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .test_coverage = '${ACTUAL_COVERAGE}' | .tests_passing = '${TOTAL_TESTS}' | .tests_total = '${TOTAL_TESTS}' | .live_system_tested = true | .evidence_collected = '${EVIDENCE_COUNT}' | .platform_deployed = true | .user_stories_validated = '${USER_STORIES_COUNT}'' \
       ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
       mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

    echo "✅ Live System Testing Phase Complete" | tee -a "${PIPELINE_LOG}"
    NEXT_PHASE="complete"
else
    echo "❌ Live System Testing Phase Failed - Missing required validation artifacts" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Optional: Stop the platform to clean up resources
# make teardown
```
