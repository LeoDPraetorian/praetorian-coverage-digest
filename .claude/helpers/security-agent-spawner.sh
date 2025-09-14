#!/bin/bash
# Security Agent Auto-Spawner for Claude Flow Task Tool Matcher
# Automatically spawns security agents based on development agent types

# Parse Task tool input to extract agent type and task description
TASK_INPUT=$(cat | jq -r '.tool_input | select(.subagent_type) | .subagent_type + "|" + (.prompt // "")' | head -1)

if [ -z "$TASK_INPUT" ]; then
  exit 0  # No Task tool input, exit silently
fi

# Extract agent type and task description
IFS='|' read -r agent_type task_desc <<< "$TASK_INPUT"

echo "🔍 Task Tool Matcher: Detected $agent_type"

# Security agent mapping based on development agent type
case $agent_type in
  golang-developer|golang-api-developer)
    echo "🔒 Spawning security agents for Go development"
    npx claude-flow@alpha agent spawn go-security-reviewer \
      --task "Security review: $task_desc" \
      --priority high 2>/dev/null &
    npx claude-flow@alpha agent spawn security-architect \
      --task "Architecture security: $task_desc" \
      --priority high 2>/dev/null &
    ;;
    
  react-developer)
    echo "🔒 Spawning security agents for React/Frontend"
    npx claude-flow@alpha agent spawn react-security-reviewer \
      --task "UI security review: $task_desc" \
      --priority high 2>/dev/null &
    npx claude-flow@alpha agent spawn security-architect \
      --task "Frontend security: $task_desc" \
      --priority medium 2>/dev/null &
    ;;
    
  integration-developer)
    echo "🔒 Spawning security agents for integrations"
    npx claude-flow@alpha agent spawn security-architect \
      --task "Integration security: $task_desc" \
      --priority high 2>/dev/null &
    npx claude-flow@alpha agent spawn code-review-swarm \
      --task "Integration code review: $task_desc" \
      --priority medium 2>/dev/null &
    ;;
    
  vql-developer)
    echo "🔒 Spawning security agents for VQL/security tools"
    npx claude-flow@alpha agent spawn go-security-reviewer \
      --task "VQL security review: $task_desc" \
      --priority high 2>/dev/null &
    ;;
    
  coder)
    echo "🔒 Spawning general security review"
    npx claude-flow@alpha agent spawn code-review-swarm \
      --task "General security review: $task_desc" \
      --priority high 2>/dev/null &
    ;;
    
  *)
    echo "ℹ️  No security agents configured for: $agent_type"
    ;;
esac

# Wait for all background security agent spawns to complete
wait

echo "✅ Security agent auto-spawning completed for: $agent_type"