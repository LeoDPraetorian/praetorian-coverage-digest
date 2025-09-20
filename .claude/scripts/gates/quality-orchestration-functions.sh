#!/bin/bash

# Quality Gate Orchestration Functions
# Supporting dynamic agent discovery and iterative refinement coordination

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# === AGENT DISCOVERY FUNCTIONS ===

discover_quality_agents() {
    local feature_id=$1
    local discovery_output=".claude/features/${feature_id}/quality-gates/agent-discovery.json"
    
    mkdir -p ".claude/features/${feature_id}/quality-gates"
    
    echo -e "${BLUE}=== Dynamic Quality Agent Discovery ===${NC}"
    
    # Initialize discovery results
    cat > "$discovery_output" << 'EOF'
{
  "discovery_timestamp": "",
  "quality_agents": [],
  "development_agents": [],
  "refinement_capable": [],
  "validation_agents": [],
  "capability_map": {}
}
EOF
    
    # Update timestamp
    jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.discovery_timestamp = $timestamp' \
        "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
    
    # Discover quality agents
    local quality_agents_dir=".claude/agents/quality"
    if [ -d "$quality_agents_dir" ]; then
        echo -e "${GREEN}Quality/Review Agents discovered:${NC}"
        
        find "$quality_agents_dir" -name "*.md" -type f | while read -r agent_file; do
            agent_name=$(basename "$agent_file" .md)
            agent_type=$(grep "^type:" "$agent_file" | cut -d':' -f2- | xargs || echo "unknown")
            capabilities=$(grep "^capabilities:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            domains=$(grep "^domains:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            specializations=$(grep "^specializations:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            validation_capable=$(grep "^validation:" "$agent_file" | cut -d':' -f2- | xargs || echo "false")
            orchestration_capable=$(grep "^orchestration:" "$agent_file" | cut -d':' -f2- | xargs || echo "false")
            
            echo "  • ${agent_name}:"
            echo "    - Type: ${agent_type}"
            echo "    - Capabilities: ${capabilities}"
            echo "    - Domains: ${domains}"
            echo "    - Specializations: ${specializations}"
            
            # Add to discovery results
            local agent_json=$(jq -n \
                --arg name "$agent_name" \
                --arg type "$agent_type" \
                --arg capabilities "$capabilities" \
                --arg domains "$domains" \
                --arg specializations "$specializations" \
                --arg validation "$validation_capable" \
                --arg orchestration "$orchestration_capable" \
                '{
                    name: $name,
                    type: $type,
                    capabilities: ($capabilities | split(", ")),
                    domains: ($domains | split(", ")),
                    specializations: ($specializations | split(", ")),
                    validation_capable: ($validation == "true"),
                    orchestration_capable: ($orchestration == "true")
                }')
                
            # Add to quality_agents array
            jq --argjson agent "$agent_json" '.quality_agents += [$agent]' \
                "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
                
            # Add to validation_agents if validation capable
            if [ "$validation_capable" = "true" ]; then
                jq --argjson agent "$agent_json" '.validation_agents += [$agent]' \
                    "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
            fi
        done
    else
        echo -e "${YELLOW}Quality agents directory not found: $quality_agents_dir${NC}"
    fi
    
    # Discover development agents (refinement capable)
    local dev_agents_dir=".claude/agents/development"
    if [ -d "$dev_agents_dir" ]; then
        echo -e "${GREEN}Development Agents available for refinement:${NC}"
        
        find "$dev_agents_dir" -name "*.md" -type f | while read -r agent_file; do
            agent_name=$(basename "$agent_file" .md)
            refinement_capable=$(grep "^refinement:" "$agent_file" | cut -d':' -f2- | xargs || echo "true")
            agent_type=$(grep "^type:" "$agent_file" | cut -d':' -f2- | xargs || echo "development")
            capabilities=$(grep "^capabilities:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            domains=$(grep "^domains:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            
            # Most development agents are refinement capable unless explicitly marked false
            if [ "$refinement_capable" != "false" ]; then
                echo "  • ${agent_name}: Available for code refinement"
                echo "    - Capabilities: ${capabilities}"
                echo "    - Domains: ${domains}"
                
                local agent_json=$(jq -n \
                    --arg name "$agent_name" \
                    --arg type "$agent_type" \
                    --arg capabilities "$capabilities" \
                    --arg domains "$domains" \
                    '{
                        name: $name,
                        type: $type,
                        capabilities: ($capabilities | split(", ")),
                        domains: ($domains | split(", "))
                    }')
                    
                # Add to development_agents and refinement_capable arrays
                jq --argjson agent "$agent_json" '.development_agents += [$agent]' \
                    "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
                jq --argjson agent "$agent_json" '.refinement_capable += [$agent]' \
                    "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
            fi
        done
    else
        echo -e "${YELLOW}Development agents directory not found: $dev_agents_dir${NC}"
    fi
    
    echo -e "${GREEN}Agent discovery completed: $discovery_output${NC}"
    return 0
}

# === ISSUE ANALYSIS FUNCTIONS ===

analyze_quality_issues() {
    local feature_id=$1
    local analysis_output=".claude/features/${feature_id}/quality-gates/issue-analysis.json"
    
    echo -e "${BLUE}=== Quality Issue Analysis ===${NC}"
    
    local quality_analysis_dir=".claude/features/${feature_id}/quality-review/analysis"
    local security_analysis_dir=".claude/features/${feature_id}/security-review/analysis"
    
    # Initialize issue analysis
    cat > "$analysis_output" << 'EOF'
{
  "analysis_timestamp": "",
  "issue_summary": {
    "blocking_count": 0,
    "warning_count": 0,
    "info_count": 0,
    "total_issues": 0,
    "affected_domains": [],
    "technology_stack": [],
    "issue_categories": []
  },
  "issues_by_file": {},
  "issues_by_domain": {},
  "issues_by_severity": {
    "blocking": [],
    "warning": [],
    "info": []
  }
}
EOF
    
    # Update timestamp
    jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.analysis_timestamp = $timestamp' \
        "$analysis_output" > "$analysis_output.tmp" && mv "$analysis_output.tmp" "$analysis_output"
    
    local total_blocking=0
    local total_warning=0
    local total_info=0
    
    # Analyze quality review files
    if [ -d "$quality_analysis_dir" ]; then
        echo -e "${GREEN}Analyzing quality review results...${NC}"
        
        find "$quality_analysis_dir" -name "*.md" -type f | while read -r analysis_file; do
            echo "  Analyzing: $(basename "$analysis_file")"
            
            # Count issues by severity using standardized format
            local blocking_in_file=$(grep -c "\\[BLOCKING\\]" "$analysis_file" 2>/dev/null || echo "0")
            local warning_in_file=$(grep -c "\\[WARNING\\]" "$analysis_file" 2>/dev/null || echo "0")
            local info_in_file=$(grep -c "\\[INFO\\]" "$analysis_file" 2>/dev/null || echo "0")
            
            echo "    - Blocking: $blocking_in_file"
            echo "    - Warning: $warning_in_file"
            echo "    - Info: $info_in_file"
            
            total_blocking=$((total_blocking + blocking_in_file))
            total_warning=$((total_warning + warning_in_file))
            total_info=$((total_info + info_in_file))
        done
    fi
    
    # Analyze security review files
    if [ -d "$security_analysis_dir" ]; then
        echo -e "${GREEN}Analyzing security review results...${NC}"
        
        find "$security_analysis_dir" -name "*.md" -type f | while read -r analysis_file; do
            echo "  Analyzing: $(basename "$analysis_file")"
            
            local blocking_in_file=$(grep -c "\\[BLOCKING\\]" "$analysis_file" 2>/dev/null || echo "0")
            local warning_in_file=$(grep -c "\\[WARNING\\]" "$analysis_file" 2>/dev/null || echo "0")
            local info_in_file=$(grep -c "\\[INFO\\]" "$analysis_file" 2>/dev/null || echo "0")
            
            echo "    - Blocking: $blocking_in_file"
            echo "    - Warning: $warning_in_file"
            echo "    - Info: $info_in_file"
            
            total_blocking=$((total_blocking + blocking_in_file))
            total_warning=$((total_warning + warning_in_file))
            total_info=$((total_info + info_in_file))
        done
    fi
    
    # Detect affected domains and technology stack
    local affected_domains=()
    local tech_stack=()
    
    # Backend detection
    if find "$quality_analysis_dir" "$security_analysis_dir" -name "*go*.md" -o -name "*backend*.md" -o -name "*api*.md" 2>/dev/null | grep -q .; then
        affected_domains+=("backend")
        tech_stack+=("go")
    fi
    
    # Frontend detection  
    if find "$quality_analysis_dir" "$security_analysis_dir" -name "*react*.md" -o -name "*frontend*.md" -o -name "*ui*.md" 2>/dev/null | grep -q .; then
        affected_domains+=("frontend")
        tech_stack+=("react")
    fi
    
    # Security detection
    if [ -d "$security_analysis_dir" ] && [ "$(find "$security_analysis_dir" -name "*.md" | wc -l)" -gt 0 ]; then
        affected_domains+=("security")
    fi
    
    # Performance detection
    if find "$quality_analysis_dir" -name "*performance*.md" 2>/dev/null | grep -q .; then
        affected_domains+=("performance")
    fi
    
    # Update issue summary
    local total_issues=$((total_blocking + total_warning + total_info))
    local domains_json=$(printf '%s\n' "${affected_domains[@]}" | jq -R . | jq -s .)
    local tech_json=$(printf '%s\n' "${tech_stack[@]}" | jq -R . | jq -s .)
    
    jq --arg blocking "$total_blocking" \
       --arg warning "$total_warning" \
       --arg info "$total_info" \
       --arg total "$total_issues" \
       --argjson domains "$domains_json" \
       --argjson tech "$tech_json" \
       '
       .issue_summary.blocking_count = ($blocking | tonumber) |
       .issue_summary.warning_count = ($warning | tonumber) |
       .issue_summary.info_count = ($info | tonumber) |
       .issue_summary.total_issues = ($total | tonumber) |
       .issue_summary.affected_domains = $domains |
       .issue_summary.technology_stack = $tech
       ' "$analysis_output" > "$analysis_output.tmp" && mv "$analysis_output.tmp" "$analysis_output"
    
    echo -e "${GREEN}Issue analysis completed:${NC}"
    echo "  • Blocking Issues: $total_blocking"
    echo "  • Warning Issues: $total_warning"
    echo "  • Info Issues: $total_info"
    echo "  • Affected Domains: ${affected_domains[*]}"
    echo "  • Technology Stack: ${tech_stack[*]}"
    echo "  • Analysis saved: $analysis_output"
    
    return 0
}

# === REFINEMENT DECISION LOGIC ===

make_refinement_decision() {
    local feature_id=$1
    local max_iterations=${2:-3}
    local decision_output=".claude/features/${feature_id}/quality-gates/refinement-decision.json"
    local issue_analysis=".claude/features/${feature_id}/quality-gates/issue-analysis.json"
    local agent_discovery=".claude/features/${feature_id}/quality-gates/agent-discovery.json"
    
    echo -e "${BLUE}=== Refinement Decision Analysis ===${NC}"
    
    if [ ! -f "$issue_analysis" ]; then
        echo -e "${RED}Error: Issue analysis not found: $issue_analysis${NC}"
        return 1
    fi
    
    if [ ! -f "$agent_discovery" ]; then
        echo -e "${RED}Error: Agent discovery not found: $agent_discovery${NC}"
        return 1
    fi
    
    # Get current refinement iteration from metadata
    local metadata_file=".claude/features/${feature_id}/metadata.json"
    local current_iteration=0
    if [ -f "$metadata_file" ]; then
        current_iteration=$(cat "$metadata_file" | jq -r '.quality_refinement_iteration // 0')
    fi
    
    # Read issue counts
    local blocking_count=$(cat "$issue_analysis" | jq -r '.issue_summary.blocking_count')
    local warning_count=$(cat "$issue_analysis" | jq -r '.issue_summary.warning_count')
    local total_issues=$(cat "$issue_analysis" | jq -r '.issue_summary.total_issues')
    local affected_domains=$(cat "$issue_analysis" | jq -r '.issue_summary.affected_domains[]' | tr '\n' ',' | sed 's/,$//')
    
    echo -e "${GREEN}Decision Criteria:${NC}"
    echo "  • Blocking Issues: $blocking_count"
    echo "  • Warning Issues: $warning_count"
    echo "  • Total Issues: $total_issues"
    echo "  • Current Iteration: $current_iteration/$max_iterations"
    echo "  • Affected Domains: $affected_domains"
    
    # Decision logic
    local decision="proceed"
    local decision_reason=""
    local escalation_needed=false
    
    if [ "$blocking_count" -gt 0 ]; then
        if [ "$current_iteration" -lt "$max_iterations" ]; then
            decision="refinement_needed"
            decision_reason="Blocking issues found and iterations remaining"
            echo -e "${YELLOW}🔄 DECISION: Refinement Required (Blocking issues found)${NC}"
        else
            decision="escalation_needed"
            decision_reason="Maximum iterations reached with remaining blocking issues"
            escalation_needed=true
            echo -e "${RED}⚠️  DECISION: Escalation Required (Max iterations reached)${NC}"
        fi
    else
        decision="proceed"
        decision_reason="No blocking issues detected"
        echo -e "${GREEN}✅ DECISION: Quality Gate Passed (Proceed to next phase)${NC}"
    fi
    
    # Create decision record
    cat > "$decision_output" << EOF
{
  "decision_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "decision": "$decision",
  "decision_reason": "$decision_reason",
  "refinement_iteration": $current_iteration,
  "max_iterations": $max_iterations,
  "blocking_issues": $blocking_count,
  "warning_issues": $warning_count,
  "total_issues": $total_issues,
  "affected_domains": ["$(echo "$affected_domains" | sed 's/,/", "/g')"],
  "escalation_needed": $escalation_needed,
  "next_actions": []
}
EOF
    
    # Add specific next actions based on decision
    case "$decision" in
        "refinement_needed")
            jq '.next_actions += ["spawn_refinement_agents", "update_iteration_count", "coordinate_targeted_fixes"]' \
                "$decision_output" > "$decision_output.tmp" && mv "$decision_output.tmp" "$decision_output"
            ;;
        "escalation_needed")
            jq '.next_actions += ["create_human_review_report", "document_unresolved_issues", "escalate_to_management"]' \
                "$decision_output" > "$decision_output.tmp" && mv "$decision_output.tmp" "$decision_output"
            ;;
        "proceed")
            jq '.next_actions += ["update_pipeline_status", "proceed_to_next_phase", "document_quality_success"]' \
                "$decision_output" > "$decision_output.tmp" && mv "$decision_output.tmp" "$decision_output"
            ;;
    esac
    
    echo -e "${GREEN}Decision recorded: $decision_output${NC}"
    
    # Return appropriate exit code
    case "$decision" in
        "proceed") return 0 ;;
        "refinement_needed") return 1 ;;
        "escalation_needed") return 2 ;;
        *) return 3 ;;
    esac
}

# === AGENT SELECTION FUNCTIONS ===

select_refinement_agents() {
    local feature_id=$1
    local selection_output=".claude/features/${feature_id}/quality-gates/agent-selection.json"
    local issue_analysis=".claude/features/${feature_id}/quality-gates/issue-analysis.json"
    local agent_discovery=".claude/features/${feature_id}/quality-gates/agent-discovery.json"
    
    echo -e "${BLUE}=== Dynamic Refinement Agent Selection ===${NC}"
    
    # Read affected domains and technology stack from issue analysis
    local affected_domains=$(cat "$issue_analysis" | jq -r '.issue_summary.affected_domains[]' 2>/dev/null)
    local tech_stack=$(cat "$issue_analysis" | jq -r '.issue_summary.technology_stack[]' 2>/dev/null)
    
    echo -e "${GREEN}Selection Criteria:${NC}"
    echo "  • Affected Domains: $affected_domains"
    echo "  • Technology Stack: $tech_stack"
    
    # Initialize selection results
    cat > "$selection_output" << 'EOF'
{
  "selection_timestamp": "",
  "selection_criteria": {
    "affected_domains": [],
    "technology_stack": []
  },
  "selected_agents": [],
  "selection_reasons": [],
  "coverage_analysis": {
    "backend_coverage": false,
    "frontend_coverage": false,
    "security_coverage": false,
    "performance_coverage": false
  }
}
EOF
    
    # Update timestamp and criteria
    jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       --argjson domains "$(echo "$affected_domains" | jq -R . | jq -s . 2>/dev/null || echo '[]')" \
       --argjson tech "$(echo "$tech_stack" | jq -R . | jq -s . 2>/dev/null || echo '[]')" \
       '
       .selection_timestamp = $timestamp |
       .selection_criteria.affected_domains = $domains |
       .selection_criteria.technology_stack = $tech
       ' "$selection_output" > "$selection_output.tmp" && mv "$selection_output.tmp" "$selection_output"
    
    # Get available refinement agents
    local refinement_agents=$(cat "$agent_discovery" | jq -c '.refinement_capable[]' 2>/dev/null)
    
    echo -e "${GREEN}Available refinement agents:${NC}"
    echo "$refinement_agents" | while read -r agent; do
        local agent_name=$(echo "$agent" | jq -r '.name')
        local agent_domains=$(echo "$agent" | jq -r '.domains[]' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
        echo "  • $agent_name: $agent_domains"
    done
    
    local selected_agents=()
    local selection_reasons=()
    
    # Backend/Go agent selection
    if echo "$affected_domains" | grep -q "backend" && echo "$tech_stack" | grep -q "go"; then
        echo -e "${YELLOW}🔍 Backend Go issues detected - searching for Go developers...${NC}"
        
        local go_agent=$(echo "$refinement_agents" | jq -r 'select(.domains[] | test("go.*development|backend.*development")) | .name' | head -1)
        if [ -n "$go_agent" ]; then
            selected_agents+=("$go_agent")
            selection_reasons+=("$go_agent: backend Go issues require golang development capabilities")
            echo "  ✅ Selected: $go_agent (backend Go refinement)"
            
            # Update coverage
            jq '.coverage_analysis.backend_coverage = true' "$selection_output" > "$selection_output.tmp" && mv "$selection_output.tmp" "$selection_output"
        fi
    fi
    
    # Frontend/React agent selection
    if echo "$affected_domains" | grep -q "frontend" && echo "$tech_stack" | grep -q "react"; then
        echo -e "${YELLOW}🔍 Frontend React issues detected - searching for React developers...${NC}"
        
        local react_agent=$(echo "$refinement_agents" | jq -r 'select(.domains[] | test("react.*development|frontend.*development")) | .name' | head -1)
        if [ -n "$react_agent" ]; then
            selected_agents+=("$react_agent")
            selection_reasons+=("$react_agent: frontend React issues require react development capabilities")
            echo "  ✅ Selected: $react_agent (frontend React refinement)"
            
            # Update coverage
            jq '.coverage_analysis.frontend_coverage = true' "$selection_output" > "$selection_output.tmp" && mv "$selection_output.tmp" "$selection_output"
        fi
    fi
    
    # Security agent selection
    if echo "$affected_domains" | grep -q "security"; then
        echo -e "${YELLOW}🔍 Security issues detected - searching for security specialists...${NC}"
        
        local security_agent=$(cat "$agent_discovery" | jq -r '.quality_agents[] | select(.capabilities[] | test("security.*review|security.*remediation")) | .name' | head -1)
        if [ -n "$security_agent" ]; then
            selected_agents+=("$security_agent")
            selection_reasons+=("$security_agent: security issues require specialized security capabilities")
            echo "  ✅ Selected: $security_agent (security refinement)"
            
            # Update coverage
            jq '.coverage_analysis.security_coverage = true' "$selection_output" > "$selection_output.tmp" && mv "$selection_output.tmp" "$selection_output"
        fi
    fi
    
    # Performance agent selection
    if echo "$affected_domains" | grep -q "performance"; then
        echo -e "${YELLOW}🔍 Performance issues detected - searching for performance specialists...${NC}"
        
        local perf_agent=$(echo "$refinement_agents" | jq -r 'select(.capabilities[] | test("performance.*optimization|api.*optimization")) | .name' | head -1)
        if [ -n "$perf_agent" ]; then
            selected_agents+=("$perf_agent")
            selection_reasons+=("$perf_agent: performance issues require optimization capabilities")
            echo "  ✅ Selected: $perf_agent (performance refinement)"
            
            # Update coverage
            jq '.coverage_analysis.performance_coverage = true' "$selection_output" > "$selection_output.tmp" && mv "$selection_output.tmp" "$selection_output"
        fi
    fi
    
    # Update selection results
    local agents_json=$(printf '%s\n' "${selected_agents[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]')
    local reasons_json=$(printf '%s\n' "${selection_reasons[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]')
    
    jq --argjson agents "$agents_json" \
       --argjson reasons "$reasons_json" \
       '
       .selected_agents = $agents |
       .selection_reasons = $reasons
       ' "$selection_output" > "$selection_output.tmp" && mv "$selection_output.tmp" "$selection_output"
    
    echo -e "${GREEN}Agent selection completed:${NC}"
    echo "  • Selected Agents: ${selected_agents[*]}"
    echo "  • Selection saved: $selection_output"
    
    return 0
}

# === REFINEMENT PLAN GENERATION ===

generate_refinement_plan() {
    local feature_id=$1
    local plan_output=".claude/features/${feature_id}/quality-gates/refinement-plan.json"
    local issue_analysis=".claude/features/${feature_id}/quality-gates/issue-analysis.json"
    local agent_selection=".claude/features/${feature_id}/quality-gates/agent-selection.json"
    local agent_discovery=".claude/features/${feature_id}/quality-gates/agent-discovery.json"
    
    echo -e "${BLUE}=== Generating Refinement Plan ===${NC}"
    
    # Get current refinement iteration
    local metadata_file=".claude/features/${feature_id}/metadata.json"
    local current_iteration=1
    if [ -f "$metadata_file" ]; then
        current_iteration=$(cat "$metadata_file" | jq -r '.quality_refinement_iteration // 0')
        current_iteration=$((current_iteration + 1))
    fi
    
    # Create comprehensive refinement plan
    cat > "$plan_output" << EOF
{
  "plan_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "refinement_needed": true,
  "refinement_iteration": $current_iteration,
  "max_iterations": 3,
  "feature_id": "$feature_id",
  "issue_summary": {},
  "discovered_agents": {},
  "recommended_refinement": [],
  "validation_agents": [],
  "coordination_strategy": {
    "execution_mode": "parallel",
    "workspace_isolation": true,
    "progress_tracking": true
  },
  "success_criteria": [
    "All BLOCKING issues resolved or documented",
    "No new BLOCKING issues introduced",
    "Validation confirms issue resolution",
    "Implementation maintains existing functionality"
  ]
}
EOF
    
    # Copy issue summary from issue analysis
    local issue_summary=$(cat "$issue_analysis" | jq '.issue_summary')
    jq --argjson summary "$issue_summary" '.issue_summary = $summary' \
        "$plan_output" > "$plan_output.tmp" && mv "$plan_output.tmp" "$plan_output"
    
    # Copy discovered agents from agent discovery
    local discovered_agents=$(cat "$agent_discovery" | jq '{
        quality_agents: .quality_agents,
        development_agents: .development_agents,
        refinement_capable: .refinement_capable,
        validation_agents: .validation_agents
    }')
    jq --argjson agents "$discovered_agents" '.discovered_agents = $agents' \
        "$plan_output" > "$plan_output.tmp" && mv "$plan_output.tmp" "$plan_output"
    
    # Generate specific refinement recommendations for each selected agent
    local selected_agents=$(cat "$agent_selection" | jq -r '.selected_agents[]' 2>/dev/null)
    
    echo -e "${GREEN}Generating refinement tasks:${NC}"
    echo "$selected_agents" | while read -r agent_name; do
        if [ -n "$agent_name" ]; then
            echo "  • Creating refinement task for: $agent_name"
            
            # Get agent capabilities from discovery
            local agent_capabilities=$(cat "$agent_discovery" | jq -r ".refinement_capable[] | select(.name == \"$agent_name\") | .capabilities[]" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
            local agent_domains=$(cat "$agent_discovery" | jq -r ".refinement_capable[] | select(.name == \"$agent_name\") | .domains[]" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
            
            # Create refinement task
            local refinement_task=$(jq -n \
                --arg agent "$agent_name" \
                --arg capabilities "$agent_capabilities" \
                --arg domains "$agent_domains" \
                --arg iteration "$current_iteration" \
                '{
                    agent_type: $agent,
                    capabilities_matched: ($capabilities | split(",")),
                    target_domains: ($domains | split(",")),
                    iteration: ($iteration | tonumber),
                    issues_to_address: ["Analyze and fix BLOCKING issues in assigned domains"],
                    target_files: ["To be determined from implementation analysis"],
                    priority: "high",
                    estimated_effort: "2-4 hours",
                    workspace: {
                        "input_context": [
                            ".claude/features/\($feature_id)/quality-review/analysis/",
                            ".claude/features/\($feature_id)/security-review/analysis/",
                            ".claude/features/\($feature_id)/implementation/code-changes/"
                        ],
                        "output_location": ".claude/features/\($feature_id)/quality-gates/refinement/\($agent | ascii_downcase)-fixes.md",
                        "progress_tracking": ".claude/features/\($feature_id)/quality-gates/progress/\($agent | ascii_downcase)-progress.json"
                    }
                }')
            
            # Add to refinement plan
            jq --argjson task "$refinement_task" '.recommended_refinement += [$task]' \
                "$plan_output" > "$plan_output.tmp" && mv "$plan_output.tmp" "$plan_output"
        fi
    done
    
    # Add validation agents from discovery
    local validation_agents=$(cat "$agent_discovery" | jq '.validation_agents')
    jq --argjson validators "$validation_agents" '.validation_agents = $validators' \
        "$plan_output" > "$plan_output.tmp" && mv "$plan_output.tmp" "$plan_output"
    
    echo -e "${GREEN}Refinement plan generated: $plan_output${NC}"
    
    # Display plan summary
    local agent_count=$(cat "$plan_output" | jq '.recommended_refinement | length')
    local validator_count=$(cat "$plan_output" | jq '.validation_agents | length')
    
    echo -e "${GREEN}Plan Summary:${NC}"
    echo "  • Refinement Iteration: $current_iteration/3"
    echo "  • Refinement Agents: $agent_count"
    echo "  • Validation Agents: $validator_count"
    echo "  • Execution Mode: parallel"
    echo "  • Workspace Isolation: enabled"
    
    return 0
}

# === MAIN ORCHESTRATION FUNCTION ===

execute_quality_gate_orchestration() {
    local feature_id=$1
    local max_iterations=${2:-3}
    
    echo -e "${BLUE}🎯 Starting Quality Gate Orchestration${NC}"
    echo "Feature ID: $feature_id"
    echo "Max Iterations: $max_iterations"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    
    # Step 1: Dynamic Agent Discovery
    echo -e "${YELLOW}Step 1: Dynamic Agent Discovery${NC}"
    if ! discover_quality_agents "$feature_id"; then
        echo -e "${RED}❌ Agent discovery failed${NC}"
        return 1
    fi
    echo ""
    
    # Step 2: Issue Analysis
    echo -e "${YELLOW}Step 2: Quality Issue Analysis${NC}"
    if ! analyze_quality_issues "$feature_id"; then
        echo -e "${RED}❌ Issue analysis failed${NC}"
        return 1
    fi
    echo ""
    
    # Step 3: Refinement Decision
    echo -e "${YELLOW}Step 3: Refinement Decision Logic${NC}"
    make_refinement_decision "$feature_id" "$max_iterations"
    local decision_result=$?
    
    case $decision_result in
        0)  # Proceed to next phase
            echo -e "${GREEN}✅ Quality Gate Passed - No refinement needed${NC}"
            return 0
            ;;
        1)  # Refinement needed
            echo -e "${YELLOW}🔄 Quality Gate requires refinement - Proceeding with agent selection${NC}"
            ;;
        2)  # Escalation needed
            echo -e "${RED}⚠️  Quality Gate escalation required - Human review needed${NC}"
            return 2
            ;;
        *)  # Error
            echo -e "${RED}❌ Quality Gate decision failed${NC}"
            return 1
            ;;
    esac
    echo ""
    
    # Step 4: Agent Selection (only if refinement needed)
    if [ $decision_result -eq 1 ]; then
        echo -e "${YELLOW}Step 4: Dynamic Agent Selection${NC}"
        if ! select_refinement_agents "$feature_id"; then
            echo -e "${RED}❌ Agent selection failed${NC}"
            return 1
        fi
        echo ""
        
        # Step 5: Refinement Plan Generation
        echo -e "${YELLOW}Step 5: Refinement Plan Generation${NC}"
        if ! generate_refinement_plan "$feature_id"; then
            echo -e "${RED}❌ Refinement plan generation failed${NC}"
            return 1
        fi
        echo ""
    fi
    
    echo -e "${GREEN}🎯 Quality Gate Orchestration Complete${NC}"
    echo "All orchestration artifacts saved to: .claude/features/$feature_id/quality-gates/"
    
    return $decision_result
}

# === UTILITY FUNCTIONS ===

update_metadata_refinement_iteration() {
    local feature_id=$1
    local iteration=$2
    local metadata_file=".claude/features/${feature_id}/metadata.json"
    
    if [ -f "$metadata_file" ]; then
        jq --arg iteration "$iteration" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.quality_refinement_iteration = ($iteration | tonumber) | 
            .last_refinement_timestamp = $timestamp' \
            "$metadata_file" > "$metadata_file.tmp" && mv "$metadata_file.tmp" "$metadata_file"
    fi
}

create_quality_gates_workspace() {
    local feature_id=$1
    local workspace_dir=".claude/features/${feature_id}/quality-gates"
    
    mkdir -p "$workspace_dir"/{refinement,validation,progress,logs}
    
    echo "Quality gates workspace created: $workspace_dir"
    return 0
}

# Export functions for use in other scripts
export -f discover_quality_agents
export -f analyze_quality_issues
export -f make_refinement_decision
export -f select_refinement_agents
export -f generate_refinement_plan
export -f execute_quality_gate_orchestration
export -f update_metadata_refinement_iteration
export -f create_quality_gates_workspace