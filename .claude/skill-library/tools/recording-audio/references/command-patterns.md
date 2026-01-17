# FFmpeg Command Patterns for Audio Recording

**Advanced command patterns, flag combinations, and optimization techniques for FFmpeg audio recording on macOS.**

---

## Core Command Structure

### Minimal Recording Command

```bash
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a
```

**Defaults:**

- Codec: AAC (automatic for .m4a)
- Bitrate: ~128k (FFmpeg default)
- Sample rate: 44.1 kHz
- Channels: Mono (from single microphone)

### Explicit Parameters (Recommended)

```bash
ffmpeg -f avfoundation -i ":0" \
  -t 30 \
  -c:a aac \
  -b:a 192k \
  -ar 44100 \
  -ac 1 \
  output.m4a
```

**Parameters:**

- `-c:a aac` - Audio codec (explicit)
- `-b:a 192k` - Bitrate: 192 kbps
- `-ar 44100` - Sample rate: 44.1 kHz
- `-ac 1` - Audio channels: mono

**Why explicit parameters?**

- Predictable output quality
- Consistent behavior across FFmpeg versions
- Clear documentation in scripts
- Easier troubleshooting

---

## Device Selection Patterns

### Audio-Only Recording

```bash
# Format: -i "VIDEO_DEVICE:AUDIO_DEVICE"
# ":0" means no video, audio device 0

ffmpeg -f avfoundation -i ":0" output.m4a    # Audio device 0
ffmpeg -f avfoundation -i ":1" output.m4a    # Audio device 1
ffmpeg -f avfoundation -i ":2" output.m4a    # Audio device 2
```

### Video + Audio Recording

```bash
# "0:0" means video device 0, audio device 0
ffmpeg -f avfoundation -i "0:0" output.mov

# "1:2" means video device 1, audio device 2 (external mic with camera)
ffmpeg -f avfoundation -i "1:2" output.mov
```

### Multiple Device Listing

```bash
# List all AVFoundation devices
ffmpeg -f avfoundation -list_devices true -i ""

# Filter for audio only
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -A 10 "audio devices"

# Get device count
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -c "^\[AVFoundation"
```

---

## Quality Presets

### Voice Quality (Dictation, Voice Memos)

```bash
ffmpeg -f avfoundation -i ":0" \
  -t 300 \
  -c:a aac \
  -b:a 128k \
  -ar 44100 \
  -ac 1 \
  -profile:a aac_he \
  voice-memo.m4a
```

**Optimizations:**

- 128k bitrate (sufficient for speech)
- HE-AAC profile (High-Efficiency AAC, better at low bitrates)
- Mono channel (single speaker)
- 44.1 kHz sample rate (standard)

**File size**: ~960 KB per minute

### Music Quality (Instruments, Singing)

```bash
ffmpeg -f avfoundation -i ":0" \
  -t 300 \
  -c:a aac \
  -b:a 256k \
  -ar 48000 \
  -ac 2 \
  -profile:a aac_low \
  music-recording.m4a
```

**Optimizations:**

- 256k bitrate (captures musical detail)
- LC-AAC profile (Low Complexity, better quality)
- Stereo channels (if using stereo mic)
- 48 kHz sample rate (professional standard)

**File size**: ~1.9 MB per minute

### Podcast/Meeting Quality (Balance)

```bash
ffmpeg -f avfoundation -i ":0" \
  -t 3600 \
  -c:a aac \
  -b:a 192k \
  -ar 44100 \
  -ac 1 \
  podcast.m4a
```

**Optimizations:**

- 192k bitrate (good speech clarity)
- Mono channel (single microphone)
- 1-hour duration (typical podcast length)

**File size**: ~86 MB for 1 hour

---

## Duration Control Patterns

### Fixed Duration

```bash
# Stop after 30 seconds
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a

# Stop after 5 minutes (300 seconds)
ffmpeg -f avfoundation -i ":0" -t 300 output.m4a

# Stop after 1 hour (3600 seconds)
ffmpeg -f avfoundation -i ":0" -t 3600 output.m4a
```

### Indefinite Recording (Manual Stop)

```bash
# Record until user presses 'q' or Ctrl+C
ffmpeg -f avfoundation -i ":0" output.m4a

# Graceful shutdown: press 'q' (recommended)
# Force shutdown: Ctrl+C (may corrupt last frame)
```

### Duration with Buffer

```bash
# Record slightly longer than specified to account for startup delay
DURATION=30
BUFFER=2
ffmpeg -f avfoundation -i ":0" -t $((DURATION + BUFFER)) output.m4a

# Trim to exact duration in post-processing
ffmpeg -i output.m4a -t $DURATION -c copy output-trimmed.m4a
```

---

## Output Path Patterns

### With Timestamp

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ffmpeg -f avfoundation -i ":0" -t 30 "recording-$TIMESTAMP.m4a"

# Example: recording-20260115-143022.m4a
```

### With Session Directory

```bash
SESSION_DIR=".claude/.output/audio/session-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SESSION_DIR"
ffmpeg -f avfoundation -i ":0" -t 30 "$SESSION_DIR/recording-001.m4a"
```

### With Metadata

```bash
ffmpeg -f avfoundation -i ":0" -t 30 \
  -metadata title="Voice Memo" \
  -metadata artist="John Doe" \
  -metadata date="2026-01-15" \
  memo.m4a
```

---

## Progress Display Patterns

### Minimal Progress (Default)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a

# Shows: size, time, bitrate, speed
# Example: size= 123kB time=00:00:05.12 bitrate=196kbits/s speed=1.01x
```

### Quiet Mode (No Progress)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 -loglevel quiet output.m4a

# No output, useful for scripts
```

### Verbose Mode (Debug)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 -loglevel verbose output.m4a

# Shows detailed encoding info, device parameters, codec details
```

### Progress with Stats

```bash
ffmpeg -f avfoundation -i ":0" -t 30 -stats output.m4a 2>&1 | grep -E "(time=|bitrate=)"

# Filters to show only time and bitrate
# Example output:
# time=00:00:05.12 bitrate=196kbits/s
# time=00:00:10.24 bitrate=195kbits/s
```

---

## Error Suppression Patterns

### Suppress Banner

```bash
ffmpeg -hide_banner -f avfoundation -i ":0" -t 30 output.m4a

# Hides FFmpeg version info and build configuration
```

### Suppress Warnings

```bash
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a 2>&1 | grep -v "deprecated"

# Filters out deprecation warnings
```

### Capture Only Errors

```bash
ffmpeg -f avfoundation -i ":0" -t 30 -loglevel error output.m4a

# Shows only errors, not progress or warnings
```

---

## Overwrite Handling

### Prompt Before Overwrite (Default)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a

# If output.m4a exists, FFmpeg asks: "File 'output.m4a' already exists. Overwrite? [y/N]"
```

### Auto-Overwrite

```bash
ffmpeg -y -f avfoundation -i ":0" -t 30 output.m4a

# -y flag: always overwrite without prompting
```

### Never Overwrite

```bash
ffmpeg -n -f avfoundation -i ":0" -t 30 output.m4a

# -n flag: fail if file exists, never overwrite
```

### Conditional Overwrite (Script Pattern)

```bash
OUTPUT="recording.m4a"

if [ -f "$OUTPUT" ]; then
  echo "File exists: $OUTPUT"
  read -p "Overwrite? [y/N]: " REPLY
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
  fi
fi

ffmpeg -y -f avfoundation -i ":0" -t 30 "$OUTPUT"
```

---

## Piping and Redirection

### Pipe Audio to Another Process

```bash
# Record and pipe raw audio to another tool
ffmpeg -f avfoundation -i ":0" -t 30 -f wav - | \
  some-audio-processor

# "-" means stdout
```

### Split Audio Output

```bash
# Record to file AND pipe to processor
ffmpeg -f avfoundation -i ":0" -t 30 \
  output.m4a \
  -f wav - | some-processor
```

### Redirect FFmpeg Logs

```bash
# Separate progress from errors
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a 2>recording.log

# Check log
cat recording.log | grep -i error
```

---

## Advanced Codec Options

### Variable Bitrate (VBR)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 \
  -c:a aac \
  -q:a 2 \
  output.m4a

# -q:a 2 = VBR quality 2 (0-9, lower is better)
# Adapts bitrate based on audio complexity
```

**VBR vs CBR:**

| Mode | Bitrate        | Quality           | File Size | Use Case        |
| ---- | -------------- | ----------------- | --------- | --------------- |
| CBR  | Fixed (192k)   | Consistent        | Larger    | Streaming       |
| VBR  | Variable (avg) | Better efficiency | Smaller   | Storage/archive |

### AAC Profile Selection

```bash
# HE-AAC (High Efficiency) - best for low bitrates
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -profile:a aac_he -b:a 64k output.m4a

# LC-AAC (Low Complexity) - best for high bitrates (default)
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -profile:a aac_low -b:a 256k output.m4a

# Main AAC - balance between HE and LC
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -profile:a aac_main -b:a 192k output.m4a
```

### Sample Rate Conversion

```bash
# Upsample to 48 kHz (professional standard)
ffmpeg -f avfoundation -i ":0" -t 30 -ar 48000 output.m4a

# Downsample to 22.05 kHz (low quality, small file)
ffmpeg -f avfoundation -i ":0" -t 30 -ar 22050 output.m4a

# Standard 44.1 kHz (CD quality)
ffmpeg -f avfoundation -i ":0" -t 30 -ar 44100 output.m4a
```

---

## Multi-Channel Recording

### Stereo from Single Mic (Duplicate)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 -ac 2 output.m4a

# -ac 2: force stereo output (mono input duplicated to both channels)
```

### Stereo from Stereo Mic

```bash
# Assuming device 1 is a stereo microphone
ffmpeg -f avfoundation -i ":1" -t 30 -ac 2 output.m4a

# Captures true left/right channels
```

### Mono from Stereo Source

```bash
ffmpeg -f avfoundation -i ":1" -t 30 -ac 1 output.m4a

# Downmixes stereo to mono (averages left+right)
```

---

## Conditional Recording Patterns

### Record Only If Mic Active

```bash
# Check if device is accessible before recording
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -q "\[0\]" && \
  ffmpeg -f avfoundation -i ":0" -t 30 output.m4a || \
  echo "Device not found"
```

### Record Until File Size Limit

```bash
# Stop when file reaches 10MB (for loop-based recording)
while [ $(stat -f%z output.m4a 2>/dev/null || echo 0) -lt 10485760 ]; do
  ffmpeg -f avfoundation -i ":0" -t 10 -c copy output.m4a
done
```

### Record Until Disk Space Low

```bash
# Check available space before recording
AVAILABLE=$(df -k . | awk 'NR==2 {print $4}')
REQUIRED=$((100 * 1024))  # 100MB in KB

if [ $AVAILABLE -gt $REQUIRED ]; then
  ffmpeg -f avfoundation -i ":0" -t 300 output.m4a
else
  echo "Insufficient disk space: ${AVAILABLE}KB available, ${REQUIRED}KB required"
fi
```

---

## Performance Optimization

### Low-Latency Recording

```bash
ffmpeg -f avfoundation -i ":0" \
  -t 30 \
  -fflags +flush_packets \
  -flush_packets 1 \
  output.m4a

# Reduces buffering delay
```

### Low CPU Usage

```bash
ffmpeg -f avfoundation -i ":0" \
  -t 30 \
  -c:a aac \
  -b:a 128k \
  -compression_level 0 \
  output.m4a

# Faster encoding, slightly larger file
```

### Fast Start (Streaming-Optimized)

```bash
ffmpeg -f avfoundation -i ":0" -t 30 \
  -c:a aac \
  -movflags +faststart \
  output.m4a

# Moves metadata to file start (faster playback initiation)
```

---

## Script-Friendly Patterns

### Capture Exit Code

```bash
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "Recording successful"
else
  echo "Recording failed with code $EXIT_CODE"
fi
```

### Parse Recording Duration

```bash
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a 2>&1 | \
  grep -oP 'time=\K[0-9:.]+' | tail -1

# Outputs: 00:00:30.04
```

### Estimate File Size Before Recording

```bash
DURATION=300  # seconds
BITRATE=192   # kbps

ESTIMATED_SIZE=$(( DURATION * BITRATE / 8 ))  # KB
echo "Estimated file size: ${ESTIMATED_SIZE}KB (~$((ESTIMATED_SIZE / 1024))MB)"

# Example: 300s * 192k / 8 = 7200KB (~7MB)
```

---

## Research Sources

Based on:

- `.claude/.output/research/2026-01-15-120747-macos-cli-audio-recording/SYNTHESIS.md` (FFmpeg patterns)
- FFmpeg documentation - AVFoundation input device
- FFmpeg documentation - AAC encoder options
- Community best practices from GitHub gists and tutorials
