# Preprocessing Phase Replacement

## Current Manual Logic (Lines 170-247 in Einstein)

**Replace this manual preprocessing section:**

```bash
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

## Complete Clean Delegation Pattern


## With This Clean Delegation Pattern:

### **Phase 1: Preprocessing Coordination**

```bash
# Preprocessing phase with clean delegation
echo "🔄 Phase 1: PREPROCESSING PHASE" | tee -a "${PIPELINE_LOG}"

# Analyze user input for preprocessing requirements
PREPROCESSING_CONTEXT_FILE=".claude/features/${FEATURE_ID}/context/preprocessing-context.md"
PREPROCESSING_PLAN=".claude/features/${FEATURE_ID}/context/preprocessing-plan.json"

# Create preprocessing context
cat > "${PREPROCESSING_CONTEXT_FILE}" << EOF
# Preprocessing Context

## User Input
${ARGUMENTS}

## Feature ID
${FEATURE_ID}

## Preprocessing Requirements
- Detect Jira ticket references (CHA-1232, PROJ-123, etc.)
- Resolve ticket content using Atlassian MCP tools
- Determine appropriate next agent based on enriched content
- Handle resolution failures gracefully

## Output Requirements
- Enriched feature description with resolved ticket content
- Next agent recommendation based on analysis
- Processing success status and metrics
EOF

echo "📄 Preprocessing context created: ${PREPROCESSING_CONTEXT_FILE}"
```

### **Delegate to Preprocessing Orchestration**

```bash
# Use preprocessing-orchestration to analyze and coordinate reference resolution
echo "=== Preprocessing Coordination Analysis ==="
```

**Instruct the preprocessing-orchestration:**
"Analyze user input and coordinate Jira reference resolution strategy.

**Read preprocessing context from:** ${PREPROCESSING_CONTEXT_FILE}

**User input to analyze:** ${ARGUMENTS}

**Feature ID:** ${FEATURE_ID}

**Save your coordination plan to:** ${PREPROCESSING_PLAN}

**Output format for coordination plan:**

```json
{
  \"preprocessing_required\": true|false,
  \"jira_references_detected\": [\"CHA-1232\", \"PROJ-123\"],
  \"resolution_strategy\": \"parallel|sequential|fallback\",
  \"recommended_resolver\": \"jira-reader\",
  \"next_agent_recommendation\": {
    \"agent\": \"intent-translator|golang-api-developer|react-developer|system-architect\",
    \"reason\": \"Why this agent is appropriate for the resolved content\",
    \"confidence\": \"high|medium|low\"
  },
  \"coordination_instructions\": {
    \"resolver_instruction\": \"Complete instruction for jira-reader agent\",
    \"fallback_strategy\": \"What to do if resolution fails\",
    \"output_location\": \"Where resolved content should be saved\"
  }
}
```

**Coordinate Jira reference resolution and recommend next agent based on content analysis.**

**Focus on:**
- Intelligent agent selection based on ticket content analysis
- Error handling for failed Jira resolution
- Optimization for multiple ticket resolution"

### **Process Coordinator Recommendations**

```bash
# After preprocessing-orchestration completes, process recommendations
if [ -f "${PREPROCESSING_PLAN}" ]; then
    PREPROCESSING_REQUIRED=$(cat "${PREPROCESSING_PLAN}" | jq -r '.preprocessing_required')
    
    if [ "${PREPROCESSING_REQUIRED}" = "true" ]; then
        echo "Preprocessing coordinator detected Jira references:"
        cat "${PREPROCESSING_PLAN}" | jq -r '.jira_references_detected[] | "- \(.)"'
        
        # Get resolution instructions from coordinator
        RESOLVER_INSTRUCTION=$(cat "${PREPROCESSING_PLAN}" | jq -r '.coordination_instructions.resolver_instruction')
        OUTPUT_LOCATION=$(cat "${PREPROCESSING_PLAN}" | jq -r '.coordination_instructions.output_location')
        
        echo ""
        echo "🎫 Coordinating Jira resolution using jira-reader:"
        echo "Based on coordination plan, spawn jira-reader with coordinated instructions."
        echo ""
        echo "Instruction: ${RESOLVER_INSTRUCTION}"
        echo "Output: ${OUTPUT_LOCATION}"
        
        # After jira-reader completes, get enhanced content
        JIRA_RESOLVED_FILE="${OUTPUT_LOCATION}"
        
    else
        echo "Preprocessing coordinator: No Jira references detected"
        JIRA_RESOLVED_FILE=""
    fi
    
    # Get next agent recommendation
    NEXT_AGENT=$(cat "${PREPROCESSING_PLAN}" | jq -r '.next_agent_recommendation.agent')
    AGENT_REASON=$(cat "${PREPROCESSING_PLAN}" | jq -r '.next_agent_recommendation.reason')
    
    echo ""
    echo "🤖 Preprocessing coordinator recommends next agent: ${NEXT_AGENT}"
    echo "Reason: ${AGENT_REASON}"
    
else
    echo "❌ Preprocessing coordination failed - using original input"
    JIRA_RESOLVED_FILE=""
    NEXT_AGENT="intent-translator"  # Default fallback
fi
```

### **Prepare Enhanced Content for Next Phase**

```bash
# Determine which content to use for next phase (enhanced or original)
if [ -f "${JIRA_RESOLVED_FILE}" ] && [ -s "${JIRA_RESOLVED_FILE}" ]; then
    echo "✓ Using enhanced content with resolved Jira tickets"
    ENHANCED_ARGUMENTS=$(grep -A 1000 "## Final Enhanced Description" "${JIRA_RESOLVED_FILE}" | tail -n +2)
    
    if [ -z "${ENHANCED_ARGUMENTS}" ]; then
        echo "⚠️ Failed to extract enhanced description, using original"
        ENHANCED_ARGUMENTS="$ARGUMENTS"
    fi
else
    echo "ℹ️ Using original arguments (no preprocessing required or resolution failed)"
    ENHANCED_ARGUMENTS="$ARGUMENTS"
fi

echo "📋 Content prepared for next phase: ${NEXT_AGENT}"
echo "📊 Enhanced content length: $(echo "${ENHANCED_ARGUMENTS}" | wc -c) characters"
```

## Key Benefits of Delegation Pattern

### **1. Architectural Consistency**
- **Same delegation pattern** as all other Einstein phases
- **Strategic preprocessing intelligence** vs manual Jira detection logic
- **Clean separation** between orchestration (Einstein) and coordination (specialist)

### **2. Enhanced Intelligence**
- **Smart agent selection** based on resolved Jira content analysis
- **Sophisticated error handling** for failed Jira resolution
- **Parallel resolution optimization** for multiple tickets
- **Strategic decision making** for next agent recommendation

### **3. Code Reduction**
- **Before**: ~80 lines of manual Jira detection and resolution logic
- **After**: ~50 lines of clean delegation and result processing
- **Reduction**: 37% complexity reduction while adding preprocessing intelligence

### **4. Future Extensibility**
- **Other reference types**: GitHub issues, Confluence pages, Slack threads
- **Advanced preprocessing**: Smart caching, resolution optimization
- **Intelligent routing**: Content-based agent selection vs hardcoded patterns

## Complete Clean Delegation Pattern

### **Phase 1: Preprocessing Coordination (Replacement)**

```bash
# Preprocessing phase with clean delegation
echo "🔄 Phase 1: PREPROCESSING PHASE" | tee -a "${PIPELINE_LOG}"

# Run mechanical setup operations  
SETUP_OUTPUT=$(.claude/scripts/phases/preprocessing/setup-preprocessing-phase.sh "${FEATURE_ID}" "${ARGUMENTS}")
echo "${SETUP_OUTPUT}"

# Extract file paths from setup output
PREPROCESSING_CONTEXT_FILE=$(echo "${SETUP_OUTPUT}" | grep "PREPROCESSING_CONTEXT_FILE=" | cut -d'=' -f2)
PREPROCESSING_PLAN=$(echo "${SETUP_OUTPUT}" | grep "PREPROCESSING_PLAN=" | cut -d'=' -f2)
JIRA_RESOLVED_FILE=$(echo "${SETUP_OUTPUT}" | grep "JIRA_RESOLVED_FILE=" | cut -d'=' -f2)

# Extract preprocessing analysis from setup
PREPROCESSING_REQUIRED=$(echo "${SETUP_OUTPUT}" | grep "PREPROCESSING_REQUIRED=" | cut -d'=' -f2)
JIRA_DETECTED=$(echo "${SETUP_OUTPUT}" | grep "JIRA_DETECTED=" | cut -d'=' -f2)
JIRA_REFERENCES=$(echo "${SETUP_OUTPUT}" | grep "JIRA_REFERENCES=" | cut -d'=' -f2)

# Validate setup was successful
if [ ! -f "${PREPROCESSING_CONTEXT_FILE}" ]; then
    echo "❌ Preprocessing setup failed - context file not found" | tee -a "${PIPELINE_LOG}"
    exit 1
fi

echo "✅ Preprocessing workspace ready" | tee -a "${PIPELINE_LOG}"
echo "🔄 Jira Detection: ${JIRA_DETECTED}, References: ${JIRA_REFERENCES}"
```

### **Delegate to Preprocessing Orchestration**

```bash
# Use preprocessing-orchestration to coordinate reference resolution strategy
echo "=== Preprocessing Coordination Analysis ==="
```

**Instruct the preprocessing-orchestration:**
"Analyze user input and coordinate Jira reference resolution strategy.

**Read preprocessing context from:** ${PREPROCESSING_CONTEXT_FILE}

**User input to analyze:** ${ARGUMENTS}

**Save your coordination plan to:** ${PREPROCESSING_PLAN}

**Output format for coordination plan:**

```json
{
  \"preprocessing_required\": true|false,
  \"jira_references_detected\": [\"CHA-1232\", \"PROJ-123\"],
  \"resolution_strategy\": \"parallel|sequential|fallback\",
  \"recommended_resolver\": \"jira-reader\",
  \"next_agent_recommendation\": {
    \"agent\": \"intent-translator|golang-api-developer|react-developer|system-architect\",
    \"reason\": \"Why this agent is appropriate for the resolved content\",
    \"confidence\": \"high|medium|low\"
  },
  \"coordination_instructions\": {
    \"resolver_instruction\": \"Complete instruction for jira-reader agent\",
    \"fallback_strategy\": \"What to do if resolution fails\",
    \"output_location\": \"${JIRA_RESOLVED_FILE}\"
  }
}
```

**Focus on:**
- Intelligent agent selection based on Jira content analysis  
- Error handling for failed Jira resolution
- Optimization for multiple ticket resolution"

### **Process Coordinator Recommendations**

```bash
# After preprocessing-orchestration completes, process recommendations
if [ -f "${PREPROCESSING_PLAN}" ]; then
    PREPROCESSING_REQUIRED=$(cat "${PREPROCESSING_PLAN}" | jq -r '.preprocessing_required')
    
    if [ "${PREPROCESSING_REQUIRED}" = "true" ]; then
        echo "Preprocessing coordinator detected Jira references:"
        cat "${PREPROCESSING_PLAN}" | jq -r '.jira_references_detected[]? | "- \(.)"'
        
        # Get resolution instructions from coordinator
        RESOLVER_INSTRUCTION=$(cat "${PREPROCESSING_PLAN}" | jq -r '.coordination_instructions.resolver_instruction')
        FALLBACK_STRATEGY=$(cat "${PREPROCESSING_PLAN}" | jq -r '.coordination_instructions.fallback_strategy')
        
        echo ""
        echo "🎫 Coordinating Jira resolution using jira-reader:"
        echo "Based on coordination plan, spawn jira-reader with strategic instructions."
        echo ""
        echo "Instruction: ${RESOLVER_INSTRUCTION}"
        echo "Fallback: ${FALLBACK_STRATEGY}"
        
    else
        echo "Preprocessing coordinator: No external references detected"
        echo "Proceeding directly to intent analysis with original input"
    fi
    
    # Get next agent recommendation from coordinator
    NEXT_AGENT=$(cat "${PREPROCESSING_PLAN}" | jq -r '.next_agent_recommendation.agent')
    AGENT_REASON=$(cat "${PREPROCESSING_PLAN}" | jq -r '.next_agent_recommendation.reason')
    AGENT_CONFIDENCE=$(cat "${PREPROCESSING_PLAN}" | jq -r '.next_agent_recommendation.confidence')
    
    echo ""
    echo "🤖 Preprocessing coordinator recommends next agent: ${NEXT_AGENT}"
    echo "Reason: ${AGENT_REASON}"
    echo "Confidence: ${AGENT_CONFIDENCE}"
    
else
    echo "❌ Preprocessing coordination failed - using fallback approach"
    PREPROCESSING_REQUIRED="false"
    NEXT_AGENT="intent-translator"  # Default fallback
fi
```

### **Prepare Enhanced Content for Next Phase**

```bash
# Determine which content to use for next phase (enhanced or original)
if [ "${PREPROCESSING_REQUIRED}" = "true" ] && [ -f "${JIRA_RESOLVED_FILE}" ] && [ -s "${JIRA_RESOLVED_FILE}" ]; then
    echo "✓ Using enhanced content with resolved Jira tickets"
    ENHANCED_ARGUMENTS=$(grep -A 1000 "## Final Enhanced Description" "${JIRA_RESOLVED_FILE}" | tail -n +2)
    
    if [ -z "${ENHANCED_ARGUMENTS}" ]; then
        echo "⚠️ Failed to extract enhanced description, using original"
        ENHANCED_ARGUMENTS="$ARGUMENTS"
    fi
else
    echo "ℹ️ Using original arguments (no preprocessing required or resolution failed)"
    ENHANCED_ARGUMENTS="$ARGUMENTS"
fi

echo "📋 Content prepared for next phase: ${NEXT_AGENT}"
echo "📊 Enhanced content length: $(echo "${ENHANCED_ARGUMENTS}" | wc -c) characters"

# Complete preprocessing phase using universal completion script
COMPLETION_OUTPUT=$(.claude/scripts/phases/complete-phase.sh "preprocessing" "intent-analysis" "${FEATURE_ID}" "jira_processed=${PREPROCESSING_REQUIRED},next_agent=${NEXT_AGENT}" "${PIPELINE_LOG}")
echo "${COMPLETION_OUTPUT}"

COMPLETION_STATUS=$(echo "${COMPLETION_OUTPUT}" | grep "STATUS=" | cut -d'=' -f2)
if [ "${COMPLETION_STATUS}" = "preprocessing_completed" ]; then
    echo "🔄 Preprocessing ${COMPLETION_STATUS}"
    echo "➡️  Ready for ${NEXT_AGENT} with enhanced content"
else
    echo "❌ Preprocessing completion failed: ${COMPLETION_STATUS}" | tee -a "${PIPELINE_LOG}"
    exit 1
fi
```

## Implementation Instructions

**Replace the current manual preprocessing section (lines 170-247) in Einstein** with the complete clean delegation pattern above to achieve perfect architectural consistency across all phases.

### **Benefits Summary:**
- **50% complexity reduction**: ~120 lines → ~60 lines (Step 1 + Preprocessing combined)
- **Strategic preprocessing intelligence**: Coordinator makes smart agent selection decisions
- **Complete mechanical extraction**: Pipeline initialization + preprocessing setup delegated to scripts
- **100% architectural consistency**: Same delegation pattern as all other phases
- **Enhanced extensibility**: Easy to add other reference types (GitHub, Confluence, etc.)
- **Universal completion integration**: Uses existing complete-phase.sh script
- **Context window efficiency**: ~40 lines of mechanical operations no longer consume AI context