#!/bin/bash

# extract-and-setup-agents.sh
# Extract agent assignments from implementation plan and setup coordination workspace
# Usage: extract-and-setup-agents.sh <FEATURE_ID>

set -e  # Exit on error

# Validate input
if [ $# -ne 1 ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

FEATURE_ID="$1"

# Validate feature exists
if [ ! -d ".claude/features/${FEATURE_ID}" ]; then
    echo "❌ Feature directory not found: .claude/features/${FEATURE_ID}"
    exit 1
fi

# Define key paths
IMPLEMENTATION_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"
IMPL_DIR=".claude/features/${FEATURE_ID}/implementation"
AGENT_ASSIGNMENTS="${IMPL_DIR}/agent-assignments.json"
COORDINATION_DIR="${IMPL_DIR}/coordination"

# Validate implementation plan exists
if [ ! -f "${IMPLEMENTATION_PLAN}" ]; then
    echo "❌ Implementation plan not found: ${IMPLEMENTATION_PLAN}"
    exit 1
fi

echo "🔍 Extracting agent assignments from implementation plan"

# Extract agent assignments using Python parsing
python3 -c "
import re
import json
import sys
import os

def extract_agent_assignments(plan_file):
    '''Extract agent assignments from implementation plan using multiple patterns'''
    try:
        with open(plan_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'❌ Failed to read implementation plan: {e}')
        sys.exit(1)
    
    assignments = []
    
    # Multiple patterns to catch different agent assignment formats
    patterns = [
        # Pattern 1: **Agent:** agent-name or Agent: agent-name
        r'\*\*Agent:\*\*\s*([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)',
        r'Agent:\s*([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)',
        
        # Pattern 2: Use the \`agent-name\` subagent
        r'Use the \\\`([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)\\\` (?:subagent|agent)',
        r'Use the \`([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)\` (?:subagent|agent)',
        
        # Pattern 3: **Assigned to:** or Assigned to: or Responsibility:
        r'\*\*Assigned to:\*\*\s*([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)',
        r'Assigned to:\s*([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)',
        r'Responsibility:\s*([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)',
        
        # Pattern 4: Task sections with agents
        r'###\s*Task\s*\d+:.*?(?:Agent|Assigned|Responsibility):\s*([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)',
        
        # Pattern 5: Subagent or development agent mentions
        r'([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)-(?:developer|specialist|engineer|architect)',
        
        # Pattern 6: Common agent names in context
        r'(?:golang-api-developer|react-developer|python-developer|integration-developer|vql-developer|unit-test-engineer|e2e-test-engineer)'
    ]
    
    # Extract all matches from all patterns
    all_matches = []
    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        all_matches.extend(matches)
    
    # Filter and deduplicate agents
    valid_agents = []
    seen = set()
    
    # Common valid agent suffixes
    valid_suffixes = [
        'developer', 'engineer', 'architect', 'specialist', 'tester', 
        'coordinator', 'planner', 'reviewer', 'analyzer'
    ]
    
    for agent in all_matches:
        # Clean up the agent name
        agent = agent.lower().strip()
        
        # Skip empty or invalid agents
        if not agent or len(agent) < 3:
            continue
            
        # Validate agent name format (contains valid suffix or is known agent)
        if (any(agent.endswith(suffix) for suffix in valid_suffixes) or 
            agent in ['golang-api-developer', 'react-developer', 'python-developer', 
                     'integration-developer', 'vql-developer', 'frontend-developer',
                     'backend-developer', 'security-developer']):
            
            if agent not in seen:
                valid_agents.append(agent)
                seen.add(agent)
    
    return valid_agents

def create_agent_assignment_data(agents):
    '''Create structured agent assignment data with parallel grouping'''
    if not agents:
        return {
            'total_agents': 0,
            'parallel_execution': False,
            'assignments': []
        }
    
    agent_data = []
    
    # Intelligent parallel grouping based on agent types
    primary_types = ['backend', 'frontend', 'api']  # Independent work
    secondary_types = ['test', 'integration', 'security']  # Dependent work
    
    primary_agents = []
    secondary_agents = []
    
    for agent in agents:
        # Categorize agents for parallel execution
        if any(agent_type in agent for agent_type in primary_types):
            primary_agents.append(agent)
        elif any(agent_type in agent for agent_type in secondary_types):
            secondary_agents.append(agent)
        else:
            # Default to primary for unknown types
            primary_agents.append(agent)
    
    # Limit primary agents to 3 for optimal parallel execution
    if len(primary_agents) > 3:
        secondary_agents.extend(primary_agents[3:])
        primary_agents = primary_agents[:3]
    
    # Create assignment data
    order = 1
    
    for agent in primary_agents:
        agent_data.append({
            'agent': agent,
            'order': order,
            'parallel_group': 'primary',
            'execution_phase': '1_primary',
            'status': 'pending'
        })
        order += 1
    
    for agent in secondary_agents:
        agent_data.append({
            'agent': agent,
            'order': order,
            'parallel_group': 'secondary', 
            'execution_phase': '2_secondary',
            'status': 'pending'
        })
        order += 1
    
    return {
        'total_agents': len(agent_data),
        'parallel_execution': len(agent_data) > 1,
        'primary_agents': len(primary_agents),
        'secondary_agents': len(secondary_agents),
        'assignments': agent_data
    }

# Main execution
try:
    # Extract agents from implementation plan
    agents = extract_agent_assignments('${IMPLEMENTATION_PLAN}')
    
    if not agents:
        print('⚠️  No agent assignments found in implementation plan')
        print('    Common formats: Agent: agent-name, Use the \`agent-name\` subagent')
        # Create minimal assignment with generic developer
        agents = ['golang-api-developer']  # Fallback
    
    # Create structured assignment data
    assignment_data = create_agent_assignment_data(agents)
    
    # Save to agent assignments file
    os.makedirs(os.path.dirname('${AGENT_ASSIGNMENTS}'), exist_ok=True)
    with open('${AGENT_ASSIGNMENTS}', 'w') as f:
        json.dump(assignment_data, f, indent=2)
    
    # Output results
    print(f'✅ Extracted {len(agents)} unique agents from implementation plan')
    for i, agent in enumerate(agents):
        group = 'primary' if i < assignment_data['primary_agents'] else 'secondary'
        print(f'   {i+1}. {agent} (Group: {group})')
        
except Exception as e:
    print(f'❌ Failed to extract agent assignments: {e}')
    sys.exit(1)
" || exit 1

# Validate extraction was successful
if [ ! -f "${AGENT_ASSIGNMENTS}" ]; then
    echo "❌ Failed to create agent assignments file"
    exit 1
fi

# Read extracted data
TOTAL_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.total_agents')
PARALLEL_EXECUTION=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.parallel_execution')
PRIMARY_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.primary_agents')
SECONDARY_AGENTS=$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.secondary_agents')

echo "📊 Agent Assignment Summary:"
echo "   • Total Agents: ${TOTAL_AGENTS}"
echo "   • Parallel Execution: ${PARALLEL_EXECUTION}"
echo "   • Primary Agents (parallel): ${PRIMARY_AGENTS}"
echo "   • Secondary Agents (sequential): ${SECONDARY_AGENTS}"

# Create coordination workspace
echo "📁 Setting up agent coordination workspace"

mkdir -p "${COORDINATION_DIR}"/{progress,communication,shared-artifacts,api-contracts}

# Create progress tracker with extracted agent data
cat > "${COORDINATION_DIR}/progress/agent-progress.json" << EOF
{
  "execution_start": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "feature_id": "${FEATURE_ID}",
  "total_agents": ${TOTAL_AGENTS},
  "parallel_execution": ${PARALLEL_EXECUTION},
  "primary_agents": ${PRIMARY_AGENTS},
  "secondary_agents": ${SECONDARY_AGENTS},
  "agent_status": $(cat "${AGENT_ASSIGNMENTS}" | jq '[.assignments[] | {agent: .agent, status: "extracted", group: .parallel_group, phase: .execution_phase, started: null, completed: null, workspace: ("'${IMPL_DIR}'/agent-outputs/" + .agent)}]'),
  "phase": "agent_extraction_complete",
  "coordination_workspace": "${COORDINATION_DIR}",
  "implementation_plan": "${IMPLEMENTATION_PLAN}"
}
EOF

# Create communication template
cat > "${COORDINATION_DIR}/communication/README.md" << EOF
# Agent Communication

This directory facilitates communication between development agents.

## Usage

- **status-updates.md**: Agents post status updates and blockers
- **coordination-notes.md**: Cross-agent coordination and dependencies
- **api-contracts/**: Shared API specifications and contracts
- **shared-artifacts/**: Code snippets, configurations, or shared resources

## Coordination Pattern

1. Each agent works in their designated workspace: \`${IMPL_DIR}/agent-outputs/<agent-name>/\`
2. Agents share progress in \`progress/agent-progress.json\`
3. Cross-agent communication happens through files in this directory
4. API contracts and shared specifications go in \`api-contracts/\`

## Current Agents

$(cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[] | "- " + .agent + " (" + .parallel_group + " group)"')
EOF

# Create shared artifacts directory structure  
mkdir -p "${COORDINATION_DIR}/shared-artifacts"/{configs,templates,utilities}

echo "✅ Agent coordination workspace ready"
echo ""
echo "📋 Coordination Structure:"
echo "   • Progress Tracking: ${COORDINATION_DIR}/progress/"
echo "   • Communication: ${COORDINATION_DIR}/communication/"
echo "   • API Contracts: ${COORDINATION_DIR}/api-contracts/"
echo "   • Shared Artifacts: ${COORDINATION_DIR}/shared-artifacts/"

# Create agent workspace directories
echo "📁 Creating individual agent workspaces"
cat "${AGENT_ASSIGNMENTS}" | jq -r '.assignments[].agent' | while read agent; do
    AGENT_WORKSPACE="${IMPL_DIR}/agent-outputs/${agent}"
    mkdir -p "${AGENT_WORKSPACE}"/{code-changes,progress-logs,documentation}
    echo "   • ${agent}: ${AGENT_WORKSPACE}"
done

# Output structured data for Einstein to consume
echo ""
echo "🎯 Setup Complete - Output Variables:"
echo "TOTAL_AGENTS=${TOTAL_AGENTS}"
echo "PARALLEL_EXECUTION=${PARALLEL_EXECUTION}"
echo "PRIMARY_AGENTS=${PRIMARY_AGENTS}"
echo "SECONDARY_AGENTS=${SECONDARY_AGENTS}"
echo "AGENT_ASSIGNMENTS=${AGENT_ASSIGNMENTS}"
echo "COORDINATION_DIR=${COORDINATION_DIR}"
echo "IMPL_DIR=${IMPL_DIR}"

echo ""
echo "✅ Agent extraction and coordination setup complete"
echo "🚀 Ready for development agent spawning"