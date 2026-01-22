# Hook Lifecycle and Debugging

## Hook Lifecycle and Limitations

### Hooks Load at Session Start

**Important:** Hooks are loaded when Claude Code session starts. Changes to hook configuration require restarting Claude Code.

**Cannot hot-swap hooks:**

- Editing `hooks/hooks.json` won't affect current session
- Adding new hook scripts won't be recognized
- Changing hook commands/prompts won't update
- Must restart Claude Code: exit and run `claude` again

**To test hook changes:**

1. Edit hook configuration or scripts
2. Exit Claude Code session
3. Restart: `claude` or `cc`
4. New hook configuration loads
5. Test hooks with `claude --debug`

### Hook Validation at Startup

Hooks are validated when Claude Code starts:

- Invalid JSON in hooks.json causes loading failure
- Missing scripts cause warnings
- Syntax errors reported in debug mode

Use `/hooks` command to review loaded hooks in current session.

## Debugging Hooks

### Enable Debug Mode

```bash
claude --debug
```

Look for hook registration, execution logs, input/output JSON, and timing information.

### Test Hook Scripts

Test command hooks directly:

```bash
echo '{"tool_name": "Write", "tool_input": {"file_path": "/test"}}' | \
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh

echo "Exit code: $?"
```

### Validate JSON Output

Ensure hooks output valid JSON:

```bash
output=$(./your-hook.sh < test-input.json)
echo "$output" | jq .
```
