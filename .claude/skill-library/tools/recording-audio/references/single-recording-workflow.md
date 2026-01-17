# Single Recording Workflow

**Complete implementation guide for single audio recording sessions.**

---

## Overview

Single recording workflow captures one audio segment with a specified duration and saves it to the Claude output directory. This is the simplest use case and serves as the foundation for more complex workflows.

---

## Prerequisites

Before recording, verify all prerequisites are met:

### 1. FFmpeg Installation

```bash
# Check if FFmpeg is installed
which ffmpeg

# Expected output: /opt/homebrew/bin/ffmpeg (or similar)
# If not installed:
brew install ffmpeg
```

**Installation time**: ~2 minutes (100MB download)

### 2. Microphone Permissions

**Critical**: macOS enforces microphone permissions at the system level.

**Steps to verify/enable:**

1. Open System Settings (macOS 13+) or System Preferences (macOS 12 and earlier)
2. Navigate to Privacy & Security → Microphone
3. Find your terminal app (Terminal, iTerm2, Warp, etc.)
4. Enable the checkbox
5. **Restart terminal** (permissions don't apply until restart)

**Visual indicator**: When recording, an orange dot appears in the menu bar (macOS 14+)

### 3. Output Directory

```bash
# Navigate to repository root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"

# Create output directory
mkdir -p "$ROOT/.claude/.output/audio"

# Verify creation
ls -ld "$ROOT/.claude/.output/audio"
```

---

## Workflow Steps

### Step 1: List Available Devices

**Always start by listing devices** - device indices can change based on connected hardware.

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

**Example output:**

```
[AVFoundation indev @ 0x...] AVFoundation video devices:
[AVFoundation indev @ 0x...] [0] FaceTime HD Camera
[AVFoundation indev @ 0x...] AVFoundation audio devices:
[AVFoundation indev @ 0x...] [0] MacBook Pro Microphone
[AVFoundation indev @ 0x...] [1] External Microphone
[AVFoundation indev @ 0x...] [2] AirPods Pro
```

**Interpretation:**

- Audio device `[0]` = Built-in microphone (typical default)
- Audio device `[1]` = External USB microphone
- Audio device `[2]` = Bluetooth headset

**Device selection in command**: Use `:N` where N is the device index
- `:0` = device [0] (built-in mic)
- `:1` = device [1] (external mic)
- `:2` = device [2] (AirPods)

---

### Step 2: Determine Quality Settings

Choose bitrate based on content type:

| Content         | Bitrate | Command Flag  | File Size (30 sec) | Use Case                    |
| --------------- | ------- | ------------- | ------------------ | --------------------------- |
| Voice/Speech    | 128k    | `-b:a 128k`   | ~480 KB            | Voice memos, dictation      |
| General Purpose | 192k    | `-b:a 192k`   | ~720 KB            | Meetings, podcasts          |
| High Quality    | 256k    | `-b:a 256k`   | ~960 KB            | Music, professional audio   |

**Default recommendation**: 192k (general purpose)

**Quality vs. Size trade-off**: 128k is sufficient for voice clarity, 256k offers better music fidelity but larger files

---

### Step 3: Generate Timestamp Filename

Use consistent naming convention for organization:

```bash
# Generate timestamp in format YYYYMMDD-HHMMSS
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Construct filename
FILENAME="recording-$TIMESTAMP.m4a"

# Example output: recording-20260115-143022.m4a
echo $FILENAME
```

**Pattern benefits:**

- Chronological sorting
- No filename conflicts
- Clear recording date/time
- Searchable by date pattern

---

### Step 4: Execute Recording

**Basic command structure:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="$ROOT/.claude/.output/audio"

ffmpeg -f avfoundation -i ":0" \
  -t 30 \
  -c:a aac \
  -b:a 192k \
  "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"
```

**Parameter breakdown:**

- `-f avfoundation` - Input format: macOS AVFoundation framework
- `-i ":0"` - Input device: `:` = no video, `0` = audio device 0
- `-t 30` - Duration: 30 seconds (terminates automatically)
- `-c:a aac` - Audio codec: AAC (used in M4A container)
- `-b:a 192k` - Audio bitrate: 192 kbps
- `"$OUTPUT_DIR/..."` - Output path with timestamp

**During recording:**

- FFmpeg displays progress: `size= 123kB time=00:00:05.12 bitrate=196kbits/s`
- Press `q` or `Ctrl+C` to stop early (graceful termination)
- Orange dot in menu bar indicates active microphone

---

### Step 5: Verify Recording

After recording completes, verify the file:

```bash
# Check file exists
ls -lh "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"

# Expected output: -rw-r--r-- 1 user staff 720K Jan 15 14:30 recording-20260115-143022.m4a

# Check file duration and format
ffmpeg -i "$OUTPUT_DIR/recording-$TIMESTAMP.m4a" 2>&1 | grep Duration

# Expected output: Duration: 00:00:30.04, start: 0.000000, bitrate: 192 kb/s
```

**Validation checklist:**

- ✅ File exists in `.claude/.output/audio/`
- ✅ File size reasonable (~24KB per second for 192k bitrate)
- ✅ Duration matches requested time
- ✅ No error messages in FFmpeg output

---

### Step 6: Provide User Feedback

Report the recording details:

```bash
echo "Recording complete:"
echo "  File: $OUTPUT_DIR/recording-$TIMESTAMP.m4a"
echo "  Duration: 30 seconds"
echo "  Quality: 192k (general purpose)"
echo "  Size: $(du -h "$OUTPUT_DIR/recording-$TIMESTAMP.m4a" | cut -f1)"
```

**User-friendly output:**

```
Recording complete:
  File: /Users/john/.../chariot-development-platform/.claude/.output/audio/recording-20260115-143022.m4a
  Duration: 30 seconds
  Quality: 192k (general purpose)
  Size: 720K
```

---

## Complete Example

**User request**: "Record 2 minutes of audio at high quality"

**Implementation:**

```bash
# Step 0: Navigate to repo root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT"

# Step 1: List devices (informational, skip if user knows device)
ffmpeg -f avfoundation -list_devices true -i ""

# Step 2: Set parameters
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="$ROOT/.claude/.output/audio"
DURATION=120  # 2 minutes in seconds
BITRATE="256k"  # High quality

# Step 3: Create output directory
mkdir -p "$OUTPUT_DIR"

# Step 4: Record
echo "Recording for $DURATION seconds at $BITRATE quality..."
ffmpeg -f avfoundation -i ":0" \
  -t $DURATION \
  -c:a aac \
  -b:a $BITRATE \
  "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"

# Step 5: Verify
ls -lh "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"
ffmpeg -i "$OUTPUT_DIR/recording-$TIMESTAMP.m4a" 2>&1 | grep Duration

# Step 6: Report
echo ""
echo "Recording complete:"
echo "  File: $OUTPUT_DIR/recording-$TIMESTAMP.m4a"
echo "  Duration: $(($DURATION / 60)) minutes"
echo "  Quality: $BITRATE (high quality)"
echo "  Size: $(du -h "$OUTPUT_DIR/recording-$TIMESTAMP.m4a" | cut -f1)"
```

---

## Error Handling

### Error: "Error opening input device"

**Cause**: Missing microphone permission

**Solution**:

1. System Settings → Privacy & Security → Microphone
2. Enable terminal app
3. **Restart terminal** (critical step)
4. Retry recording

### Error: "Device not found"

**Cause**: Invalid device index

**Solution**:

1. Re-list devices: `ffmpeg -f avfoundation -list_devices true -i ""`
2. Verify device index (e.g., `:0`, `:1`, `:2`)
3. Update command with correct index

### Error: "Cannot find output format"

**Cause**: Typo in output filename extension

**Solution**:

- Use `.m4a` extension (not `.mp4` or `.aac`)
- Verify: `echo "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"`

### File is Silent (No Audio)

**Cause**: Wrong device selected or microphone muted

**Solution**:

1. Test microphone in Voice Memos app (native macOS app)
2. Check device index - try `:1` or `:2` if `:0` is silent
3. Verify microphone not muted in System Settings → Sound

---

## Integration Points

### With Transcription

After recording, transcribe using the `transcribing-audio` skill:

```bash
# Record first
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 192k "$OUTPUT_DIR/recording-$TIMESTAMP.m4a"

# Then transcribe
skill: "transcribing-audio"
# Provide file path: $OUTPUT_DIR/recording-$TIMESTAMP.m4a
```

### With File Management

Organize recordings by date:

```bash
# Create date-based subdirectory
DATE=$(date +%Y-%m-%d)
mkdir -p "$OUTPUT_DIR/$DATE"

# Record with date organization
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 192k \
  "$OUTPUT_DIR/$DATE/recording-$TIMESTAMP.m4a"
```

---

## Performance Considerations

### CPU Usage

Recording is lightweight:

- Voice quality (128k): ~1-2% CPU
- General quality (192k): ~2-3% CPU
- High quality (256k): ~3-5% CPU

### Disk Space

Plan storage for long recordings:

| Duration | 128k   | 192k   | 256k   |
| -------- | ------ | ------ | ------ |
| 1 minute | 960 KB | 1.4 MB | 1.9 MB |
| 10 min   | 9.6 MB | 14 MB  | 19 MB  |
| 1 hour   | 58 MB  | 86 MB  | 115 MB |

### Battery Impact

For laptop users:

- Minimal impact for voice recording (<5% battery drain per hour)
- Moderate impact for high-quality recording (~10-15% per hour)
- Background recording while CPU idle: ~3% per hour at 192k

---

## Related Workflows

- **Recording Loop Workflow**: Multiple recordings with transcription (see `recording-loop-workflow.md`)
- **Batch Recording**: Record multiple clips in sequence (extend this workflow with loops)
- **Scheduled Recording**: Use cron jobs for time-based recording automation

---

## Research Sources

Based on:

- `.claude/.output/research/2026-01-15-120747-macos-cli-audio-recording/SYNTHESIS.md` (FFmpeg AVFoundation integration)
- FFmpeg documentation - AVFoundation input device
- macOS Security Model - Microphone permissions and TCC (Transparency, Consent, and Control)
