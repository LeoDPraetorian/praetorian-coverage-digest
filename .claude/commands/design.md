---
description: Transform user prompt / feature description into comprehensive design specification and implementation plan
model: claude-opus-4-1-20250805
---

# Einstein Design Phase Workflow

You are orchestrating a multi-phase feature design workflow. Your goal is to transform the user's feature description into a comprehensive, detailed implementation plan ready for development.

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
mkdir -p .claude/features/${FEATURE_ID}/{context,research,output,logs,architecture}

# Save feature metadata
cat > .claude/features/${FEATURE_ID}/metadata.json << EOF
{
  "id": "${FEATURE_ID}",
  "description": "$ARGUMENTS",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "design_in_progress",
  "phase": "design"
}
EOF

# Export for use throughout workflow
echo "Feature workspace created: .claude/features/${FEATURE_ID}"
echo "FEATURE_ID=${FEATURE_ID}" > .claude/features/current_feature.env

# Display the full paths that will be used
echo "=== Feature Workspace Paths ==="
echo "Requirements: .claude/features/${FEATURE_ID}/context/requirements.json"
echo "Knowledge Base: .claude/features/${FEATURE_ID}/context/knowledge-base.md"
echo "Research Dir: .claude/features/${FEATURE_ID}/research/"
echo "Complexity: .claude/features/${FEATURE_ID}/context/complexity-assessment.json"
echo "Architecture Dir: .claude/features/${FEATURE_ID}/architecture/"
echo "Design Output: .claude/features/${FEATURE_ID}/output/implementation-plan.md"
echo "=============================="
```

Throughout this workflow, you will create intermediate files in the feature-specific directory. Each phase will generate artifacts that subsequent phases can read.

## Design Phase Execution

### Phase 1: Intent Analysis

Get the workspace paths for this phase:

```bash
source .claude/features/current_feature.env
REQUIREMENTS_FILE=".claude/features/${FEATURE_ID}/context/requirements.json"
echo "Requirements will be saved to: ${REQUIREMENTS_FILE}"
```

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
else
    echo "No Jira references detected - proceeding with direct analysis"
fi
```

If Jira references are found, resolve them first:

Tell the jira-reader (if Jira references detected):
"Resolve all Jira ticket references in this feature request: $ARGUMENTS

Use your preprocessing mode to:
1. Detect all Jira ticket references (CHA-1232, PROJ-123, etc.)
2. Fetch full ticket details using Atlassian MCP tools
3. Replace references with structured ticket content
4. Save the enriched feature description to: ${JIRA_RESOLVED_FILE}

Format the enriched content as:
```
# Enhanced Feature Request

## Original Request
$ARGUMENTS

## Resolved Jira Tickets
[For each resolved ticket, include full details]

## Final Enhanced Description
[Original request with Jira references replaced by full ticket content]
```"

Wait for jira-reader to complete, then prepare the content for intent analysis:

```bash
# Determine which content to use for intent analysis
if [ -f "${JIRA_RESOLVED_FILE}" ]; then
    echo "✓ Jira references resolved successfully"
    # Extract the enhanced description for intent analysis
    ENHANCED_ARGUMENTS=$(grep -A 1000 "## Final Enhanced Description" "${JIRA_RESOLVED_FILE}" | tail -n +2)
    echo "Using enhanced content with resolved Jira tickets"
else
    ENHANCED_ARGUMENTS="$ARGUMENTS"
    echo "Using original arguments (no Jira resolution)"
fi

echo "Content prepared for intent analysis"
```

#### Intent Analysis

Use the `intent-translator` subagent to parse and structure the feature request.

Tell the intent-translator:
"Analyze this feature request: ${ENHANCED_ARGUMENTS}

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

Use the `knowledge-synthesizer` subagent to analyze requirements and recommend research approach.

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

CRITICAL: Choose the optimal agent type for each research need:

**Available Research Agents:**

- `code-pattern-analyzer` - For analyzing existing codebase patterns and implementations
- `context7-search-specialist` - BEST for 3rd party integrations, library documentation, API references, SDK docs (e.g., Cloudflare API, AWS SDK, React docs)
- `web-research-specialist` - For industry practices, tutorials, best practices, general research, and as a fall back if context7, is not available

**Agent Selection Guidelines:**

- 3rd party integrations, library documentation, API references, SDK docs (e.g., Cloudflare API, AWS SDK, React docs) → USE `context7-search-specialist`
- For implementation patterns in codebase → USE `code-pattern-analyzer`
- For industry best practices and tutorials → USE `web-research-specialist`
- For security architecture and threats → USE `security-architect`

Do NOT use biased examples - evaluate each research need independently and select the most appropriate agent.

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

Example spawning based on recommendations:

- If "context7-search-specialist" is recommended with output_file "cloudflare-api-documentation.md":
  Tell the agent: "Research Cloudflare WAF API v4 official documentation.
  Focus on: [specific focus from plan].
  Save your complete findings to: ${RESEARCH_DIR}/cloudflare-api-documentation.md"

- If "web-research-specialist" is recommended with output_file "web-research-findings.md":
  Tell the agent: "Research security testing best practices for WAF integrations.
  Focus on: [specific focus from plan].
  Save your complete findings to: ${RESEARCH_DIR}/web-research-findings.md"

- If "code-pattern-analyzer" is recommended with output_file "code-patterns-analysis.md":
  Tell the agent: "Analyze our codebase for [specific patterns from plan].
  Look for reusable components related to [feature].
  Save your complete analysis to: ${RESEARCH_DIR}/code-patterns-analysis.md"

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

If architecture planning is required, use the `architecture-coordinator`:

Instruct the architecture-coordinator:
"Analyze this complex feature and recommend an architecture approach.

Read context from: ${CONTEXT_FILE}

Also read the full knowledge base from: ${KNOWLEDGE_PATH}

Instead of spawning architects directly, save your recommendations to: ${COORDINATION_PLAN}

Output format:

```json
{
  \"recommendation\": \"spawn_architects|single_architect|skip_architecture\",
  \"rationale\": \"Why this approach is best\",
  \"suggested_agents\": [
    {
      \"agent\": \"frontend-architect\",
      \"reason\": \"UI components need redesign\",
      \"context\": \"Focus on responsive design patterns\",
      \"priority\": \"high\"
    }
  ],
  \"execution_strategy\": \"parallel|sequential\",
  \"integration_points\": [\"List of systems that need coordination\"]
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
            title=$(echo "$basename_no_ext" | sed 's/-/ /g' | sed 's/\b\(.\/\)/\u\1/g')
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
echo "===================================="
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

## Design Phase Completion

Finalize the design phase:

```bash
source .claude/features/current_feature.env

# Verify implementation plan exists in feature directory
SOURCE_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"

if [ -f "${SOURCE_PLAN}" ]; then
    echo "✓ Implementation plan created: ${SOURCE_PLAN}"
else
    echo "✗ Implementation plan not found at ${SOURCE_PLAN}"
fi

# Update feature status to design completed
METADATA_FILE=".claude/features/${FEATURE_ID}/metadata.json"
jq '.status = "design_completed" | .phase = "design_complete"' "${METADATA_FILE}" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "${METADATA_FILE}"

# Create design summary
DESIGN_SUMMARY=".claude/features/${FEATURE_ID}/output/design-summary.md"
cat > "${DESIGN_SUMMARY}" << EOFS
# Feature Design Summary

## Feature: $ARGUMENTS
- **Workspace**: .claude/features/${FEATURE_ID}
- **Complexity**: ${COMPLEXITY}
- **Estimated Effort**: ${EFFORT}
- **Status**: Design Complete

## Generated Design Artifacts
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Knowledge Base: .claude/features/${FEATURE_ID}/context/knowledge-base.md
- Complexity Assessment: .claude/features/${FEATURE_ID}/context/complexity-assessment.json
- Architecture Decisions: .claude/features/${FEATURE_ID}/architecture/
- Implementation Plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md

## Next Phase Commands
Run these commands to proceed with implementation and validation:

\`\`\`bash
# Implement the designed feature
npx claude-code command implement "${FEATURE_ID}"

# Run security validation
npx claude-code command security-review "${FEATURE_ID}"

# Run quality validation  
npx claude-code command quality-review "${FEATURE_ID}"

# Run comprehensive testing
npx claude-code command test "${FEATURE_ID}"
\`\`\`

Or run the full pipeline:
\`\`\`bash
npx claude-code command einstein "${FEATURE_ID}"
\`\`\`
EOFS

# Display summary
cat "${DESIGN_SUMMARY}"
```

**🎯 DESIGN PHASE COMPLETE**

The feature has been thoroughly analyzed, researched, and planned. The implementation plan is ready for the next phase of development.

**Key Outputs:**
- ✅ Requirements Analysis (Phase 1)
- ✅ Knowledge Synthesis & Research (Phase 2)  
- ✅ Complexity Assessment (Phase 3)
- ✅ Architecture Planning (Phase 4 - if needed)
- ✅ Implementation Plan (Phase 5)

**Next Steps:**
- Use `/implement` to execute the implementation plan
- Use `/security-review` to validate security compliance
- Use `/quality-review` to ensure code quality and design adherence
- Use `/test` to run comprehensive testing

Remember: Each feature gets its own isolated workspace, enabling parallel development, historical reference, and clean context separation.