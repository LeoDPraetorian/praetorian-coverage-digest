# Claude Code Hooks

This directory contains hooks for enforcing development workflows and policies.

## Installed Hooks

### orchestrator-enforcement.ts (UserPromptSubmit) ✅ ACTIVE

Enforces skill compliance when Claude spawns subagents via Task tool.

**Configuration (settings.json):**
```json
"UserPromptSubmit": [{
  "matcher": "*",
  "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/orchestrator-enforcement.ts"}]
}]
```

**Problem Solved:**
- Subagents don't receive SessionStart hook injection
- Subagents skip mandatory skills even when defined in their agent definition
- No verification that skills were actually invoked

**Solution:**
- Injects reminder for Claude to include explicit skill requirements in Task prompts
- Requires Claude to verify `skills_invoked` metadata when agents return
- Creates orchestrator-level accountability for subagent compliance

**Behavior:**
- Fires on user prompts containing task-like keywords (analyze, implement, fix, etc.)
- Injects `<orchestrator-skill-enforcement>` block into Claude's context
- Reminds Claude to: read agent Step 1 table, include skills in Task prompt, verify on return

**Test:** `echo '{"hook_event_name":"UserPromptSubmit","user_prompt":"analyze the code","session_id":"test","transcript_path":"/tmp/t","cwd":"/tmp","permission_mode":"allow"}' | npx tsx .claude/hooks/orchestrator-enforcement.ts`

---

### session-start.ts (SessionStart) ✅ ACTIVE

Injects `using-skills` skill content at session start.

**Configuration (settings.json):**
```json
"SessionStart": [{
  "matcher": "startup|resume|clear|compact",
  "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start.ts"}]
}]
```

**Behavior:**
- Loads using-skills skill from `.claude/skills/using-skills/SKILL.md`
- Injects as additionalContext in SessionStart event
- Teaches Claude about hybrid skill system (core vs library)
- Ensures skill-search CLI usage is understood

**Migrated from:** `session-start.sh` (bash) → `session-start.ts` (TypeScript for type safety)

---

### enforce-serena.ts (PreToolUse) ✅ ACTIVE

Enforces Serena MCP usage for code searches instead of Grep/Search tools.

**Configuration (settings.json):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Grep|Search",
        "hooks": [{"type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce-serena.ts"}]
      }
    ]
  }
}
```

**Behavior:**
- Blocks Grep/Search on code files (`.ts`, `.tsx`, `.go`, `.py`, etc.)
- Auto-generates semanticContext from search parameters
- Provides guidance to use `serena.find_symbol` instead
- Logs `[Serena Enforcement]` messages for observability

**Test:** `echo '{"hook_event_name":"PreToolUse","tool_name":"Grep","tool_input":{"pattern":"class Asset","glob":"**/*.ts"},...}' | npx tsx .claude/hooks/enforce-serena.ts`

---

### sound-notification.ts (Notification) ✅ ACTIVE

Plays sound notification when Claude completes a task and waits for user input.

**Configuration (settings.json):**
```json
"Notification": [{
  "matcher": "",
  "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/sound-notification.ts"}]
}]
```

**Behavior:**
- As hook: Receives Notification event, plays sound if enabled
- As CLI: Provides commands to configure sound settings

**Migrated from:** `sound-notification.sh` + `sound.sh` (bash) → `sound-notification.ts` (TypeScript)

**Test:** `echo '{"hook_event_name":"Notification","session_id":"test","transcript_path":"/tmp/t","cwd":"/tmp","permission_mode":"allow"}' | npx tsx .claude/hooks/sound-notification.ts`

---

## Sound Notification Command

Control sound notifications for Claude Code agent completion events.

## Usage

```bash
/sound <command> [options]
```

## Commands

- `on` - Enable sound notifications
- `off` - Disable sound notifications
- `toggle` - Toggle sound on/off
- `test` - Play test sound
- `status` - Show current settings
- `volume <n>` - Set volume (0.0 to 1.0)
- `file <path>` - Set custom sound file
- `help` - Show help message

## Examples

```bash
# Enable sound notifications
/sound on

# Disable sound notifications
/sound off

# Set volume to 30%
/sound volume 0.3

# Use custom sound file
/sound file ~/Downloads/notification.wav

# Test current sound
/sound test

# Check status
/sound status
```

## Configuration

Sound settings are stored in `scripts/sound/sound-config.json`:

```json
{
  "enabled": true,
  "sound_file": "/Users/user/.claude/sounds/completion.aiff",
  "volume": 0.5
}
```

## Hook Integration

This command works with Claude Code hooks to automatically play sounds when agents complete tasks and wait for user input.

## Cross-Platform Support

- **macOS**: Uses `afplay` with system sounds as fallback
- **Linux**: Uses `aplay` (ALSA) or `paplay` (PulseAudio)
- **Fallback**: System bell (`\a`) if no audio system available

## Sound File Formats

Supports common audio formats:

- `.wav` (recommended)
- `.aiff` (macOS default)
- `.mp3` (with mpv)
- `.ogg` (with mpv)

If no custom sound file is specified, a pleasant two-tone notification sound will be automatically generated.
