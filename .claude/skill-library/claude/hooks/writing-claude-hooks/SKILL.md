---
name: writing-claude-hooks
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse/PostToolUse/Stop hook", "validate tool use", "implement prompt-based hooks", "use ${CLAUDE_PLUGIN_ROOT}", "set up event-driven automation", "block dangerous commands", or mentions hook events (PreToolUse, PostToolUse, Stop, SubagentStop, SessionStart, SessionEnd, UserPromptSubmit, PreCompact, Notification). Provides comprehensive guidance for creating and implementing Claude Code plugin hooks with focus on advanced prompt-based hooks API.
allowed-tools: "Read, Write, Edit, Grep, Glob, Bash"
---

# Hook Development for Claude Code Plugins

## Overview

Hooks are event-driven automation scripts that execute in response to Claude Code events. Use hooks to validate operations, enforce policies, add context, and integrate external tools into workflows.

**Key capabilities:**

- Validate tool calls before execution (PreToolUse)
- React to tool results (PostToolUse)
- Enforce completion standards (Stop, SubagentStop)
- Load project context (SessionStart)
- Automate workflows across the development lifecycle

## Hook Types

### Prompt-Based Hooks (Recommended)

Use LLM-driven decision making for context-aware validation:

```json
{
  "type": "prompt",
  "prompt": "Evaluate if this tool use is appropriate: $TOOL_INPUT",
  "timeout": 30
}
```

**Supported events:** Stop, SubagentStop, UserPromptSubmit, PreToolUse

**Benefits:**

- Context-aware decisions based on natural language reasoning
- Flexible evaluation logic without bash scripting
- Better edge case handling
- Easier to maintain and extend

### Command Hooks

Execute bash commands for deterministic checks:

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
  "timeout": 60
}
```

**Use for:**

- Fast deterministic validations
- File system operations
- External tool integrations
- Performance-critical checks

## Hook Configuration Formats

### Plugin hooks.json Format

**For plugin hooks** in `hooks/hooks.json`, use wrapper format:

```json
{
  "description": "Brief explanation of hooks (optional)",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**Key points:**

- `description` field is optional
- `hooks` field is required wrapper containing actual hook events
- This is the **plugin-specific format**

**Example:**

```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Settings Format (Direct)

**For user settings** in `.claude/settings.json`, use direct format:

```json
{
  "PreToolUse": [...],
  "Stop": [...],
  "SessionStart": [...]
}
```

**Key points:**

- No wrapper - events directly at top level
- No description field
- This is the **settings format**

**Important:** The examples below show the hook event structure that goes inside either format. For plugin hooks.json, wrap these in `{"hooks": {...}}`.

## Hook Events

### PreToolUse

Execute before any tool runs. Use to approve, deny, or modify tool calls.

**Example (prompt-based):**

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validate file write safety. Check: system paths, credentials, path traversal, sensitive content. Return 'approve' or 'deny'."
        }
      ]
    }
  ]
}
```

**Output for PreToolUse:**

```json
{
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask",
    "updatedInput": { "field": "modified_value" }
  },
  "systemMessage": "Explanation for Claude"
}
```

### PostToolUse

Execute after tool completes. Use to react to results, provide feedback, or log.

**Example:**

```json
{
  "PostToolUse": [
    {
      "matcher": "Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Analyze edit result for potential issues: syntax errors, security vulnerabilities, breaking changes. Provide feedback."
        }
      ]
    }
  ]
}
```

**Output behavior:**

- Exit 0: stdout JSON parsed and processed
- Exit 2: stderr shown but **does not reliably trigger actions** (avoid)
- systemMessage included in context

### Stop

Execute when main agent considers stopping. Use to validate completeness.

**Example:**

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Verify task completion: tests run, build succeeded, questions answered. Return 'approve' to stop or 'block' with reason to continue."
        }
      ]
    }
  ]
}
```

**Decision output (depends on hook type):**

For **command-based hooks** (`type: "command"` - bash scripts):

```json
{"decision": "approve"}  // allow stop, exit 0
{"decision": "block", "reason": "..."}  // block stop, exit 0
```

**WARNING:** Exit code 2 + stderr does NOT work reliably. Testing confirmed it's treated as plain text, not a blocking signal. Always use JSON with exit 0.

For **prompt-based hooks** (`type: "prompt"` - LLM evaluation):

```json
{"ok": true}
{"ok": false, "reason": "Explanation of why work should continue"}
```

**CRITICAL:**

- `type: "command"` → Use `{"decision": "block"}` with **exit 0** (exit 2 is unreliable!)
- `type: "prompt"` → Use `{"ok": boolean}` (LLM responds to prompt asking for this format)
- Known bug: Exit code 2 + stderr is treated as plain text (GitHub #10412, #3656)

### SubagentStop

Execute when subagent considers stopping. Use to ensure subagent completed its task.

**Key differences from Stop:**

- Fires when a **subagent** (spawned via Task tool) tries to return
- Main agent's Stop hook does NOT catch subagent completions
- Use both Stop AND SubagentStop for complete coverage

**Important:** PostToolUse hooks DO fire for subagent tool calls, so state tracking works across both main agent and subagents.

**Example:**

```json
{
  "SubagentStop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Verify subagent completed its assigned task. Check if code was modified and appropriate verification ran. Return {\"ok\": true} or {\"ok\": false, \"reason\": \"...\"}",
          "timeout": 45
        }
      ]
    }
  ]
}
```

### UserPromptSubmit

Execute when user submits a prompt. Use to add context, validate, or block prompts.

**Example config:**

```json
{
  "UserPromptSubmit": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/my-hook.sh"
        }
      ]
    }
  ]
}
```

**Command-based output format (REQUIRED schema):**

```json
{
  "continue": true,
  "suppressOutput": false,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Context string to add to conversation"
  }
}
```

**CRITICAL:** `hookEventName: "UserPromptSubmit"` is **required** when using `hookSpecificOutput`. Omitting it causes validation error.

**To block a prompt:**

```json
{
  "decision": "block",
  "reason": "Explanation shown to user (not added to context)"
}
```

### SessionStart

Execute when Claude Code session begins. Use to load context and set environment.

**Example:**

```json
{
  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh"
        }
      ]
    }
  ]
}
```

**Special capability:** Persist environment variables using `$CLAUDE_ENV_FILE`:

```bash
echo "export PROJECT_TYPE=nodejs" >> "$CLAUDE_ENV_FILE"
```

See `examples/load-context.sh` for complete example.

### SessionEnd

Execute when session ends. Use for cleanup, logging, and state preservation.

### PreCompact

Execute before context compaction. Use to add critical information to preserve.

### Notification

Execute when Claude sends notifications. Use to react to user notifications.

## Hook Output Format

### Standard Output (All Hooks)

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Message for Claude"
}
```

- `continue`: If false, halt processing (default true)
- `suppressOutput`: Hide output from transcript (default false)
- `systemMessage`: Message shown to Claude

### Exit Codes

- `0` - Success (stdout JSON parsed and processed)
- `2` - **UNRELIABLE** (stderr shown but does NOT block - use JSON instead)
- Other - Non-blocking error

**Important:** Always use exit 0 with JSON output. Exit code 2 does not reliably block.

## Hook Input and Environment

All hooks receive JSON via stdin with common and event-specific fields. Use environment variables like `$CLAUDE_PLUGIN_ROOT` for portability.

**See:** [references/hook-input-format.md](references/hook-input-format.md) for complete input schema, event-specific fields, and environment variables.

## Plugin Hook Configuration

Define hooks in `hooks/hooks.json` with event types (PreToolUse, Stop, SessionStart), matchers, and hook configurations. Plugin hooks merge with user hooks and run in parallel.

**See:** [references/patterns.md](references/patterns.md) for complete plugin configuration examples.

## Matchers

Matchers are case-sensitive and support exact match (`"Write"`), multiple tools (`"Read|Write|Edit"`), wildcard (`"*"`), and regex patterns (`"mcp__.*__delete.*"`).

**See:** [references/patterns.md](references/patterns.md) for common matcher patterns (MCP tools, file operations, specific plugins).

## Security Best Practices

Always validate inputs, check for path traversal, quote all bash variables, and set appropriate timeouts.

**See:** [references/security.md](references/security.md) for detailed patterns including input validation, path safety checks, variable quoting, and timeout configuration.

## Performance Considerations

All matching hooks run in parallel. Design for independence and optimize by using command hooks for deterministic checks and prompt hooks for complex reasoning.

**See:** [references/performance.md](references/performance.md) for parallel execution patterns, design implications, and optimization strategies.

## Temporarily Active Hooks

Create hooks that activate conditionally using flag files or configuration checks. Useful for enabling strict validation only when needed, temporary debugging, or feature flags.

**See:** [references/advanced.md](references/advanced.md) for flag file activation patterns, configuration-based activation, and best practices.

## Enforced Iteration Limits

Skills like iterating-to-completion document max_iterations: 10, but these are guidance - Claude can rationalize around them. Stop hooks provide deterministic enforcement.

State file tracks iterations; Stop hook blocks exit until limit reached:

```bash
#!/bin/bash
# iteration-counter-stop.sh
set -euo pipefail

STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/iteration-state.json"

# Read current state
if [ -f "$STATE_FILE" ]; then
  iteration=$(jq -r '.iteration // 0' "$STATE_FILE")
  max_iterations=$(jq -r '.max_iterations // 10' "$STATE_FILE")
else
  # No state file = not in iteration mode, allow exit
  echo '{"decision": "approve"}'
  exit 0
fi

# Check if limit reached
if [ "$iteration" -ge "$max_iterations" ]; then
  rm -f "$STATE_FILE"  # Clean up, allow exit
  echo '{"decision": "approve"}'
  exit 0
fi

# Increment and block exit
iteration=$((iteration + 1))
jq --argjson iter "$iteration" '.iteration = $iter' "$STATE_FILE" > "${STATE_FILE}.tmp"
mv "${STATE_FILE}.tmp" "$STATE_FILE"

# Block with continuation reason (command hooks use "decision", not "ok")
cat <<EOF
{
  "decision": "block",
  "reason": "Iteration $iteration of $max_iterations. Continue working on the task."
}
EOF
exit 0
```

### Starting an Iteration Loop

Create state file to activate the loop:

```bash
echo '{"iteration": 0, "max_iterations": 10, "task": "description"}' > .claude/iteration-state.json
```

### Hook Configuration

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/iteration-counter-stop.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

**Hybrid layers:** Skill (guidance: max_iterations: 10) → State file (tracking: .claude/iteration-state.json) → Stop hook (enforcement: JSON `{"decision": "block"}` with exit 0) → Scratchpad (context: scratchpad-{task}.md).

**Activation:** State file presence enables iteration mode. No file = hook inactive. Removing file allows exit. Compatible with prompt-based hooks.

**Source:** Community research on autonomous loops (Ralph Wiggum, Continuous-Claude-v3, claude-code-hooks-mastery).

## Hook Lifecycle and Debugging

Hooks load at session start and require restart to pick up changes. Use `claude --debug` for troubleshooting and test scripts directly before deployment.

**See:** [references/lifecycle-debugging.md](references/lifecycle-debugging.md) for lifecycle limitations, hot-swap constraints, debugging techniques, and testing patterns.

## Quick Reference

**Hook Events:** PreToolUse (validation), PostToolUse (feedback), Stop/SubagentStop (completeness), UserPromptSubmit (context), SessionStart (loading), SessionEnd (cleanup), PreCompact (preservation), Notification (reactions).

**Best Practices:** Use prompt-based hooks for complex logic, ${CLAUDE_PLUGIN_ROOT} for portability, validate inputs, quote variables, set timeouts, test thoroughly. Avoid hardcoded paths, long-running operations, execution order dependencies.

## Integration

### Called By

- **`gateway-claude`** - Routes hook development tasks ("create a hook", "add a PreToolUse hook", "use ${CLAUDE_PLUGIN_ROOT}") to this skill

### Requires (invoke before starting)

None - This skill is self-contained documentation and can be used immediately.

### Calls (during execution)

None - This skill provides reference documentation and does not invoke other skills.

### Pairs With (conditional)

None - Standalone reference skill for hook development.

## Additional Resources

**Reference files:** See `references/` directory for detailed patterns, security best practices, performance optimization, lifecycle management, and migration guides.

**External:** Official documentation at https://docs.claude.com/en/docs/claude-code/hooks. Implementation workflow in [references/patterns.md](references/patterns.md).
