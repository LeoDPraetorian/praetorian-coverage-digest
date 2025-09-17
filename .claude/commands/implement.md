---
description: Execute implementation plan with systematic agent orchestration and progress gates
model: claude-opus-4-1-20250805
---

# Einstein Implementation Phase Workflow

You are orchestrating Phase 6 of the Einstein system: **Implementation Execution**. Your goal is to transform the implementation plan into working, tested code through systematic agent coordination and progress validation.

**Feature ID or Plan Path**: $ARGUMENTS

## Implementation Phase Overview

**Implementation Phase Formalization** with:

- **Sub-Phase 6.1**: Implementation Initialization
- **Sub-Phase 6.2**: Parallel Implementation Orchestration
- **Sub-Phase 6.3**: Implementation Progress Gates (25%, 50%, 75%, 100%)
- **Sub-Phase 6.4**: Conflict Resolution and Quality Validation

## Implementation Initialization

### Step 1: Load Implementation Context

```bash
# Determine if we have a feature ID or need to find the most recent
if [[ "$ARGUMENTS" =~ ^[a-z0-9-]+_[0-9]{8}_[0-9]{6}$ ]]; then
    # Direct feature ID provided
    FEATURE_ID="$ARGUMENTS"
    echo "Using provided feature ID: ${FEATURE_ID}"
else
    # Find most recent feature or use current_feature.env
    if [ -f ".claude/features/current_feature.env" ]; then
        source .claude/features/current_feature.env
        echo "Using current feature: ${FEATURE_ID}"
    else
        # Find most recent completed design
        FEATURE_ID=$(find .claude/features -name "metadata.json" -exec grep -l "design_completed" {} \; | head -1 | xargs dirname | xargs basename)
        if [ -z "${FEATURE_ID}" ]; then
            echo "❌ No design found. Please run /design first or provide a feature ID."
            exit 1
        fi
        echo "Found most recent design: ${FEATURE_ID}"
    fi
fi

# Validate required design artifacts exist
FEATURE_DIR=".claude/features/${FEATURE_ID}"
IMPLEMENTATION_PLAN="${FEATURE_DIR}/output/implementation-plan.md"
REQUIREMENTS_FILE="${FEATURE_DIR}/context/requirements.json"
COMPLEXITY_FILE="${FEATURE_DIR}/context/complexity-assessment.json"

if [ ! -f "${IMPLEMENTATION_PLAN}" ]; then
    echo "❌ Implementation plan not found: ${IMPLEMENTATION_PLAN}"
    echo "Please run: npx claude-code command design \"<feature description>\""
    exit 1
fi

echo "✅ Found implementation plan: ${IMPLEMENTATION_PLAN}"
```

### Step 2: Initialize Implementation Workspace

```bash
# Create implementation workspace structure
IMPL_DIR="${FEATURE_DIR}/implementation"
mkdir -p "${IMPL_DIR}"/{progress,code-changes,validation,logs,agent-outputs}

# Create individual agent output directories for tracking
AGENT_OUTPUT_DIR="${IMPL_DIR}/agent-outputs"
mkdir -p "${AGENT_OUTPUT_DIR}"

echo "=== Implementation Workspace ==="
echo "Feature: ${FEATURE_ID}"
echo "Implementation: ${IMPL_DIR}"
echo "Plan: ${IMPLEMENTATION_PLAN}"
echo "Agent Outputs: ${AGENT_OUTPUT_DIR}"
echo "==============================="

# Initialize progress tracking with individual agent tracking
cat > "${IMPL_DIR}/progress/task-tracker.json" << EOF
{
  "feature_id": "${FEATURE_ID}",
  "started": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "initializing",
  "current_gate": 0,
  "tasks": [],
  "agents": [],
  "agent_tracking": {
    "individual_outputs": "${AGENT_OUTPUT_DIR}",
    "active_agents": [],
    "completed_agents": [],
    "blocked_agents": [],
    "conflict_resolution": []
  },
  "milestones": {
    "foundation_gate": {"threshold": 25, "status": "pending"},
    "integration_gate": {"threshold": 50, "status": "pending"},
    "feature_complete_gate": {"threshold": 75, "status": "pending"},
    "production_ready_gate": {"threshold": 100, "status": "pending"}
  }
}
EOF

# Initialize agent output tracking structure
cat > "${AGENT_OUTPUT_DIR}/agent-registry.json" << EOF
{
  "tracking_initialized": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "feature_id": "${FEATURE_ID}",
  "agents": {},
  "coordination_log": []
}
EOF

echo "✅ Individual agent tracking structure initialized"

# Update feature metadata
METADATA_FILE="${FEATURE_DIR}/metadata.json"
jq '.status = "implementation_in_progress" | .phase = "implementation" | .implementation_started = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' "${METADATA_FILE}" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "${METADATA_FILE}"

echo "✅ Implementation workspace initialized"
```

### Step 2.5: Initialize Agent Tracking Framework

```bash
# Create agent tracking templates and coordination framework
echo "Setting up individual agent tracking framework..."

# Create agent tracking template
cat > "${AGENT_OUTPUT_DIR}/agent-tracking-template.md" << 'EOAT'
# Agent Tracking Report Template

**Agent:** [AGENT_NAME]
**Track:** [TRACK_NAME]  
**Started:** [START_TIMESTAMP]
**Status:** in_progress|completed|blocked|failed

## Task Assignment
### Primary Tasks
- [List of assigned tasks from implementation plan]

### File Targets
- [List of files this agent should create/modify]

### Success Criteria  
- [List of completion criteria]

### Dependencies
- [List of other agents or tasks this depends on]

## Progress Log
| Timestamp | Milestone | Status | Notes |
|-----------|-----------|---------|-------|
| [timestamp] | Started | in_progress | Agent initialization complete |
| [timestamp] | Foundation (25%) | pending | Core structure implementation |
| [timestamp] | Integration (50%) | pending | Integration points validated |
| [timestamp] | Feature Complete (75%) | pending | User workflows functional |
| [timestamp] | Production Ready (100%) | pending | All validation passed |

## Code Changes Summary
### Files Created
- [List files created with line counts]

### Files Modified  
- [List files modified with change summary]

### Tests Added
- [List test files created/modified]

## Issues Encountered
### Resolved Issues
| Issue | Resolution | Timestamp |
|-------|------------|-----------|
| [issue description] | [how resolved] | [when] |

### Blocking Issues
| Issue | Impact | Needs | Status |
|-------|---------|-------|--------|
| [issue description] | [impact on progress] | [what's needed to resolve] | [current status] |

### Coordination Notes
- [Notes about coordination with other agents]
- [Conflicts identified and resolution approach]
- [Communication with validation gates]

## Quality Metrics
### Code Quality
- Lines of code: [count]
- Test coverage: [percentage if available]
- Static analysis: [results if available]

### Performance Notes
- [Any performance considerations or measurements]

## Agent-Specific Insights
- [Domain-specific insights this agent discovered]
- [Patterns or approaches that worked well]
- [Recommendations for future similar tasks]

## Final Status
**Completion Status:** [PASS/FAIL/PARTIAL]
**Quality Rating:** [HIGH/MEDIUM/LOW]
**Handoff Notes:** [Notes for next phase or other agents]

---
*Agent tracking report generated on [TIMESTAMP]*
EOAT

# Create agent coordination helper functions
cat > "${AGENT_OUTPUT_DIR}/coordination-helpers.sh" << 'EOCH'
#!/bin/bash
# Agent Coordination Helper Functions

# Function to register agent start
register_agent_start() {
    local agent_name=$1
    local track_name=$2
    local agent_dir="${AGENT_OUTPUT_DIR}/${agent_name}"
    
    # Create agent directory
    mkdir -p "${agent_dir}"
    
    # Initialize agent tracking file from template  
    cp "${AGENT_OUTPUT_DIR}/agent-tracking-template.md" "${agent_dir}/tracking-report.md"
    
    # Replace template variables
    sed -i.bak "s/\[AGENT_NAME\]/${agent_name}/g; s/\[TRACK_NAME\]/${track_name}/g; s/\[START_TIMESTAMP\]/$(date -u +%Y-%m-%dT%H:%M:%SZ)/g" "${agent_dir}/tracking-report.md"
    rm "${agent_dir}/tracking-report.md.bak" 2>/dev/null || true
    
    # Update agent registry
    local registry_file="${AGENT_OUTPUT_DIR}/agent-registry.json"
    jq --arg agent "$agent_name" --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.agents[$agent] = {"status": "starting", "started": $timestamp, "track": "'$track_name'"}' \
       "$registry_file" > "$registry_file.tmp" && mv "$registry_file.tmp" "$registry_file"
    
    echo "✅ Agent ${agent_name} registered and tracking initialized"
}

# Function to update agent progress
update_agent_progress() {
    local agent_name=$1
    local milestone=$2  
    local status=$3
    local notes=$4
    
    local agent_dir="${AGENT_OUTPUT_DIR}/${agent_name}"
    local tracking_file="${agent_dir}/tracking-report.md"
    
    # Add progress entry to tracking report
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    sed -i.bak "/| \[timestamp\] | ${milestone} |/c\\| ${timestamp} | ${milestone} | ${status} | ${notes} |" "$tracking_file"
    rm "${tracking_file}.bak" 2>/dev/null || true
    
    # Update registry
    local registry_file="${AGENT_OUTPUT_DIR}/agent-registry.json"
    jq --arg agent "$agent_name" --arg milestone "$milestone" --arg status "$status" --arg timestamp "$timestamp" \
       '.agents[$agent].milestones[$milestone] = {"status": $status, "timestamp": $timestamp}' \
       "$registry_file" > "$registry_file.tmp" && mv "$registry_file.tmp" "$registry_file"
}

# Function to detect agent conflicts
detect_agent_conflicts() {
    echo "Checking for agent conflicts..."
    local conflicts_found=false
    local conflict_report="${AGENT_OUTPUT_DIR}/conflict-detection-report.md"
    
    # Initialize conflict report
    cat > "$conflict_report" << EOCR
# Agent Conflict Detection Report

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Feature ID:** ${FEATURE_ID}

## Conflict Analysis Summary
EOCR
    
    # Check for file overlap between agents
    echo "## File Overlap Analysis" >> "$conflict_report"
    echo "" >> "$conflict_report"
    
    # Create associative array to track file ownership
    declare -A file_agents
    
    for agent_dir in "${AGENT_OUTPUT_DIR}"/*; do
        if [ -d "$agent_dir" ] && [ -f "$agent_dir/tracking-report.md" ]; then
            local agent_name=$(basename "$agent_dir")
            echo "Analyzing agent: $agent_name"
            
            # Extract files this agent is working on
            if grep -q "### Files Created\|### Files Modified" "$agent_dir/tracking-report.md"; then
                grep -A 10 "### Files Created\|### Files Modified" "$agent_dir/tracking-report.md" | grep "^- " | while read -r file_line; do
                    local file_path=$(echo "$file_line" | sed 's/^- //' | cut -d' ' -f1)
                    
                    # Check if another agent is also working on this file
                    if [ -n "${file_agents[$file_path]}" ]; then
                        echo "⚠️  **FILE CONFLICT DETECTED**" >> "$conflict_report"
                        echo "- **File**: $file_path" >> "$conflict_report"
                        echo "- **Agents**: ${file_agents[$file_path]} AND $agent_name" >> "$conflict_report"
                        echo "" >> "$conflict_report"
                        conflicts_found=true
                    else
                        file_agents[$file_path]="$agent_name"
                    fi
                done
            fi
        fi
    done
    
    # Check for dependency conflicts
    echo "## Dependency Conflict Analysis" >> "$conflict_report"
    echo "" >> "$conflict_report"
    
    for agent_dir in "${AGENT_OUTPUT_DIR}"/*; do
        if [ -d "$agent_dir" ] && [ -f "$agent_dir/tracking-report.md" ]; then
            local agent_name=$(basename "$agent_dir")
            
            # Check if this agent's dependencies are being met
            if grep -q "### Dependencies" "$agent_dir/tracking-report.md"; then
                grep -A 5 "### Dependencies" "$agent_dir/tracking-report.md" | grep "^- " | while read -r dep_line; do
                    local dependency=$(echo "$dep_line" | sed 's/^- //')
                    
                    # Check if dependency agent exists and is progressing
                    local dep_agent_dir="${AGENT_OUTPUT_DIR}/${dependency}"
                    if [ ! -d "$dep_agent_dir" ]; then
                        echo "⚠️  **DEPENDENCY CONFLICT DETECTED**" >> "$conflict_report"
                        echo "- **Waiting Agent**: $agent_name" >> "$conflict_report"  
                        echo "- **Missing Dependency**: $dependency" >> "$conflict_report"
                        echo "" >> "$conflict_report"
                        conflicts_found=true
                    fi
                done
            fi
        fi
    done
    
    # Check for coordination issues
    echo "## Coordination Issues Analysis" >> "$conflict_report"
    echo "" >> "$conflict_report"
    
    # Look for agents that have reported coordination issues
    for agent_dir in "${AGENT_OUTPUT_DIR}"/*; do
        if [ -d "$agent_dir" ] && [ -f "$agent_dir/tracking-report.md" ]; then
            local agent_name=$(basename "$agent_dir")
            
            if grep -q "### Coordination Notes" "$agent_dir/tracking-report.md"; then
                local coord_issues=$(grep -A 10 "### Coordination Notes" "$agent_dir/tracking-report.md" | grep -i "conflict\|block\|issue")
                if [ -n "$coord_issues" ]; then
                    echo "⚠️  **COORDINATION ISSUE REPORTED**" >> "$conflict_report"
                    echo "- **Agent**: $agent_name" >> "$conflict_report"
                    echo "- **Issue**: $coord_issues" >> "$conflict_report"
                    echo "" >> "$conflict_report"
                    conflicts_found=true
                fi
            fi
        fi
    done
    
    # Generate conflict resolution recommendations
    echo "## Conflict Resolution Recommendations" >> "$conflict_report"
    echo "" >> "$conflict_report"
    
    if [ "$conflicts_found" = true ]; then
        echo "### Immediate Actions Required" >> "$conflict_report"
        echo "1. **File Conflicts**: Agents should coordinate on shared files or split responsibilities" >> "$conflict_report"
        echo "2. **Dependency Issues**: Ensure dependency agents are active and progressing" >> "$conflict_report"
        echo "3. **Coordination Problems**: Facilitate agent communication through tracking reports" >> "$conflict_report"
        echo "" >> "$conflict_report"
        echo "### Resolution Strategy" >> "$conflict_report"
        echo "- Document conflict resolution in individual agent tracking reports" >> "$conflict_report"
        echo "- Update agent task assignments if necessary" >> "$conflict_report"
        echo "- Implement conflict resolution checkpoints at validation gates" >> "$conflict_report"
        
        echo "❌ Agent conflicts detected - see report: $conflict_report"
        
        # Update task tracker with conflict information
        local task_tracker="${IMPL_DIR}/progress/task-tracker.json"
        jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.agent_tracking.conflict_resolution += [{"timestamp": $timestamp, "status": "conflicts_detected", "report": "'$conflict_report'"}]' \
           "$task_tracker" > "$task_tracker.tmp" && mv "$task_tracker.tmp" "$task_tracker"
    else
        echo "### No Conflicts Detected" >> "$conflict_report"
        echo "All agents appear to be working without conflicts." >> "$conflict_report"
        echo "✅ No agent conflicts detected"
    fi
    
    echo "Conflict detection report saved to: $conflict_report"
}
EOCH

chmod +x "${AGENT_OUTPUT_DIR}/coordination-helpers.sh"

echo "✅ Agent tracking framework initialized"
echo "  - Template: ${AGENT_OUTPUT_DIR}/agent-tracking-template.md"  
echo "  - Registry: ${AGENT_OUTPUT_DIR}/agent-registry.json"
echo "  - Helpers: ${AGENT_OUTPUT_DIR}/coordination-helpers.sh"
```

### Step 3: Parse Implementation Plan

```bash
# Extract task assignments from implementation plan
TASK_FILE="${IMPL_DIR}/progress/agent-assignments.json"

echo "Parsing implementation plan for agent assignments..."

# Use implementation-planner to extract structured tasks
# This ensures we have machine-readable task definitions
```

Tell the `implementation-planner`:
"Re-read the implementation plan and extract structured task assignments.

Read the plan from: ${IMPLEMENTATION_PLAN}

Create a structured task assignment file at: ${TASK_FILE}

Output format:

```json
{
  \"implementation_tracks\": [
    {
      \"track_id\": \"backend_development\",
      \"agents\": [\"golang-api-developer\", \"database-architect\"],
      \"dependencies\": [],
      \"parallel_safe\": true,
      \"estimated_duration\": \"4-6 hours\",
      \"tasks\": [
        {
          \"task_id\": \"create_api_endpoints\",
          \"agent\": \"golang-api-developer\",
          \"description\": \"Create REST API endpoints for feature\",
          \"files\": [\"pkg/handlers/feature_handler.go\"],
          \"dependencies\": [],
          \"completion_criteria\": [\"Endpoints return 200\", \"Handlers tested\"]
        }
      ]
    }
  ],
  \"total_estimated_hours\": 12,
  \"critical_path\": [\"backend_development\", \"frontend_development\"],
  \"risk_factors\": [\"Third-party API dependencies\", \"Complex state management\"]
}
```

Ensure all tasks have:

- Clear agents assigned
- Specific file targets
- Measurable completion criteria
- Proper dependency chains"

## Parallel Implementation Orchestration

### Step 4: Agent Coordination Setup

```bash
source .claude/features/current_feature.env
TASK_FILE="${FEATURE_DIR}/implementation/progress/agent-assignments.json"

if [ ! -f "${TASK_FILE}" ]; then
    echo "❌ Agent assignments not found. Implementation plan parsing failed."
    exit 1
fi

echo "=== Agent Coordination Plan ==="
cat "${TASK_FILE}" | jq -r '.implementation_tracks[] | "Track: \(.track_id) | Agents: \(.agents | join(", ")) | Duration: \(.estimated_duration)"'
echo "==============================="

# Identify parallel-safe tracks for concurrent execution
PARALLEL_TRACKS=$(cat "${TASK_FILE}" | jq -r '.implementation_tracks[] | select(.parallel_safe == true) | .track_id')

echo "Parallel tracks identified:"
echo "${PARALLEL_TRACKS}"

# Initialize individual agent tracking for each agent
echo "=== Individual Agent Tracking Setup ==="
source "${AGENT_OUTPUT_DIR}/coordination-helpers.sh"

# Pre-register all agents from the task assignments
cat "${TASK_FILE}" | jq -r '.implementation_tracks[] as $track | $track.tasks[] | "\(.agent) \($track.track_id)"' | while read agent_name track_name; do
    register_agent_start "$agent_name" "$track_name"
done

echo "✅ All agents registered for individual tracking"

# Add periodic conflict detection checkpoint
echo "=== Agent Conflict Detection Checkpoint ==="
detect_agent_conflicts
echo "============================================"
```

### Step 5: Spawn Implementation Agents

**CRITICAL: All implementation agents MUST be spawned in a SINGLE MESSAGE for true parallel execution:**

Based on the agent assignments, spawn all agents concurrently with their specific tasks:

```bash
# Display the spawning plan with individual tracking info
echo "=== Agent Spawning Plan with Individual Tracking ==="
cat "${TASK_FILE}" | jq -r '.implementation_tracks[].tasks[] | "Task: \(.task_id) | Agent: \(.agent) | Files: \(.files | join(", ")) | Tracking: '${AGENT_OUTPUT_DIR}'/\(.agent)/"'
echo "=============================================="

# Display agent tracking directories
echo "=== Individual Agent Tracking Directories ==="
for agent_dir in "${AGENT_OUTPUT_DIR}"/*; do
    if [ -d "$agent_dir" ] && [ "$agent_dir" != "${AGENT_OUTPUT_DIR}/agent-tracking-template.md" ]; then
        agent_name=$(basename "$agent_dir")
        echo "  - ${agent_name}: ${agent_dir}/"
    fi
done
echo "=============================================="
```

**Spawn ALL agents in ONE message using Claude Code's Task tool with Individual Tracking:**

For each task in the agent assignments, provide enhanced instructions with individual tracking:

**EXAMPLE ENHANCED TASK SPAWNING:**

Based on your task assignments, spawn agents with individual tracking like this:

1. **Backend Development Track** (if present):

   - Task("golang-api-developer", "[Enhanced tracking instructions - see template below]", "golang-api-developer")
   - Task("database-architect", "[Enhanced tracking instructions - see template below]", "database-neo4j-architect")

2. **Frontend Development Track** (if present):

   - Task("react-developer", "[Enhanced tracking instructions - see template below]", "react-developer") 
   - Task("react-typescript-architect", "[Enhanced tracking instructions - see template below]", "react-typescript-architect")

3. **Integration Track** (if present):

   - Task("integration-developer", "[Enhanced tracking instructions - see template below]", "integration-developer")

4. **Infrastructure Track** (if present):
   - Task("devops-automator", "[Enhanced tracking instructions - see template below]", "devops-automator")

**Enhanced Agent Instructions Template with Individual Tracking:**

Replace "[Enhanced tracking instructions - see template below]" with this comprehensive template for each agent:

```
"Implement your assigned tasks from the implementation plan with comprehensive individual tracking.

## Context Files
- Implementation Plan: ${IMPLEMENTATION_PLAN}
- Requirements: ${REQUIREMENTS_FILE}
- Complexity: ${COMPLEXITY_FILE}
- Task Assignments: ${TASK_FILE}

## Your Individual Tracking Workspace
**CRITICAL: You have a dedicated tracking workspace for full transparency and debugging.**

### Your Dedicated Directories
- **Individual Tracking Directory**: ${AGENT_OUTPUT_DIR}/[AGENT_NAME]/
- **Your Tracking Report**: ${AGENT_OUTPUT_DIR}/[AGENT_NAME]/tracking-report.md
- **Code Changes**: ${IMPL_DIR}/code-changes/[your-domain]/
- **Execution Log**: ${IMPL_DIR}/logs/[AGENT_NAME]-execution.log

### Individual Tracking Requirements
**MANDATORY: Update your individual tracking report throughout your work.**

1. **Initialize Your Tracking Report**
   - Your tracking report template is already created at ${AGENT_OUTPUT_DIR}/[AGENT_NAME]/tracking-report.md
   - Fill in the [TASK ASSIGNMENT] section with your specific tasks from the implementation plan
   - Update [FILE TARGETS] with the specific files you'll create/modify
   - Document your [SUCCESS CRITERIA] and [DEPENDENCIES]

2. **Progress Tracking Protocol**
   - Update your progress log table for each milestone (25%, 50%, 75%, 100%)
   - Document all code changes in the 'Code Changes Summary' section
   - Log any issues encountered with resolution approaches
   - Note coordination points with other agents

3. **Quality Documentation**
   - Document code quality metrics (lines added, test coverage if available)
   - Note any performance considerations
   - Record domain-specific insights you discover
   - Provide final quality rating and handoff notes

## Coordination Protocol
1. **Dependency Management**: Check your tracking report for dependencies before starting
2. **Progress Checkpoints**: Update tracking report at 25%, 50%, 75%, 100% milestones
3. **Conflict Resolution**: Document any conflicts with other agents in your tracking report
4. **Quality Validation**: Test implementations before marking milestones complete
5. **Coordination Communication**: Use tracking report coordination notes for inter-agent communication

## Implementation Requirements
### From Task Assignment (replace with actual task details):
- **Specific Tasks**: [Extract specific tasks from agent assignments for this agent]
- **Files to Create/Modify**: [List specific files from task assignments] 
- **Success Criteria**: [Measurable completion criteria from task assignments]
- **Track Dependencies**: [Any agent or task dependencies from assignments]

### Output Requirements
1. **Code Implementation**: Save all code to ${IMPL_DIR}/code-changes/[your-domain]/
2. **Individual Tracking**: Continuously update ${AGENT_OUTPUT_DIR}/[AGENT_NAME]/tracking-report.md
3. **Execution Log**: Log major actions to ${IMPL_DIR}/logs/[AGENT_NAME]-execution.log
4. **Shared Progress**: Update overall task completion in ${IMPL_DIR}/progress/task-tracker.json

### Final Deliverable Checklist
Before marking your work complete, ensure:
- [ ] All assigned tasks implemented and tested
- [ ] Individual tracking report fully completed with final status
- [ ] Code changes properly organized and documented  
- [ ] Any conflicts or coordination issues documented
- [ ] Quality metrics and insights captured
- [ ] Handoff notes prepared for validation gates

## Agent-Specific Context
Replace this section with agent-specific guidance based on the implementation plan:
- **Domain Focus**: [Backend/Frontend/Integration/Infrastructure specific guidance]
- **Technology Stack**: [Relevant technologies for this agent's domain]
- **Validation Approach**: [How this agent's work will be validated]

Work in parallel with other agents but maintain full transparency through your individual tracking workspace."
```

**Template Customization for Each Agent:**
When spawning each agent, replace the placeholders:
- [AGENT_NAME] → actual agent name (e.g., "golang-api-developer")
- [Extract specific tasks...] → actual tasks from task assignments JSON
- [List specific files...] → actual file targets from task assignments
- [Measurable completion criteria...] → actual success criteria from task assignments
- [Agent-specific guidance...] → domain-specific instructions based on agent type

## Implementation Progress Gates

### Step 6: Gate 1 - Foundation Gate (25%)

```bash
# Monitor progress and trigger validation at 25%
echo "Monitoring for Foundation Gate (25% completion)..."

# Ensure validation directory exists
mkdir -p "${IMPL_DIR}/validation"

# Check if foundation tasks are complete
FOUNDATION_COMPLETE=$(cat "${IMPL_DIR}/progress/task-tracker.json" | jq '.milestones.foundation_gate.status')

if [ "${FOUNDATION_COMPLETE}" = "\"ready\"" ]; then
    echo "🚪 Triggering Foundation Gate Validation..."
    
    # Display validation context
    echo "=== Foundation Gate Validation Context ==="
    echo "Implementation Directory: ${IMPL_DIR}/code-changes/"
    echo "Validation Report Output: ${IMPL_DIR}/validation/foundation-gate-report.md"
    echo "Task Tracker: ${IMPL_DIR}/progress/task-tracker.json"
    echo "========================================"
fi
```

Use `code-pattern-analyzer` for comprehensive foundation validation:

"Conduct comprehensive foundation implementation validation at 25% milestone.

**Validation Context:**
- Implementation workspace: ${IMPL_DIR}/code-changes/
- Feature requirements: ${REQUIREMENTS_FILE}
- Task tracker: ${IMPL_DIR}/progress/task-tracker.json
- Individual agent tracking: ${AGENT_OUTPUT_DIR}/
- Agent registry: ${AGENT_OUTPUT_DIR}/agent-registry.json

**CRITICAL: Save your complete validation analysis to: ${IMPL_DIR}/validation/foundation-gate-report.md**

**Individual Agent Tracking Analysis:**
Before performing foundation validation, analyze individual agent progress:

1. **Review Agent Registry**: Check ${AGENT_OUTPUT_DIR}/agent-registry.json for agent status
2. **Analyze Individual Reports**: Review each agent's tracking report at ${AGENT_OUTPUT_DIR}/[agent-name]/tracking-report.md
3. **Identify Agent-Specific Issues**: Look for blocked agents, conflicts, or quality concerns
4. **Cross-Agent Coordination**: Validate that agents are coordinating properly

**Validation Criteria:**

1. **Code Structure Validation**
   - All planned files have been created with proper structure
   - File organization follows established project patterns
   - Directory structure matches architectural decisions

2. **Syntax and Dependencies**
   - No syntax errors in any created files
   - All imports and dependencies properly resolved
   - Package imports follow project conventions

3. **Pattern Compliance**
   - Code follows established design patterns from DESIGN-PATTERNS.md
   - Consistent with existing codebase architecture
   - Proper separation of concerns implemented

4. **Foundation Requirements**
   - Core business logic structure in place
   - Basic error handling patterns established
   - Logging and monitoring hooks implemented

**Required Report Structure:**

```markdown
# Foundation Gate Validation Report - 25% Milestone

**Date:** [Current Date]
**Feature ID:** ${FEATURE_ID}
**Validation Status:** PASS/FAIL

## Executive Summary
[Overall assessment of foundation implementation quality]

## Individual Agent Progress Analysis
### Agent Registry Overview
[Summary of agent statuses from agent-registry.json]

### Agent-Specific Progress
[For each active agent, summarize their tracking report status]

### Agent Coordination Assessment
[Analysis of cross-agent coordination and conflict resolution]

### Blocked or Failed Agents
[Identify any agents that are blocked or have failed, with root cause analysis]

## Code Structure Analysis
### Files Created
[List all files with line counts, file types, and purposes]

### Directory Organization
[Validate directory structure against project patterns]

### Missing Foundation Elements
[Identify any planned files or structures not yet created]

## Syntax and Dependency Validation
### Syntax Check Results
[Report any syntax errors found]

### Dependency Resolution
[Verify all imports and dependencies are properly resolved]

### Build Compatibility
[Assess if code builds without errors]

## Pattern Compliance Assessment
### Design Pattern Adherence
[Evaluate compliance with established patterns]

### Architecture Consistency
[Assess consistency with existing codebase architecture]

### Code Quality Standards
[Review against coding standards and best practices]

## Issues and Risks Identified
### Critical Issues
[Issues that must be resolved before proceeding]

### Warning-Level Issues  
[Issues that should be addressed but don't block progression]

### Technical Debt Notes
[Areas where shortcuts were taken that need future attention]

## Recommendations
### Immediate Actions Required
[Steps needed to pass this gate]

### Suggested Improvements
[Non-blocking improvements for better quality]

### Next Gate Preparation
[What should be focus for Integration Gate (50%)]

## Gate Decision
**Status:** [PASS/FAIL]
**Rationale:** [Clear explanation of decision]
**Blocker Resolution:** [Required actions if FAIL]

---
*Generated by code-pattern-analyzer on [timestamp]*
```

**Post-Validation Actions:**
1. Update task tracker with gate status based on your analysis
2. If PASS: Mark foundation_gate as 'completed' in task tracker
3. If FAIL: Mark foundation_gate as 'blocked' with issues list
4. Provide specific next steps for development team"

### Step 7: Gate 2 - Integration Gate (50%)

```bash
echo "🚪 Integration Gate (50% completion)..."

# Ensure previous gate passed
FOUNDATION_STATUS=$(grep "Validation Status.*PASS" "${IMPL_DIR}/validation/foundation-gate-report.md" 2>/dev/null || echo "")
if [ -z "$FOUNDATION_STATUS" ]; then
    echo "⚠️ Foundation Gate must pass before proceeding to Integration Gate"
    echo "Please resolve Foundation Gate issues first"
fi

# Display validation context
echo "=== Integration Gate Validation Context ==="
echo "Implementation Directory: ${IMPL_DIR}/code-changes/"
echo "Validation Report Output: ${IMPL_DIR}/validation/integration-gate-report.md"
echo "Foundation Report: ${IMPL_DIR}/validation/foundation-gate-report.md"
echo "========================================"
```

Use `integration-test-engineer` for comprehensive integration validation:

"Conduct comprehensive integration testing and validation at 50% milestone.

**Validation Context:**
- Implementation workspace: ${IMPL_DIR}/code-changes/
- Feature requirements: ${REQUIREMENTS_FILE}
- Foundation gate report: ${IMPL_DIR}/validation/foundation-gate-report.md
- Task tracker: ${IMPL_DIR}/progress/task-tracker.json
- Individual agent tracking: ${AGENT_OUTPUT_DIR}/
- Agent registry: ${AGENT_OUTPUT_DIR}/agent-registry.json

**CRITICAL: Save your complete validation analysis to: ${IMPL_DIR}/validation/integration-gate-report.md**

**Individual Agent Tracking Analysis:**
Before performing integration validation, analyze agent progress since Foundation Gate:

1. **Agent Progress Since Foundation**: Review how each agent has progressed since 25% milestone
2. **Integration-Specific Agent Work**: Focus on agents handling API, database, and service integrations
3. **Cross-Agent Dependencies**: Validate that agent dependencies are being met
4. **Agent Coordination Issues**: Identify any new coordination challenges that emerged

**Integration Validation Criteria:**

1. **API Integration Testing**
   - All API endpoints return expected HTTP status codes
   - Request/response payloads match specifications  
   - Error responses properly formatted and handled
   - Authentication and authorization working correctly

2. **Database Integration**
   - Database connections established and stable
   - CRUD operations function correctly
   - Data persistence verified across operations
   - Database constraints and validations working

3. **Third-Party Service Integration**
   - External API calls succeed with proper authentication
   - Rate limiting and retry logic implemented
   - Error handling for service unavailability
   - Webhook handlers (if applicable) responding correctly

4. **Component Integration**
   - Frontend-backend communication verified
   - State management working across components
   - Data flow between modules functioning
   - Event handling and callbacks operational

5. **Infrastructure Integration**
   - Configuration management working
   - Logging and monitoring integration active
   - Environment-specific settings loading correctly
   - Resource allocation and scaling functional

**Required Report Structure:**

```markdown
# Integration Gate Validation Report - 50% Milestone

**Date:** [Current Date]
**Feature ID:** ${FEATURE_ID}  
**Validation Status:** PASS/FAIL

## Executive Summary
[Overall assessment of integration implementation status]

## Individual Agent Progress Analysis (Since Foundation Gate)
### Agent Progress Summary
[Progress of each agent since 25% milestone, focusing on integration work]

### Integration-Focused Agent Analysis
[Detailed analysis of agents handling APIs, databases, and service integrations]

### Agent Dependency Validation
[Verification that cross-agent dependencies are being met properly]

### Coordination Issues Since Foundation
[Any new coordination challenges that emerged during integration phase]

## API Integration Results
### Endpoint Testing Results
[Test results for each API endpoint with status codes and response validation]

### Authentication Testing
[Results of authentication and authorization testing]

### Error Handling Validation
[Testing of error scenarios and response handling]

## Database Integration Results
### Connection Testing
[Database connectivity and configuration validation]

### CRUD Operation Testing
[Results of Create, Read, Update, Delete operations]

### Data Integrity Testing
[Validation of data persistence and consistency]

## Third-Party Integration Results
### External Service Testing
[Results of external API integrations and service calls]

### Error Handling and Resilience
[Testing of failure scenarios and recovery mechanisms]

### Authentication and Security
[Validation of secure communication with external services]

## Component Integration Results
### Frontend-Backend Communication
[Testing of UI-API communication pathways]

### Inter-Module Integration
[Validation of communication between different system modules]

### State Management Integration
[Testing of state synchronization and data flow]

## Infrastructure Integration Results
### Configuration Management
[Validation of configuration loading and environment handling]

### Monitoring and Logging
[Testing of observability and debugging capabilities]

### Resource Management
[Assessment of resource allocation and performance]

## Integration Test Execution
### Automated Tests Run
[List of automated integration tests executed with results]

### Manual Test Scenarios
[Manual testing scenarios completed with outcomes]

### Performance Baseline
[Basic performance metrics captured during integration testing]

## Issues and Risks Identified
### Critical Integration Issues
[Integration failures that block further progress]

### Warning-Level Issues
[Integration concerns that should be addressed]

### Performance Concerns
[Any performance issues identified during testing]

## Recommendations
### Immediate Actions Required
[Steps needed to resolve critical integration issues]

### Integration Improvements
[Suggested improvements for better integration reliability]

### Feature Complete Gate Preparation
[Recommendations for preparing the next validation gate]

## Gate Decision
**Status:** [PASS/FAIL]
**Rationale:** [Clear explanation of integration validation decision]
**Blocker Resolution:** [Required actions if FAIL]

## Test Evidence
[Include relevant test output, logs, or screenshots as evidence]

---
*Generated by integration-test-engineer on [timestamp]*
```

**Post-Validation Actions:**
1. Update task tracker with integration gate status based on your validation results
2. If PASS: Mark integration_gate as 'completed' in task tracker
3. If FAIL: Mark integration_gate as 'blocked' with detailed issues list
4. Document any integration patterns discovered for future reference
5. Provide clear next steps for reaching Feature Complete Gate (75%)"

### Step 8: Gate 3 - Feature Complete Gate (75%)

```bash
echo "🚪 Feature Complete Gate (75% completion)..."

# Ensure previous gate passed
INTEGRATION_STATUS=$(grep "Validation Status.*PASS" "${IMPL_DIR}/validation/integration-gate-report.md" 2>/dev/null || echo "")
if [ -z "$INTEGRATION_STATUS" ]; then
    echo "⚠️ Integration Gate must pass before proceeding to Feature Complete Gate"
    echo "Please resolve Integration Gate issues first"
fi

# Display validation context
echo "=== Feature Complete Gate Validation Context ==="
echo "Implementation Directory: ${IMPL_DIR}/code-changes/"
echo "Validation Report Output: ${IMPL_DIR}/validation/feature-complete-gate-report.md"
echo "Integration Report: ${IMPL_DIR}/validation/integration-gate-report.md"
echo "Feature Requirements: ${REQUIREMENTS_FILE}"
echo "========================================"
```

Use `e2e-test-engineer` for comprehensive feature completeness validation:

"Conduct comprehensive end-to-end feature validation at 75% milestone.

**Validation Context:**
- Implementation workspace: ${IMPL_DIR}/code-changes/
- Feature requirements: ${REQUIREMENTS_FILE}
- Integration gate report: ${IMPL_DIR}/validation/integration-gate-report.md
- Foundation gate report: ${IMPL_DIR}/validation/foundation-gate-report.md
- Task tracker: ${IMPL_DIR}/progress/task-tracker.json
- Individual agent tracking: ${AGENT_OUTPUT_DIR}/
- Agent registry: ${AGENT_OUTPUT_DIR}/agent-registry.json

**CRITICAL: Save your complete validation analysis to: ${IMPL_DIR}/validation/feature-complete-gate-report.md**

**Individual Agent Tracking Analysis:**
Focus on feature completion across all agents:

1. **Feature Implementation Agent Analysis**: Review frontend, backend, and integration agents' progress toward feature completion
2. **User Story Implementation Tracking**: Validate which agents contributed to each user story
3. **Agent Quality Metrics**: Review code quality, testing, and documentation from individual agent reports
4. **Cross-Agent Feature Integration**: Ensure agents' work integrates properly for end-to-end user workflows

**Feature Completeness Validation Criteria:**

1. **User Story Validation**
   - All user stories from requirements are implemented
   - User workflows function end-to-end without errors
   - Edge cases and error scenarios properly handled
   - User experience meets acceptance criteria

2. **End-to-End Workflow Testing**
   - Complete user journeys testable and functional
   - Cross-browser compatibility (if web application)
   - Mobile responsiveness (if applicable)
   - Performance meets minimum acceptable thresholds

3. **Acceptance Criteria Verification**
   - Every acceptance criterion from requirements validated
   - Business logic correctly implemented
   - Data validation and constraints working
   - Output formats and responses as specified

4. **Error Handling and Edge Cases**
   - Graceful error handling for all failure scenarios
   - Appropriate user feedback and error messages
   - System recovery from error states
   - Input validation and sanitization complete

5. **Security Implementation**
   - Security patterns properly implemented
   - Authentication and authorization working correctly
   - Data protection and privacy measures in place
   - No obvious security vulnerabilities present

6. **User Interface Completeness**
   - All UI components functional and accessible
   - Design consistency across the application
   - Loading states and feedback mechanisms implemented
   - Responsive design working across screen sizes

**Required Report Structure:**

```markdown
# Feature Complete Gate Validation Report - 75% Milestone

**Date:** [Current Date]
**Feature ID:** ${FEATURE_ID}
**Validation Status:** PASS/FAIL

## Executive Summary
[Overall assessment of feature implementation completeness]

## User Story Implementation Status
### Implemented User Stories
[List of completed user stories with validation results]

### User Story Coverage Analysis
[Assessment of user story implementation completeness]

### Missing or Incomplete Stories
[Any user stories not yet fully implemented]

## End-to-End Workflow Validation
### Primary User Workflows
[Testing results for main user journey flows]

### Secondary Workflows
[Testing results for supporting user workflows]

### Cross-Platform Compatibility
[Testing results across different platforms/browsers]

### Performance Validation
[Basic performance metrics and user experience validation]

## Acceptance Criteria Verification
### Met Acceptance Criteria
[List of acceptance criteria that are fully satisfied]

### Partially Met Criteria
[Acceptance criteria that are implemented but have issues]

### Unmet Criteria
[Acceptance criteria that still need implementation]

### Business Logic Validation
[Verification that business rules are correctly implemented]

## Error Handling and Edge Case Testing
### Error Scenario Testing
[Testing results for various error conditions]

### Input Validation Testing
[Testing of data validation and sanitization]

### System Recovery Testing
[Testing of system recovery from failure states]

### User Feedback Mechanisms
[Validation of user feedback and notification systems]

## Security Implementation Review
### Authentication Testing
[Validation of user authentication mechanisms]

### Authorization Testing
[Testing of user permission and access control]

### Data Protection Validation
[Review of data security and privacy implementations]

### Security Vulnerability Assessment
[Basic security review for obvious vulnerabilities]

## User Interface and Experience Validation
### UI Component Testing
[Validation of all user interface components]

### Accessibility Testing
[Basic accessibility compliance verification]

### Responsive Design Testing
[Testing across different screen sizes and devices]

### User Experience Flow
[Assessment of overall user experience quality]

## Test Execution Results
### Automated E2E Tests
[Results from automated end-to-end test execution]

### Manual Testing Scenarios
[Results from manual user workflow testing]

### Regression Testing
[Verification that existing functionality still works]

### Performance Benchmarking
[Basic performance metrics captured during testing]

## Issues and Risks Identified
### Critical Feature Gaps
[Features or functionality missing that block completion]

### Quality Issues
[Issues that affect user experience or functionality]

### Performance Concerns
[Performance issues that need addressing]

### Security Concerns
[Security issues identified that need resolution]

## Recommendations
### Critical Actions Required
[Actions needed to achieve feature completeness]

### Quality Improvements
[Suggestions for improving feature quality]

### User Experience Enhancements
[Recommendations for better user experience]

### Production Ready Gate Preparation
[Actions needed to prepare for final production validation]

## Gate Decision
**Status:** [PASS/FAIL]
**Rationale:** [Clear explanation of feature completeness assessment]
**Completion Percentage:** [Estimated percentage of feature completeness]
**Blocker Resolution:** [Required actions if FAIL]

## Test Evidence and Artifacts
### Screenshots/Videos
[Visual evidence of user workflows and functionality]

### Test Logs and Output
[Relevant test execution logs and results]

### Performance Metrics
[Performance measurement data collected]

---
*Generated by e2e-test-engineer on [timestamp]*
```

**Post-Validation Actions:**
1. Update task tracker with feature complete gate status based on your validation results
2. If PASS: Mark feature_complete_gate as 'completed' in task tracker
3. If FAIL: Mark feature_complete_gate as 'blocked' with detailed completion gaps
4. Document any user experience patterns or issues discovered
5. Create or update E2E test suite based on validation findings
6. Provide clear roadmap for achieving Production Ready Gate (100%)"

### Step 9: Gate 4 - Production Ready Gate (100%)

```bash
echo "🚪 Production Ready Gate (100% completion)..."

# Ensure previous gate passed
FEATURE_COMPLETE_STATUS=$(grep "Validation Status.*PASS" "${IMPL_DIR}/validation/feature-complete-gate-report.md" 2>/dev/null || echo "")
if [ -z "$FEATURE_COMPLETE_STATUS" ]; then
    echo "⚠️ Feature Complete Gate must pass before proceeding to Production Ready Gate"
    echo "Please resolve Feature Complete Gate issues first"
fi

# Display validation context
echo "=== Production Ready Gate Validation Context ==="
echo "Implementation Directory: ${IMPL_DIR}/code-changes/"
echo "Validation Report Output: ${IMPL_DIR}/validation/production-ready-gate-report.md"
echo "Feature Complete Report: ${IMPL_DIR}/validation/feature-complete-gate-report.md"
echo "All Previous Reports: ${IMPL_DIR}/validation/"
echo "Feature Requirements: ${REQUIREMENTS_FILE}"
echo "========================================="
```

Use `production-validator` for comprehensive production readiness validation:

"Conduct comprehensive production readiness validation at 100% milestone.

**Validation Context:**
- Implementation workspace: ${IMPL_DIR}/code-changes/
- Feature requirements: ${REQUIREMENTS_FILE}
- All validation reports: ${IMPL_DIR}/validation/
- Task tracker: ${IMPL_DIR}/progress/task-tracker.json
- Feature metadata: ${FEATURE_DIR}/metadata.json
- Individual agent tracking: ${AGENT_OUTPUT_DIR}/
- Agent registry: ${AGENT_OUTPUT_DIR}/agent-registry.json

**Security Integration Context (when available):**
- Security review workspace: ${FEATURE_DIR}/security-review/ (if exists)
- Security findings: ${FEATURE_DIR}/security-review/findings/ (if exists)
- Security integration notes: ${FEATURE_DIR}/security-review/context/implementation-integration.md (if exists)

**CRITICAL: Save your complete validation analysis to: ${IMPL_DIR}/validation/production-ready-gate-report.md**

**Individual Agent Tracking Analysis:**
Conduct comprehensive review of all agent work for production readiness:

1. **Complete Agent Portfolio Review**: Analyze final deliverables from all agents
2. **Agent Quality Assessment**: Review each agent's final quality metrics and self-assessments
3. **Cross-Agent Integration Validation**: Ensure seamless integration of all agent contributions
4. **Agent Handoff Documentation**: Validate that each agent has provided proper handoff notes for operations

**Security Review Integration Analysis:**
If security review workspace is available, integrate security findings:

1. **Security Review Status Validation**: Verify security review has been completed for this feature
2. **Security Findings Integration**: Analyze security review findings and ensure critical issues are resolved
3. **Security Recommendations Implementation**: Validate that security recommendations have been addressed
4. **Cross-Phase Security Validation**: Ensure security implementation matches security design decisions

**Production Readiness Validation Criteria:**

1. **Code Quality and Testing**
   - All unit tests passing with >80% coverage
   - All integration tests passing
   - All E2E tests passing
   - Code quality metrics meet standards
   - No critical static analysis issues

2. **Security Validation**
   - Security review completed with no high-severity issues
   - Authentication and authorization properly implemented
   - Input validation and sanitization complete
   - No exposed secrets or credentials
   - Security headers and configurations proper

**Enhanced Security Integration (when available):**
   - Cross-reference with feature security review workspace if available
   - Validate that security review findings have been addressed
   - Ensure security recommendations from design phase are implemented

3. **Performance and Scalability**
   - Performance benchmarks meet requirements
   - Load testing completed successfully
   - Resource usage within acceptable limits
   - Caching strategies implemented correctly
   - Database query optimization verified

4. **Deployment Readiness**
   - Deployment configurations complete and tested
   - Environment-specific settings properly configured
   - CI/CD pipeline integration functional
   - Rollback procedures defined and tested
   - Infrastructure requirements documented

5. **Monitoring and Observability**
   - Logging implementation complete and functional
   - Monitoring and alerting configured
   - Health check endpoints implemented
   - Error tracking and reporting operational
   - Performance metrics collection active

6. **Documentation and Compliance**
   - Technical documentation complete and accurate
   - API documentation up to date
   - Deployment guides available
   - Operational runbooks created
   - Compliance requirements met

7. **Operational Readiness**
   - Support procedures documented
   - Error handling and recovery procedures defined
   - Data backup and recovery mechanisms in place
   - Access control and permissions configured
   - Incident response procedures available

**Required Report Structure:**

```markdown
# Production Ready Gate Validation Report - 100% Milestone

**Date:** [Current Date]
**Feature ID:** ${FEATURE_ID}
**Validation Status:** PASS/FAIL

## Executive Summary
[Comprehensive assessment of production readiness]

## Code Quality and Testing Validation
### Test Suite Execution Results
[Results from all test suites with coverage metrics]

### Code Quality Metrics
[Static analysis results, complexity metrics, maintainability scores]

### Dependency Security Audit
[Results of dependency vulnerability scanning]

### Code Review Completion
[Verification that code reviews are complete]

## Security Validation Results

### Security Review Integration Status
[Status and results of comprehensive security review]

**Enhanced Security Integration (when security review workspace available):**
- **Security Review Workspace**: Check ${FEATURE_DIR}/security-review/ for comprehensive security analysis
- **Security Findings Report**: Review ${FEATURE_DIR}/security-review/findings/final-security-report.md
- **Security Integration Notes**: Reference ${FEATURE_DIR}/security-review/context/implementation-integration.md
- **Design-Implementation Security Gaps**: Validate any gaps identified in security review have been addressed

### Authentication and Authorization
[Validation of security implementation correctness]

**Context-Enhanced Validation:**
- Cross-reference with security review findings on authentication implementation
- Validate authentication matches security requirements from design phase
- Ensure authorization implementation follows security architecture decisions

### Input Validation and Sanitization
[Verification of proper input handling]

**Context-Enhanced Validation:**
- Reference security review analysis of input validation patterns
- Validate that input sanitization follows security architecture guidelines
- Cross-check against security vulnerabilities identified in security review

### Secret Management
[Confirmation that no secrets are exposed in code]

**Context-Enhanced Validation:**
- Reference security review findings on credential management
- Validate secret management follows security architecture decisions
- Ensure no secrets identified in security review remain in code

### Security Configuration
[Validation of security headers, HTTPS, and other configurations]

**Context-Enhanced Validation:**
- Cross-reference with security review analysis of configuration security
- Validate security configurations match security architecture requirements
- Ensure security review recommendations for configuration are implemented

## Performance and Scalability Assessment
### Performance Benchmarking
[Results of performance testing against requirements]

### Load Testing Results
[Results of load and stress testing]

### Resource Utilization Analysis
[Memory, CPU, and storage usage analysis]

### Scalability Assessment
[Evaluation of horizontal and vertical scaling capabilities]

### Caching Implementation
[Validation of caching strategies and effectiveness]

## Deployment Readiness Verification
### Deployment Configuration
[Validation of deployment scripts and configurations]

### Environment Configuration
[Verification of environment-specific settings]

### CI/CD Pipeline Integration
[Testing of continuous integration and deployment processes]

### Rollback Procedures
[Testing and validation of rollback capabilities]

### Infrastructure Requirements
[Documentation and validation of infrastructure needs]

## Monitoring and Observability Validation
### Logging Implementation
[Validation of logging completeness and format consistency]

### Monitoring Setup
[Verification of monitoring and alerting configuration]

### Health Check Implementation
[Testing of application health check endpoints]

### Error Tracking
[Validation of error reporting and tracking systems]

### Performance Metrics Collection
[Verification of performance data collection and reporting]

## Documentation and Compliance Review
### Technical Documentation
[Review of technical documentation completeness and accuracy]

### API Documentation
[Validation of API documentation currency and correctness]

### Deployment Documentation
[Review of deployment and operational guides]

### Compliance Requirements
[Verification of regulatory and organizational compliance]

### Knowledge Transfer
[Assessment of knowledge transfer and handover materials]

## Operational Readiness Assessment
### Support Procedures
[Review of support and maintenance procedures]

### Incident Response
[Validation of incident response procedures and escalation paths]

### Data Management
[Verification of backup, recovery, and data management procedures]

### Access Control
[Validation of production access controls and permissions]

### Business Continuity
[Assessment of business continuity and disaster recovery readiness]

## Gate Progression Review
### Foundation Gate Review
[Summary of Foundation Gate (25%) results and resolution]

### Integration Gate Review  
[Summary of Integration Gate (50%) results and resolution]

### Feature Complete Gate Review
[Summary of Feature Complete Gate (75%) results and resolution]

### Cross-Gate Issue Tracking
[Any issues that emerged across multiple gates]

## Risk Assessment
### Production Deployment Risks
[Identified risks for production deployment]

### Mitigation Strategies
[Risk mitigation strategies and contingency plans]

### Go/No-Go Decision Factors
[Key factors influencing production readiness decision]

## Final Recommendations
### Critical Actions Required
[Any final actions needed before production deployment]

### Production Deployment Plan
[Recommended deployment approach and timeline]

### Post-Deployment Monitoring
[Recommended monitoring and validation after deployment]

### Future Improvements
[Recommendations for future enhancements and technical debt]

## Gate Decision
**Status:** [PASS/FAIL]
**Production Ready:** [YES/NO]
**Confidence Level:** [HIGH/MEDIUM/LOW]
**Rationale:** [Comprehensive explanation of production readiness assessment]
**Deployment Recommendation:** [Immediate/Scheduled/Blocked]
**Required Actions:** [Any final requirements if not immediately ready]

## Validation Evidence
### Test Results Archive
[Links to or summaries of all test execution results]

### Security Scan Reports
[Security scanning and audit report summaries]

### Performance Test Data
[Performance benchmark and load test result data]

### Deployment Test Results
[Results from deployment testing in staging environments]

---
*Generated by production-validator on [timestamp]*
*Final validation for feature ${FEATURE_ID} implementation*
```

**Post-Validation Actions:**
1. Update task tracker with production ready gate status based on your comprehensive validation
2. If PASS: Mark production_ready_gate as 'completed' and overall implementation as 'ready_for_deployment'
3. If FAIL: Mark production_ready_gate as 'blocked' with detailed remediation plan
4. Generate deployment readiness checklist based on validation findings
5. Create post-deployment monitoring plan
6. Archive all validation reports for compliance and audit purposes
7. Notify stakeholders of production readiness status and next steps"

## Implementation Completion

### Step 10: Generate Implementation Summary

```bash
source .claude/features/current_feature.env
IMPL_SUMMARY="${FEATURE_DIR}/output/implementation-summary.md"

# Update final status
jq '.status = "implementation_completed" | .phase = "implementation_complete" | .implementation_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' "${METADATA_FILE}" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "${METADATA_FILE}"

# Generate comprehensive summary
cat > "${IMPL_SUMMARY}" << EOFS
# Implementation Summary

## Feature: $(cat "${FEATURE_DIR}/metadata.json" | jq -r '.description')
- **Feature ID**: ${FEATURE_ID}
- **Implementation Started**: $(cat "${METADATA_FILE}" | jq -r '.implementation_started')
- **Implementation Completed**: $(cat "${METADATA_FILE}" | jq -r '.implementation_completed')
- **Status**: Implementation Complete

## Progress Gates Results

### Foundation Gate (25%)
$(if [ -f "${IMPL_DIR}/validation/foundation-gate-report.md" ]; then
    FOUNDATION_STATUS=$(grep -E "^\*\*Validation Status:\*\*|^## Gate Decision|^\*\*Status:\*\*" "${IMPL_DIR}/validation/foundation-gate-report.md" | head -1 | grep -o "PASS\|FAIL" || echo "UNKNOWN")
    if [ "$FOUNDATION_STATUS" = "PASS" ]; then
        echo "- ✅ **PASSED** - Foundation implementation validated"
        # Extract key findings if available
        FOUNDATION_SUMMARY=$(grep -A 2 "## Executive Summary" "${IMPL_DIR}/validation/foundation-gate-report.md" | tail -1)
        [ -n "$FOUNDATION_SUMMARY" ] && echo "  - $FOUNDATION_SUMMARY"
    elif [ "$FOUNDATION_STATUS" = "FAIL" ]; then
        echo "- ❌ **FAILED** - Foundation implementation has issues"
        # Extract critical issues if available
        CRITICAL_ISSUES=$(grep -A 3 "### Critical Issues" "${IMPL_DIR}/validation/foundation-gate-report.md" | tail -2 | head -1)
        [ -n "$CRITICAL_ISSUES" ] && echo "  - $CRITICAL_ISSUES"
    else
        echo "- ⚠️ **INCOMPLETE** - Foundation validation not properly completed"
    fi
else
    echo "- ❌ **NOT EXECUTED** - Foundation Gate validation not run"
fi)

### Integration Gate (50%)
$(if [ -f "${IMPL_DIR}/validation/integration-gate-report.md" ]; then
    INTEGRATION_STATUS=$(grep -E "^\*\*Validation Status:\*\*|^## Gate Decision|^\*\*Status:\*\*" "${IMPL_DIR}/validation/integration-gate-report.md" | head -1 | grep -o "PASS\|FAIL" || echo "UNKNOWN")
    if [ "$INTEGRATION_STATUS" = "PASS" ]; then
        echo "- ✅ **PASSED** - Integration testing successful"
        INTEGRATION_SUMMARY=$(grep -A 2 "## Executive Summary" "${IMPL_DIR}/validation/integration-gate-report.md" | tail -1)
        [ -n "$INTEGRATION_SUMMARY" ] && echo "  - $INTEGRATION_SUMMARY"
    elif [ "$INTEGRATION_STATUS" = "FAIL" ]; then
        echo "- ❌ **FAILED** - Integration issues identified"
        CRITICAL_ISSUES=$(grep -A 3 "### Critical Integration Issues" "${IMPL_DIR}/validation/integration-gate-report.md" | tail -2 | head -1)
        [ -n "$CRITICAL_ISSUES" ] && echo "  - $CRITICAL_ISSUES"
    else
        echo "- ⚠️ **INCOMPLETE** - Integration validation not properly completed"
    fi
else
    echo "- ❌ **NOT EXECUTED** - Integration Gate validation not run"
fi)

### Feature Complete Gate (75%)
$(if [ -f "${IMPL_DIR}/validation/feature-complete-gate-report.md" ]; then
    FEATURE_STATUS=$(grep -E "^\*\*Validation Status:\*\*|^## Gate Decision|^\*\*Status:\*\*" "${IMPL_DIR}/validation/feature-complete-gate-report.md" | head -1 | grep -o "PASS\|FAIL" || echo "UNKNOWN")
    if [ "$FEATURE_STATUS" = "PASS" ]; then
        echo "- ✅ **PASSED** - Feature implementation complete"
        FEATURE_SUMMARY=$(grep -A 2 "## Executive Summary" "${IMPL_DIR}/validation/feature-complete-gate-report.md" | tail -1)
        [ -n "$FEATURE_SUMMARY" ] && echo "  - $FEATURE_SUMMARY"
        # Extract completion percentage if available
        COMPLETION_PCT=$(grep -o "Completion Percentage.*[0-9]\+%" "${IMPL_DIR}/validation/feature-complete-gate-report.md" | head -1)
        [ -n "$COMPLETION_PCT" ] && echo "  - $COMPLETION_PCT"
    elif [ "$FEATURE_STATUS" = "FAIL" ]; then
        echo "- ❌ **FAILED** - Feature not yet complete"
        CRITICAL_GAPS=$(grep -A 3 "### Critical Feature Gaps" "${IMPL_DIR}/validation/feature-complete-gate-report.md" | tail -2 | head -1)
        [ -n "$CRITICAL_GAPS" ] && echo "  - $CRITICAL_GAPS"
    else
        echo "- ⚠️ **INCOMPLETE** - Feature completeness validation not properly completed"
    fi
else
    echo "- ❌ **NOT EXECUTED** - Feature Complete Gate validation not run"
fi)

### Production Ready Gate (100%)
$(if [ -f "${IMPL_DIR}/validation/production-ready-gate-report.md" ]; then
    PRODUCTION_STATUS=$(grep -E "^\*\*Validation Status:\*\*|^## Gate Decision|^\*\*Status:\*\*" "${IMPL_DIR}/validation/production-ready-gate-report.md" | head -1 | grep -o "PASS\|FAIL" || echo "UNKNOWN")
    if [ "$PRODUCTION_STATUS" = "PASS" ]; then
        echo "- ✅ **PASSED** - Ready for production deployment"
        PRODUCTION_SUMMARY=$(grep -A 2 "## Executive Summary" "${IMPL_DIR}/validation/production-ready-gate-report.md" | tail -1)
        [ -n "$PRODUCTION_SUMMARY" ] && echo "  - $PRODUCTION_SUMMARY"
        # Extract deployment recommendation
        DEPLOYMENT_REC=$(grep "Deployment Recommendation.*" "${IMPL_DIR}/validation/production-ready-gate-report.md" | head -1)
        [ -n "$DEPLOYMENT_REC" ] && echo "  - $DEPLOYMENT_REC"
    elif [ "$PRODUCTION_STATUS" = "FAIL" ]; then
        echo "- ❌ **FAILED** - Not ready for production"
        CRITICAL_ACTIONS=$(grep -A 3 "### Critical Actions Required" "${IMPL_DIR}/validation/production-ready-gate-report.md" | tail -2 | head -1)
        [ -n "$CRITICAL_ACTIONS" ] && echo "  - $CRITICAL_ACTIONS"
    else
        echo "- ⚠️ **INCOMPLETE** - Production readiness validation not properly completed"
    fi
else
    echo "- ❌ **NOT EXECUTED** - Production Ready Gate validation not run"
fi)

## Code Changes
$(find "${IMPL_DIR}/code-changes" -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l) files created/modified

### Files Created/Modified:
$(find "${IMPL_DIR}/code-changes" -type f 2>/dev/null | sed 's|^|  - |' || echo "  No files found")

## Validation Reports Archive
Detailed validation reports available at:
$(if [ -d "${IMPL_DIR}/validation" ]; then
    echo "- **Validation Directory**: ${IMPL_DIR}/validation/"
    find "${IMPL_DIR}/validation" -name "*.md" -type f | while read report_file; do
        report_name=$(basename "$report_file" .md)
        report_size=$(wc -l < "$report_file" 2>/dev/null || echo "0")
        echo "  - **$(echo $report_name | sed 's/-/ /g' | sed 's/\b\w/\u&/g')**: $report_size lines"
    done
else
    echo "- No validation reports directory found"
fi)

## Individual Agent Tracking Summary

### Agent Registry Status
$(if [ -f "${IMPL_DIR}/agent-outputs/agent-registry.json" ]; then
    echo "**Registry:** ${IMPL_DIR}/agent-outputs/agent-registry.json"
    echo ""
    echo "**Active Agents:**"
    cat "${IMPL_DIR}/agent-outputs/agent-registry.json" | jq -r '.agents | to_entries[] | "  - **\(.key)**: \(.value.status) (started: \(.value.started))"' 2>/dev/null || echo "  No agent data available"
else
    echo "No individual agent tracking available"
fi)

### Individual Agent Reports
$(if [ -d "${IMPL_DIR}/agent-outputs" ]; then
    echo "**Individual Agent Tracking Reports:**"
    find "${IMPL_DIR}/agent-outputs" -name "tracking-report.md" | while read agent_report; do
        agent_name=$(basename $(dirname "$agent_report"))
        report_size=$(wc -l < "$agent_report" 2>/dev/null || echo "0")
        completion_status=$(grep -E "^\*\*Completion Status:\*\*" "$agent_report" | head -1 | sed 's/.*Status:\*\* *//' 2>/dev/null || echo "Unknown")
        quality_rating=$(grep -E "^\*\*Quality Rating:\*\*" "$agent_report" | head -1 | sed 's/.*Rating:\*\* *//' 2>/dev/null || echo "Unknown")
        echo "  - **${agent_name}**: $report_size lines | Status: $completion_status | Quality: $quality_rating"
    done
    
    echo ""
    echo "**Agent Coordination Summary:**"
    blocked_agents=$(find "${IMPL_DIR}/agent-outputs" -name "tracking-report.md" -exec grep -l "Status.*blocked\|Status.*failed" {} \; 2>/dev/null | wc -l)
    completed_agents=$(find "${IMPL_DIR}/agent-outputs" -name "tracking-report.md" -exec grep -l "Completion Status.*PASS" {} \; 2>/dev/null | wc -l)
    total_agents=$(find "${IMPL_DIR}/agent-outputs" -name "tracking-report.md" 2>/dev/null | wc -l)
    
    echo "  - **Completed Agents**: $completed_agents/$total_agents"
    echo "  - **Blocked/Failed Agents**: $blocked_agents"
    
    if [ "$blocked_agents" -gt 0 ]; then
        echo "  - **Blocked Agent Details:**"
        find "${IMPL_DIR}/agent-outputs" -name "tracking-report.md" -exec grep -l "Status.*blocked\|Status.*failed" {} \; 2>/dev/null | while read blocked_report; do
            agent_name=$(basename $(dirname "$blocked_report"))
            blocking_issue=$(grep -A 5 "### Blocking Issues" "$blocked_report" | tail -4 | head -1 2>/dev/null || echo "Unknown issue")
            echo "    - **${agent_name}**: $blocking_issue"
        done
    fi
else
    echo "No individual agent tracking directory found"
fi)

## Agent Execution Logs
$(find "${IMPL_DIR}/logs" -name "*.log" 2>/dev/null | wc -l) agent execution logs available

## Implementation Workspace Structure
\`\`\`
${FEATURE_DIR}/implementation/
├── code-changes/          # Final implementation code
├── progress/             # Task tracking and milestone data  
├── validation/           # Gate validation reports
│   ├── foundation-gate-report.md
│   ├── integration-gate-report.md
│   ├── feature-complete-gate-report.md
│   └── production-ready-gate-report.md
├── agent-outputs/        # Individual agent tracking (NEW)
│   ├── agent-registry.json              # Central agent coordination registry
│   ├── agent-tracking-template.md       # Template for agent reports
│   ├── coordination-helpers.sh          # Agent coordination utilities
│   ├── conflict-detection-report.md     # Automatic conflict detection results
│   ├── [agent-name-1]/                 # Individual agent workspace
│   │   └── tracking-report.md           # Agent's progress and outputs
│   ├── [agent-name-2]/                 # Individual agent workspace  
│   │   └── tracking-report.md           # Agent's progress and outputs
│   └── ...                             # One directory per agent
└── logs/                # Agent execution logs
\`\`\`

## Agent Coordination Benefits

The enhanced individual agent tracking provides:

**🔍 Debugging Capabilities:**
- Identify which specific agent caused issues
- Trace agent decision-making and implementation approaches
- Debug inter-agent coordination problems
- Analyze agent-specific performance and quality

**📊 Progress Visibility:**
- Real-time view of each agent's progress through milestones
- Individual agent quality metrics and self-assessments
- Granular tracking of code changes by agent
- Agent-specific issue resolution tracking

**🤝 Coordination Management:**
- Cross-agent dependency tracking and validation
- Conflict detection between agents working on overlapping areas
- Quality consistency across different agent domains
- Handoff documentation for validation gates

**📈 Continuous Improvement:**
- Learning from individual agent approaches and insights
- Building institutional knowledge of agent coordination patterns
- Identifying successful agent collaboration strategies
- Optimizing future agent selection and task assignment

## Next Phase Commands
The implementation is complete. Run validation commands:

\`\`\`bash
# Security validation
npx claude-code command security-review "${FEATURE_ID}"

# Quality validation
npx claude-code command quality-review "${FEATURE_ID}"

# Comprehensive testing
npx claude-code command test "${FEATURE_ID}"
\`\`\`

Or run the full remaining pipeline:
\`\`\`bash
# Continue with quality gates
npx claude-code command einstein-continue "${FEATURE_ID}"
\`\`\`

EOFS

# Display summary
cat "${IMPL_SUMMARY}"
```

**🎯 IMPLEMENTATION PHASE COMPLETE**

The feature implementation has been executed through systematic agent coordination with progress gates:

**Key Achievements:**

- ✅ **Implementation Initialization**: Workspace and task coordination setup
- ✅ **Parallel Agent Orchestration**: Concurrent implementation execution with individual tracking
- ✅ **Progress Gate Validation**: 25%, 50%, 75%, 100% milestone validation with agent analysis
- ✅ **Quality Checkpoints**: Code validation at each gate with individual agent insights
- ✅ **Conflict Resolution**: Automated conflict detection and coordinated resolution
- ✅ **Individual Agent Tracking**: Comprehensive transparency and debugging capabilities

**Implementation Artifacts:**

- Implementation code in `.claude/features/{FEATURE_ID}/implementation/code-changes/`
- Progress tracking in `.claude/features/{FEATURE_ID}/implementation/progress/`
- Gate validation reports in `.claude/features/{FEATURE_ID}/implementation/validation/`
- **Individual agent tracking in `.claude/features/{FEATURE_ID}/implementation/agent-outputs/`**
- Agent execution logs in `.claude/features/{FEATURE_ID}/implementation/logs/`

**Next Steps:**
The implementation is ready for quality validation phases:

- **Security Review** (Phase 8)
- **Quality Review** (Phase 7)
- **Comprehensive Testing** (Phase 9)

## Error Recovery and Troubleshooting

### Gate Failure Recovery

```bash
# If any gate fails, recover with:
check_gate_failure() {
    local gate_name=$1
    local report_file="${IMPL_DIR}/validation/${gate_name}-gate-report.md"

    if grep -q "Status: FAIL" "${report_file}" 2>/dev/null; then
        echo "❌ ${gate_name} gate failed. Check report:"
        echo "   ${report_file}"
        echo ""
        echo "📊 Individual agent debugging available:"
        echo "   - Agent registry: ${AGENT_OUTPUT_DIR}/agent-registry.json"
        echo "   - Individual reports: ${AGENT_OUTPUT_DIR}/*/tracking-report.md"
        echo "   - Conflict detection: ${AGENT_OUTPUT_DIR}/conflict-detection-report.md"
        echo ""
        echo "Recovery options:"
        echo "1. Review individual agent tracking reports for root cause analysis"
        echo "2. Fix issues identified in specific agent reports"
        echo "3. Re-run validation after agent-specific fixes"
        echo "4. Rollback to previous gate if issues are systemic"
        echo "5. Spawn debugging agents for complex issues using agent insights"
        return 1
    fi
}
```

### Agent Conflict Resolution

```bash
# Enhanced conflict resolution with individual agent tracking
resolve_conflicts() {
    echo "Checking for conflicts using individual agent tracking..."

    # Use the sophisticated conflict detection from agent tracking
    source "${AGENT_OUTPUT_DIR}/coordination-helpers.sh"
    detect_agent_conflicts
    
    # Check for code-level merge conflicts 
    echo "Checking for code merge conflicts..."
    find "${IMPL_DIR}/code-changes" -name "*.conflict" -o -name "*.orig" 2>/dev/null | while read conflict_file; do
        echo "⚠️  Code merge conflict detected: ${conflict_file}"
        
        # Identify which agents might be involved based on file ownership
        echo "Analyzing agent ownership for conflict resolution..."
        file_basename=$(basename "${conflict_file}" | sed 's/\.\(conflict\|orig\)$//')
        
        # Check which agents claim this file in their tracking reports
        find "${AGENT_OUTPUT_DIR}" -name "tracking-report.md" | while read agent_report; do
            agent_name=$(basename $(dirname "$agent_report"))
            if grep -q "$file_basename" "$agent_report" 2>/dev/null; then
                echo "  - Agent involved: $agent_name (check ${agent_report} for details)"
            fi
        done
        
        echo "Manual resolution required before proceeding to next gate"
        echo "Resolution steps:"
        echo "1. Review individual agent tracking reports for context"
        echo "2. Coordinate resolution between involved agents"
        echo "3. Update agent tracking reports with resolution approach"
        echo "4. Re-run conflict detection to verify resolution"
    done
    
    # Display conflict detection report location
    if [ -f "${AGENT_OUTPUT_DIR}/conflict-detection-report.md" ]; then
        echo "📊 Full conflict analysis available at:"
        echo "   ${AGENT_OUTPUT_DIR}/conflict-detection-report.md"
    fi
}
```

The implementation phase provides systematic execution with quality gates, ensuring reliable feature development through coordinated AI agent collaboration.
