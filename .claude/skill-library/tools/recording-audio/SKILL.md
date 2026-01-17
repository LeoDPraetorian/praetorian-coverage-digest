---
name: recording-audio
description: Records audio from microphone using FFmpeg on macOS, saves to Claude output directory, supports time-limited recordings and transcription loop workflows
allowed-tools: Bash, Read, Write, TodoWrite, AskUserQuestion, Skill
---

# Recording Audio with FFmpeg

**Guides CLI audio recording workflows using FFmpeg on macOS with proper quality settings, permissions, and Claude output directory integration.**

## When to Use

Use this skill when:

- User requests audio recording from microphone
- Need to capture voice memos, meetings, or audio notes
- Setting up multi-recording transcription loops
- User says "record audio", "capture microphone", "voice recording"

**You MUST use TodoWrite** to track recording session state and loop progress.

## Quick Reference

| Command Pattern                                               | Purpose                   | Quality      |
| ------------------------------------------------------------- | ------------------------- | ------------ |
| `ffmpeg -f avfoundation -i ":N" -t 30 -c:a aac -b:a 128k`     | Voice recording (30 sec)  | Voice        |
| `ffmpeg -f avfoundation -i ":N" -t 300 -c:a aac -b:a 192k`    | General recording (5 min) | General      |
| `ffmpeg -f avfoundation -i ":N" -t 600 -c:a aac -b:a 256k`    | High quality (10 min)     | High quality |
| `ffmpeg -f avfoundation -list_devices true -i ""`             | List available devices    | N/A          |
| `skill: "transcribing-audio"`                                 | Transcribe recorded file  | N/A          |

**Important**: Replace `:N` with actual device index from config or user selection. NEVER use `:0` without verifying.

**Output format**: M4A (AAC codec) - native macOS support, good compression

---

## User Configuration (Optional but Recommended)

**Purpose**: Persist user preferences to avoid re-setup in every session

**Location**: `.claude/skill-library/tools/recording-audio/.local/config.json` (gitignored)

### Initial Setup

Run once to create configuration:

```bash
# Create config directory
mkdir -p .claude/skill-library/tools/recording-audio/.local

# Create config file
cat > .claude/skill-library/tools/recording-audio/.local/config.json <<'EOF'
{
  "audio_device_index": 0,
  "quality_preset": "general",
  "transcription_model": "base.en",
  "default_duration": 30,
  "output_directory": ".claude/.output/audio"
}
EOF
```

### Configuration Options

| Field                 | Default                   | Options                                                          | Purpose                              |
| --------------------- | ------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `audio_device_index`  | `0`                       | `0`, `1`, `2`, etc.                                              | Microphone device (from FFmpeg list) |
| `quality_preset`      | `"general"`               | `"voice"`, `"general"`, `"high"`                                 | Recording bitrate (128k/192k/256k)   |
| `transcription_model` | `"base.en"`               | `"tiny.en"`, `"base.en"`, `"small.en"`, `"medium.en"`, `"large"` | Whisper model for transcription      |
| `default_duration`    | `30`                      | Any integer (seconds)                                            | Default recording duration           |
| `output_directory`    | `".claude/.output/audio"` | Any path                                                         | Where to save recordings             |

**Model selection guidance** (aligns with `transcribing-audio` skill):

- `tiny.en` - Fastest, lowest accuracy (~1GB, ~32x faster than realtime)
- `base.en` - **Recommended default** - Good balance (~1GB, ~16x faster)
- `small.en` - Better accuracy (~2GB, ~6x faster)
- `medium.en` - High accuracy (~5GB, ~2x faster)
- `large` - Best accuracy, multilingual (~10GB, ~1x realtime)

### Using Configuration

If config exists, workflows automatically:

- Skip device listing (uses `audio_device_index`)
- Apply quality preset (no need to specify bitrate)
- Use configured transcription model (when calling `transcribing-audio`)

**See**: [references/configuration.md](references/configuration.md) for complete configuration management

---

## Prerequisites Check

**🚨 MANDATORY: Check these in order. DO NOT skip any phase.**

**Phase -1: Check for Configuration File (ALWAYS CHECK FIRST)**

```bash
# Check if config file exists
CONFIG_FILE=".claude/skill-library/tools/recording-audio/.local/config.json"
if [ -f "$CONFIG_FILE" ]; then
  echo "Config file found - will use saved device preferences"
  AUDIO_DEVICE_INDEX=$(jq -r '.audio_device_index' "$CONFIG_FILE")
  QUALITY_PRESET=$(jq -r '.quality_preset' "$CONFIG_FILE")
  echo "Device index: $AUDIO_DEVICE_INDEX, Quality: $QUALITY_PRESET"
else
  echo "No config file - will need to list devices and ask user"
fi
```

**If config exists**: Use `audio_device_index` from config, skip to Phase 0
**If config does NOT exist**: MUST proceed through all phases including device listing

**Phase 0: Verify FFmpeg Installation**

```bash
# Check if FFmpeg is installed
which ffmpeg

# If not installed, guide user
echo "Install FFmpeg via Homebrew:"
echo "brew install ffmpeg"
```

**Phase 1: Verify Microphone Permissions**

Terminal app must have microphone access:

1. System Settings → Privacy & Security → Microphone
2. Enable permission for Terminal (or iTerm2, Warp, etc.)
3. Restart terminal after enabling

**Phase 2: Verify Output Directory**

```bash
# Ensure Claude output directory exists
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
mkdir -p "$ROOT/.claude/.output/audio"
```

---

## Core Workflows

### Workflow 1: Single Recording

**Use when**: User specifies a duration and wants one recording

**Steps:**

1. **Check prerequisites** (Phase -1 through Phase 2 above) - MANDATORY, cannot skip
2. **Device Selection (BLOCKING STEP)**:
   - **If config exists**: Use `audio_device_index` from config, announce which device
   - **If NO config**: MUST list devices AND ask user which device to use

   **DO NOT PROCEED without:**
   - Valid device index from config, OR
   - User-confirmed device selection via AskUserQuestion

   ```bash
   # List devices (if no config)
   ffmpeg -f avfoundation -list_devices true -i ""
   # Shows: [0] MacBook Pro Microphone, [1] External Microphone, etc.
   ```

   **Then use AskUserQuestion** to let user select which device:
   - Question: "Which audio device should I use for recording?"
   - Options: One option per device from ffmpeg output
   - Store selected index for use in recording command

3. **Generate filename** with timestamp
4. **Execute recording** with user-selected device index (NOT hardcoded `:0`)
5. **Confirm completion** and provide file path

**See:** [references/single-recording-workflow.md](references/single-recording-workflow.md) for detailed implementation

---

### Workflow 2: Recording Loop with Transcription

**Use when**: User wants multiple recordings with automatic transcription until stop condition

**Stop conditions:**

- Zero text detected in transcription (silence)
- User speaks an end phrase (e.g., "stop recording")
- Maximum time limit reached
- User manually stops

**Steps:**

1. **Initialize loop state** with TodoWrite
2. **Record audio segment** (user-specified duration)
3. **Transcribe segment** using `transcribing-audio` skill
4. **Check stop condition** (silence, end phrase, max time)
5. **Repeat or exit** based on condition

**See:** [references/recording-loop-workflow.md](references/recording-loop-workflow.md) for complete loop implementation

---

## Rationalization Prevention

**Common excuses for skipping device selection - ALL ARE INVALID:**

| Thought                                      | Reality                                                          |
| -------------------------------------------- | ---------------------------------------------------------------- |
| "Device [0] is always the built-in mic"      | Not true - device order changes with external devices connected |
| "I'll just use :0, it's the default"         | Default doesn't mean correct - user may want external mic        |
| "Listing devices takes extra time"           | Takes 1 second - wrong device wastes minutes re-recording        |
| "The config is optional"                     | Optional to CREATE, MANDATORY to CHECK if it exists              |
| "User didn't mention which device"           | That's WHY you must list devices and ask via AskUserQuestion     |
| "I can skip this for quick tests"            | Quick tests with wrong device are useless                        |
| "The workflow says 'if no config' - I can assume" | NEVER assume - check explicitly every time                       |

**Not even when:**
- User says "quick" or "urgent" (wrong device = wasted time, not saved time)
- You're recording multiple chunks (same wrong device = all chunks wrong)
- It's a test recording (tests with wrong device don't test anything)
- "Just this once" (exceptions become habits, habits become bugs)

**If you detect yourself thinking any of these, STOP. Go back to Phase -1.**

---

## Quality Settings

Choose bitrate based on content type:

| Content Type | Bitrate | Use Case                             | File Size (per min) |
| ------------ | ------- | ------------------------------------ | ------------------- |
| Voice/Speech | 128k    | Voice memos, meetings, dictation     | ~960 KB             |
| General      | 192k    | Music, podcasts, mixed content       | ~1.4 MB             |
| High Quality | 256k    | Professional audio, music production | ~1.9 MB             |

**Default recommendation**: 192k for general-purpose recording

---

## File Naming Convention

**Pattern**: `recording-YYYYMMDD-HHMMSS.m4a`

**Example**: `recording-20260115-143022.m4a`

**Location**: `.claude/.output/audio/`

**Full path example**: `/Users/john/.../chariot-development-platform/.claude/.output/audio/recording-20260115-143022.m4a`

---

## Critical Rules

### 🚨 Permission Requirements

**FFmpeg CANNOT record without microphone permission.** If recording fails:

1. Check System Settings → Privacy & Security → Microphone
2. Verify Terminal app has permission
3. Restart terminal after granting permission

**Error pattern**: "Error opening input device" = permission issue

### 🚨 Device Index Discovery (MANDATORY - NO EXCEPTIONS)

**NEVER hardcode device index.** You MUST either:
1. Check config file for saved `audio_device_index`, OR
2. List devices AND ask user via AskUserQuestion

**There is NO third option.** Using `:0` without checking config or asking user is a BLOCKING VIOLATION.

**To list devices:**

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

**Typical output:**

```
[AVFoundation indev @ ...] AVFoundation video devices:
[AVFoundation indev @ ...] [0] FaceTime HD Camera
[AVFoundation indev @ ...] AVFoundation audio devices:
[AVFoundation indev @ ...] [0] MacBook Pro Microphone
[AVFoundation indev @ ...] [1] External Microphone
```

**After listing devices, use AskUserQuestion:**
- Parse ffmpeg output to extract audio device names
- Present each device as an option
- Use selected index in recording command

**DO NOT assume device [0] is what user wants** - external mics, USB interfaces, and audio routing can change device order.

### 🚨 AVFoundation Format

**macOS-specific**: `-f avfoundation` is REQUIRED for macOS device access

**Format**: `-i ":N"` means no video (`:` before device index), audio device N

**Example**: `-i ":2"` = no video, use audio device index 2 (from device listing or config)

**Other platforms**: Linux uses ALSA, Windows uses DirectShow (not covered by this skill)

### 🚨 Time Limit Enforcement

**Always specify `-t` duration** unless user explicitly wants indefinite recording:

```bash
-t 30    # 30 seconds
-t 300   # 5 minutes (300 seconds)
-t 3600  # 1 hour
```

**Stop recording**: User presses `Ctrl+C` (stops FFmpeg gracefully)

### 🚨 Output Directory

**ALWAYS save to Claude output directory**, never to user's arbitrary paths without confirmation:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
OUTPUT_DIR="$ROOT/.claude/.output/audio"
mkdir -p "$OUTPUT_DIR"
```

---

## Integration

### Called By

- User direct invocation (via natural language)
- Other skills requiring audio input capture
- Workflow automation scripts

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

| Skill                | Phase      | Purpose                         |
| -------------------- | ---------- | ------------------------------- |
| `transcribing-audio` | Workflow 2 | Transcribe recorded audio files |

### Pairs With (conditional)

| Skill                | Trigger                 | Purpose                               |
| -------------------- | ----------------------- | ------------------------------------- |
| `transcribing-audio` | Recording loop workflow | Automatic transcription after capture |

---

## Recording Loop Example

**User request**: "Record 30-second clips and transcribe each one until I say 'stop recording'"

**Implementation:**

```markdown
1. Initialize loop:
   - Set duration: 30 seconds
   - Set stop phrase: "stop recording"
   - Set max iterations: 100 (safety limit)

2. Loop:
   a. Record 30-second clip → recording-{timestamp}.m4a
   b. Transcribe clip using transcribing-audio skill
   c. Check if transcription contains "stop recording"
   d. If yes: exit loop
   e. If no: continue to next iteration

3. Report:
   - Total clips recorded: X
   - Total duration: Y minutes
   - Transcripts saved to: .claude/.output/audio/
```

**See:** [references/recording-loop-workflow.md](references/recording-loop-workflow.md) for full implementation

---

## Troubleshooting

### Recording Fails Immediately

**Symptom**: `Error opening input device`

**Solution**:

1. Verify microphone permission (System Settings → Privacy & Security → Microphone)
2. Restart terminal after granting permission
3. List devices to confirm device index: `ffmpeg -f avfoundation -list_devices true -i ""`

### No Audio in Recording

**Symptom**: File created but silent

**Solution**:

1. Check device index - may be wrong device
2. Test with different device: `-i ":1"` or `:2`
3. Verify microphone works in other apps (Voice Memos, etc.)

### File Size Too Large

**Symptom**: Recording creates huge files

**Solution**:

1. Reduce bitrate: `-b:a 128k` instead of 256k
2. Use AAC codec: `-c:a aac` (already default)
3. Consider shorter time segments for long recordings

**See:** [references/troubleshooting.md](references/troubleshooting.md) for complete guide

---

## Command Reference

### Basic Recording Command

**IMPORTANT**: These examples use `:N` as placeholder. Replace with actual device index.

```bash
# Get device index from config or user selection FIRST
DEVICE_INDEX="0"  # Example - get this from config or AskUserQuestion

ffmpeg -f avfoundation -i ":$DEVICE_INDEX" \
  -t 30 \
  -c:a aac \
  -b:a 192k \
  output.m4a
```

**Breakdown:**

- `-f avfoundation` - Use macOS AVFoundation framework
- `-i ":$DEVICE_INDEX"` - Input: no video, audio device from variable (NOT hardcoded)
- `-t 30` - Duration: 30 seconds
- `-c:a aac` - Audio codec: AAC (M4A format)
- `-b:a 192k` - Audio bitrate: 192 kbps
- `output.m4a` - Output filename

### Complete Workflow with Device Selection

```bash
# Step 1: Check for config
CONFIG_FILE=".claude/skill-library/tools/recording-audio/.local/config.json"
if [ -f "$CONFIG_FILE" ]; then
  DEVICE_INDEX=$(jq -r '.audio_device_index' "$CONFIG_FILE")
  echo "Using device $DEVICE_INDEX from config"
else
  # Step 2: List devices and ask user (use AskUserQuestion)
  ffmpeg -f avfoundation -list_devices true -i ""
  # Then use AskUserQuestion to get user selection
  DEVICE_INDEX="0"  # Replace with user's selection
fi

# Step 3: Record with selected device
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="$ROOT/.claude/.output/audio"
mkdir -p "$OUTPUT_DIR"

ffmpeg -f avfoundation -i ":$DEVICE_INDEX" \
  -t 30 \
  -c:a aac \
  -b:a 192k \
  "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"
```

**See:** [references/command-patterns.md](references/command-patterns.md) for advanced usage

---

## Related Skills

- `transcribing-audio` - Transcribe recorded audio to text (uses Whisper API)
- `using-skills` - Navigator for discovering audio-related skills
- `developing-with-tdd` - Testing audio recording workflows
- `verifying-before-completion` - Verify recordings succeeded before claiming complete

---

## Research Sources

This skill is based on comprehensive research documented in:

- `.claude/.output/research/2026-01-15-120747-macos-cli-audio-recording/SYNTHESIS.md`

Key findings:

- FFmpeg is the gold standard for CLI audio recording on macOS
- Native macOS tools (afconvert, afplay) do NOT support recording
- AVFoundation is the proper framework for macOS device access
- M4A/AAC provides best balance of quality and file size
- Microphone permissions are system-enforced (cannot be bypassed)

---

## Changelog

See `.history/CHANGELOG` for version history.
