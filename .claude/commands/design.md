---
description: Design Phase Only - Feature Design Pipeline (Phases 1-8)
model: claude-opus-4-1-20250805
tools: Bash, BashOutput, Glob, Grep, KillBash, Read, Write, TodoWrite
---

**Design Pipeline Starting - Manual analysis PROHIBITED**
**Do NOT use MCP tools directly**
**ALL work must go through design phases and agents**

You are orchestrating the **Design Phase of feature development**. Your goal is to take a feature description through systematic design phases (1-8) to produce a comprehensive design specification ready for implementation.

**Feature Request or Feature ID**: $ARGUMENTS

# Design-Only Feature Development Pipeline

The Design system implements a systematic **8-phase design pipeline** with quality gates:

🎯 **Design Phase** (Phases 1-8): Creates comprehensive design documentation
✅ **Output**: Design specification, architecture plans, complexity assessment
🛑 **Stop Point**: Pipeline completes after design - no implementation

**Quality Gates**: Each phase includes validation checkpoints ensuring systematic quality assurance.

## Pipeline Execution

**Execute Design Phase**

**Phase 1: Preprocessing**

### Step 1: Determine Execution Mode (Phase 1)

**CRITICAL PIPELINE RULE**

- Never manually create pipeline infrastructure
- Always use .claude/scripts/phases/initialize-pipeline.sh
- Any bypassing of this script is a violation of pipeline integrity

```bash
# Strategic decision (core orchestration logic)
if [[ "$ARGUMENTS" =~ ^[a-z0-9-]+_[0-9]{8}_[0-9]{6}$ ]]; then
    FEATURE_ID="$ARGUMENTS"
    EXECUTION_MODE="resume"
    echo "🔄 Resume Mode: ${FEATURE_ID}" | tee -a "${PIPELINE_LOG}"
else
    FEATURE_DESCRIPTION="$ARGUMENTS"
    EXECUTION_MODE="new"
    echo "🚀 New Pipeline: ${FEATURE_DESCRIPTION}" | tee -a "${PIPELINE_LOG}"
fi

# Mechanical pipeline initialization (delegated to script)
INIT_OUTPUT=$(.claude/scripts/phases/initialize-pipeline.sh "${EXECUTION_MODE}" "${ARGUMENTS}")
echo "${INIT_OUTPUT}"

# Extract initialization results
PIPELINE_LOG=$(echo "${INIT_OUTPUT}" | grep "PIPELINE_LOG=" | cut -d'=' -f2)
PIPELINE_DIR=$(echo "${INIT_OUTPUT}" | grep "PIPELINE_DIR=" | cut -d'=' -f2)
FEATURE_ID=$(echo "${INIT_OUTPUT}" | grep "FEATURE_ID=" | cut -d'=' -f2)
FEATURE_WORKSPACE_PATH=$(echo "${INIT_OUTPUT}" | grep "FEATURE_WORKSPACE_PATH=" | cut -d'=' -f2)
CONTENT_SOURCE=$(echo "${INIT_OUTPUT}" | grep "CONTENT_SOURCE=" | cut -d'=' -f2)
JIRA_TARGET_FILE=$(echo "${INIT_OUTPUT}" | grep "JIRA_TARGET_FILE=" | cut -d'=' -f2)
INIT_STATUS=$(echo "${INIT_OUTPUT}" | grep "INITIALIZATION_STATUS=" | cut -d'=' -f2)

# Validate initialization
if [ "${INIT_STATUS}" != "success" ] || [ ! -f "${PIPELINE_LOG}" ]; then
    echo "❌ Pipeline initialization failed" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

echo "✅ Pipeline infrastructure ready - Mode: ${EXECUTION_MODE}" | tee -a "${PIPELINE_LOG}"
echo "📁 Feature Workspace: ${FEATURE_ID}" | tee -a "${PIPELINE_LOG}"
echo "📝 Content Source: ${CONTENT_SOURCE:-direct}" | tee -a "${PIPELINE_LOG}"


# Validate proper initialization
if [ -z "${PIPELINE_LOG}" ] || [ ! -f "${PIPELINE_LOG}" ]; then
    echo "❌ ERROR: Pipeline was not properly initialized through Einstein scripts"
    echo "❌ This indicates the design pipeline bypassed mandatory initialization"
    exit 1
fi
```

**Wait for initialize-pipeline to complete, before continuing**

### Step 2: Pipeline State Detection (Phase 1)

```bash
# For design-only pipeline, we always start with design
NEXT_PHASE="design"
echo "🎯 Starting Design-Only Pipeline" | tee -a "${PIPELINE_LOG}"
echo "📋 This pipeline will complete after design phase (8 phases)" | tee -a "${PIPELINE_LOG}"
```

### Step 3: Jira Resolution (Phase 1)

```bash
# Check if Jira resolution is needed based on content source from initialization
if [[ "${CONTENT_SOURCE}" == file:* ]]; then
    JIRA_TARGET_FILE=${CONTENT_SOURCE#file:}

    echo "📋 Jira references detected - spawning jira-reader agent" | tee -a "${PIPELINE_LOG}"
    echo "🎯 Target file: ${JIRA_TARGET_FILE}" | tee -a "${PIPELINE_LOG}"
    echo "💰 Token costs will be attributed to jira-reader agent" | tee -a "${PIPELINE_LOG}"

    JIRA_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Jira resolution started: ${JIRA_START}" | tee -a "${PIPELINE_LOG}"
else
    echo "📝 No Jira references detected - proceeding with direct arguments" | tee -a "${PIPELINE_LOG}"
fi
```

**Execute Jira Resolution (if needed):**

Use the `jira-reader` subagent to resolve Jira ticket references and enrich the feature description.

Instruct the jira-reader (if Jira references detected):
"Resolve all Jira ticket references in this feature request: ${ARGUMENTS}

Use your preprocessing mode to:

1. Detect all Jira ticket references (CHA-1527, PROJ-123, etc.)
2. Fetch full ticket details using Atlassian MCP tools
3. Replace references with structured ticket content
4. Save the enriched feature description to: ${JIRA_TARGET_FILE}

Format the enriched content as:

```
# Enhanced Feature Request

## Original Request
${ARGUMENTS}

## Resolved Jira Tickets
[For each resolved ticket, include full details]

## Final Enhanced Description
[Original request with Jira references replaced by full ticket content]
```

This preserves the pipeline directory structure while properly delegating Jira resolution token costs."

Wait for jira-reader to complete, then validate:

```bash
# Validate Jira resolution results
if [[ "${CONTENT_SOURCE}" == file:* ]]; then
    JIRA_TARGET_FILE=${CONTENT_SOURCE#file:}

    if [ -f "${JIRA_TARGET_FILE}" ] && [ -s "${JIRA_TARGET_FILE}" ]; then
        echo "✅ Jira resolution completed successfully" | tee -a "${PIPELINE_LOG}"
        echo "📄 Enhanced content saved to: ${JIRA_TARGET_FILE}" | tee -a "${PIPELINE_LOG}"

        JIRA_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        echo "Jira resolution completed: ${JIRA_END}" | tee -a "${PIPELINE_LOG}"
    else
        echo "⚠️ Jira resolution failed - falling back to original arguments" | tee -a "${PIPELINE_LOG}"
        CONTENT_SOURCE="direct:${ARGUMENTS}"
    fi
fi

echo "Content source prepared for design phases: ${CONTENT_SOURCE}" | tee -a "${PIPELINE_LOG}"
```

### Step 4: Execute Design (Phase 1)

```bash
echo "🎯 Phase 1-8: DESIGN PHASE" | tee -a "${PIPELINE_LOG}"

# Use workspace and content source from enhanced initialization
echo "📁 Using feature workspace: ${FEATURE_ID}" | tee -a "${PIPELINE_LOG}"
echo "📝 Processing content from: ${CONTENT_SOURCE:-direct}" | tee -a "${PIPELINE_LOG}"

DESIGN_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Design started: ${DESIGN_START}" | tee -a "${PIPELINE_LOG}"
```

**Phase 2: Intent Analysis**

Content source processing was completed in Phase 1. The enhanced content is now ready for intent analysis.

Use the `intent-translator` subagent to parse and structure the feature request using the enhanced content source.

Instruct the intent-translator:
"Analyze feature request from: ${CONTENT_SOURCE}

Save your analysis as JSON to: .claude/features/${FEATURE_ID}/context/requirements.json

Your output should include:

- feature_name: short identifier
- user_stories: array of stories
- acceptance_criteria: array of criteria
- affected_systems: list of components
- constraints: technical constraints
- clarification_needed: any unclear requirements

The intent-translator will automatically detect whether to read from a file (if CONTENT_SOURCE starts with 'file:') or process direct text (if it starts with 'direct:')."

Wait for the intent-translator to complete, then verify:

```bash
REQUIREMENTS_FILE=".claude/features/${FEATURE_ID}/context/requirements.json"
if [ -f "${REQUIREMENTS_FILE}" ]; then
    echo "✓ Requirements analysis completed" | tee -a "${PIPELINE_LOG}"
    cat "${REQUIREMENTS_FILE}" | jq '.feature_name'
else
    echo "✗ Requirements analysis failed" | tee -a "${PIPELINE_LOG}"
fi
```

**Phase 3: Existing Patterns & Code Synthesis**

```bash
source .claude/features/current_feature.env
echo "🔒 COMPLIANCE FRAMEWORK INITIALIZATION" | tee -a "${PIPELINE_LOG}"
echo "MANDATORY: All agents must confirm reuse-first approach" | tee -a "${PIPELINE_LOG}"

INPUT_REQUIREMENTS=".claude/features/${FEATURE_ID}/context/requirements.json"
OUTPUT_KNOWLEDGE=".claude/features/${FEATURE_ID}/context/knowledge-base.md"
SYNTHESIS_PLAN=".claude/features/${FEATURE_ID}/context/synthesis-plan.json"
COMPLIANCE_TRACKER=".claude/features/${FEATURE_ID}/compliance/compliance-tracker.json"
EXISTING_IMPL_DISCOVERY=".claude/features/${FEATURE_ID}/context/existing-implementation-discovery.md"
IMPLEMENTATION_GAP_ANALYSIS=".claude/features/${FEATURE_ID}/context/implementation-gap-analysis.json"

mkdir -p ".claude/features/${FEATURE_ID}/compliance"

cat > "${COMPLIANCE_TRACKER}" << 'EOF'
{
  "compliance_confirmed": false,
  "phases_validated": [],
  "reuse_analysis_performed": [],
  "creation_justifications": [],
  "validation_failures": [],
  "agent_compliance_status": {}
}
EOF

echo "=== Enhanced Knowledge Synthesizer Paths ===" | tee -a "${PIPELINE_LOG}"
echo "Input: ${INPUT_REQUIREMENTS}" | tee -a "${PIPELINE_LOG}"
echo "Output: ${OUTPUT_KNOWLEDGE}" | tee -a "${PIPELINE_LOG}"
echo "Synthesis Plan: ${SYNTHESIS_PLAN}" | tee -a "${PIPELINE_LOG}"
echo "Compliance Tracking: ${COMPLIANCE_TRACKER}" | tee -a "${PIPELINE_LOG}"
echo "Existing Implementation Discovery: ${EXISTING_IMPL_DISCOVERY}" | tee -a "${PIPELINE_LOG}"
echo "Gap Analysis: ${IMPLEMENTATION_GAP_ANALYSIS}" | tee -a "${PIPELINE_LOG}"
echo "====================================" | tee -a "${PIPELINE_LOG}"
echo "Requirements Summary:"
cat "${INPUT_REQUIREMENTS}" | jq -r '.feature_name, .affected_systems[]' 2>/dev/null || echo "Requirements not found"
```

### Mandatory Existing Implementation Discovery

Use the `code-pattern-analyzer` subagent in **"Codebase Discovery Mode"** first.

[Include full Phase 3 content from Einstein pipeline - lines 286-554]

**Phase 4: Knowledge Synthesis**

[Include full Phase 4 content from Einstein pipeline - lines 556-710]

**Phase 5: Architectural Impact Triage**

[Include full Phase 5 content from Einstein pipeline - lines 712-938]

**Phase 6: Complexity Assessment**

[Include full Phase 6 content from Einstein pipeline - lines 940-1040]

**Phase 7: Thinking Budget Optimization**

[Include full Phase 7 content from Einstein pipeline - lines 1042-1092]

**Phase 8: Architecture Planning (If Complex)**

[Include full Phase 8 content from Einstein pipeline - lines 1094-1226]

### Validate Design Phase Completion

```bash
source .claude/features/current_feature.env
echo ""
echo "=== DESIGN PHASE COMPLETION ===" | tee -a "${PIPELINE_LOG}"

# Validate all design artifacts exist
DESIGN_COMPLETE=true
MISSING_ARTIFACTS=()

# Check required design outputs
[ ! -f ".claude/features/${FEATURE_ID}/context/requirements.json" ] && MISSING_ARTIFACTS+=("requirements.json") && DESIGN_COMPLETE=false
[ ! -f ".claude/features/${FEATURE_ID}/context/knowledge-base.md" ] && MISSING_ARTIFACTS+=("knowledge-base.md") && DESIGN_COMPLETE=false
[ ! -f ".claude/features/${FEATURE_ID}/context/existing-implementation-discovery.md" ] && MISSING_ARTIFACTS+=("existing-implementation-discovery.md") && DESIGN_COMPLETE=false
[ ! -f ".claude/features/${FEATURE_ID}/context/implementation-gap-analysis.json" ] && MISSING_ARTIFACTS+=("implementation-gap-analysis.json") && DESIGN_COMPLETE=false
[ ! -f ".claude/features/${FEATURE_ID}/context/impact-analysis.json" ] && MISSING_ARTIFACTS+=("impact-analysis.json") && DESIGN_COMPLETE=false
[ ! -f ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" ] && MISSING_ARTIFACTS+=("complexity-assessment.json") && DESIGN_COMPLETE=false

if [ "${DESIGN_COMPLETE}" = false ]; then
    echo "❌ Design phase incomplete - missing artifacts:" | tee -a "${PIPELINE_LOG}"
    printf '%s\n' "${MISSING_ARTIFACTS[@]}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Update metadata to indicate design completion
cat > ".claude/features/${FEATURE_ID}/metadata.json" << EOF
{
  "feature_id": "${FEATURE_ID}",
  "description": "${ARGUMENTS}",
  "status": "design_completed",
  "design_completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "next_phase": "implementation",
  "design_artifacts": {
    "requirements": "context/requirements.json",
    "knowledge_base": "context/knowledge-base.md",
    "existing_implementations": "context/existing-implementation-discovery.md",
    "gap_analysis": "context/implementation-gap-analysis.json",
    "impact_analysis": "context/impact-analysis.json",
    "complexity_assessment": "context/complexity-assessment.json",
    "architecture": "architecture/"
  }
}
EOF

DESIGN_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Design completed: ${DESIGN_END}" | tee -a "${PIPELINE_LOG}"

echo "✅ DESIGN PHASE COMPLETE" | tee -a "${PIPELINE_LOG}"
echo "📁 Design artifacts saved to: .claude/features/${FEATURE_ID}/" | tee -a "${PIPELINE_LOG}"
echo "📋 Status: design_completed" | tee -a "${PIPELINE_LOG}"
echo "" | tee -a "${PIPELINE_LOG}"
echo "=== DESIGN SUMMARY ===" | tee -a "${PIPELINE_LOG}"

# Display design summary
if [ -f ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" ]; then
    COMPLEXITY=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.level')
    RISK=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.risk_level')
    EFFORT=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.estimated_effort')
    echo "📊 Complexity: ${COMPLEXITY}" | tee -a "${PIPELINE_LOG}"
    echo "⚠️  Risk Level: ${RISK}" | tee -a "${PIPELINE_LOG}"
    echo "⏱️  Estimated Effort: ${EFFORT}" | tee -a "${PIPELINE_LOG}"
fi

if [ -f ".claude/features/${FEATURE_ID}/context/implementation-gap-analysis.json" ]; then
    REUSE_PCT=$(cat ".claude/features/${FEATURE_ID}/context/implementation-gap-analysis.json" | jq -r '.reuse_metrics.reuse_percentage')
    echo "♻️  Code Reuse: ${REUSE_PCT}%" | tee -a "${PIPELINE_LOG}"
fi

echo "" | tee -a "${PIPELINE_LOG}"
echo "🎯 To continue with implementation, run:" | tee -a "${PIPELINE_LOG}"
echo "   /implement ${FEATURE_ID}" | tee -a "${PIPELINE_LOG}"
echo "" | tee -a "${PIPELINE_LOG}"
echo "📄 To review design artifacts, check:" | tee -a "${PIPELINE_LOG}"
echo "   .claude/features/${FEATURE_ID}/" | tee -a "${PIPELINE_LOG}"

# Final success marker
echo "🏁 DESIGN-ONLY PIPELINE COMPLETE" | tee -a "${PIPELINE_LOG}"
```

## Notes

This design-only pipeline:

1. **Executes Phases 1-8** - Complete design analysis and architecture planning
2. **Stops after design** - Does not proceed to implementation or other phases
3. **Preserves feature workspace** - Can be resumed later with `/implement ${FEATURE_ID}`
4. **Creates comprehensive design artifacts**:
   - Requirements analysis
   - Existing code discovery and reuse analysis
   - Knowledge synthesis and research
   - Architectural impact assessment
   - Complexity assessment
   - Architecture plans (if needed)

The design can be reviewed and approved before proceeding with implementation, providing a natural checkpoint for stakeholder review and approval.
