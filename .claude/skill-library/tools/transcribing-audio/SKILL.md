---
name: transcribing-audio
description: Use when transcribing audio/video files to text - wraps Docker-based Whisper for local transcription without cloud dependencies
allowed-tools: Bash, Read, Write, TodoWrite
---

# Transcribing Audio

**Local audio/video transcription using OpenAI Whisper via Docker.**

## When to Use

Use this skill when:

- User wants to transcribe audio files (WAV, M4A, MP3, etc.) to text
- User wants to transcribe video files (MP4, MOV, etc.) to text
- User asks to "transcribe this audio/video file"
- User needs speech-to-text conversion

## Quick Start

```bash
# Create output directory
TRANSCRIPT_DIR=".claude/.output/transcriptions/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TRANSCRIPT_DIR"

# Run transcription (uses base.en model, cached in Docker image)
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$(pwd)/$TRANSCRIPT_DIR:/output" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base.en \
    --output_format txt \
    --output_dir /output \
    --fp16 False

# Transcript saved to: .claude/.output/transcriptions/{timestamp}/recording.txt
```

## Prerequisites

### Docker Installation

Docker must be installed and running. Check with:

```bash
docker --version
```

**Common Docker paths** (for automated detection):

- `docker` (in PATH)
- `/opt/homebrew/bin/docker` (Homebrew on Apple Silicon)
- `/usr/local/bin/docker` (Homebrew on Intel Mac / standard Linux)
- `/usr/bin/docker` (Standard Linux)
- `/Applications/Docker.app/Contents/Resources/bin/docker` (Docker Desktop on Mac)

### Docker Image Setup

**Option A: Pull pre-built image (Recommended for Praetorian)**

```bash
# Authenticate with GitHub (one-time)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull image
docker pull ghcr.io/praetorian-inc/whisper-transcribe:latest
```

**Option B: Build locally**

See [references/docker-image.md](references/docker-image.md) for complete Dockerfile and build instructions.

## Core Transcription Workflow

**IMPORTANT: Output Directory Requirement**

Transcripts MUST be saved to `.claude/.output/transcriptions/{timestamp}/`. This is non-negotiable.

**Not even when:**
- User says "urgent" or "quick" (directory creation takes 1 second)
- Someone suggests saving to audio directory "like the Obsidian plugin" (Claude Code is not Obsidian)
- You've spent time debugging (shortcuts create more problems than they solve)
- "Just this once" or "we'll move it later" (never happens, becomes permanent)

**Why this matters:**
- Consistent artifact location across all Claude Code skills
- Gitignored location (won't clutter version control)
- Timestamped (no overwrites, trackable history)
- Expected by post-processing workflows

**There is no "legacy mode" for Claude Code usage.** The docker-image.md reference documents the legacy Obsidian behavior only for historical context - do not use it.

### Step 1: Locate Audio File

```bash
# Verify file exists and get absolute path
ls -lh /path/to/audio.m4a
```

### Step 2: Create Output Directory

```bash
# Create timestamped output directory
TRANSCRIPT_DIR=".claude/.output/transcriptions/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TRANSCRIPT_DIR"
```

### Step 3: Run Transcription

**Basic command structure:**

```bash
docker run --rm \
  -v "/path/to/audio/directory:/audio" \
  -v "$(pwd)/$TRANSCRIPT_DIR:/output" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/<filename> \
    --model base.en \
    --output_format txt \
    --output_dir /output \
    --fp16 False
```

**Key parameters:**

- `-v "/path/to/audio/directory:/audio"` - Mount directory containing audio file
- `-v "$(pwd)/$TRANSCRIPT_DIR:/output"` - Mount output directory for transcripts
- `-v "$HOME/.cache/whisper:/root/.cache/whisper"` - Mount model cache (prevents re-downloading models)
- `--model base.en` - Model selection (see Available Models section)
- `--output_format txt` - Output format (txt, json, vtt, srt, tsv)
- `--output_dir /output` - Save transcripts to mounted output directory
- `--fp16 False` - Disable half-precision (required for CPU-only systems)

### Step 4: Retrieve Output

Transcript is saved in the timestamped output directory:

```bash
# Find the transcript
ls -lh $TRANSCRIPT_DIR/

# Read the transcript
cat $TRANSCRIPT_DIR/<filename>.txt
```

## Available Models

| Model     | Speed | Accuracy | VRAM | Cached in Image |
| --------- | ----- | -------- | ---- | --------------- |
| tiny.en   | ~10x  | Lower    | ~1GB | No              |
| base.en   | ~7x   | Good     | ~1GB | ✅ Yes (default) |
| small.en  | ~4x   | Better   | ~2GB | No              |
| medium.en | ~2x   | Best     | ~5GB | No              |

**Model caching:** The pre-built image only includes `base.en` cached. Other models download on first use (~2-5 minutes delay).

**To use different models without delays:** See [references/docker-image.md](references/docker-image.md) for building images with additional pre-cached models.

## Advanced Usage

### Timestamps

**Word-level timestamps:**

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base.en \
    --output_format json \
    --word_timestamps True \
    --fp16 False
```

**Segment-level timestamps (VTT for subtitles):**

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base.en \
    --output_format vtt \
    --fp16 False
```

### Language Detection

**Auto-detect language:**

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base \
    --fp16 False
# Note: Use 'base' not 'base.en' for non-English detection
```

**Specify language:**

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base \
    --language es \
    --fp16 False
```

### Translation to English

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base \
    --task translate \
    --fp16 False
```

### Initial Prompt (Context)

Provide context for better accuracy:

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base.en \
    --initial_prompt "This is a technical discussion about Kubernetes security." \
    --fp16 False
```

### Batch Processing

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/*.m4a \
    --model base.en \
    --output_format txt \
    --fp16 False
```

## Output Formats

| Format | Use Case                | Contains                            |
| ------ | ----------------------- | ----------------------------------- |
| txt    | Plain text              | Transcribed text only               |
| json   | Programmatic processing | Full data: text, segments, metadata |
| vtt    | Video subtitles         | WebVTT format with timestamps       |
| srt    | Video subtitles         | SubRip format with timestamps       |
| tsv    | Spreadsheet analysis    | Tab-separated segments              |

**Specify format:**

```bash
--output_format txt  # or json, vtt, srt, tsv
```

## Integration with Claude Code

### Example Workflow

1. **User provides audio file path:**

   ```
   User: "Transcribe /Users/john/audio/meeting.m4a"
   ```

2. **Verify file exists:**

   ```bash
   ls -lh /Users/john/audio/meeting.m4a
   ```

3. **Create output directory:**

   ```bash
   TRANSCRIPT_DIR=".claude/.output/transcriptions/$(date +%Y%m%d_%H%M%S)"
   mkdir -p "$TRANSCRIPT_DIR"
   ```

4. **Run transcription:**

   ```bash
   docker run --rm \
     -v "/Users/john/audio:/audio" \
     -v "$(pwd)/$TRANSCRIPT_DIR:/output" \
     -v "$HOME/.cache/whisper:/root/.cache/whisper" \
     ghcr.io/praetorian-inc/whisper-transcribe:latest \
     whisper /audio/meeting.m4a \
       --model base.en \
       --output_format txt \
       --output_dir /output \
       --fp16 False
   ```

5. **Read and present output:**

   ```bash
   cat $TRANSCRIPT_DIR/meeting.txt
   ```

6. **Display output location to user:**

   ```
   Transcript saved to: .claude/.output/transcriptions/20260115_143052/meeting.txt
   Original audio: /Users/john/audio/meeting.m4a
   ```

## Performance Optimization

### Model Cache Volume Mount

**CRITICAL:** Always mount the model cache to avoid re-downloading models on each invocation:

```bash
-v "$HOME/.cache/whisper:/root/.cache/whisper"
```

**Without cache mount:** Models download on every run (~2-5 minutes delay)
**With cache mount:** Models cached after first download (~instant startup)

### Model Selection Guidelines

| Use Case                        | Recommended Model |
| ------------------------------- | ----------------- |
| Quick transcription             | tiny.en or base.en |
| General purpose                 | base.en (default) |
| High accuracy needed            | small.en or medium.en |
| Non-English                     | base or small    |
| CPU-only system                 | base.en + fp16 False |
| GPU available                   | medium.en        |

### Expected Processing Times

**base.en model (cached):**

- 1 minute audio → ~8 seconds
- 5 minute audio → ~40 seconds
- 30 minute audio → ~4 minutes
- 1 hour audio → ~8 minutes

**Times are approximate and vary by system.**

## Common Issues

**Docker not found:**
- Install Docker or specify full path (see [references/error-handling.md](references/error-handling.md))

**Model download hanging:**
- Use model cache volume mount: `-v "$HOME/.cache/whisper:/root/.cache/whisper"`

**File not found:**
- Verify volume mount path matches file location

**Out of memory:**
- Use smaller model (tiny.en or base.en) or ensure `--fp16 False` is set for CPU

**Complete error catalog:** See [references/error-handling.md](references/error-handling.md)

## Improvements for Claude Code Integration

Based on your request to "improve upon this skill so I can record audio and transcribe right in Claude Code", here are enhancement opportunities:

### 1. Audio Recording Integration

**Current limitation:** No built-in audio recording in Claude Code CLI.

**Potential improvements:**

- System audio recording wrappers (macOS: ffmpeg, Linux: arecord/parecord, Windows: PowerShell)
- Slash command integration: `/record-audio`, `/transcribe`, `/record-and-transcribe`
- Browser-based recording (if Claude Code has UI): Web Audio API + MediaRecorder API

See [references/audio-recording.md](references/audio-recording.md) for complete recording implementation patterns.

### 2. Model Management

**Current limitation:** Only `base.en` pre-cached in image.

**Potential improvements:**

- Multi-model image variants (base, all-en, multilingual)
- On-demand model caching with user notification
- Automatic model selection based on audio characteristics

See [references/docker-image.md](references/docker-image.md) for multi-model Dockerfile examples.

### 3. Post-processing

**Current limitation:** Raw transcription only, no formatting.

**Potential improvements:**

- Automatic formatting with Claude (punctuation, paragraphs, speaker diarization)
- Meeting notes extraction (action items, decisions, summary)
- Integration with existing skills (brainstorming, writing-plans)

See [references/post-processing.md](references/post-processing.md) for LLM-based enhancement patterns.

### 4. Real-time Transcription

**Current limitation:** File-based only, no streaming.

**Potential approaches:**

- Microphone streaming to OpenAI Whisper API (cloud)
- Hybrid: stream to cloud + record locally as backup
- Trade-off: real-time feedback vs. fully local processing

## Integration

### Called By

- User direct invocation when transcription needed
- Could be invoked by future audio recording commands

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - uses Docker/Whisper directly

### Pairs With (conditional)

| Skill                      | Trigger                     | Purpose                          |
| -------------------------- | --------------------------- | -------------------------------- |
| Future recording skill     | After audio recording       | Transcribe recorded audio        |
| `brainstorming`            | After transcribing meeting  | Process brainstorming transcript |
| `writing-plans`            | After transcribing planning | Convert transcript to plan       |

## Related Skills

None currently - this is the first audio transcription skill.

## References

- [Docker Image Details](references/docker-image.md) - Complete Dockerfile, build instructions, model caching, image variants
- [Audio Recording](references/audio-recording.md) - System audio recording implementation patterns, slash command integration
- [Post-processing](references/post-processing.md) - LLM-based transcript enhancement, formatting, action item extraction
- [Error Handling](references/error-handling.md) - Complete error catalog and troubleshooting guide

## Credits

Based on the [obsidian-transcription](https://github.com/praetorian-inc/obsidian-transcription) plugin architecture by Praetorian, which uses:

- [OpenAI Whisper](https://openai.com/blog/whisper/) - Speech recognition model
- Docker containerization for local execution
- Model caching with SHA256 verification
