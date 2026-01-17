# Audio Recording Integration

Implementation patterns for recording audio directly within Claude Code before transcription.

## Current Limitations

Claude Code CLI has no built-in audio recording capabilities. This reference documents approaches for adding recording functionality.

## System-Level Recording

### macOS Recording

**Tool: afrecord (via AVFoundation)**

```bash
# Record 30 seconds of audio to M4A
afplay doesn't record - use sox or ffmpeg instead

# Using ffmpeg (recommended)
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a

# List available audio devices
ffmpeg -f avfoundation -list_devices true -i ""
```

**Tool: sox**

```bash
# Install sox with Homebrew
brew install sox

# Record 30 seconds
rec -r 44100 -c 2 output.wav trim 0 30

# Convert to M4A for smaller file size
ffmpeg -i output.wav -c:a aac -b:a 128k output.m4a
```

### Linux Recording

**Tool: arecord (ALSA)**

```bash
# Record 30 seconds to WAV
arecord -f cd -t wav -d 30 output.wav

# Convert to M4A
ffmpeg -i output.wav -c:a aac -b:a 128k output.m4a
```

**Tool: parecord (PulseAudio)**

```bash
# Record 30 seconds to WAV
parecord --channels=2 --rate=44100 --file-format=wav output.wav &
RECORD_PID=$!
sleep 30
kill $RECORD_PID

# Convert to M4A
ffmpeg -i output.wav -c:a aac -b:a 128k output.m4a
```

### Windows Recording

**Tool: PowerShell with NAudio library**

```powershell
# Install NAudio (one-time)
Install-Package NAudio

# Record audio (requires custom PowerShell script)
# See examples/windows-record.ps1
```

**Tool: ffmpeg**

```powershell
# List audio devices
ffmpeg -list_devices true -f dshow -i dummy

# Record 30 seconds
ffmpeg -f dshow -i audio="Microphone" -t 30 output.wav
```

## Unified Recording Script

**Cross-platform wrapper:** `record-audio.sh`

```bash
#!/usr/bin/env bash
# record-audio.sh - Cross-platform audio recording wrapper
# Usage: ./record-audio.sh <duration_seconds> <output_file>

set -e

DURATION=${1:-30}
OUTPUT=${2:-recording.m4a}
TEMP_WAV=$(mktemp --suffix=.wav)

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use ffmpeg with avfoundation
    ffmpeg -f avfoundation -i ":0" -t "$DURATION" -y "$TEMP_WAV" 2>&1 | grep -v "deprecated"
elif [[ -f /proc/asound/version ]]; then
    # Linux with ALSA
    arecord -f cd -t wav -d "$DURATION" "$TEMP_WAV"
elif command -v parecord &> /dev/null; then
    # Linux with PulseAudio
    timeout "$DURATION" parecord --channels=2 --rate=44100 --file-format=wav "$TEMP_WAV"
else
    echo "Error: No audio recording tool found"
    echo "Install: ffmpeg (macOS), alsa-utils (Linux), or pulseaudio-utils (Linux)"
    exit 1
fi

# Convert to M4A for smaller file size
ffmpeg -i "$TEMP_WAV" -c:a aac -b:a 128k -y "$OUTPUT" 2>&1 | grep -v "deprecated"

# Cleanup
rm "$TEMP_WAV"

echo "Recording saved to: $OUTPUT"
```

**Make executable:**

```bash
chmod +x record-audio.sh
```

**Usage:**

```bash
# Record 30 seconds to recording.m4a
./record-audio.sh 30 recording.m4a

# Record 60 seconds to meeting-notes.m4a
./record-audio.sh 60 meeting-notes.m4a
```

## Slash Command Integration

### Proposed Commands

**Command: `/record-audio`**

```bash
# Usage
/record-audio duration=30s output=recording.m4a

# Implementation (as skill or command)
# 1. Parse arguments
# 2. Call record-audio.sh with duration and output
# 3. Show progress indicator
# 4. Return file path when complete
```

**Command: `/transcribe`**

```bash
# Usage
/transcribe file=recording.m4a model=base.en

# Implementation
# 1. Verify file exists
# 2. Invoke transcribing-audio skill
# 3. Return transcript text
```

**Command: `/record-and-transcribe`**

```bash
# Usage (combined workflow)
/record-and-transcribe duration=30s model=base.en

# Implementation
# 1. Record audio to temp file
# 2. Automatically transcribe
# 3. Return transcript
# 4. Optionally save audio file
```

### Command Implementation Location

**Option A: New skill `recording-audio`**

Create `.claude/skill-library/tools/recording-audio/` with:
- SKILL.md - Recording workflow
- references/platforms.md - Platform-specific implementations
- scripts/record-audio.sh - Cross-platform wrapper

**Option B: Extend `transcribing-audio` skill**

Add recording phase before transcription:
- Phase 1: Record audio (if needed)
- Phase 2: Transcribe audio
- Phase 3: Return transcript

**Option C: New command `/record-audio`**

Create `.claude/commands/record-audio.md` that:
- Delegates to recording-audio skill (if created)
- Directly implements recording workflow (simpler)

**Recommendation:** Option A (separate skill) for single responsibility principle.

## Browser-Based Recording (Claude Code UI)

If Claude Code has a web-based UI (Electron, browser extension, or web app), use Web APIs:

### MediaRecorder API

```typescript
// Request microphone access
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Create recorder
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});

const chunks: Blob[] = [];
mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

// Start recording
mediaRecorder.start();

// Stop after duration
setTimeout(() => {
  mediaRecorder.stop();
}, duration * 1000);

// On stop, create file
mediaRecorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const url = URL.createObjectURL(blob);

  // Download or send to backend
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recording.webm';
  a.click();
};
```

### Audio Format Conversion

Web Audio API produces WebM. Whisper prefers M4A/WAV. Convert on backend:

```bash
# Convert WebM to M4A
ffmpeg -i recording.webm -c:a aac -b:a 128k recording.m4a
```

## Streaming to Transcription

### Real-time Transcription Architecture

**Client (Browser):**
1. Capture microphone via MediaRecorder
2. Split audio into chunks (e.g., 5-second segments)
3. Send chunks to backend WebSocket

**Backend (Server):**
1. Receive audio chunks
2. Send to OpenAI Whisper API (cloud) or local Whisper
3. Return partial transcripts

**Display:**
1. Show transcript as it arrives
2. Update in real-time

**Trade-offs:**
- Cloud API: Fast, accurate, but requires API key and internet
- Local Docker: Private, offline, but slower (not truly real-time)

### Hybrid Approach

**Best of both worlds:**

1. **Record locally** while streaming to cloud API
2. **Display cloud transcript** as it arrives (real-time feedback)
3. **Save local recording** as backup
4. **If cloud fails**, fall back to local Docker transcription

```typescript
// Pseudo-code
async function recordAndTranscribe(duration: number) {
  const localRecording = startLocalRecording();
  const cloudStream = startCloudStream();

  try {
    // Real-time cloud transcription
    for await (const partial of cloudStream) {
      displayTranscript(partial);
    }
  } catch (error) {
    // Fallback to local Docker
    const audioFile = await localRecording.save();
    const transcript = await transcribeWithDocker(audioFile);
    displayTranscript(transcript);
  }
}
```

## Example Workflows

### Workflow 1: Simple Recording + Transcription

```bash
# User: "Record 1 minute of audio and transcribe it"

# Step 1: Record
./record-audio.sh 60 recording.m4a
# Output: "Recording saved to: recording.m4a"

# Step 2: Transcribe
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a --model base.en --output_format txt --fp16 False

# Step 3: Read transcript
cat recording.txt
```

### Workflow 2: Meeting Notes with Timestamps

```bash
# User: "Record our meeting and create timestamped notes"

# Step 1: Record (long duration)
./record-audio.sh 3600 meeting.m4a
# Output: "Recording saved to: meeting.m4a"

# Step 2: Transcribe with timestamps
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/meeting.m4a \
    --model small.en \
    --output_format vtt \
    --fp16 False

# Step 3: Read transcript with timestamps
cat meeting.vtt
```

### Workflow 3: Voice Memo with Context

```bash
# User: "Record a voice memo about the Kubernetes security discussion"

# Step 1: Record
./record-audio.sh 120 kube-security-memo.m4a

# Step 2: Transcribe with context prompt
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/kube-security-memo.m4a \
    --model base.en \
    --output_format txt \
    --initial_prompt "This is a technical discussion about Kubernetes security and RBAC policies." \
    --fp16 False

# Step 3: Format with Claude (post-processing)
# Feed transcript to Claude for:
# - Paragraph formatting
# - Bullet point extraction
# - Action item identification
```

## Dependencies

### Required Tools

| Platform | Recording Tool | Installation |
|----------|----------------|--------------|
| macOS    | ffmpeg         | `brew install ffmpeg` |
| Linux    | arecord        | `sudo apt-get install alsa-utils` (Debian/Ubuntu) |
| Linux    | parecord       | `sudo apt-get install pulseaudio-utils` (Debian/Ubuntu) |
| Windows  | ffmpeg         | Download from ffmpeg.org |

### Optional Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| sox  | Advanced audio processing | `brew install sox` (macOS), `sudo apt-get install sox` (Linux) |
| lame | MP3 encoding | `brew install lame` (macOS), `sudo apt-get install lame` (Linux) |

## Future Enhancements

1. **Voice Activity Detection (VAD):** Stop recording when silence detected
2. **Noise Reduction:** Pre-process audio before transcription
3. **Multi-channel Recording:** Record multiple speakers separately
4. **Hotkey Activation:** Start/stop recording with keyboard shortcut
5. **Browser Extension:** Record audio from any web page
6. **Mobile Support:** iOS/Android recording via app or PWA
