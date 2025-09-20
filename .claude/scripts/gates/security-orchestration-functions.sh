#!/bin/bash

# Security Gate Orchestration Functions - SIMPLIFIED VERSION
# Strategic decision logic moved to security-risk-assessor and security-agent-strategist agents
# This file contains ONLY mechanical operations: counting, file creation, directory management

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# === AGENT DISCOVERY FUNCTIONS (Mechanical Only) ===

discover_security_agents() {
    local feature_id=$1
    local discovery_output=".claude/features/${feature_id}/security-gates/agent-discovery.json"
    
    mkdir -p ".claude/features/${feature_id}/security-gates"
    
    echo -e "${BLUE}=== Dynamic Security Agent Discovery (Mechanical) ===${NC}"
    
    # Initialize discovery results
    cat > "$discovery_output" << 'EOF'
{
  "discovery_timestamp": "",
  "security_analysis_agents": [],
  "security_capable_developers": [],
  "security_architects": [],
  "security_validators": []
}
EOF
    
    # Update timestamp
    jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.discovery_timestamp = $timestamp' \
        "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
    
    # Discover security analysis agents (mechanical file scanning)
    local security_agents_dir=".claude/agents/analysis"
    if [ -d "$security_agents_dir" ]; then
        echo -e "${GREEN}Security Analysis Agents discovered:${NC}"
        
        find "$security_agents_dir" -name "*security*.md" -type f | while read -r agent_file; do
            agent_name=$(basename "$agent_file" .md)
            agent_type=$(grep "^type:" "$agent_file" | cut -d':' -f2- | xargs || echo "unknown")
            capabilities=$(grep "^capabilities:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            domains=$(grep "^domains:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            specializations=$(grep "^specializations:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            
            echo "  • ${agent_name}:"
            echo "    - Type: ${agent_type}"
            echo "    - Capabilities: ${capabilities}"
            echo "    - Domains: ${domains}"
            
            # Add to discovery results (mechanical JSON operation)
            local agent_json=$(jq -n \
                --arg name "$agent_name" \
                --arg type "$agent_type" \
                --arg capabilities "$capabilities" \
                --arg domains "$domains" \
                --arg specializations "$specializations" \
                '{
                    name: $name,
                    type: $type,
                    capabilities: ($capabilities | split(", ")),
                    domains: ($domains | split(", ")),
                    specializations: ($specializations | split(", "))
                }')
                
            # Add to security_analysis_agents array
            jq --argjson agent "$agent_json" '.security_analysis_agents += [$agent]' \
                "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
        done
    fi
    
    # Discover security architects (mechanical file scanning)
    local arch_agents_dir=".claude/agents/architecture"
    if [ -d "$arch_agents_dir" ]; then
        echo -e "${GREEN}Security Architects discovered:${NC}"
        
        find "$arch_agents_dir" -name "*security*.md" -type f | while read -r agent_file; do
            agent_name=$(basename "$agent_file" .md)
            capabilities=$(grep "^capabilities:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            
            echo "  • ${agent_name}: Security architecture oversight"
            
            local agent_json=$(jq -n \
                --arg name "$agent_name" \
                --arg capabilities "$capabilities" \
                '{
                    name: $name,
                    capabilities: ($capabilities | split(", ")),
                    role: "mandatory_oversight"
                }')
                
            jq --argjson agent "$agent_json" '.security_architects += [$agent]' \
                "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
        done
    fi
    
    # Discover security-capable development agents (mechanical capability scanning)
    local dev_agents_dir=".claude/agents/development"
    if [ -d "$dev_agents_dir" ]; then
        echo -e "${GREEN}Security-Capable Development Agents:${NC}"
        
        find "$dev_agents_dir" -name "*.md" -type f | while read -r agent_file; do
            agent_name=$(basename "$agent_file" .md)
            capabilities=$(grep "^capabilities:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            domains=$(grep "^domains:" "$agent_file" | cut -d':' -f2- | xargs || echo "")
            
            # Simple check: Include if has security-related capabilities
            if echo "$capabilities" | grep -q -E "(security.*remediation|security.*development|vulnerability.*fixing)" || \
               echo "$domains" | grep -q -E "(security.*development|backend.*security)"; then
                
                echo "  • ${agent_name}: Security-capable development"
                
                local agent_json=$(jq -n \
                    --arg name "$agent_name" \
                    --arg capabilities "$capabilities" \
                    --arg domains "$domains" \
                    '{
                        name: $name,
                        capabilities: ($capabilities | split(", ")),
                        domains: ($domains | split(", ")),
                        security_capable: true
                    }')
                    
                jq --argjson agent "$agent_json" '.security_capable_developers += [$agent]' \
                    "$discovery_output" > "$discovery_output.tmp" && mv "$discovery_output.tmp" "$discovery_output"
            fi
        done
    fi
    
    echo -e "${GREEN}Security agent discovery completed: $discovery_output${NC}"
    return 0
}

# === SECURITY ISSUE ANALYSIS FUNCTIONS (Mechanical Only) ===

analyze_security_issues() {
    local feature_id=$1
    local analysis_output=".claude/features/${feature_id}/security-gates/issue-analysis.json"
    
    echo -e "${PURPLE}=== Security Issue Analysis (Mechanical Counting) ===${NC}"
    
    local security_analysis_dir=".claude/features/${feature_id}/security-review/analysis"
    
    # Initialize issue analysis
    cat > "$analysis_output" << 'EOF'
{
  "analysis_timestamp": "",
  "issue_summary": {
    "critical_count": 0,
    "high_count": 0,
    "medium_count": 0,
    "total_security_issues": 0,
    "affected_domains": [],
    "technology_stack": []
  }
}
EOF
    
    # Update timestamp
    jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.analysis_timestamp = $timestamp' \
        "$analysis_output" > "$analysis_output.tmp" && mv "$analysis_output.tmp" "$analysis_output"
    
    local total_critical=0
    local total_high=0
    local total_medium=0
    
    # Analyze security review files (mechanical counting only)
    if [ -d "$security_analysis_dir" ]; then
        echo -e "${GREEN}Analyzing security review results (mechanical counting)...${NC}"
        
        find "$security_analysis_dir" -name "*.md" -type f | while read -r analysis_file; do
            echo "  Analyzing: $(basename "$analysis_file")"
            
            # Count issues by severity (mechanical regex)
            local critical_in_file=$(grep -c "\\[CRITICAL\\]\\|\\[BLOCKING\\]" "$analysis_file" 2>/dev/null || echo "0")
            local high_in_file=$(grep -c "\\[HIGH\\]\\|\\[VULNERABILITY\\]" "$analysis_file" 2>/dev/null || echo "0")
            local medium_in_file=$(grep -c "\\[MEDIUM\\]\\|\\[WARNING\\]" "$analysis_file" 2>/dev/null || echo "0")
            
            echo "    - Critical/Blocking: $critical_in_file"
            echo "    - High/Vulnerability: $high_in_file"  
            echo "    - Medium/Warning: $medium_in_file"
            
            total_critical=$((total_critical + critical_in_file))
            total_high=$((total_high + high_in_file))
            total_medium=$((total_medium + medium_in_file))
        done
    else
        echo -e "${RED}Security analysis directory not found: $security_analysis_dir${NC}"
        return 1
    fi
    
    # Detect affected domains and technology stack (mechanical pattern detection)
    local affected_domains=()
    local tech_stack=()
    
    # Backend security detection
    if find "$security_analysis_dir" -name "*go*.md" -o -name "*backend*.md" -o -name "*api*.md" 2>/dev/null | grep -q .; then
        affected_domains+=("backend")
        tech_stack+=("go")
    fi
    
    # Frontend security detection  
    if find "$security_analysis_dir" -name "*react*.md" -o -name "*frontend*.md" -o -name "*ui*.md" 2>/dev/null | grep -q .; then
        affected_domains+=("frontend")
        tech_stack+=("react")
    fi
    
    # Infrastructure security detection
    if find "$security_analysis_dir" -name "*infrastructure*.md" -o -name "*cloud*.md" -o -name "*aws*.md" 2>/dev/null | grep -q .; then
        affected_domains+=("infrastructure")
        tech_stack+=("aws")
    fi
    
    # Update security issue summary (mechanical JSON update)
    local total_security_issues=$((total_critical + total_high + total_medium))
    local domains_json=$(printf '%s\n' "${affected_domains[@]}" | jq -R . | jq -s .)
    local tech_json=$(printf '%s\n' "${tech_stack[@]}" | jq -R . | jq -s .)
    
    jq --arg critical "$total_critical" \
       --arg high "$total_high" \
       --arg medium "$total_medium" \
       --arg total "$total_security_issues" \
       --argjson domains "$domains_json" \
       --argjson tech "$tech_json" \
       '
       .issue_summary.critical_count = ($critical | tonumber) |
       .issue_summary.high_count = ($high | tonumber) |
       .issue_summary.medium_count = ($medium | tonumber) |
       .issue_summary.total_security_issues = ($total | tonumber) |
       .issue_summary.affected_domains = $domains |
       .issue_summary.technology_stack = $tech
       ' "$analysis_output" > "$analysis_output.tmp" && mv "$analysis_output.tmp" "$analysis_output"
    
    echo -e "${GREEN}Security issue analysis completed (mechanical counting):${NC}"
    echo "  🚨 Critical Issues: $total_critical"
    echo "  ⚠️  High Issues: $total_high"
    echo "  ℹ️  Medium Issues: $total_medium"
    echo "  📁 Affected Domains: ${affected_domains[*]}"
    echo "  🔧 Technology Stack: ${tech_stack[*]}"
    echo "  📄 Analysis saved: $analysis_output"
    
    return 0
}

# === SIMPLIFIED SECURITY STATUS CHECK ===
# NOTE: Strategic decision logic moved to security-risk-assessor agent

check_security_status() {
    local feature_id=$1
    local issue_analysis=".claude/features/${feature_id}/security-gates/issue-analysis.json"
    
    echo -e "${PURPLE}=== Security Status Check (Mechanical) ===${NC}"
    
    if [ ! -f "$issue_analysis" ]; then
        echo -e "${RED}Error: Security issue analysis not found: $issue_analysis${NC}"
        return 1
    fi
    
    # Read security issue counts (mechanical operation)
    local critical_count=$(cat "$issue_analysis" | jq -r '.issue_summary.critical_count')
    local high_count=$(cat "$issue_analysis" | jq -r '.issue_summary.high_count')
    local medium_count=$(cat "$issue_analysis" | jq -r '.issue_summary.medium_count')
    local total_issues=$(cat "$issue_analysis" | jq -r '.issue_summary.total_security_issues')
    local affected_domains=$(cat "$issue_analysis" | jq -r '.issue_summary.affected_domains[]' | tr '\n' ',' | sed 's/,$//')
    
    echo -e "${GREEN}Security Issue Summary (Mechanical Count):${NC}"
    echo "  🚨 Critical Issues: $critical_count"
    echo "  ⚠️  High Issues: $high_count"  
    echo "  ℹ️  Medium Issues: $medium_count"
    echo "  📊 Total Security Issues: $total_issues"
    echo "  📁 Affected Domains: $affected_domains"
    
    # Simple status determination for Einstein coordination (no strategic decisions)
    if [ "$critical_count" -gt 0 ] || [ "$high_count" -gt 0 ]; then
        echo -e "${YELLOW}🔄 REQUIRES STRATEGIC ASSESSMENT: Critical/High vulnerabilities detected${NC}"
        return 1  # Indicates strategic agents needed
    elif [ "$medium_count" -gt 0 ]; then
        echo -e "${BLUE}ℹ️  STRATEGIC ASSESSMENT RECOMMENDED: Medium vulnerabilities detected${NC}"
        return 1  # Let strategic agents decide
    else
        echo -e "${GREEN}✅ NO SECURITY ISSUES: Proceed to next phase${NC}"
        return 0  # Clear to proceed
    fi
}

# === SIMPLIFIED MAIN SECURITY ORCHESTRATION FUNCTION ===
# NOTE: Strategic decisions moved to security-risk-assessor and security-agent-strategist agents

execute_security_gate_orchestration() {
    local feature_id=$1
    local max_iterations=${2:-2}  # Conservative for security
    
    echo -e "${PURPLE}🛡️ Starting Simplified Security Gate Orchestration${NC}"
    echo "Feature ID: $feature_id"
    echo "Note: Strategic decisions delegated to security-risk-assessor and security-agent-strategist agents"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    
    # Step 1: Dynamic Security Agent Discovery (mechanical)
    echo -e "${YELLOW}Step 1: Security Agent Discovery (Mechanical)${NC}"
    if ! discover_security_agents "$feature_id"; then
        echo -e "${RED}❌ Security agent discovery failed${NC}"
        return 1
    fi
    echo ""
    
    # Step 2: Security Issue Analysis (mechanical counting)
    echo -e "${YELLOW}Step 2: Security Issue Analysis (Mechanical Counting)${NC}"
    if ! analyze_security_issues "$feature_id"; then
        echo -e "${RED}❌ Security issue analysis failed${NC}"
        return 1
    fi
    echo ""
    
    # Step 3: Simple Security Status Check (mechanical)
    echo -e "${YELLOW}Step 3: Basic Security Status Check${NC}"
    check_security_status "$feature_id"
    local status_result=$?
    
    case $status_result in
        0)  # No security issues detected
            echo -e "${GREEN}✅ No Security Issues - Proceed to next phase${NC}"
            return 0
            ;;
        1)  # Security issues detected - strategic agents needed
            echo -e "${YELLOW}🔄 Security Issues Detected - Strategic Assessment Required${NC}"
            echo "  ℹ️  Strategic agents (security-risk-assessor, security-agent-strategist) will make decisions"
            return 1  # Indicates strategic assessment needed
            ;;
        *)  # Error in analysis
            echo -e "${RED}❌ Security status check failed${NC}"
            return 1
            ;;
    esac
    
    echo -e "${GREEN}🛡️ Simplified Security Gate Orchestration Complete${NC}"
    echo "Strategic decisions delegated to security-risk-assessor and security-agent-strategist agents"
    
    return $status_result
}

# === SECURITY UTILITY FUNCTIONS (Mechanical Only) ===

update_metadata_security_iteration() {
    local feature_id=$1
    local iteration=$2
    local metadata_file=".claude/features/${feature_id}/metadata.json"
    
    if [ -f "$metadata_file" ]; then
        jq --arg iteration "$iteration" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.security_refinement_iteration = ($iteration | tonumber) | 
            .last_security_refinement_timestamp = $timestamp' \
            "$metadata_file" > "$metadata_file.tmp" && mv "$metadata_file.tmp" "$metadata_file"
    fi
}

create_security_gates_workspace() {
    local feature_id=$1
    local workspace_dir=".claude/features/${feature_id}/security-gates"
    
    mkdir -p "$workspace_dir"/{refinement,validation,oversight,progress,logs}
    
    echo "Security gates workspace created: $workspace_dir"
    return 0
}

# Export simplified functions for use in Einstein pipeline
export -f discover_security_agents
export -f analyze_security_issues
export -f check_security_status
export -f execute_security_gate_orchestration
export -f update_metadata_security_iteration
export -f create_security_gates_workspace