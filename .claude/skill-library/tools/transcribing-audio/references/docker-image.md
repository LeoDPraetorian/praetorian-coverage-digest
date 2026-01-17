# Docker Image Details

Complete documentation for building and managing the Whisper transcription Docker image.

## Pre-built Image

**Registry:** `ghcr.io/praetorian-inc/whisper-transcribe:latest`

**Included models:** `base.en` only (cached with SHA256 verification)

### Authentication

```bash
# One-time GitHub authentication
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull image
docker pull ghcr.io/praetorian-inc/whisper-transcribe:latest
```

## Building Locally

### Base Dockerfile

```dockerfile
# Dockerfile for OpenAI Whisper CLI
# Transcribes audio/video files to English text using Whisper

FROM python:3.10-slim

# Install system dependencies (ffmpeg is required by Whisper)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Whisper
RUN pip install --no-cache-dir openai-whisper

# Pre-download and cache models with hash verification
# Models are cached in /root/.cache/whisper/
# Hash verification is built into Whisper's download process
#
# Model info:
# base.en: SHA256 = 25a8566e1d0c1e2231d1c762132cd20e0f96a85d16145c3a00adf5d1ac670ead
# tiny.en: SHA256 = d3dd57d32accea0b295c96e26691aa14d8822fac7d9d27d5dc00b4ca2826dd03
# small.en: SHA256 = f953ad0fd29cacd07d5a9eda5624af0f6bcf2258be67c92b79389873d91e0872
# medium.en: SHA256 = d7440d1dc186f76616474e0ff0b3b6b879abc9d1a4926b7adfa41db2d497ab4f

# Download base.en model (default) - will verify hash during download
RUN python3 -c "import whisper; whisper.load_model('base.en')"

# Optionally pre-download additional models (uncomment as needed):
# RUN python3 -c "import whisper; whisper.load_model('tiny.en')"
# RUN python3 -c "import whisper; whisper.load_model('small.en')"
# RUN python3 -c "import whisper; whisper.load_model('medium.en')"

# Create directory for audio files
WORKDIR /audio

# Set default model (can be overridden)
ENV WHISPER_MODEL=base.en

# Default command: show help
CMD ["whisper", "--help"]
```

### Build Commands

**Base image (base.en only):**

```bash
docker build -t whisper-transcribe:base .
```

**All English models:**

```bash
# Modify Dockerfile to uncomment all .en models, then:
docker build -t whisper-transcribe:all-en .
```

### Output Directory Management

**Saving transcripts to custom location:**

Whisper CLI supports `--output_dir` parameter to specify where transcripts are saved. This is used by the transcribing-audio skill to save to `.claude/.output/transcriptions/`.

```bash
# Create output directory (timestamped for organization)
TRANSCRIPT_DIR=".claude/.output/transcriptions/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TRANSCRIPT_DIR"

# Mount output directory and specify --output_dir
docker run --rm \
  -v "$(pwd)/audio:/audio" \
  -v "$(pwd)/$TRANSCRIPT_DIR:/output" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base.en \
    --output_dir /output \
    --fp16 False

# Transcript saved to: .claude/.output/transcriptions/{timestamp}/recording.txt
```

**Benefits of centralized output directory:**

1. **Organized artifacts** - All transcripts in one place
2. **Easy cleanup** - `.output/` directory can be gitignored
3. **Timestamped** - Multiple runs don't overwrite each other
4. **Consistent** - Matches pattern used by other Claude Code skills (orchestrating-research, threat-modeling)

**Without --output_dir (legacy behavior):**

```bash
# Legacy: Saves to same directory as input
docker run --rm \
  -v "$(pwd)/audio:/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a --model base.en --fp16 False

# Output: audio/recording.txt (same directory as input)
```

**Multilingual (all models):**

```bash
# Modify Dockerfile to include non-.en models:
# RUN python3 -c "import whisper; whisper.load_model('base')"
# RUN python3 -c "import whisper; whisper.load_model('small')"
# RUN python3 -c "import whisper; whisper.load_model('medium')"

docker build -t whisper-transcribe:multilingual .
```

### Build Time Estimates

| Image Variant | Models Cached | Size | Build Time |
|---------------|---------------|------|------------|
| base          | base.en       | ~1.5GB | ~3-5 min   |
| all-en        | tiny.en, base.en, small.en, medium.en | ~3GB | ~8-12 min |
| multilingual  | All models    | ~5GB | ~15-20 min |

## Model Caching Strategy

### Why Cache Models in Image

**Without caching:**
- Each `docker run` downloads model (~150MB for base.en)
- 2-5 minute delay on every transcription
- Network required
- Bandwidth waste

**With caching:**
- Model downloaded once during `docker build`
- Instant startup on `docker run`
- Works offline
- Verified with SHA256 checksum

### Volume-based Caching (Alternative)

Instead of baking models into image, cache in user's home directory:

```bash
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  whisper-transcribe:base \
  whisper /audio/recording.m4a --model base.en --fp16 False
```

**Benefits:**
- Smaller image size
- Models shared across image updates
- User can pre-cache multiple models without rebuilding image

**Trade-offs:**
- First run per model downloads (~2-3 minutes)
- Requires volume mount in every command
- Users must manage cache directory

**Recommendation:** Use both approaches:
1. Pre-cache `base.en` in image (most common)
2. Use volume mount for additional models (on-demand)

## Image Variants

### Variant: Base (Default)

**Tag:** `whisper-transcribe:base` or `:latest`

**Contains:** `base.en` model only

**Use case:** General purpose English transcription

**Build:**
```bash
docker build -t whisper-transcribe:base .
```

### Variant: All English Models

**Tag:** `whisper-transcribe:all-en`

**Contains:** `tiny.en`, `base.en`, `small.en`, `medium.en`

**Use case:** English transcription with model selection flexibility

**Dockerfile modification:**
```dockerfile
RUN python3 -c "import whisper; whisper.load_model('tiny.en')"
RUN python3 -c "import whisper; whisper.load_model('base.en')"
RUN python3 -c "import whisper; whisper.load_model('small.en')"
RUN python3 -c "import whisper; whisper.load_model('medium.en')"
```

### Variant: Multilingual

**Tag:** `whisper-transcribe:multilingual`

**Contains:** All models (`.en` and non-`.en`)

**Use case:** Multi-language transcription and translation

**Dockerfile modification:**
```dockerfile
# English-specific models
RUN python3 -c "import whisper; whisper.load_model('tiny.en')"
RUN python3 -c "import whisper; whisper.load_model('base.en')"
RUN python3 -c "import whisper; whisper.load_model('small.en')"
RUN python3 -c "import whisper; whisper.load_model('medium.en')"

# Multilingual models
RUN python3 -c "import whisper; whisper.load_model('tiny')"
RUN python3 -c "import whisper; whisper.load_model('base')"
RUN python3 -c "import whisper; whisper.load_model('small')"
RUN python3 -c "import whisper; whisper.load_model('medium')"
```

## Verifying Model Cache

### Check Models in Running Container

```bash
docker run --rm whisper-transcribe:base \
  ls -lh /root/.cache/whisper/
```

**Expected output:**
```
total 150M
-rw-r--r-- 1 root root 145M Nov 15 10:30 base.en.pt
```

### Verify SHA256 Checksums

```bash
docker run --rm whisper-transcribe:base \
  sh -c "cd /root/.cache/whisper && sha256sum *.pt"
```

**Expected checksums:**
- `base.en.pt`: `25a8566e1d0c1e2231d1c762132cd20e0f96a85d16145c3a00adf5d1ac670ead`
- `tiny.en.pt`: `d3dd57d32accea0b295c96e26691aa14d8822fac7d9d27d5dc00b4ca2826dd03`
- `small.en.pt`: `f953ad0fd29cacd07d5a9eda5624af0f6bcf2258be67c92b79389873d91e0872`
- `medium.en.pt`: `d7440d1dc186f76616474e0ff0b3b6b879abc9d1a4926b7adfa41db2d497ab4f`

## Image Registry Configuration

### Push to GitHub Container Registry

```bash
# Tag for registry
docker tag whisper-transcribe:base ghcr.io/praetorian-inc/whisper-transcribe:latest
docker tag whisper-transcribe:base ghcr.io/praetorian-inc/whisper-transcribe:base
docker tag whisper-transcribe:all-en ghcr.io/praetorian-inc/whisper-transcribe:all-en

# Push
docker push ghcr.io/praetorian-inc/whisper-transcribe:latest
docker push ghcr.io/praetorian-inc/whisper-transcribe:base
docker push ghcr.io/praetorian-inc/whisper-transcribe:all-en
```

### Access Control

**Public image:** Anyone can pull without authentication

**Private image:** Requires GitHub token with `read:packages` scope

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## Troubleshooting

### Build Fails: Hash Mismatch

**Error:**
```
RuntimeError: Model has been modified. Hash mismatch.
```

**Cause:** Corrupted download or Whisper library version mismatch

**Solution:**
```bash
# Clear Docker build cache and rebuild
docker build --no-cache -t whisper-transcribe:base .
```

### Build Fails: Out of Disk Space

**Error:**
```
no space left on device
```

**Cause:** Docker images consuming disk space

**Solution:**
```bash
# Prune unused images
docker image prune -a

# Check disk usage
docker system df
```

### Model Download Hanging

**Symptom:** Build stuck at "Downloading model..." for >10 minutes

**Causes:**
1. Network issues
2. Rate limiting from Hugging Face CDN
3. Firewall blocking connections

**Solution:**
```bash
# Build with verbose output to see progress
docker build --progress=plain -t whisper-transcribe:base .

# Or set HTTP proxy if behind corporate firewall
docker build --build-arg http_proxy=http://proxy:port -t whisper-transcribe:base .
```

## Performance Considerations

### Image Size Optimization

**Current size:** ~1.5GB (base.en cached)

**Optimization opportunities:**
1. Use `python:3.10-alpine` instead of `python:3.10-slim` (saves ~200MB, but ffmpeg install more complex)
2. Multi-stage build to exclude build dependencies
3. Compress models (not recommended - impacts accuracy)

**Trade-off:** Smaller image vs. ease of maintenance

### Build Caching

Docker caches layers. Structure Dockerfile for optimal caching:

```dockerfile
# Good: Rarely changing layers first
RUN apt-get update && apt-get install -y ffmpeg
RUN pip install openai-whisper
RUN python3 -c "import whisper; whisper.load_model('base.en')"

# Bad: Frequently changing layers first (invalidates all subsequent caches)
COPY ./config.json /config.json  # Changes frequently
RUN apt-get update && apt-get install -y ffmpeg  # Re-runs every time
```

## Future Enhancements

1. **GPU support:** CUDA-enabled base image for faster transcription
2. **Quantized models:** Smaller file sizes with acceptable accuracy trade-off
3. **Streaming support:** Real-time transcription via stdin
4. **Built-in post-processing:** Punctuation, formatting, speaker diarization
5. **Health check endpoint:** HTTP server for orchestration systems
