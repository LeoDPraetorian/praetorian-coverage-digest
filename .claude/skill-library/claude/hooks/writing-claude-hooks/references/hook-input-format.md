# Hook Input Format

All hooks receive JSON via stdin with common fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.txt",
  "cwd": "/current/working/dir",
  "permission_mode": "ask|allow",
  "hook_event_name": "PreToolUse"
}
```

## Event-Specific Fields

- **PreToolUse/PostToolUse:** `tool_name`, `tool_input`, `tool_result`
- **UserPromptSubmit:** `user_prompt`
- **Stop/SubagentStop:** `reason`

Access fields in prompts using `$TOOL_INPUT`, `$TOOL_RESULT`, `$USER_PROMPT`, etc.

## Environment Variables

Available in all command hooks:

- `$CLAUDE_PROJECT_DIR` - Project root path
- `$CLAUDE_PLUGIN_ROOT` - Plugin directory (use for portable paths)
- `$CLAUDE_ENV_FILE` - SessionStart only: persist env vars here
- `$CLAUDE_CODE_REMOTE` - Set if running in remote context

**Always use ${CLAUDE_PLUGIN_ROOT} in hook commands for portability:**

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
}
```
