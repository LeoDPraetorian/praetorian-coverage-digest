# Sound Notification Command

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

This command works with the `UserPromptSubmit` hook in `.claude/settings.json` to automatically play sounds when agents complete tasks and wait for user input.

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