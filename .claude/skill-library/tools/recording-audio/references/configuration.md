# Configuration Management

**Complete guide to user-specific configuration for the recording-audio skill.**

---

## Overview

Configuration allows you to:
- **Reduce context usage** - Skip device discovery on every session
- **Persist preferences** - Audio device, quality, transcription model
- **Speed up workflows** - Use defaults instead of specifying parameters
- **Customize behavior** - Set recording duration, output directory

**Configuration file**: `.claude/skill-library/tools/recording-audio/.local/config.json`

**Why `.local/`**: Gitignored, user-specific, won't affect other developers

---

## Initial Configuration

### Step 1: Discover Your Audio Device

**First time only** - list devices to find your microphone index:

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

**Example output:**

```
[AVFoundation indev @ 0x...] AVFoundation audio devices:
[AVFoundation indev @ 0x...] [0] MacBook Pro Microphone
[AVFoundation indev @ 0x...] [1] External USB Microphone
[AVFoundation indev @ 0x...] [2] AirPods Pro
```

**Note your preferred device index** (e.g., `0` for built-in, `1` for external)

### Step 2: Create Configuration File

```bash
# Navigate to repo root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT"

# Create .local directory
mkdir -p .claude/skill-library/tools/recording-audio/.local

# Create config with your preferences
cat > .claude/skill-library/tools/recording-audio/.local/config.json <<'EOF'
{
  "audio_device_index": 0,
  "quality_preset": "general",
  "transcription_model": "base.en",
  "default_duration": 30,
  "output_directory": ".claude/.output/audio"
}
EOF

echo "Configuration created successfully"
```

### Step 3: Verify Configuration

```bash
# Check file exists
ls -lh .claude/skill-library/tools/recording-audio/.local/config.json

# Validate JSON syntax
cat .claude/skill-library/tools/recording-audio/.local/config.json | jq '.'

# Expected output: Pretty-printed JSON with your settings
```

---

## Configuration Fields

### audio_device_index

**Purpose**: Which microphone to use for recording

**Type**: Integer

**Default**: `0` (built-in microphone)

**How to find**: Run `ffmpeg -f avfoundation -list_devices true -i ""` and note the device number

**Examples:**

```json
"audio_device_index": 0   // Built-in MacBook microphone
"audio_device_index": 1   // External USB microphone
"audio_device_index": 2   // Bluetooth headset
```

**When to change:**
- Using external USB microphone instead of built-in
- Using Bluetooth headset for recording
- Built-in mic is malfunctioning

---

### quality_preset

**Purpose**: Audio recording quality (bitrate)

**Type**: String

**Default**: `"general"` (192k bitrate)

**Options:**

| Preset     | Bitrate | File Size (1 min) | Use Case                     |
| ---------- | ------- | ----------------- | ---------------------------- |
| `"voice"`  | 128k    | ~960 KB           | Voice memos, dictation       |
| `"general"`| 192k    | ~1.4 MB           | Meetings, podcasts           |
| `"high"`   | 256k    | ~1.9 MB           | Music, professional audio    |

**Examples:**

```json
"quality_preset": "voice"    // For voice memos (smallest files)
"quality_preset": "general"  // Balanced quality/size (recommended)
"quality_preset": "high"     // Best quality (largest files)
```

**When to change:**
- Disk space limited → use `"voice"`
- Recording music or high-fidelity audio → use `"high"`
- Need faster uploads/transfers → use `"voice"`

---

### transcription_model

**Purpose**: Which Whisper model to use for transcription (when invoking `transcribing-audio` skill)

**Type**: String

**Default**: `"base.en"` (recommended)

**Options:**

| Model        | Size  | Speed       | Accuracy | Languages    |
| ------------ | ----- | ----------- | -------- | ------------ |
| `"tiny.en"`  | ~1GB  | ~32x faster | Low      | English only |
| `"base.en"`  | ~1GB  | ~16x faster | Good     | English only |
| `"small.en"` | ~2GB  | ~6x faster  | Better   | English only |
| `"medium.en"`| ~5GB  | ~2x faster  | High     | English only |
| `"large"`    | ~10GB | ~1x realtime| Best     | Multilingual |

**Examples:**

```json
"transcription_model": "base.en"    // Recommended default
"transcription_model": "medium.en"  // Better accuracy, slower
"transcription_model": "large"      // Best accuracy, multilingual
```

**When to change:**
- Need faster transcription → use `"tiny.en"`
- Need better accuracy → use `"medium.en"` or `"large"`
- Recording non-English audio → use `"large"` (multilingual)

**Note**: Aligns with `transcribing-audio` skill default (`base.en`)

---

### default_duration

**Purpose**: Default recording duration in seconds (when not specified)

**Type**: Integer

**Default**: `30` (30 seconds)

**Examples:**

```json
"default_duration": 30     // 30 seconds (quick voice memos)
"default_duration": 300    // 5 minutes (meeting notes)
"default_duration": 3600   // 1 hour (full meeting)
```

**When to change:**
- Recording longer meetings → increase to 1800 or 3600
- Recording short notes → decrease to 15 or 30
- Using recording loop → keep low (30-60s per segment)

**Note**: Can always override when invoking skill

---

### output_directory

**Purpose**: Where to save recorded audio files

**Type**: String (relative path from repo root)

**Default**: `".claude/.output/audio"`

**Examples:**

```json
"output_directory": ".claude/.output/audio"           // Default (gitignored)
"output_directory": ".claude/.output/recordings"      // Custom subdirectory
"output_directory": "/Users/john/Documents/audio"     // Absolute path (not recommended)
```

**When to change:**
- Custom organization system
- Syncing to cloud storage
- Separating by project

**Note**: Relative paths recommended for portability

---

## Using Configuration

### Automatic Configuration Loading

When configuration file exists, workflows automatically:

1. **Skip device listing** - Uses `audio_device_index` from config
2. **Apply quality preset** - No need to specify `-b:a` flag
3. **Use default duration** - If user doesn't specify time
4. **Use configured transcription model** - When calling `transcribing-audio`

**With configuration:**

```bash
# Simple invocation (uses config defaults)
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 192k recording.m4a
```

**Without configuration:**

```bash
# Must specify everything each time
ffmpeg -f avfoundation -list_devices true -i ""  # List devices first
# Then use discovered device
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 192k recording.m4a
```

### Manual Override

Configuration provides defaults but can always be overridden:

```bash
# Use different device (override audio_device_index)
ffmpeg -f avfoundation -i ":1" -t 30 -c:a aac -b:a 192k recording.m4a

# Use different quality (override quality_preset)
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 256k recording.m4a

# Use different duration (override default_duration)
ffmpeg -f avfoundation -i ":0" -t 120 -c:a aac -b:a 192k recording.m4a
```

---

## Configuration Workflow Integration

### Single Recording with Config

```bash
# Read configuration
CONFIG_FILE=".claude/skill-library/tools/recording-audio/.local/config.json"

if [ -f "$CONFIG_FILE" ]; then
  # Load settings from config
  DEVICE=$(jq -r '.audio_device_index' "$CONFIG_FILE")
  QUALITY=$(jq -r '.quality_preset' "$CONFIG_FILE")
  DURATION=$(jq -r '.default_duration' "$CONFIG_FILE")
  OUTPUT_DIR=$(jq -r '.output_directory' "$CONFIG_FILE")

  # Map quality preset to bitrate
  case "$QUALITY" in
    voice)   BITRATE="128k" ;;
    general) BITRATE="192k" ;;
    high)    BITRATE="256k" ;;
    *)       BITRATE="192k" ;;
  esac

  echo "Using config: device=$DEVICE, quality=$QUALITY ($BITRATE), duration=${DURATION}s"
else
  # Fallback to defaults and device discovery
  echo "No config found, using defaults and listing devices"
  ffmpeg -f avfoundation -list_devices true -i ""
  DEVICE=0
  BITRATE="192k"
  DURATION=30
  OUTPUT_DIR=".claude/.output/audio"
fi

# Record with configured settings
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$OUTPUT_DIR"

ffmpeg -f avfoundation -i ":$DEVICE" \
  -t $DURATION \
  -c:a aac \
  -b:a $BITRATE \
  "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"

echo "Recording saved: $OUTPUT_DIR/recording-$TIMESTAMP.m4a"
```

### Recording Loop with Config

```bash
# Read transcription model from config
CONFIG_FILE=".claude/skill-library/tools/recording-audio/.local/config.json"
TRANSCRIPTION_MODEL=$(jq -r '.transcription_model // "base.en"' "$CONFIG_FILE")

# Loop with configured model
for i in {1..10}; do
  # Record segment
  ffmpeg -f avfoundation -i ":0" -t 30 recording-$i.m4a

  # Transcribe with configured model (via transcribing-audio skill)
  docker run --rm \
    -v "$(pwd):/audio" \
    ghcr.io/praetorian-inc/whisper-transcribe:latest \
    whisper /audio/recording-$i.m4a \
      --model $TRANSCRIPTION_MODEL \
      --output_format txt

  # Check stop condition
  # [stop condition logic here]
done
```

---

## Context Window Savings

**Without configuration** (per session):

```
- Device discovery: ~50-100 tokens
- Quality selection prompt: ~30-50 tokens
- Duration selection prompt: ~20-30 tokens
- Total per session: ~100-180 tokens
```

**With configuration** (per session):

```
- Config read: ~10-20 tokens
- Total per session: ~10-20 tokens
- Savings: ~80-160 tokens per session
```

**For 10 recording sessions**: Saves ~800-1600 tokens total

**For frequent users**: Significant reduction in context usage

---

## Configuration Management

### Updating Configuration

```bash
# Edit config file
nano .claude/skill-library/tools/recording-audio/.local/config.json

# Or use jq to update specific field
jq '.audio_device_index = 1' config.json > config.json.tmp && mv config.json.tmp config.json
```

### Viewing Current Configuration

```bash
cat .claude/skill-library/tools/recording-audio/.local/config.json | jq '.'
```

### Resetting to Defaults

```bash
# Backup current config
cp .claude/skill-library/tools/recording-audio/.local/config.json \
   .claude/skill-library/tools/recording-audio/.local/config.json.backup

# Reset to defaults
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

### Deleting Configuration

```bash
# Remove config (skill will use defaults and prompt for device)
rm .claude/skill-library/tools/recording-audio/.local/config.json

# Or rename to disable temporarily
mv .claude/skill-library/tools/recording-audio/.local/config.json \
   .claude/skill-library/tools/recording-audio/.local/config.json.disabled
```

---

## Advanced Configuration

### Per-Project Configuration

For different projects with different audio requirements:

```bash
# Project A: Voice quality, built-in mic
{
  "audio_device_index": 0,
  "quality_preset": "voice",
  "transcription_model": "base.en",
  "default_duration": 30,
  "output_directory": ".claude/.output/audio/project-a"
}

# Project B: High quality, external mic, longer meetings
{
  "audio_device_index": 1,
  "quality_preset": "high",
  "transcription_model": "medium.en",
  "default_duration": 1800,
  "output_directory": ".claude/.output/audio/project-b"
}
```

**Workflow**: Swap config files based on project context

### Shared Team Defaults

For teams with standard equipment:

```bash
# Document team defaults in README
# Each developer customizes audio_device_index based on their hardware
{
  "audio_device_index": 0,  // <-- CUSTOMIZE THIS for your setup
  "quality_preset": "general",
  "transcription_model": "base.en",
  "default_duration": 300,
  "output_directory": ".claude/.output/audio"
}
```

### Multiple Device Profiles

Use separate config files for different scenarios:

```bash
# .local/config-builtin.json
{ "audio_device_index": 0, "quality_preset": "voice" }

# .local/config-external.json
{ "audio_device_index": 1, "quality_preset": "high" }

# Switch configs
cp .local/config-external.json .local/config.json
```

---

## Troubleshooting Configuration

### Config File Not Found

**Symptom**: Skill always lists devices despite config existing

**Solution**:

```bash
# Verify file exists
ls -la .claude/skill-library/tools/recording-audio/.local/config.json

# Check path is correct (must be relative to repo root)
pwd  # Should be at repo root
```

### Invalid JSON Syntax

**Symptom**: Config not loading, fallback to defaults

**Solution**:

```bash
# Validate JSON
jq '.' .claude/skill-library/tools/recording-audio/.local/config.json

# If error, fix syntax or regenerate file
```

### Wrong Audio Device

**Symptom**: Recording from wrong microphone

**Solution**:

```bash
# Re-list devices
ffmpeg -f avfoundation -list_devices true -i ""

# Update config with correct index
jq '.audio_device_index = 1' config.json > config.json.tmp && mv config.json.tmp config.json
```

---

## Related

- **transcribing-audio skill**: Uses same `transcription_model` field for consistency
- **Single Recording Workflow**: Uses `audio_device_index` and `quality_preset`
- **Recording Loop Workflow**: Uses `transcription_model` for batch transcription
- **Troubleshooting**: Config issues documented in troubleshooting.md

---

## Research Sources

Based on:
- User configuration requirements
- `.local/` gitignore pattern in repository
- `transcribing-audio` skill model defaults (base.en)
- Context window optimization needs
