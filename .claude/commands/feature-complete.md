---
description: Complete feature development pipeline - Design, Implement, Security Review, Quality Review, and Testing
model: sonnet
allowed-tools: Bash, BashOutput, Glob, Grep, KillBash, Read, Write, TodoWrite, Task
argument-hint: <feature-description>
---

**Einstein Pipeline Starting - Manual analysis PROHIBITED**
**Do NOT use MCP tools directly**
**ALL work must go through Einstein phases and agents**

You are orchestrating the **complete Einstein feature development pipeline**. Your goal is to take a feature description through systematic design, implementation, security validation, quality assurance, and comprehensive testing to produce production-ready code.

**Feature Request or Feature ID**: $ARGUMENTS

# Einstein Complete Feature Development Pipeline

The Einstein system implements a systematic **14-phase feature development pipeline** with quality gates:

🎯 **Design Phase** (Phases 1-8): `/design` command  
⚙️ **Implementation Phase** (Phases 9-10): `/implement` command  
📊 **Quality Review Phase** (Phase 11): `/quality-review` command  
🛡️ **Security Review Phase** (Phase 12): `/security-review` command  
🧪 **Testing Phase** (Phase 13): `/test` command
🚀 **Deployment Phase** (Phase 14): `/deploy` command

**Quality Gates**: Each phase includes validation checkpoints ensuring systematic quality assurance.

## Directory Structure

The Einstein pipeline creates feature-specific directory structures for complete isolation:

```
.claude/
└── features/
    └── {FEATURE_ID}/                   # Feature-specific workspace
        ├── pipeline/                   # Feature-specific pipeline logs and state
        │   └── einstein-pipeline-*.log # Pipeline execution logs
        ├── context/                    # Requirements and analysis
        ├── research/                   # Background research outputs
        ├── output/                     # Implementation plans and agent assignments
        ├── architecture/               # Architecture design documents
        ├── implementation/             # Code changes and agent outputs
        ├── quality-review/             # Quality validation results
        ├── security-review/            # Security analysis outputs
        ├── testing/                    # Test strategies and results
        └── deployment/                 # Deployment plans and results
```

**Key Benefits:**
- **Feature Isolation**: Each feature maintains its own pipeline state and logs
- **Parallel Development**: Multiple features can be developed simultaneously
- **Easy Cleanup**: Removing a feature removes all associated pipeline data
- **Resume Reliability**: Resume mode finds all feature-specific data in one location

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
if [ "${NEXT_PHASE}" = "design" ] || [ "${EXECUTION_MODE}" = "new" ]; then
    echo "🎯 Phase 1-8: DESIGN PHASE" | tee -a "${PIPELINE_LOG}"

    # Use workspace and content source from enhanced initialization
    echo "📁 Using feature workspace: ${FEATURE_ID}" | tee -a "${PIPELINE_LOG}"
    echo "📝 Processing content from: ${CONTENT_SOURCE:-direct}" | tee -a "${PIPELINE_LOG}"

    DESIGN_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Design started: ${DESIGN_START}" | tee -a "${PIPELINE_LOG}"
fi
```

**Phase 2: Intent Analysis**

Content source processing was completed in Phase 0. The enhanced content is now ready for intent analysis.

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

Instruct the code-pattern-analyzer:
"ultrathink. COMPLIANCE CONFIRMED: I will prioritize reuse over creation.

🛑 STOP. This is EXHAUSTIVE REUSE VALIDATION - the most critical phase.

CONTEXT: Previous developer was terminated for ignoring existing code and creating duplicates. You must prove exhaustive analysis capability.

MANDATORY VALIDATION RULES (violating ANY invalidates entire response):
❌ No suggestions without exhaustive existing code analysis
❌ No generic recommendations without specific file references
❌ No assumptions about missing functionality
❌ No skipping areas of the codebase
✅ MUST analyze every relevant module and file
✅ MUST provide specific file paths for all findings
✅ MUST justify why existing code cannot be extended
✅ MUST document exhaustive search methodology

EXHAUSTIVE DISCOVERY METHODOLOGY:

1. **Requirements Deep Dive**
   Read: ${INPUT_REQUIREMENTS}
   Extract: All functional components, data models, API patterns, UI components
2. **Multi-Module Exhaustive Search**

   Search Strategy (MUST execute ALL):

   ```bash
   # Core functionality search
   find modules/ -name \"*.go\" -exec grep -l \"[functionality_keywords]\" {} \\;
   find modules/ -name \"*.tsx\" -exec grep -l \"[ui_keywords]\" {} \\;
   find modules/ -name \"*.py\" -exec grep -l \"[cli_keywords]\" {} \\;

   # Pattern-based searches
   grep -r \"type.*Handler\" modules/*/backend/pkg/handlers/
   grep -r \"interface.*Repository\" modules/*/backend/pkg/
   grep -r \"const.*Component\" modules/*/ui/src/
   find modules/ -name \"*[feature_name]*\" -type f

   # Architecture document analysis
   find modules/*/architecture/ -name \"*.md\" -exec grep -l \"[concepts]\" {} \\;
   find modules/*/docs/ -name \"*.md\" -exec grep -l \"[patterns]\" {} \\;
   ```

3. **Reusability Assessment Matrix**
   For each existing implementation found:

- Can be used as-is: 100% reuse
- Can be extended: 80% reuse
- Can be adapted: 60% reuse
- Must be refactored: 40% reuse
- Cannot be reused: 0% reuse (requires justification)

4. **Document Existing Implementation Discovery**

   Save to: ${EXISTING_IMPL_DISCOVERY}

   MANDATORY format:

   ```markdown
   # Exhaustive Reuse Analysis Report

   ## COMPLIANCE CONFIRMATION

   COMPLIANCE CONFIRMED: Exhaustive analysis performed, reuse prioritized over creation.

   ## SEARCH METHODOLOGY EXECUTED
   ```

- [x] Multi-module keyword search performed
- [x] Pattern-based analysis completed
- [x] Architecture document review finished
- [x] Similar functionality mapping done
- [x] Reusability assessment matrix applied

## EXISTING IMPLEMENTATIONS DISCOVERED

### 100% Reusable (Use As-Is)

- File: modules/chariot/backend/pkg/handlers/asset/handler.go
- Functionality: CRUD operations for entities
- Evidence: Lines 45-120 show identical pattern to requirements
- Reuse Strategy: Extend existing handler with new endpoints

### 80% Reusable (Extend)

- File: modules/chariot/ui/src/hooks/useAPI.ts
- Functionality: API integration patterns
- Gap: Missing specific endpoint integration
- Extension Strategy: Add new endpoint methods to existing hook

### Cannot Be Reused (REQUIRES EXHAUSTIVE JUSTIFICATION)

- Functionality: [specific functionality]
- Files Analyzed: [exhaustive list]
- Why Not Reusable: [detailed technical justification]
- Search Proof: [grep/find commands executed with results]

````

5. **Creation Justification Requirements**
For ANY suggestion of new files:

```markdown
## NEW FILE JUSTIFICATION (EXHAUSTIVE ANALYSIS REQUIRED)

### Proposed File: path/to/new/file.go

#### Exhaustive Reuse Analysis Performed

- [x] Searched all modules for similar functionality
- [x] Analyzed existing patterns for extension possibilities
- [x] Consulted architecture documents for reuse guidance
- [x] Attempted to adapt existing implementations

#### Files Analyzed for Reuse (MINIMUM 10 files required)

1. modules/chariot/backend/pkg/handlers/similar1.go - Cannot extend because [specific reason]
2. modules/janus/pkg/orchestration/similar2.go - Cannot adapt because [specific reason]
   [... minimum 10 files with specific reasons]

#### Technical Justification for Creation

- Existing Pattern Limitation: [specific technical limitation]
- Extension Impossibility: [why extending breaks existing functionality]
- Adaptation Failure: [why adaptation creates architectural debt]

#### Creation Approval Criteria Met

- [x] No existing implementation can be reused (>10 files analyzed)
- [x] Extension would break existing functionality (technical proof provided)
- [x] Adaptation would create architectural inconsistency
- [x] New pattern serves significantly different use case
````

6. **Create Implementation Gap Analysis**

   Save structured analysis to: ${IMPLEMENTATION_GAP_ANALYSIS}

   Format:

   ```json
    {
    "compliance_confirmation": "COMPLIANCE CONFIRMED: Gap analysis prioritizes reuse over creation",
    "discovery_confidence": "high|medium|low",
    "exhaustive_search_performed": true,
    "files_analyzed_count": 25,
    "existing_implementation_status": {
      "fully_implemented": [...],
      "partially_implemented": [
        {
          "feature": "...",
          "existing_capability": "...",
          "missing_capability": "...",
          "extension_effort": "low|medium|high",
          "reusable_percentage": 80,
          "files_to_extend": [...]
        }
      ],
      "similar_patterns_available": [
        {
          "pattern": "...",
          "location": "...",
          "adaptation_effort": "...",
          "reusable_percentage": 90,
          "specific_files": [...]
        }
      ]
    },
    "reuse_opportunities": { ... },
    "reuse_metrics": {
      "total_functionality_analyzed": 20,
      "fully_reusable_count": 8,
      "partially_reusable_count": 10,
      "creation_required_count": 2,
      "reuse_percentage": 90,
      "extension_percentage": 50,
      "creation_percentage": 10
    },
    "creation_justification_required": [...],
    "implementation_recommendation": "extend_existing",
    "justification": "...",
    "validation_checkpoints": {
      "minimum_files_analyzed": true,
      "exhaustive_search_documented": true,
      "creation_properly_justified": true,
      "reuse_percentage_acceptable": true
    }
   }
   ```

- You MUST find at least one existing implementation or explicitly state why none exist
- You MUST provide file paths and code examples for any implementations found
- You MUST assess reusability of existing patterns
- You CANNOT proceed to research recommendations until this discovery is complete"

#### Validate Reuse

```bash
 echo "=== REUSE VALIDATION GATE ===" | tee -a "${PIPELINE_LOG}"

# Validate exhaustive search was performed
if [ ! -f "${EXISTING_IMPL_DISCOVERY}" ]; then
    echo "❌ PIPELINE FAILURE: Exhaustive reuse analysis not found" | tee -a "${PIPELINE_LOG}"
    echo "Cannot proceed without mandatory reuse validation" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Validate compliance confirmation exists
COMPLIANCE_CHECK=$(grep -c "COMPLIANCE CONFIRMED" "${EXISTING_IMPL_DISCOVERY}")
if [ "${COMPLIANCE_CHECK}" -lt 2 ]; then
    echo "❌ PIPELINE FAILURE: Missing compliance confirmations" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Validate exhaustive search methodology
SEARCH_METHODOLOGY=$(grep -c "SEARCH METHODOLOGY EXECUTED" "${EXISTING_IMPL_DISCOVERY}")
if [ "${SEARCH_METHODOLOGY}" -eq 0 ]; then
    echo "❌ PIPELINE FAILURE: Search methodology not documented" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Validate minimum existing implementations found
EXISTING_IMPLS=$(grep -c "modules/" "${EXISTING_IMPL_DISCOVERY}")
if [ "${EXISTING_IMPLS}" -lt 5 ]; then
    echo "❌ PIPELINE FAILURE: Insufficient existing implementations analyzed (minimum 5)" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# **ENHANCED**: Validate implementation gap analysis exists and is valid
if [ ! -f "${IMPLEMENTATION_GAP_ANALYSIS}" ]; then
    echo "❌ PIPELINE FAILURE: Implementation gap analysis not found" | tee -a "${PIPELINE_LOG}"
    echo "Required file: ${IMPLEMENTATION_GAP_ANALYSIS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# **ENHANCED**: Validate gap analysis has required reuse metrics
REUSE_PERCENTAGE=$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.reuse_metrics.reuse_percentage // 0')
if [ "${REUSE_PERCENTAGE}" -lt 70 ]; then
    echo "⚠️  WARNING: Low reuse percentage detected: ${REUSE_PERCENTAGE}%" | tee -a "${PIPELINE_LOG}"
    echo "Reuse-first validation expects >70% reuse" | tee -a "${PIPELINE_LOG}"
fi

# **ENHANCED**: Validate gap analysis compliance confirmation
GAP_COMPLIANCE=$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.compliance_confirmation')
if [[ "${GAP_COMPLIANCE}" != *"COMPLIANCE CONFIRMED"* ]]; then
    echo "❌ PIPELINE FAILURE: Gap analysis missing compliance confirmation" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# **ENHANCED**: Validate exhaustive search documentation in gap analysis
EXHAUSTIVE_SEARCH=$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.exhaustive_search_performed')
FILES_ANALYZED=$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.files_analyzed_count // 0')
if [ "${EXHAUSTIVE_SEARCH}" != "true" ] || [ "${FILES_ANALYZED}" -lt 10 ]; then
    echo "❌ PIPELINE FAILURE: Insufficient exhaustive search documentation in gap analysis" | tee -a "${PIPELINE_LOG}"
    echo "Required: exhaustive_search_performed=true, files_analyzed_count>=10" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Update compliance tracker
jq '.phases_validated += ["phase_2_1_exhaustive_reuse"] | .reuse_analysis_performed = true' \
    "${COMPLIANCE_TRACKER}" > "${COMPLIANCE_TRACKER}.tmp" && \
    mv "${COMPLIANCE_TRACKER}.tmp" "${COMPLIANCE_TRACKER}"

echo "✅ EXHAUSTIVE REUSE VALIDATION PASSED" | tee -a "${PIPELINE_LOG}"
echo "Proceeding with validated reuse analysis" | tee -a "${PIPELINE_LOG}"
```

**Phase 4: Knowledge Synthesis**
Use the `knowledge-synthesizer` subagent to analyze requirements and recommend research approach **informed by existing implementation discovery**

Instruct the knowledge-synthesizer:
"ultrathink. Analyze the requirements and determine what research is needed for this feature (Informed by Existing Implementation Discovery)

**Context from Discovery Phase:**

- Existing Implementation Discovery: ${EXISTING_IMPL_DISCOVERY}
- Implementation Gap Analysis: ${IMPLEMENTATION_GAP_ANALYSIS}

**CRITICAL: Base all research recommendations on the gap analysis, not assumptions about missing functionality.**

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
    echo "📋 Knowledge synthesizer recommendations:" | tee -a "${PIPELINE_LOG}"
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

Use research agents based on knowledge-synthesizer recommendations
Example instruction pattern (not direct Task calls):

Use the context7-search-specialist subagent for API documentation research
Use the web-research-specialist subagent for security best practices Use the code-pattern-analyzer subagent for existing pattern analysis

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
source .claude/features/current_feature.env
# Verify individual research files were created
echo "Checking individual research outputs..."
RESEARCH_FILES=$(find "${RESEARCH_DIR}" -name "*.md" -type f | wc -l)
if [ "$RESEARCH_FILES" -eq "0" ]; then
    echo "⚠️ No research files found. Ensure research agents have completed." | tee -a "${PIPELINE_LOG}"
else
    echo "✓ Found ${RESEARCH_FILES} research output files:" | tee -a "${PIPELINE_LOG}"
    ls -la "${RESEARCH_DIR}/"*.md
fi
```

DO NOT PROCEED TO PHASE 5 until all research agents are spawned and their tasking has completed.

**Phase 5: Architectural Impact Triage**

```bash
source .claude/features/current_feature.env
echo "🏗️ ARCHITECTURAL REUSE VALIDATION" | tee -a "${PIPELINE_LOG}"
echo "Building on Phase 3 exhaustive reuse analysis" | tee -a "${PIPELINE_LOG}"

# Validate Reuse Gate
if [ ! -f "${EXISTING_IMPL_DISCOVERY}" ] || [ ! -f "${IMPLEMENTATION_GAP_ANALYSIS}" ]; then
    echo "❌ PIPELINE FAILURE: Phase 3 reuse analysis missing" | tee -a "${PIPELINE_LOG}"
    echo "Cannot proceed to architectural triage without reuse validation" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

# Extract reuse metrics from Gap Analysis for architectural decisions
PHASE2_REUSE_PERCENTAGE=$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.reuse_metrics.reuse_percentage // 0')
PHASE2_CREATION_COUNT=$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq '.creation_justification_required | length')

echo "📊 Phase 3 Reuse Analysis Results:" | tee -a "${PIPELINE_LOG}"
echo "  - Overall Reuse Percentage: ${PHASE2_REUSE_PERCENTAGE}%" | tee -a "${PIPELINE_LOG}"
echo "  - Creation Justifications Required: ${PHASE2_CREATION_COUNT}" | tee -a "${PIPELINE_LOG}"

# Set up architectural triage context
TRIAGE_CONTEXT=".claude/features/${FEATURE_ID}/context/impact-triage-context.md"
IMPACT_ANALYSIS=".claude/features/${FEATURE_ID}/context/impact-analysis.json"

# Create enhanced triage context that includes Phase 3 analysis
cat > "${TRIAGE_CONTEXT}" << 'EOF'
# Architectural Impact Triage Context (Enhanced with Phase 3 Analysis)

## Feature Requirements
EOF

if ! cat ".claude/features/${FEATURE_ID}/context/requirements.json" | jq -r '.user_stories[]' >> "${TRIAGE_CONTEXT}"; then
    echo "ERROR: Failed to extract user stories" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

cat >> "${TRIAGE_CONTEXT}" << EOF

## Phase 3 Reuse Analysis Summary (MANDATORY CONTEXT)
### Reuse Metrics from Phase 3
- Overall Reuse Percentage: ${PHASE2_REUSE_PERCENTAGE}%
- Creation Justifications: ${PHASE2_CREATION_COUNT} items require new file creation

### Extension Opportunities Identified in Phase 3
EOF
cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.existing_implementation_status.similar_patterns_available[]? | "- Pattern: \(.pattern) at \(.location) (\(.reusable_percentage)% reusable)"' >> "${TRIAGE_CONTEXT}" 2>/dev/null || echo "No patterns found" >> "${TRIAGE_CONTEXT}"

cat >> "${TRIAGE_CONTEXT}" << 'EOF'

### Files Already Analyzed for Reuse (Do Not Re-analyze)
EOF

grep -A 50 "Files Analyzed for Reuse" "${EXISTING_IMPL_DISCOVERY}" >> "${TRIAGE_CONTEXT}" 2>/dev/null || echo "See ${EXISTING_IMPL_DISCOVERY} for complete analysis" >> "${TRIAGE_CONTEXT}"

cat >> "${TRIAGE_CONTEXT}" << 'EOF'

## Affected Systems (from requirements)
EOF
cat ".claude/features/${FEATURE_ID}/context/requirements.json" | jq -r '.affected_systems[]' >> "${TRIAGE_CONTEXT}" 2>/dev/null

echo "✅ Enhanced triage context prepared: ${TRIAGE_CONTEXT}" | tee -a "${PIPELINE_LOG}"
```

Use the general-system-architect subagent in "triage mode"

Instruct the general-system-architect:

"ultrathink. COMPLIANCE CONFIRMED: I will prioritize extending existing architecture over creating new patterns.

🛑 STOP. Before architectural analysis, confirm understanding:

1. Existing architecture must be extended, not replaced
2. New architectural patterns require exhaustive justification
3. Must reference specific architecture files for all decisions
4. Creating new architectural components invalidates response without justification

**CRITICAL: This analysis builds on completed Phase 3 exhaustive reuse validation.**

**Phase 2 Context (MANDATORY READING):**

- Reuse Analysis: ${EXISTING_IMPL_DISCOVERY}
- Gap Analysis: ${IMPLEMENTATION_GAP_ANALYSIS}
- Triage Context: ${TRIAGE_CONTEXT}

**Phase 2 already performed exhaustive codebase search - DO NOT re-analyze files already covered.**

REUSE-FIRST ARCHITECTURAL TRIAGE (15-minute time limit):

1. **Existing Architecture Discovery** (BUILD ON PHASE 2)

   **Read Existing Patterns & Code Analysis First:**

   ```bash
   source .claude/features/current_feature.env
   # Review Phase 2 reuse opportunities (DO NOT duplicate this search)
   cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq '.existing_implementation_status.similar_patterns_available'
   cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq '.reuse_opportunities'

   # Focus on ARCHITECTURAL patterns not covered in Phase 2
   find modules/*/architecture/ -name "*.md" -exec grep -l "[architectural_concepts]" {} \;
   find . -name "DESIGN-PATTERNS.md" -exec grep -A 10 -B 10 "[architectural_patterns]" {} \;
   ```

2. Architectural Extension Assessment
   For each architectural component needed:

   - Leverage Phase 2 Findings: Use existing reuse opportunities identified
   - Extend Existing: Can Phase 2 patterns support architectural needs? (PREFERRED)
   - Adapt Existing: Can Phase 2 patterns be adapted architecturally? (ACCEPTABLE)
   - Create New: Must new architecture be created? (REQUIRES ADDITIONAL JUSTIFICATION)

3. Phase 2 Integration and Architectural Extension
   Reference Phase 2 findings:

### Phase 2 Patterns Available for Architectural Extension

```bash
source .claude/features/current_feature.env
$(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.existing_implementation_status.similar_patterns_available[] | "- \(.pattern) at \(.location) (\(.reusable_percentage)% reusable)"')
```

### New Architectural Extensions Needed (Beyond Phase 2)

- Pattern: [Only if Phase 2 patterns insufficient for architecture]
- Location: [New architectural pattern location]
- Extension Method: [How to build on Phase 2 findings]
- Phase 2 Integration: [How this relates to Phase 2 reuse opportunities]

4. Enhanced Creation Justification (IF REQUIRED BEYOND PHASE 2)

### NEW ARCHITECTURAL PATTERN JUSTIFICATION (BEYOND PHASE 2)

#### Pattern: [New Architectural Pattern Name]

#### Phase 2 Analysis Integration

- Phase 2 Reuse Percentage: ${PHASE2_REUSE_PERCENTAGE}%
- Phase 2 Creation Count: ${PHASE2_CREATION_COUNT} items
- Phase 2 Patterns Reviewed: [Reference specific patterns from Phase 2]
- Why Phase 2 Patterns Architecturally Insufficient: [Specific architectural limitation]

#### Additional Architectural Analysis (Beyond Phase 2)

- Architectural Pattern 1: [path] - Cannot extend architecturally because [specific reason]
- Architectural Pattern 2: [path] - Cannot adapt architecturally because [specific reason]
  [MINIMUM 3 additional architectural patterns analyzed beyond Phase 2]

5. Impact Analysis with Phase 2 Integration

Save to: ${IMPACT_ANALYSIS}

```json
{
  "triage_summary": "Brief 2-sentence impact summary",
  "file_impact_estimate": {
    "frontend_files": 5,
    "backend_files": 3,
    "config_files": 2,
    "total_estimated": 10
  },
  "code_volume_estimate": {
    "lines_of_code_range": "150-300",
    "confidence_level": "medium"
  },
  "compliance_confirmation": "COMPLIANCE CONFIRMED: Architectural extension prioritized, builds on Phase 2 analysis",
  "phase_2_integration": {
    "phase_2_reuse_percentage": "${PHASE2_REUSE_PERCENTAGE}",
    "phase_2_creation_count": "${PHASE2_CREATION_COUNT}",
    "phase_2_patterns_leveraged": [
      "Extracted from gap analysis during execution"
    ],
    "phase_2_gaps_for_architecture": [
      "Architectural needs not covered by Phase 2"
    ]
  },
  "reuse_validation": {
    "reuse_metrics": {
      "phase_2_baseline_reuse": "${PHASE2_REUSE_PERCENTAGE}",
      "architectural_extension_reuse": "80",
      "architectural_creation_required": "5",
      "total_architectural_reuse": "95"
    },
    "existing_patterns_analyzed": [
      "Phase 2 patterns: See gap analysis for details",
      "Additional architectural patterns analyzed"
    ],
    "extension_opportunities": [
      {
        "pattern": "[Pattern from Phase 2 or new architectural pattern]",
        "location": "[Location]",
        "extension_feasibility": "high|medium|low",
        "phase_2_reuse_percentage": "90",
        "architectural_extension_method": "[How to extend architecturally]"
      }
    ]
  },
  "change_scope": {
    "domains": ["frontend", "design-system"],
    "breaking_changes": false,
    "database_changes": false,
    "external_integrations": false
  },
  "risk_indicators": ["Performance impact from theme switching"],
  "triage_confidence": "high"
}
```

#### Architectural Triage Validation Gate

```bash
source .claude/features/current_feature.env
if [ ! -f "${IMPACT_ANALYSIS}" ]; then
    echo "❌ PIPELINE FAILURE: Architectural impact analysis not found" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

#### Validate Impact Analysis
PHASE2_INTEGRATION=$(cat "${IMPACT_ANALYSIS}" | jq -r '.phase_2_integration.phase_2_reuse_percentage')
if [ -z "${PHASE2_INTEGRATION}" ] || [ "${PHASE2_INTEGRATION}" = "null" ]; then
    echo "❌ PIPELINE FAILURE: Missing Phase 3 integration in architectural analysis" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

echo "✅ Architectural triage validation passed" | tee -a "${PIPELINE_LOG}"
```

DO NOT PROCEED TO PHASE 6 until all agents are spawned and their tasking has completed.

**Phase 6: Complexity Assessment**

Prepare paths and context:

```bash
source .claude/features/current_feature.env
REQUIREMENTS_PATH=".claude/features/${FEATURE_ID}/context/requirements.json"
KNOWLEDGE_PATH=".claude/features/${FEATURE_ID}/context/knowledge-base.md"
IMPACT_ANALYSIS=".claude/features/${FEATURE_ID}/context/impact-analysis.json"
ASSESSMENT_OUTPUT=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
IMPLEMENTATION_GAP_ANALYSIS=".claude/features/${FEATURE_ID}/context/implementation-gap-analysis.json"

echo "=== Complexity Assessor Paths ===" | tee -a "${PIPELINE_LOG}"
echo "Requirements: ${REQUIREMENTS_PATH}" | tee -a "${PIPELINE_LOG}"
echo "Knowledge: ${KNOWLEDGE_PATH}" | tee -a "${PIPELINE_LOG}"
echo "Impact Analysis: ${IMPACT_ANALYSIS}" | tee -a "${PIPELINE_LOG}"
echo "Output: ${ASSESSMENT_OUTPUT}" | tee -a "${PIPELINE_LOG}"
echo "Phase 3 Gap Analysis: ${IMPLEMENTATION_GAP_ANALYSIS}" | tee -a "${PIPELINE_LOG}"
echo "=================================" | tee -a "${PIPELINE_LOG}"

# Show summary of what was found
echo "Knowledge Summary:"
grep -A 3 "## Similar Patterns Found" "${KNOWLEDGE_PATH}" 2>/dev/null | head -10 || echo "No knowledge base found"

if [ -f "${IMPACT_ANALYSIS}" ]; then
    echo "Impact Analysis Summary:"
    echo "- Estimated files: $(cat "${IMPACT_ANALYSIS}" | jq -r '.file_impact_estimate.total_estimated') files"
    echo "- Code volume: $(cat "${IMPACT_ANALYSIS}" | jq -r '.code_volume_estimate.lines_of_code_range') LOC"
    echo "- Domains: $(cat "${IMPACT_ANALYSIS}" | jq -r '.change_scope.domains | join(", ")')"
    echo "- Confidence: $(cat "${IMPACT_ANALYSIS}" | jq -r '.triage_confidence')"
    echo "- Phase 3 Reuse: $(cat "${IMPACT_ANALYSIS}" | jq -r '.phase_2_integration.phase_2_reuse_percentage')%"
    echo "- Architectural Reuse: $(cat "${IMPACT_ANALYSIS}" | jq -r '.reuse_validation.reuse_metrics.total_architectural_reuse')%"
else
    echo "⚠️ No impact analysis found - using heuristic assessment" | tee -a "${PIPELINE_LOG}"
fi

if [ -f "${IMPLEMENTATION_GAP_ANALYSIS}" ]; then
    echo "Phase 3 Reuse Analysis:"
    echo "- Overall Reuse: $(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq -r '.reuse_metrics.reuse_percentage')%"
    echo "- Creation Required: $(cat "${IMPLEMENTATION_GAP_ANALYSIS}" | jq '.creation_justification_required | length') items"
fi
```

Use the `complexity-assessor` subagent to evaluate implementation complexity.

Instruct the complexity-assessor:
"ultrathink. Assess the complexity of implementing this feature.

Read context from:

1. The Requirements path shown above (ending with /requirements.json)
2. The Knowledge path shown above (ending with /knowledge-base.md)
3. **NEW:** The Impact Analysis path shown above (ending with /impact-analysis.json) - USE THIS FOR QUANTITATIVE METRICS

**CRITICAL: If impact-analysis.json exists, use its quantitative data for scoring:**

- Use file_impact_estimate.total_estimated for File Impact Score
- Use code_volume_estimate for Code Volume Score
- Use change_scope and architectural_patterns for Architectural Impact
- Use risk_indicators for Risk Factors

**If impact-analysis.json is missing, fall back to heuristic assessment from requirements/knowledge.**

Save your assessment to the Output path shown above (ending with /complexity-assessment.json).

Your assessment should include:
{
'level': 'Simple|Medium|Complex',
'factors': ['list of complexity factors'],
'affected_domains': ['frontend', 'backend', 'database', 'security', 'information'],
'estimated_effort': 'hours or days',
'risk_level': 'Low|Medium|High',
'justification': 'explanation of assessment',
'data_source': 'architectural_triage|heuristic_fallback'
}"

Check the complexity level:

```bash
source .claude/features/current_feature.env
COMPLEXITY_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
if [ -f "${COMPLEXITY_FILE}" ]; then
    # Enhanced complexity data extraction
    COMPLEXITY_LEVEL=$(cat "${COMPLEXITY_FILE}" | jq -r '.level')
    COMPLEXITY_SCORE=$(cat "${COMPLEXITY_FILE}" | jq -r '.score // 50')
    ESTIMATED_EFFORT=$(cat "${COMPLEXITY_FILE}" | jq -r '.estimated_effort // "medium"')
    RISK_LEVEL=$(cat "${COMPLEXITY_FILE}" | jq -r '.risk_level // "Medium"')

    echo "✓ Enhanced complexity assessment:" | tee -a "${PIPELINE_LOG}"
    echo "  - Level: ${COMPLEXITY_LEVEL} (Score: ${COMPLEXITY_SCORE}/100)" | tee -a "${PIPELINE_LOG}"
    echo "  - Risk: ${RISK_LEVEL}" | tee -a "${PIPELINE_LOG}"
    echo "  - Estimated Effort: ${ESTIMATED_EFFORT}" | tee -a "${PIPELINE_LOG}"
else
    echo "✗ Complexity assessment failed" | tee -a "${PIPELINE_LOG}"
    COMPLEXITY_LEVEL="Unknown"
    COMPLEXITY_SCORE=50
    ESTIMATED_EFFORT="medium"
    RISK_LEVEL="Medium"
fi
```

**Phase 7: Thinking Budget Optimization**

### Optimize thinking budget allocation for architecture specialists:

```bash
source .claude/features/current_feature.env
COMPLEXITY_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
ARCH_THINKING_ALLOCATION=".claude/features/${FEATURE_ID}/context/architecture-thinking-allocation.json"

echo "=== Architecture Phase Thinking Budget Optimization ===" | tee -a "${PIPELINE_LOG}"
echo "Complexity file: ${COMPLEXITY_FILE}" | tee -a "${PIPELINE_LOG}"
echo "Thinking allocation output: ${ARCH_THINKING_ALLOCATION}" | tee -a "${PIPELINE_LOG}"
echo "=================================" | tee -a "${PIPELINE_LOG}"
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

# Validate Thinking Allocation

```bash
source .claude/features/current_feature.env
if [ -f "${ARCH_THINKING_ALLOCATION}" ]; then
    echo "✓ Architecture thinking allocation completed" | tee -a "${PIPELINE_LOG}"
    cat "${ARCH_THINKING_ALLOCATION}" | jq -r '.cost_estimate'
else
    echo "✗ Architecture thinking allocation failed - using defaults" | tee -a "${PIPELINE_LOG}"
fi
```

**Phase 8: Architecture Planning (If Complex)**

Check if architecture planning is needed:

```bash
source .claude/features/current_feature.env
# Re-use enhanced complexity variables from Phase 4 (if still in scope)
# Otherwise re-read for architecture decision logic
if [ -z "${COMPLEXITY_SCORE}" ]; then
    COMPLEXITY_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
    COMPLEXITY_LEVEL=$(cat "${COMPLEXITY_FILE}" | jq -r '.level' 2>/dev/null || echo "Unknown")
    COMPLEXITY_SCORE=$(cat "${COMPLEXITY_FILE}" | jq -r '.score // 50' 2>/dev/null || echo "50")
    RISK_LEVEL=$(cat "${COMPLEXITY_FILE}" | jq -r '.risk_level // "Medium"' 2>/dev/null || echo "Medium")
fi

# Enhanced architecture planning decision logic
if [ ${COMPLEXITY_SCORE} -ge 71 ]; then
    ARCH_APPROACH="comprehensive-architecture-planning"
    echo "=== Comprehensive Architecture Planning Required (Score: ${COMPLEXITY_SCORE}/100, Level: ${COMPLEXITY_LEVEL}) ===" | tee -a "${PIPELINE_LOG}"
elif [ ${COMPLEXITY_SCORE} -ge 40 ] || [ "${COMPLEXITY_LEVEL}" = "Medium" ]; then
    ARCH_APPROACH="focused-architecture-planning"
    echo "=== Focused Architecture Planning Required (Score: ${COMPLEXITY_SCORE}/100, Level: ${COMPLEXITY_LEVEL}) ===" | tee -a "${PIPELINE_LOG}"
else
    ARCH_APPROACH="skip-architecture-planning"
    echo "=== Architecture Planning Skipped (Score: ${COMPLEXITY_SCORE}/100, Level: ${COMPLEXITY_LEVEL}) ===" | tee -a "${PIPELINE_LOG}"
fi

if [ "${ARCH_APPROACH}" != "skip-architecture-planning" ]; then

    # Prepare architect context and directory
    ARCHITECTURE_DIR=".claude/features/${FEATURE_ID}/architecture"
    ARCHITECTURE_CONTEXT_FILE="${ARCHITECTURE_DIR}/architect-context.md"
    ARCHITECTURE_COORDINATION_PLAN="${ARCHITECTURE_DIR}/coordination-plan.json"

    # Create architecture directory for individual architect outputs
    mkdir -p "${ARCHITECTURE_DIR}"

    # Create consolidated context for architects
    cat > "${ARCHITECTURE_CONTEXT_FILE}" << EOFA
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

    COMPLEXITY_FILE=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
    COMPLEXITY_LEVEL=$(cat "${COMPLEXITY_FILE}" | jq -r '.level' 2>/dev/null || echo "Unknown")
    COMPLEXITY_SCORE=$(cat "${COMPLEXITY_FILE}" | jq -r '.score // 50' 2>/dev/null || echo "50")
    RISK_LEVEL=$(cat "${COMPLEXITY_FILE}" | jq -r '.risk_level // "Medium"' 2>/dev/null || echo "Medium")


    echo "=== Architecture Planning ===" | tee -a "${PIPELINE_LOG}"
    echo "Architecture Approach: ${ARCH_APPROACH}" | tee -a "${PIPELINE_LOG}"
    echo "Architecture Context: ${ARCHITECTURE_CONTEXT_FILE}" | tee -a "${PIPELINE_LOG}"
    echo "Affected domains requiring architects:"
    # TODO JSON File
    cat "${COMPLEXITY_FILE}" | jq -r '.affected_domains[]' 2>/dev/null
    echo "Architecture Directory: ${ARCHITECTURE_DIR}" | tee -a "${PIPELINE_LOG}"
    echo "Architecture Coordination: ${ARCHITECTURE_COORDINATION_PLAN}" | tee -a "${PIPELINE_LOG}"
    echo "Complexity File: ${COMPLEXITY_FILE}" | tee -a "${PIPELINE_LOG}"
    echo "Complexity Score: ${COMPLEXITY_SCORE}" | tee -a "${PIPELINE_LOG}"
    echo "Complexity Level: ${COMPLEXITY_LEVEL}" | tee -a "${PIPELINE_LOG}"
    echo "Ris Level: ${RISK_LEVEL}" | tee -a "${PIPELINE_LOG}"
    echo "====================================" | tee -a "${PIPELINE_LOG}"
fi
```

If architecture planning is required, use the `architecture-coordinator`:

Instruct the architecture-coordinator:
"ultrathink. Analyze this complex feature and recommend an architecture approach.

Read context from: ${ARCHITECTURE_CONTEXT_FILE}

Also read the full knowledge base from: ${KNOWLEDGE_PATH}

Instead of spawning architects directly, save your recommendations to: ${ARCHITECTURE_COORDINATION_PLAN}

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

Based on the coordination plan above, spawn the recommended architects:

if architecture coordinator recommends `spawn_architects` then

then For each high-priority architect: 1. Use Task tool to spawn the specialized architect 2. Provide the architect context from: ${ARCHITECTURE_CONTEXT_FILE} for each architecture agent 3. Include the specific focus from the coordination plan for each architecture agent 4. Direct output to: ${ARCHITECTURE_DIR}/[architect-type]-architecture.md

    The architects should work in parallel if the execution_strategy is `parallel`.

tf architecture coordinator `single_architect`

    then use the `general-system-architect` subagent to evaluate the architecture

if architecture coordinator recommends **skip_architecture**

    then do not launch any sub agents

### Validate Design Phase Completion

```bash
source .claude/features/current_feature.env`
# Complete design phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "design" "implement" "${FEATURE_ID}" "design_phases_completed=7" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)

if [ "${COMPLETION_STATUS}" != "design_completed" ]; then
    echo "❌ Design phase completion failed"
    exit 1
fi

echo "🎯 Design phase complete - proceeding to ${NEXT_PHASE} phase"
```

```bash
source .claude/features/current_feature.env
if [ "${NEXT_PHASE}" = "implement" ] || [ "${EXECUTION_MODE}" = "new" ]; then
    echo "⚙️ Phase 9-10: IMPLEMENTATION PHASE" | tee -a "${PIPELINE_LOG}"

    IMPL_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Implementation started: ${IMPL_START}" | tee -a "${PIPELINE_LOG}"
fi
```

**Phase 9: Implementation Planning**

```bash
source .claude/features/current_feature.env
# Run mechanical context creation script
CONTEXT_OUTPUT=$(.claude/scripts/phases/implementation/setup-implementation-planning.sh "${FEATURE_ID}")
echo "${CONTEXT_OUTPUT}"

# Extract file paths from script output
PLANNING_CONTEXT=$(echo "${CONTEXT_OUTPUT}" | grep "PLANNING_CONTEXT=" | cut -d'=' -f2)
AGENT_ASSIGNMENTS=$(echo "${CONTEXT_OUTPUT}" | grep "AGENT_ASSIGNMENTS=" | cut -d'=' -f2)
FINAL_PLAN=$(echo "${CONTEXT_OUTPUT}" | grep "FINAL_PLAN=" | cut -d'=' -f2)

echo "=== Implementation Planning Paths ===" | tee -a "${PIPELINE_LOG}"
echo "Planning context: ${PLANNING_CONTEXT}" | tee -a "${PIPELINE_LOG}"
echo "Agent Assignments: ${AGENT_ASSIGNMENTS}" | tee -a "${PIPELINE_LOG}"
echo "Final Plan: ${FINAL_PLAN}" | tee -a "${PIPELINE_LOG}"
echo "=================================" | tee -a "${PIPELINE_LOG}"
```

### Step 2: Einstein Calls Implementation-Planner Agent

Use the `implementation-planner` subagent to create strategic implementation plan with dual-format output.

Instruct the implementation-planner:
"ultrathink. COMPLIANCE CONFIRMED: I will prioritize reuse over creation in all implementation planning.

🛑 STOP. Implementation planning with exhaustive creation justification required.

CONTEXT: Implementation must extend existing code. Creating new files requires exhaustive justification that will be validated.

MANDATORY IMPLEMENTATION PLANNING RULES:
❌ No new files without exhaustive reuse analysis reference
❌ No agent assignments for file creation without justification
❌ No generic implementation plans without specific existing file references
❌ No ignoring existing patterns documented in previous phases
✅ Must reference existing implementations from Phase 2.1 analysis
✅ Must assign agents to extend/adapt existing files preferentially
✅ Must provide migration strategies for consolidating duplicates
✅ Must include specific file path justifications for any creation

ENHANCED PLANNING PROCESS:

1. **Reuse Analysis Integration** (MANDATORY)

   - Read exhaustive reuse analysis: ${EXISTING_IMPL_DISCOVERY}
   - Read architectural extension opportunities: ${IMPACT_ANALYSIS}
   - Build plan around documented reuse opportunities
   - Reference specific existing files for all suggestions

2. **Agent Assignment with Creation Justification**

For each agent assignment, categorize as:

- **EXTEND**: Agent extends existing files (PREFERRED - no justification needed)
- **ADAPT**: Agent adapts existing patterns (ACCEPTABLE - brief justification)
- **CREATE**: Agent creates new files (REQUIRES EXHAUSTIVE JUSTIFICATION)

Agent Assignment Format:

```markdown
## Strategic Agent Assignments

### Assigned to: golang-api-developer

- **Domain**: Backend API development
- **Tasks**:
  - Implement REST API endpoints for [specific functionality]
  - Create database integration layer
  - Handle authentication middleware
- **Files**: modules/chariot/backend/pkg/handlers/[feature]/
- **Dependencies**: None (primary group)
- **Execution Group**: Primary (parallel safe)
- **Architecture Context**: backend-architecture.md, api-architecture.md
- **Compliance Type**: EXTEND (90% of work), CREATE (10% of work)

- **EXTEND Tasks** (No justification required):

  - Extend: modules/chariot/backend/pkg/handlers/asset/handler.go
  - Add new endpoints following existing CRUD pattern
  - Reference: Lines 45-120 show identical pattern
  - Files to modify: handler.go, routes.go, validator.go

- **CREATE Tasks** (EXHAUSTIVE JUSTIFICATION REQUIRED):
  - Create: modules/chariot/backend/pkg/handlers/websocket/
  - Justification Reference: See ${EXISTING_IMPL_DISCOVERY} lines 450-520
  - Exhaustive Search: 15 files analyzed, no WebSocket infrastructure found
  - Extension Impossible: No existing handler pattern supports WebSocket
  - Files Analyzed: [list of 15 files with reasons why unusable]
  - Approval Criteria Met: ✅ >10 files analyzed ✅ Extension impossible ✅ Technical justification provided

### Assigned to: react-developer

- **Domain**: Frontend UI development
- **Tasks**:
  - Create [specific UI components]
  - Implement state management
  - Integrate with backend APIs
- **Files**: modules/chariot/ui/src/sections/[feature]/
- **Dependencies**: golang-api-developer (API contracts)
- **Execution Group**: Secondary (depends on primary)
- **Architecture Context**: frontend-architecture.md, ui-architecture.md
  ...
  ...
```

**Read the complete context from:** [planning-context.md path provided above]

**CRITICAL: Generate TWO outputs for reliable agent coordination:**

## Output 1: Human-Readable Plan

**Save to:** [implementation-plan.md path provided above]

Your comprehensive plan must include:

1. **Feature Implementation Overview**
2. **Phased implementation approach with specific tasks**
3. **Strategic Agent Assignments Section** (use consistent format):
4. **File references from the knowledge base**
5. **Testing strategy**
6. **Success criteria**
7. **Rollback procedures**

## Output 2: Machine-Readable Assignments

**Save to:** [agent-assignments.json path provided above]

Create structured JSON for reliable parsing:

```json
{
  "feature_id": "${FEATURE_ID}",
  "complexity_level": "Medium",
  "execution_strategy": "parallel",
  "thinking_budget": "think",
  "compliance_framework": "All agents must confirm reuse over creation",
  "assignments": [
    {
      "agent": "golang-api-developer",
      "domain": "backend",
      "compliance_type": "EXTEND_PREFERRED",
      "reuse_ratio": "90% extend, 10% create",
      "tasks": [
        "Implement REST API endpoints for feature functionality",
        "Create database integration layer",
        "Handle authentication middleware"
      ],
      "files": ["modules/chariot/backend/pkg/handlers/feature/"],
      "parallel_group": "primary",
      "dependencies": [],
      "architecture_files": ["backend-architecture.md", "api-architecture.md"],
      "estimated_effort": "4-6 hours",
      "thinking_level": "think"
    },
    {
      "agent": "react-developer",
      "domain": "frontend",
      "compliance_type": "ADAPT_ACCEPTABLE",
      "reuse_ratio": "80% adapt, 20% create",
      "tasks": [
        "Create UI components following existing patterns",
        "Implement state management using established hooks",
        "Integrate with backend APIs"
      ],
      "files": ["modules/chariot/ui/src/sections/feature/"],
      "parallel_group": "secondary",
      "dependencies": ["golang-api-developer"],
      "architecture_files": ["frontend-architecture.md", "ui-architecture.md"],
      "estimated_effort": "3-5 hours",
      "thinking_level": "think"
    }
  ],
  "coordination_requirements": {
    "api_contracts": "golang-api-developer must document API contracts for react-developer",
    "shared_workspaces": [
      "coordination/api-contracts/",
      "coordination/communication/"
    ],
    "execution_order": "primary_then_secondary"
  },
  "reuse_validation": {
    "total_agents": 2,
    "extend_preferred_agents": 1,
    "adapt_acceptable_agents": 1,
    "create_justified_agents": 0,
    "overall_reuse_percentage": 85
  }
}
```

**Strategic Agent Selection Logic (analyze from context):**

Based on the affected domains from complexity assessment:

- **If 'backend' in affected_domains** → Assign: golang-api-developer
- **If 'frontend' in affected_domains** → Assign: react-developer
- **If 'database' in affected_domains** → Assign: database-neo4j-architect
- **If 'integration' in affected_domains** → Assign: integration-developer
- **If 'security' in affected_domains** → Note for security review phase (not implementation)

**Execution Strategy Logic:**

- **Multi-domain features (2+ domains)** → execution_strategy: "parallel"
- **Single domain features** → execution_strategy: "sequential"
- **Frontend + Backend** → react-developer depends on golang-api-developer
- **Complex features** → thinking_budget: "ultrathink"
- **Medium features** → thinking_budget: "think harder"
- **Simple features** → thinking_budget: "think hard"

**CRITICAL Requirements:**

1. Agent assignments must use consistent 'Assigned to: {agent-name}' format in markdown
2. JSON must be valid and parseable for reliable extraction
3. Include coordination requirements and dependency mapping
4. Specify execution groups (primary/secondary) for parallel coordination
5. Reference specific architecture files available per agent domain

Make sure to reference the specific patterns and files identified in the technical context section."

### Step 3: Standard Phase Completion (Post-Agent Bash Execution)

Wait for implementation-planner to complete, then use standard completion handler:

### Validate Phase 9 Implementation Planning

```bash
source .claude/features/current_feature.env
SOURCE_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"
AGENT_ASSIGNMENTS_FILE=".claude/features/${FEATURE_ID}/output/agent-assignments.json"

if [ -f "${SOURCE_PLAN}" ] && [ -f "${AGENT_ASSIGNMENTS_FILE}" ]; then
    echo "✓ Files exist - validating JSON structure..." | tee -a "${PIPELINE_LOG}"

    # 1. Validate JSON syntax
    if ! jq '.' "${AGENT_ASSIGNMENTS_FILE}" >/dev/null 2>&1; then
        echo "❌ Invalid JSON format in ${AGENT_ASSIGNMENTS_FILE}"
         exit 1
    fi

    # 2. Validate required fields exist
    REQUIRED_FIELDS=("feature_id" "assignments" "execution_strategy")
    for field in "${REQUIRED_FIELDS[@]}"; do
        if [ "$(cat "${AGENT_ASSIGNMENTS_FILE}" | jq "has(\"${field}\")")" != "true" ]; then
            echo "❌ Missing required field: ${field} in agent assignments"
            exit 1
        fi
    done

    # 3. Validate assignments array is not empty
    TOTAL_AGENTS=$(cat "${AGENT_ASSIGNMENTS_FILE}" | jq '.assignments | length')
    if [ "${TOTAL_AGENTS}" -eq 0 ]; then
        echo "❌ No agent assignments found - assignments array is empty"
        exit 1
    fi

    # 4. Validate execution strategy is valid value
    EXECUTION_STRATEGY=$(cat "${AGENT_ASSIGNMENTS_FILE}" | jq -r '.execution_strategy')
    case "${EXECUTION_STRATEGY}" in
        "parallel"|"sequential"|"phased")
            echo "✓ Valid execution strategy: ${EXECUTION_STRATEGY}" | tee -a "${PIPELINE_LOG}"
            ;;
        *)
            echo "❌ Invalid execution strategy: ${EXECUTION_STRATEGY}. Must be: parallel, sequential, or phased"
            exit 1
            ;;
    esac

    # 5. Validate each assignment has required fields
    ASSIGNMENT_COUNT=0
    while [ ${ASSIGNMENT_COUNT} -lt ${TOTAL_AGENTS} ]; do
        AGENT_NAME=$(cat "${AGENT_ASSIGNMENTS_FILE}" | jq -r ".assignments[${ASSIGNMENT_COUNT}].agent")
        AGENT_DOMAIN=$(cat "${AGENT_ASSIGNMENTS_FILE}" | jq -r ".assignments[${ASSIGNMENT_COUNT}].domain")
        AGENT_TASKS=$(cat "${AGENT_ASSIGNMENTS_FILE}" | jq -r ".assignments[${ASSIGNMENT_COUNT}].tasks")

        if [ "${AGENT_NAME}" = "null" ] || [ "${AGENT_DOMAIN}" = "null" ] || [ "${AGENT_TASKS}" = "null" ]; then
            echo "❌ Assignment ${ASSIGNMENT_COUNT} missing required fields (agent, domain, tasks)"
            exit 1
        fi

        ASSIGNMENT_COUNT=$((ASSIGNMENT_COUNT + 1))
    done

    echo "✅ Agent assignments JSON validation passed" | tee -a "${PIPELINE_LOG}"
    echo "📋 Validated ${TOTAL_AGENTS} agent assignments with ${EXECUTION_STRATEGY} execution" | tee -a "${PIPELINE_LOG}"

else
    echo "❌ Implementation planning failed - missing required outputs"
    echo "Missing files:"
    [ ! -f "${SOURCE_PLAN}" ] && echo "  - ${SOURCE_PLAN}"
    [ ! -f "${AGENT_ASSIGNMENTS_FILE}" ] && echo "  - ${AGENT_ASSIGNMENTS_FILE}"
     exit 1
fi
```

**Phase 10: Execute Implementation**

```bash
source .claude/features/current_feature.env
if [ "${NEXT_PHASE}" = "implement" ] || [ "${NEXT_PHASE}" = "implementation-execution" ]; then
    echo "⚙️ Phase 10: IMPLEMENTATION EXECUTION" | tee -a "${PIPELINE_LOG}"

    # Run mechanical setup operations only
    SETUP_OUTPUT=$(.claude/scripts/phases/implementation/setup-implementation-execution.sh "${FEATURE_ID}")
    echo "${SETUP_OUTPUT}"

    # Extract file paths from setup output (mechanical only)
    IMPL_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "IMPL_CONTEXT_FILE=" | cut -d'=' -f2)
    IMPL_DIR=$(echo "${SETUP_OUTPUT}" | grep "IMPL_DIR=" | cut -d'=' -f2)
    COORDINATION_DIR=$(echo "${SETUP_OUTPUT}" | grep "COORDINATION_DIR=" | cut -d'=' -f2)

    # Validate required files exist
    IMPLEMENTATION_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"
    AGENT_ASSIGNMENTS=".claude/features/${FEATURE_ID}/output/agent-assignments.json"

    if [ ! -f "${IMPLEMENTATION_PLAN}" ]; then
        echo "❌ Implementation plan not found: ${IMPLEMENTATION_PLAN}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    if [ ! -f "${AGENT_ASSIGNMENTS}" ]; then
        echo "❌ Agent assignments not found: ${AGENT_ASSIGNMENTS}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    if [ ! -f "${IMPL_CONTEXT_FILE}" ]; then
        echo "❌ Implementation context not found: ${IMPL_CONTEXT_FILE}" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "✅ Implementation execution ready" | tee -a "${PIPELINE_LOG}"
    echo "📋 Implementation Plan: ${IMPLEMENTATION_PLAN}" | tee -a "${PIPELINE_LOG}"
    echo "📄 Context File: ${IMPL_CONTEXT_FILE}" | tee -a "${PIPELINE_LOG}"
    echo "🤝 Coordination Directory: ${COORDINATION_DIR}"
fi
```

### Direct Agent Coordination Analysis

```bash
source .claude/features/current_feature.env
# Analyze agent assignments directly without additional agent overhead
echo "=== Direct Agent Coordination Analysis ===" | tee -a "${PIPELINE_LOG}"

echo "Agent assignments source: ${AGENT_ASSIGNMENTS}"

# Extract coordination approach from agent assignments
COORDINATION_APPROACH=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.execution_strategy // "parallel"')
THINKING_BUDGET=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.thinking_budget // "think"')
TOTAL_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq '.assignments | length')

echo "📋 Total agents: ${TOTAL_AGENTS}" | tee -a "${PIPELINE_LOG}"
echo "📋 Coordination approach: ${COORDINATION_APPROACH}" | tee -a "${PIPELINE_LOG}"
echo "💭 Thinking budget: ${THINKING_BUDGET}" | tee -a "${PIPELINE_LOG}"

# Validate we have agents to work with
if [ "${TOTAL_AGENTS}" -eq 0 ]; then
    echo "⚠️ No agents found in assignments" | tee -a "${PIPELINE_LOG}"
    echo "Review implementation plan and agent assignments"
    exit 1
fi

# Group agents by parallel execution groups
PRIMARY_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[] | select(.parallel_group == "primary") | .agent' 2>/dev/null)
SECONDARY_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[] | select(.parallel_group == "secondary") | .agent' 2>/dev/null)
ALL_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[].agent')

# Determine execution pattern
if [ -n "${PRIMARY_AGENTS}" ] && [ -n "${SECONDARY_AGENTS}" ]; then
    EXECUTION_PATTERN="phased"
    echo "🔄 Execution pattern: Phased (Primary → Secondary)" | tee -a "${PIPELINE_LOG}"
    echo "Primary agents: $(echo "${PRIMARY_AGENTS}" | tr '\n' ' ')" | tee -a "${PIPELINE_LOG}"
    echo "Secondary agents: $(echo "${SECONDARY_AGENTS}" | tr '\n' ' ')" | tee -a "${PIPELINE_LOG}"
elif [ "${COORDINATION_APPROACH}" = "parallel" ] && [ "${TOTAL_AGENTS}" -gt 1 ]; then
    EXECUTION_PATTERN="parallel"
    echo "⚡ Execution pattern: Parallel (All agents simultaneously)" | tee -a "${PIPELINE_LOG}"
    echo "All agents: $(echo "${ALL_AGENTS}" | tr '\n' ' ')" | tee -a "${PIPELINE_LOG}"
else
    EXECUTION_PATTERN="sequential"
    echo "📍 Execution pattern: Sequential (Single agent or sequential execution)" | tee -a "${PIPELINE_LOG}"
    echo "Agent: $(echo "${ALL_AGENTS}" | head -1)" | tee -a "${PIPELINE_LOG}"
fi

echo "✅ Agent coordination analysis complete"
```

### Agent Spawning Based on Direct Coordination

```bash
source .claude/features/current_feature.env
echo ""
echo "=== Agent Spawning Instructions ===" | tee -a "${PIPELINE_LOG}"

# Helper function to generate agent spawning instructions
generate_agent_instructions() {
    local agent="$1"
    local phase="${2:-primary}"
    local phase_context="$3"

    # Extract agent-specific data from assignments
    local agent_data=$(cat "${AGENT_ASSIGNMENTS}" | jq -r ".assignments[] | select(.agent == \"${agent}\")")
    local agent_domain=$(echo "${agent_data}" | jq -r '.domain // "implementation"')
    local agent_tasks=$(echo "${agent_data}" | jq -r '.tasks[]?' 2>/dev/null | tr '\n' '; ')
    local agent_files=$(echo "${agent_data}" | jq -r '.files[]?' 2>/dev/null | tr '\n' ' ')
    local agent_effort=$(echo "${agent_data}" | jq -r '.estimated_effort // "medium"')
    local thinking_level=$(echo "${agent_data}" | jq -r '.thinking_level // "think"')
    local dependencies=$(echo "${agent_data}" | jq -r '.dependencies[]?' 2>/dev/null | tr '\n' ', ')

    echo "### Spawn ${agent} (${phase^} Phase)"
    echo ""
    echo "Use the \`${agent}\` subagent for ${agent_domain} implementation."
    echo ""
    echo "Instruct the ${agent}:"
    echo "\"Implement your assigned tasks from the implementation plan."
    echo ""
    echo "**Core Context:**"
    echo "- Implementation Plan: ${IMPLEMENTATION_PLAN}"
    echo "- Implementation Context: ${IMPL_CONTEXT_FILE}"
    echo "- Agent Assignments: Tasks assigned to ${agent} in ${AGENT_ASSIGNMENTS}"

    if [ -n "${phase_context}" ]; then
        echo "- Phase Context: ${phase_context}"
    fi

    echo ""
    echo "**Your Workspace:**"
    echo "- Code changes: ${IMPL_DIR}/code-changes/${agent}/"
    echo "- Progress tracking: ${IMPL_DIR}/agent-outputs/${agent}/"
    echo "- Coordination: ${COORDINATION_DIR}"
    echo ""
    echo "**Your Assignments:**"
    if [ -n "${agent_tasks}" ]; then
        echo "- Tasks: ${agent_tasks%??}"  # Remove trailing '; '
    fi
    if [ -n "${agent_files}" ]; then
        echo "- Files/Modules: ${agent_files% }"  # Remove trailing space
    fi
    echo "- Estimated effort: ${agent_effort}"
    echo "- Thinking level: ${thinking_level}"

    if [ -n "${dependencies}" ]; then
        echo "- Dependencies: Wait for ${dependencies%, } to complete foundational work"
    fi

    echo ""
    echo "**Instructions:**"
    echo "1. Read implementation plan and find tasks specifically assigned to ${agent}"
    echo "2. Implement assigned features following established patterns from codebase"
    echo "3. Create necessary files in your designated workspace"
    echo "4. Follow success criteria defined in implementation plan"
    if [ -n "${dependencies}" ]; then
        echo "5. Coordinate with dependencies: ${dependencies%, }"
    fi
    echo "6. Track progress and document implementation decisions"
    echo ""
}

# Execute based on determined execution pattern
case "${EXECUTION_PATTERN}" in
    "phased")
        echo "🚀 Multi-Phase Execution Strategy" | tee -a "${PIPELINE_LOG}"
        echo ""

        if [ -n "${PRIMARY_AGENTS}" ]; then
            echo "## Phase 1: Primary Agent Spawning (Foundation)"
            echo ""
            echo "Spawn these agents simultaneously for foundational implementation:"
            echo ""

            for agent in ${PRIMARY_AGENTS}; do
                generate_agent_instructions "${agent}" "primary" "No dependencies - foundational work"
            done
        fi

        if [ -n "${SECONDARY_AGENTS}" ]; then
            echo ""
            echo "## Phase 2: Secondary Agent Spawning (Integration)"
            echo ""
            echo "After primary agents complete their foundational work, spawn these agents:"
            echo ""

            for agent in ${SECONDARY_AGENTS}; do
                generate_agent_instructions "${agent}" "secondary" "Build upon primary phase outputs in ${IMPL_DIR}/agent-outputs/"
            done
        fi
        ;;

    "parallel")
        echo "⚡ Parallel Execution Strategy" | tee -a "${PIPELINE_LOG}"
        echo ""
        echo "## Parallel Agent Spawning"
        echo ""
        echo "Spawn these ${TOTAL_AGENTS} agents simultaneously for coordinated parallel implementation:"
        echo ""

        for agent in ${ALL_AGENTS}; do
            generate_agent_instructions "${agent}" "parallel" "Coordinate with other agents through shared workspace"
        done
        ;;

    "sequential"|*)
        SINGLE_AGENT=$(echo "${ALL_AGENTS}" | head -1)

        echo "📍 Sequential Execution Strategy" | tee -a "${PIPELINE_LOG}"
        echo ""
        echo "## Single Agent Implementation"
        echo ""

        generate_agent_instructions "${SINGLE_AGENT}" "complete" "Handle all implementation aspects for this feature"
        ;;
esac
```

### **Implementation Completion**

```bash
source .claude/features/current_feature.env
# Complete implementation phase using generic completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "implementation" "quality-review" "${FEATURE_ID}" "agents_spawned=${TOTAL_AGENTS},coordination_approach=${COORDINATION_APPROACH}" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)

# Validate completion was successful
if [ "${COMPLETION_STATUS}" != "implementation_completed" ]; then
    echo "❌ Implementation phase completion failed"
    exit 1
fi

echo "🚀 ${TOTAL_AGENTS} development agents spawned based on strategic coordination"
echo "📋 Coordination approach: ${COORDINATION_APPROACH}"
echo "✅ Ready for ${NEXT_PHASE} phase"
```

**Phase 11: Quality Review**

```bash
source .claude/features/current_feature.env
if [ "${NEXT_PHASE}" = "quality-review" ]; then
    echo "📊 Phase 11: QUALITY REVIEW PHASE" | tee -a "${PIPELINE_LOG}"

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
    echo "📊 Risk Level: ${RISK_LEVEL}, Tech Stack: ${TECH_STACK}" | tee -a "${PIPELINE_LOG}"
fi
```

### Delegate to Quality Review Coordinator

```bash
# Use universal-coordinator with quality domain to analyze and recommend quality strategy
echo "=== Quality Review Coordination Analysis ===" | tee -a "${PIPELINE_LOG}"
```

Instruct the universal-coordinator with domain parameter "quality":
"ultrathink. Analyze this implementation and recommend a comprehensive quality review approach with feedback loops.

**Domain:** quality

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
  "recommendation": "comprehensive_quality|focused_quality|basic_validation|skip_quality",
  "rationale": "Why this approach based on risk level and implementation scope",
  "implementation_analysis": {
    "complexity": "Simple|Medium|Complex",
    "risk_level": "Low|Medium|High|Critical",
    "affected_domains": ["backend", "frontend", "security"],
    "technology_stack": ["Go", "React", "Python"],
    "quality_priority": "critical|high|medium|low"
  },
  "suggested_quality_agents": [
    {
      "agent": "[ONLY FROM DISCOVERED AGENTS]",
      "reason": "Specific quality domain match justification",
      "quality_focus": ["Code review", "Security validation"],
      "priority": "critical|high|medium|low",
      "thinking_budget": "ultrathink|think|basic",
      "success_criteria": ["Measurable validation criteria"]
    }
  ],
  "quality_gates": {
    "critical_gates": ["Release blocker criteria"],
    "major_gates": ["Fix required criteria"],
    "minor_gates": ["Improvement opportunity criteria"]
  },
  "feedback_loop_strategy": {
    "max_iterations": 3,
    "remediation_agents": [
      {
        "quality_issue_type": "security-vulnerability",
        "remediation_agent": "golang-api-developer",
        "reason": "Backend security fixes require Go expertise"
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
# After universal-coordinator (quality domain) completes, process recommendations
if [ -f "${QUALITY_COORDINATION_PLAN}" ]; then
    echo "✓ Quality coordination plan exists - validating JSON structure..." | tee -a "${PIPELINE_LOG}"

    # 1. Validate JSON syntax
    if ! jq '.' "${QUALITY_COORDINATION_PLAN}" >/dev/null 2>&1; then
        echo "❌ Invalid JSON format in ${QUALITY_COORDINATION_PLAN}"
        exit 1
    fi

    # 2. Validate required fields exist
    REQUIRED_FIELDS=("recommendation" "rationale" "implementation_analysis")
    for field in "${REQUIRED_FIELDS[@]}"; do
        if [ "$(cat "${QUALITY_COORDINATION_PLAN}" | jq "has(\"${field}\")")" != "true" ]; then
            echo "❌ Missing required field: ${field} in quality coordination plan"
            exit 1
        fi
    done

    # 3. Validate recommendation is valid enum value
    RECOMMENDATION=$(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.recommendation')
    case "${RECOMMENDATION}" in
        "comprehensive_quality"|"focused_quality"|"basic_validation"|"skip_quality")
            echo "✓ Valid recommendation: ${RECOMMENDATION}"
            ;;
        *)
            echo "❌ Invalid recommendation: ${RECOMMENDATION}. Must be: comprehensive_quality, focused_quality, basic_validation, or skip_quality"
            exit 1
            ;;
    esac

    # 4. If quality agents recommended, validate agents array
    if [ "${RECOMMENDATION}" = "comprehensive_quality" ] || [ "${RECOMMENDATION}" = "focused_quality" ]; then
        if [ "$(cat "${QUALITY_COORDINATION_PLAN}" | jq "has(\"suggested_quality_agents\")")" != "true" ]; then
            echo "❌ Missing suggested_quality_agents array for ${RECOMMENDATION}"
            exit 1
        fi

        AGENT_COUNT=$(cat "${QUALITY_COORDINATION_PLAN}" | jq '.suggested_quality_agents | length')
        if [ "${AGENT_COUNT}" -eq 0 ]; then
            echo "❌ Empty suggested_quality_agents array for ${RECOMMENDATION}"
            exit 1
        fi

        echo "✓ Quality coordination plan validation passed - ${AGENT_COUNT} agents recommended"
        echo "Quality coordinator recommends: ${RECOMMENDATION}"
        cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.suggested_quality_agents[] | "- \(.agent): \(.reason) [\(.priority)]"'
        echo ""
        echo "Based on the coordination plan, spawn the recommended quality agents using Task tool."

    else
        echo "✓ Quality coordination plan validation passed"
        echo "Quality coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.rationale')"
        if [ "${RECOMMENDATION}" = "skip_quality" ]; then
            echo "Guidance: $(cat "${QUALITY_COORDINATION_PLAN}" | jq -r '.guidance // "Minimal quality validation required"')"
        fi
    fi

else
    echo "❌ Quality coordination failed - coordination plan not found"
    echo "Expected file: ${QUALITY_COORDINATION_PLAN}"
    exit 1
fi
```

### Quality Review Feedback Loop

```bash
# Initialize feedback loop for iterative quality improvement
echo ""
echo "=== Quality Review Feedback Loop ===" | tee -a "${PIPELINE_LOG}"

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
source .claude/features/current_feature.env
# Feedback Loop Execution (Einstein orchestrates, main Claude spawns)
ITERATION_COMPLETE=false
ITERATION_COUNT=0
MAX_ITERATIONS=2

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

### **Quality Review Completion**

```bash
# Complete quality review phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "quality-review" "security-review" "${FEATURE_ID}" "quality_review_complete=true" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)

# Validate completion was successful
if [ "${COMPLETION_STATUS}" != "quality_review_completed" ]; then
    echo "❌ Quality review phase completion failed"
    exit 1
fi

echo "✅ Quality review complete - proceeding to ${NEXT_PHASE} phase"
```

**Phase 12: Security Review**

```bash
source .claude/features/current_feature.env

if [ "${NEXT_PHASE}" = "security-review" ]; then
    echo "🔒 Phase 12: SECURITY REVIEW PHASE" | tee -a "${PIPELINE_LOG}"

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
# Use universal-coordinator with security domain to analyze and recommend security strategy
echo "=== Security Review Coordination Analysis ===" | tee -a "${PIPELINE_LOG}"
```

Instruct the universal-coordinator with domain parameter "security":
"ultrathink. Analyze this feature implementation and recommend a comprehensive security review approach with threat assessment and appropriate security analysis agents.

**Domain:** security

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
  "recommendation": "comprehensive_security|focused_security|basic_validation|skip_security",
  "rationale": "Why this approach based on risk level, attack surface, and available security agents",
  "security_assessment": {
    "risk_level": "Critical|High|Medium|Low",
    "attack_surface_changes": [
      "API endpoints",
      "Authentication",
      "Data handling"
    ],
    "threat_vectors": ["Authentication", "Authorization", "Input Validation"],
    "technology_stack": ["Go", "React", "Python"],
    "security_priority": "critical|high|medium|low"
  },
  "suggested_security_agents": [
    {
      "agent": "[ONLY FROM DISCOVERED SECURITY AGENTS]",
      "reason": "Specific security domain/threat vector match justification",
      "security_focus": ["Authentication review", "Threat modeling"],
      "priority": "critical|high|medium|low",
      "thinking_budget": "ultrathink|think|basic",
      "estimated_effort": "high|medium|low",
      "threat_coverage": ["Specific threat vectors this agent addresses"]
    }
  ],
  "security_analysis_strategy": {
    "approach": "parallel|sequential|hybrid",
    "coordination_method": "threat-focused|technology-focused|risk-prioritized",
    "analysis_depth": "comprehensive|focused|basic",
    "threat_modeling_required": true
  },
  "security_gates": {
    "critical_blockers": [
      "Authentication bypass",
      "SQL injection",
      "RCE vulnerabilities"
    ],
    "high_priority": [
      "XSS vulnerabilities",
      "Authorization flaws",
      "Data exposure"
    ],
    "medium_priority": [
      "Configuration issues",
      "Information disclosure",
      "Input validation gaps"
    ]
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
# After universal-coordinator (security domain) completes, process recommendations
if [ -f "${SECURITY_COORDINATION_PLAN}" ]; then
    echo "✓ Security coordination plan exists - validating JSON structure..."

    # 1. Validate JSON syntax
    if ! jq '.' "${SECURITY_COORDINATION_PLAN}" >/dev/null 2>&1; then
        echo "❌ Invalid JSON format in ${SECURITY_COORDINATION_PLAN}"
        exit 1
    fi

    # 2. Validate required fields exist
    REQUIRED_FIELDS=("recommendation" "rationale" "security_assessment")
    for field in "${REQUIRED_FIELDS[@]}"; do
        if [ "$(cat "${SECURITY_COORDINATION_PLAN}" | jq "has(\"${field}\")")" != "true" ]; then
            echo "❌ Missing required field: ${field} in security coordination plan"
            exit 1
        fi
    done

    # 3. Validate recommendation is valid enum value
    RECOMMENDATION=$(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.recommendation')
    case "${RECOMMENDATION}" in
        "comprehensive_security"|"focused_security"|"basic_validation"|"skip_security")
            echo "✓ Valid recommendation: ${RECOMMENDATION}"
            ;;
        *)
            echo "❌ Invalid recommendation: ${RECOMMENDATION}. Must be: comprehensive_security, focused_security, basic_validation, or skip_security"
            exit 1
            ;;
    esac

    # 4. If security agents recommended, validate agents array and security gates
    if [ "${RECOMMENDATION}" = "comprehensive_security" ] || [ "${RECOMMENDATION}" = "focused_security" ]; then
        if [ "$(cat "${SECURITY_COORDINATION_PLAN}" | jq "has(\"suggested_security_agents\")")" != "true" ]; then
            echo "❌ Missing suggested_security_agents array for ${RECOMMENDATION}"
            exit 1
        fi

        if [ "$(cat "${SECURITY_COORDINATION_PLAN}" | jq "has(\"security_gates\")")" != "true" ]; then
            echo "❌ Missing security_gates object for ${RECOMMENDATION}"
            exit 1
        fi

        AGENT_COUNT=$(cat "${SECURITY_COORDINATION_PLAN}" | jq '.suggested_security_agents | length')
        if [ "${AGENT_COUNT}" -eq 0 ]; then
            echo "❌ Empty suggested_security_agents array for ${RECOMMENDATION}"
            exit 1
        fi

        echo "✓ Security coordination plan validation passed - ${AGENT_COUNT} agents recommended"
        echo "Security coordinator recommends: ${RECOMMENDATION}"
        cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.suggested_security_agents[] | "- \(.agent): \(.reason) [\(.priority)] - Threat Coverage: \(.threat_coverage | join(\", \"))"'

        echo ""
        echo "🔒 Security gates defined:"
        echo "Critical blockers: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.security_gates.critical_blockers | join(\", \")')"
        echo "High priority: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.security_gates.high_priority | join(\", \")')"
        echo ""
        echo "Based on the coordination plan, spawn the recommended security analysis agents using Task tool."

    else
        echo "✓ Security coordination plan validation passed"
        echo "Security coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.rationale')"
        if [ "${RECOMMENDATION}" = "skip_security" ]; then
            echo "Guidance: $(cat "${SECURITY_COORDINATION_PLAN}" | jq -r '.guidance // "Minimal security validation required"')"
        fi
    fi

else
    echo "❌ Security coordination failed - coordination plan not found"
    echo "Expected file: ${SECURITY_COORDINATION_PLAN}"
    exit 1
fi
```

### **Security Review Feedback Loop**

```bash
# Initialize feedback loop for iterative security remediation
echo ""
echo "=== Security Review Feedback Loop ===" | tee -a "${PIPELINE_LOG}"

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
    NEXT_PHASE="test"  # Proceed to testing phase
else
    echo "⚠️ Maximum security iterations reached - escalating to manual review"
    NEXT_PHASE="manual-security-review"
fi
```

### **Security Review Completion**

```bash
source .claude/features/current_feature.env

# Complete security review phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "security-review" "testing-review" "${FEATURE_ID}" "" "${PIPELINE_LOG}")
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

**Phase 13: Testing Review**

```bash
source .claude/features/current_feature.env

if [ "${NEXT_PHASE}" = "test" ]; then
    echo "🧪 Phase 13: TESTING PHASE" | tee -a "${PIPELINE_LOG}"

    # Run mechanical setup operations
    SETUP_OUTPUT=$(.claude/scripts/phases/testing/setup-testing-phase.sh "${FEATURE_ID}")
    echo "${SETUP_OUTPUT}"

    # Extract file paths from setup output
    TESTING_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "TESTING_CONTEXT_FILE=" | cut -d'=' -f2)
    TESTING_COORDINATION_PLAN=$(echo "${SETUP_OUTPUT}" | grep "TESTING_COORDINATION_PLAN=" | cut -d'=' -f2)
    TESTING_STRATEGY=$(echo "${SETUP_OUTPUT}" | grep "TESTING_STRATEGY=" | cut -d'=' -f2)
    FEEDBACK_LOOP_DIR=$(echo "${SETUP_OUTPUT}" | grep "FEEDBACK_LOOP_DIR=" | cut -d'=' -f2)
    FEEDBACK_ITERATION_TRACKER=$(echo "${SETUP_OUTPUT}" | grep "FEEDBACK_ITERATION_TRACKER=" | cut -d'=' -f2)

    # Extract implementation analysis from setup
    RISK_LEVEL=$(echo "${SETUP_OUTPUT}" | grep "RISK_LEVEL=" | cut -d'=' -f2)
    COMPLEXITY_LEVEL=$(echo "${SETUP_OUTPUT}" | grep "COMPLEXITY_LEVEL=" | cut -d'=' -f2)
    AFFECTED_DOMAINS=$(echo "${SETUP_OUTPUT}" | grep "AFFECTED_DOMAINS=" | cut -d'=' -f2)
    TECH_STACK=$(echo "${SETUP_OUTPUT}" | grep "TECH_STACK=" | cut -d'=' -f2)

    # Validate setup was successful
    if [ ! -f "${TESTING_CONTEXT_FILE}" ]; then
        echo "❌ Testing setup failed - context file not found" | tee -a "${PIPELINE_LOG}"
        exit 1
    fi

    echo "✅ Testing workspace ready" | tee -a "${PIPELINE_LOG}"
    echo "🧪 Risk Level: ${RISK_LEVEL}, Complexity: ${COMPLEXITY_LEVEL}, Domains: ${AFFECTED_DOMAINS}"
fi
```

### Delegate to Test Coordinator

```bash
# Use test-coordinator to analyze and recommend testing strategy
echo "=== Testing Coordination Analysis ===" | tee -a "${PIPELINE_LOG}"
```

Instruct the test-coordinator:
"ultrathink. Analyze this implementation and recommend a comprehensive testing approach with feedback loops and iterative test execution.

**Read testing context from:** ${TESTING_CONTEXT_FILE}

**Also read these context sources:**

- Implementation outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Code changes: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Requirements (for test validation): .claude/features/${FEATURE_ID}/context/requirements.json
- Architecture context: .claude/features/${FEATURE_ID}/architecture/\*.md
- Quality review results: .claude/features/${FEATURE_ID}/quality-review/ (if available)

**Save your recommendations to:** ${TESTING_COORDINATION_PLAN}

**Create testing strategy at:** ${TESTING_STRATEGY}

**Output format for coordination plan:**

```json
{
  "recommendation": "comprehensive_testing|focused_testing|basic_validation|skip_testing",
  "rationale": "Why this approach based on risk level, complexity, and testing requirements",
  "implementation_analysis": {
    "complexity": "Simple|Medium|Complex",
    "risk_level": "Critical|High|Medium|Low",
    "affected_domains": ["backend", "frontend", "integration", "e2e"],
    "technology_stack": ["Go", "React", "Python"],
    "testing_priority": "critical|high|medium|low"
  },
  "suggested_testing_agents": [
    {
      "agent": "[ONLY FROM DISCOVERED TESTING AGENTS]",
      "reason": "Specific testing domain match justification",
      "testing_focus": ["Unit testing", "Integration testing", "E2E testing"],
      "priority": "critical|high|medium|low",
      "thinking_budget": "ultrathink|think|basic",
      "test_types": ["unit", "integration", "e2e"],
      "success_criteria": ["All tests passing", "Coverage requirements met"]
    }
  ],
  "testing_approach": {
    "test_creation_strategy": "comprehensive|focused|basic",
    "test_execution_strategy": "automated|manual|hybrid",
    "failure_remediation_strategy": "iterative_improvement|single_pass",
    "max_test_iterations": 2
  },
  "testing_gates": {
    "critical_gates": [
      "All unit tests passing",
      "Critical user workflows validated"
    ],
    "major_gates": [
      "Integration tests passing",
      "Performance requirements met"
    ],
    "minor_gates": ["Code coverage targets", "Test documentation complete"]
  },
  "feedback_loop_strategy": {
    "max_iterations": 2,
    "remediation_agents": [
      {
        "test_failure_type": "unit-test-failures",
        "remediation_agent": "golang-api-developer",
        "reason": "Backend unit test failures require Go expertise"
      },
      {
        "test_failure_type": "e2e-test-failures",
        "remediation_agent": "react-developer",
        "reason": "Frontend E2E failures require React expertise"
      }
    ]
  }
}
```

**Focus on:**

- Risk-appropriate testing depth (${RISK_LEVEL} risk level detected)
- Technology-specific testing agents (${TECH_STACK} stack detected)
- Comprehensive test coverage for affected domains (${AFFECTED_DOMAINS})
- Measurable testing gates with clear pass/fail criteria
- Intelligent feedback loops for test failure remediation"

### Process Test Coordinator Recommendations

```bash
# After test-coordinator completes, process recommendations
if [ -f "${TESTING_COORDINATION_PLAN}" ]; then
    echo "✓ Testing coordination plan exists - validating JSON structure..."

    # 1. Validate JSON syntax
    if ! jq '.' "${TESTING_COORDINATION_PLAN}" >/dev/null 2>&1; then
        echo "❌ Invalid JSON format in ${TESTING_COORDINATION_PLAN}"
        exit 1
    fi

    # 2. Validate required fields exist
    REQUIRED_FIELDS=("recommendation" "rationale" "implementation_analysis")
    for field in "${REQUIRED_FIELDS[@]}"; do
        if [ "$(cat "${TESTING_COORDINATION_PLAN}" | jq "has(\"${field}\")")" != "true" ]; then
            echo "❌ Missing required field: ${field} in testing coordination plan"
            exit 1
        fi
    done

    # 3. Validate recommendation is valid enum value
    RECOMMENDATION=$(cat "${TESTING_COORDINATION_PLAN}" | jq -r '.recommendation')
    case "${RECOMMENDATION}" in
        "comprehensive_testing"|"focused_testing"|"basic_validation"|"skip_testing")
            echo "✓ Valid recommendation: ${RECOMMENDATION}"
            ;;
        *)
            echo "❌ Invalid recommendation: ${RECOMMENDATION}. Must be: comprehensive_testing, focused_testing, basic_validation, or skip_testing"
            exit 1
            ;;
    esac

    # 4. If testing agents recommended, validate agents array and testing gates
    if [ "${RECOMMENDATION}" = "comprehensive_testing" ] || [ "${RECOMMENDATION}" = "focused_testing" ]; then
        if [ "$(cat "${TESTING_COORDINATION_PLAN}" | jq "has(\"suggested_testing_agents\")")" != "true" ]; then
            echo "❌ Missing suggested_testing_agents array for ${RECOMMENDATION}"
            exit 1
        fi

        if [ "$(cat "${TESTING_COORDINATION_PLAN}" | jq "has(\"testing_gates\")")" != "true" ]; then
            echo "❌ Missing testing_gates object for ${RECOMMENDATION}"
            exit 1
        fi

        AGENT_COUNT=$(cat "${TESTING_COORDINATION_PLAN}" | jq '.suggested_testing_agents | length')
        if [ "${AGENT_COUNT}" -eq 0 ]; then
            echo "❌ Empty suggested_testing_agents array for ${RECOMMENDATION}"
            exit 1
        fi

        echo "✓ Testing coordination plan validation passed - ${AGENT_COUNT} agents recommended"
        echo "Test coordinator recommends: ${RECOMMENDATION}"
        cat "${TESTING_COORDINATION_PLAN}" | jq -r '.suggested_testing_agents[] | \"- \\(.agent): \\(.reason) [\\(.priority)] - Tests: \\(.test_types | join(\", \"))\"'

        echo ""
        echo "🧪 Testing gates defined:"
        echo "Critical gates: $(cat "${TESTING_COORDINATION_PLAN}" | jq -r '.testing_gates.critical_gates | join(\", \")')"
        echo "Major gates: $(cat "${TESTING_COORDINATION_PLAN}" | jq -r '.testing_gates.major_gates | join(\", \")')"
        echo ""
        echo "Based on the coordination plan, spawn the recommended testing agents using Task tool."

    else
        echo "✓ Testing coordination plan validation passed"
        echo "Test coordinator recommends: ${RECOMMENDATION}"
        echo "Reason: $(cat "${TESTING_COORDINATION_PLAN}" | jq -r '.rationale')"
        if [ "${RECOMMENDATION}" = "skip_testing" ]; then
            echo "Guidance: $(cat "${TESTING_COORDINATION_PLAN}" | jq -r '.guidance // "Minimal testing validation required"')"
        fi
    fi

else
    echo "❌ Testing coordination failed - coordination plan not found"
    echo "Expected file: ${TESTING_COORDINATION_PLAN}"
    exit 1
fi
```

### Testing Feedback Loop

```bash
# Initialize feedback loop for iterative testing improvement
echo ""
echo "=== Testing Feedback Loop ===" | tee -a "${PIPELINE_LOG}"

# Check if comprehensive testing was recommended
RECOMMENDATION=$(cat "${TESTING_COORDINATION_PLAN}" | jq -r '.recommendation')
if [ "${RECOMMENDATION}" = "comprehensive_testing" ] || [ "${RECOMMENDATION}" = "focused_testing" ]; then

    echo "🧪 Initiating testing feedback loop with universal coordinator"
    echo ""
    echo "After testing agents complete their test creation and execution:"
    echo "1. Call feedback-loop-coordinator to analyze test results and create iteration plan"
    echo "2. If iteration plan recommends 'spawn_remediation_agents', spawn the specified agents"
    echo "3. If iteration plan recommends 're_run_tests', re-execute failed tests"
    echo "4. If iteration plan recommends 'complete', proceed to next phase"
    echo "5. If iteration plan recommends 'escalate', manual testing review required"

else
    echo "ℹ️ Basic testing validation - no feedback loop required"
fi
```

### Testing Feedback Loop Execution Pattern

After testing agents complete, Einstein executes this feedback loop pattern:

```bash
# Testing Feedback Loop Execution (Einstein orchestrates, main Claude spawns)
ITERATION_COMPLETE=false
ITERATION_COUNT=0
MAX_ITERATIONS=2

while [ "${ITERATION_COMPLETE}" = false ] && [ ${ITERATION_COUNT} -lt ${MAX_ITERATIONS} ]; do
    ITERATION_COUNT=$((ITERATION_COUNT + 1))
    echo "🧪 Testing Feedback Loop Iteration ${ITERATION_COUNT}/${MAX_ITERATIONS}"

    # Call feedback-loop-coordinator to analyze test results and create iteration plan
    echo "Calling feedback-loop-coordinator to analyze testing results and create remediation plan..."

    # feedback-loop-coordinator outputs iteration plan for testing phase
    ITERATION_PLAN=".claude/features/${FEATURE_ID}/testing/feedback-loop/iteration-${ITERATION_COUNT}-plan.json"

    # Process coordinator recommendation
    if [ -f "${ITERATION_PLAN}" ]; then
        ACTION=$(cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.action')

        case "${ACTION}" in
            "spawn_remediation_agents")
                echo "🛠️ Iteration plan recommends: Spawn test remediation agents"
                cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.execution_summary'
                echo ""
                echo "Based on iteration plan, spawn the following test remediation agents:"
                cat "${ITERATION_PLAN}" | jq -r '.einstein_instructions.spawning_details[] | "- \(.agent): \(.instruction)"'
                echo ""
                echo "After remediation agents complete, continue feedback loop..."
                ;;

            "re_run_tests")
                echo "🔍 Iteration plan recommends: Re-run failed tests"
                echo "Re-spawn testing agents to verify fixes were successful"
                ;;

            "complete")
                echo "✅ Iteration plan recommends: Testing validation complete"
                echo "All tests passing and quality gates met"
                ITERATION_COMPLETE=true
                ;;

            "escalate")
                echo "🚨 Iteration plan recommends: Testing escalation required"
                echo "Reason: $(cat "${ITERATION_PLAN}" | jq -r '.iteration_management.escalation_reason')"
                ITERATION_COMPLETE=true
                ESCALATION_REQUIRED=true
                ;;
        esac
    else
        echo "❌ Testing iteration plan not found - ending feedback loop"
        ITERATION_COMPLETE=true
    fi
done

# Handle testing completion or escalation
if [ "${ESCALATION_REQUIRED}" = true ]; then
    echo "🚨 Testing review requires manual testing intervention"
    NEXT_PHASE="manual-testing-review"
elif [ "${ITERATION_COMPLETE}" = true ]; then
    echo "✅ Testing feedback loop complete"
    NEXT_PHASE="deploy"
else
    echo "⚠️ Maximum testing iterations reached - escalating to manual review"
    NEXT_PHASE="manual-testing-review"
fi
```

### Testing Completion

```bash
# Complete testing phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "testing" "deploy" "${FEATURE_ID}" "testing_complete=true" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

# Extract completion results
COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)
NEXT_PHASE=$(echo "${COMPLETION_OUTPUT}" | grep "NEXT_PHASE=" | cut -d'=' -f2)
COMPLETION_TIME=$(echo "${COMPLETION_OUTPUT}" | grep "COMPLETION_TIME=" | cut -d'=' -f2)

# Validate completion
if [ "${COMPLETION_STATUS}" = "testing_completed" ]; then
    echo "🧪 Testing ${COMPLETION_STATUS} at ${COMPLETION_TIME}"
    echo "➡️ Proceeding to ${NEXT_PHASE}"
else
    echo "❌ Testing completion failed: ${COMPLETION_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

**Phase 14: Deployment**

```bash
if [ "${NEXT_PHASE}" = "deploy" ]; then
    echo "🚀 Phase 14: DEPLOYMENT PHASE" | tee -a "${PIPELINE_LOG}"

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
# Use universal-coordinator with deployment domain to analyze and recommend validation strategy
echo "=== Deployment Coordination Analysis ===" | tee -a "${PIPELINE_LOG}"
```

Instruct the universal-coordinator with domain parameter "deployment":
"ultrathink. Analyze this feature deployment and recommend a comprehensive validation approach with appropriate deployment validation agents.

**Domain:** deployment

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
  "recommendation": "comprehensive_deployment|focused_deployment|basic_deployment|skip_deployment",
  "rationale": "Why this approach based on deployment risk, platform status, and available validation agents",
  "deployment_assessment": {
    "risk_level": "Critical|High|Medium|Low",
    "complexity_level": "Complex|Medium|Simple",
    "deployment_scope": [
      "Frontend changes",
      "Backend API changes",
      "Database migrations"
    ],
    "technology_stack": ["Go", "React", "AWS", "Python"],
    "deployment_priority": "critical|high|medium|low"
  },
  "deployment_strategy": {
    "approach": "direct|staged|canary|blue_green",
    "justification": "Why this deployment approach is optimal",
    "rollback_plan": "immediate|staged|manual",
    "success_criteria": ["Measurable deployment success indicators"]
  },
  "suggested_validation_agents": [
    {
      "agent": "[ONLY FROM DISCOVERED AGENTS]",
      "reason": "Specific deployment validation domain match justification",
      "validation_focus": ["Production readiness", "Integration testing"],
      "priority": "critical|high|medium|low",
      "thinking_budget": "ultrathink|think|basic",
      "estimated_effort": "high|medium|low",
      "success_criteria": [
        "Specific validation requirements this agent addresses"
      ]
    }
  ],
  "deployment_gates": {
    "pre_deployment": ["Build success", "Security cleared", "Quality approved"],
    "post_deployment": [
      "Health checks passed",
      "Integration validated",
      "Performance confirmed"
    ],
    "rollback_triggers": [
      "Health failures",
      "Critical errors",
      "Performance degradation"
    ]
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
# After universal-coordinator (deployment domain) completes, process recommendations
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
echo "=== Deployment Validation Feedback Loop ===" | tee -a "${PIPELINE_LOG}"

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
