# Error Handling and Troubleshooting

Complete error catalog for Whisper Docker transcription.

## Error Categories

1. Docker-related errors
2. Model download errors
3. File/path errors
4. Audio format errors
5. Performance/memory errors
6. Output errors

## Docker-Related Errors

### Error: Docker not found

**Symptom:**

```
Error: Docker not found
bash: docker: command not found
```

**Cause:** Docker not installed or not in PATH

**Solution:**

```bash
# Check if Docker is installed
which docker

# If not found, try common paths
/opt/homebrew/bin/docker --version
/usr/local/bin/docker --version
/usr/bin/docker --version

# If still not found, install Docker
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Linux: https://docs.docker.com/engine/install/
# Windows: https://docs.docker.com/desktop/install/windows-install/
```

### Error: Docker daemon not running

**Symptom:**

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
Is the docker daemon running?
```

**Cause:** Docker Desktop not started

**Solution:**

```bash
# macOS: Start Docker Desktop application
open -a Docker

# Linux: Start Docker daemon
sudo systemctl start docker

# Verify Docker is running
docker ps
```

### Error: Permission denied (Docker socket)

**Symptom:**

```
Got permission denied while trying to connect to the Docker daemon socket
```

**Cause:** User not in docker group (Linux)

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker

# Verify access
docker ps
```

### Error: Docker image not found

**Symptom:**

```
Unable to find image 'ghcr.io/praetorian-inc/whisper-transcribe:latest' locally
docker: Error response from daemon: pull access denied
```

**Cause:** Image not pulled or not authenticated

**Solution:**

```bash
# Option 1: Pull pre-built image (requires GitHub auth)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker pull ghcr.io/praetorian-inc/whisper-transcribe:latest

# Option 2: Build locally
cd whisper-transcribe-image
docker build -t ghcr.io/praetorian-inc/whisper-transcribe:latest .
```

## Model Download Errors

### Error: Model download hanging

**Symptom:**

```
Downloading model...
[Hangs for >10 minutes]
```

**Causes:**

1. Network issues
2. Rate limiting from Hugging Face CDN
3. Firewall blocking connections

**Solutions:**

```bash
# Solution 1: Use model cache volume mount (recommended)
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/file.m4a --model base.en --fp16 False

# Solution 2: Pre-download models in Docker image
# See references/docker-image.md for building with cached models

# Solution 3: Set HTTP proxy if behind corporate firewall
docker run --rm \
  -e HTTP_PROXY=http://proxy:port \
  -e HTTPS_PROXY=http://proxy:port \
  ...
```

### Error: Hash mismatch

**Symptom:**

```
RuntimeError: Model has been modified. Hash mismatch.
Expected: 25a8566e1d0c1e2231d1c762132cd20e0f96a85d16145c3a00adf5d1ac670ead
Got: [different hash]
```

**Cause:** Corrupted model download

**Solution:**

```bash
# Clear model cache and re-download
rm -rf ~/.cache/whisper/
# Or in Docker:
docker run --rm -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  whisper-transcribe:base rm -rf /root/.cache/whisper/*

# Re-run transcription (will re-download)
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/file.m4a --model base.en --fp16 False
```

## File/Path Errors

### Error: File not found

**Symptom:**

```
FileNotFoundError: [Errno 2] No such file or directory: '/audio/recording.m4a'
```

**Cause:** Volume mount path mismatch

**Solution:**

```bash
# Verify file exists
ls -lh /full/path/to/recording.m4a

# Ensure volume mount matches file location
# If file is at /Users/john/audio/recording.m4a:
docker run --rm \
  -v "/Users/john/audio:/audio" \
  ...
  whisper /audio/recording.m4a ...

# NOT:
# -v "/Users/john:/audio"  (missing /audio subdirectory)
# whisper /Users/john/audio/recording.m4a  (wrong path inside container)
```

### Error: Permission denied (file)

**Symptom:**

```
PermissionError: [Errno 13] Permission denied: '/audio/recording.m4a'
```

**Cause:** File not readable by Docker container

**Solution:**

```bash
# Make file readable
chmod 644 /path/to/recording.m4a

# Or change file ownership
sudo chown $USER:$USER /path/to/recording.m4a
```

### Error: Output file not found

**Symptom:**

```
Error: Transcription output file not found: /audio/recording.txt
```

**Cause:** Whisper failed silently or wrote to unexpected location

**Solution:**

```bash
# Check Docker output for errors
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a --model base.en --output_format txt --fp16 False 2>&1 | tee whisper.log

# Check log for errors
cat whisper.log

# List files created in mounted directory
ls -la /audio/
```

## Audio Format Errors

### Error: Unsupported audio format

**Symptom:**

```
RuntimeError: Unsupported audio file format
```

**Cause:** Audio codec not supported by ffmpeg

**Solution:**

```bash
# Convert to supported format first (M4A, WAV, MP3)
ffmpeg -i input.flac -c:a aac -b:a 128k output.m4a

# Then transcribe
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/output.m4a --model base.en --fp16 False
```

### Error: Audio file too short

**Symptom:**

```
Warning: audio is shorter than 30ms, padding to 30ms
[Empty transcript]
```

**Cause:** Audio file is empty or corrupted

**Solution:**

```bash
# Check audio file duration
ffprobe input.m4a 2>&1 | grep Duration

# If duration is 0, file is corrupted
# Re-record or use a different file
```

### Error: Audio file too long

**Symptom:**

```
RuntimeError: CUDA out of memory
```

(Even though using CPU)

**Cause:** Audio file is very long (>2 hours) and consumes too much memory

**Solution:**

```bash
# Split audio into chunks
ffmpeg -i input.m4a -f segment -segment_time 600 -c copy output_%03d.m4a

# Transcribe each chunk
for file in output_*.m4a; do
  docker run --rm \
    -v "$(pwd):/audio" \
    -v "$HOME/.cache/whisper:/root/.cache/whisper" \
    ghcr.io/praetorian-inc/whisper-transcribe:latest \
    whisper "/audio/$file" --model base.en --fp16 False
done

# Combine transcripts
cat output_*.txt > full_transcript.txt
```

## Performance/Memory Errors

### Error: Out of memory (CPU)

**Symptom:**

```
RuntimeError: out of memory
```

**Cause:** Large model or long audio file consuming too much RAM

**Solutions:**

```bash
# Solution 1: Use smaller model
--model tiny.en  # Instead of base.en or small.en

# Solution 2: Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory → Increase to 4GB+

# Solution 3: Split audio into smaller chunks (see Audio file too long above)
```

### Error: Out of memory (GPU)

**Symptom:**

```
RuntimeError: CUDA out of memory
```

**Cause:** GPU VRAM insufficient for model

**Solutions:**

```bash
# Solution 1: Use CPU instead (disable fp16)
--fp16 False

# Solution 2: Use smaller model
--model tiny.en  # or base.en instead of small.en/medium.en

# Solution 3: Increase GPU memory (if available)
# Not applicable for Docker on consumer hardware
```

### Error: Transcription too slow

**Symptom:** Transcription takes >2x the audio duration

**Causes:**

1. Using large model (medium.en) on CPU
2. Docker resource constraints
3. Other processes consuming CPU/memory

**Solutions:**

```bash
# Solution 1: Use faster model
--model base.en  # Instead of small.en or medium.en
# base.en: ~7x real-time
# small.en: ~4x real-time
# medium.en: ~2x real-time

# Solution 2: Increase Docker CPU allocation
# Docker Desktop → Settings → Resources → CPUs → Increase to 4+

# Solution 3: Close other applications to free resources
```

## Output Errors

### Error: Empty transcript

**Symptom:**

```
# recording.txt is empty or contains only whitespace
```

**Causes:**

1. Audio is silent or very quiet
2. Audio is corrupted
3. Wrong language model (using .en model for non-English)

**Solutions:**

```bash
# Solution 1: Check audio volume
ffmpeg -i input.m4a -af volumedetect -f null /dev/null 2>&1 | grep mean_volume
# If mean_volume < -40dB, audio is too quiet

# Solution 2: Amplify audio
ffmpeg -i input.m4a -af "volume=10dB" output.m4a

# Solution 3: Use correct language model
# For non-English, use 'base' not 'base.en'
--model base --language es  # For Spanish
```

### Error: Transcript contains only "[BLANK_AUDIO]"

**Symptom:**

```
[BLANK_AUDIO]
```

**Cause:** Audio is completely silent

**Solution:**

```bash
# Verify audio has actual content
ffplay input.m4a  # Listen to audio manually

# If audio is silent, re-record
```

### Error: Incorrect transcription

**Symptom:** Transcription is gibberish or incorrect

**Causes:**

1. Audio quality is poor
2. Background noise
3. Heavy accent or uncommon words
4. Wrong language model

**Solutions:**

```bash
# Solution 1: Use better model for improved accuracy
--model small.en  # or medium.en for best accuracy

# Solution 2: Provide context with initial_prompt
--initial_prompt "This is a technical discussion about Kubernetes security"

# Solution 3: Clean audio (noise reduction)
ffmpeg -i input.m4a -af "highpass=f=200, lowpass=f=3000" cleaned.m4a

# Solution 4: Verify language model matches audio language
# For English: base.en, small.en, medium.en
# For other languages: base, small, medium (without .en)
```

## Docker Volume Mount Issues

### Error: Cannot write output file

**Symptom:**

```
PermissionError: [Errno 13] Permission denied: '/audio/recording.txt'
```

**Cause:** Docker container cannot write to mounted volume

**Solution (macOS/Linux):**

```bash
# Ensure directory is writable
chmod 755 /path/to/audio/directory

# Or run Docker with user permissions
docker run --rm \
  --user $(id -u):$(id -g) \
  -v "$(pwd):/audio" \
  ...
```

**Solution (Windows):**

```powershell
# Ensure directory is not read-only
# Right-click directory → Properties → Uncheck "Read-only"

# Or use absolute Windows paths in WSL
docker run --rm \
  -v "/mnt/c/Users/YourName/audio:/audio" \
  ...
```

### Error: Model cache not persisting

**Symptom:** Models download on every invocation despite volume mount

**Cause:** Volume mount path incorrect or not persisting

**Solution:**

```bash
# Verify mount path is correct
# Should be: $HOME/.cache/whisper (Linux/macOS)
echo $HOME/.cache/whisper
ls -la $HOME/.cache/whisper

# Create directory if it doesn't exist
mkdir -p $HOME/.cache/whisper

# Verify mount in running container
docker run --rm \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  ls -la /root/.cache/whisper/
```

## Common Workflow Errors

### Error: Output format not recognized

**Symptom:**

```
ValueError: Invalid output format: txtt
```

**Cause:** Typo in output_format argument

**Solution:**

```bash
# Valid formats: txt, json, vtt, srt, tsv
--output_format txt  # NOT txtt, text, or .txt
```

### Error: Model not found

**Symptom:**

```
RuntimeError: Model 'base-en' not found
```

**Cause:** Incorrect model name

**Solution:**

```bash
# Valid model names:
# English-only: tiny.en, base.en, small.en, medium.en
# Multilingual: tiny, base, small, medium, large

--model base.en  # NOT base-en or baseEn
```

### Error: Language code not recognized

**Symptom:**

```
ValueError: Language 'eng' not supported
```

**Cause:** Invalid language code

**Solution:**

```bash
# Use ISO 639-1 two-letter codes
--language en   # NOT eng or english
--language es   # NOT esp or spanish
--language fr   # NOT fra or french

# Full list: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
```

## Debugging Commands

### Enable Verbose Output

```bash
# Add verbose flag to see detailed progress
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a \
    --model base.en \
    --output_format txt \
    --fp16 False \
    --verbose True
```

### Check Docker Logs

```bash
# Save full Docker output to log file
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper /audio/recording.m4a --model base.en --fp16 False 2>&1 | tee whisper-debug.log

# Review log
cat whisper-debug.log
```

### Inspect Running Container

```bash
# Start container in interactive mode
docker run --rm -it \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  /bin/bash

# Inside container, run commands manually
whisper /audio/recording.m4a --model base.en --fp16 False
ls -la /audio/
exit
```

## Getting Help

If errors persist after trying solutions above:

1. **Check Docker logs:** `docker logs [container_id]`
2. **Verify environment:**
   ```bash
   docker --version
   ffmpeg -version
   ls -la /path/to/audio/file.m4a
   ```
3. **Minimal reproduction:**
   ```bash
   # Test with simple 5-second audio file
   ffmpeg -f lavfi -i sine=frequency=1000:duration=5 test.wav
   docker run --rm -v "$(pwd):/audio" ghcr.io/praetorian-inc/whisper-transcribe:latest whisper /audio/test.wav --model base.en --fp16 False
   ```
4. **Report issue:** Include Docker version, OS, error message, and minimal reproduction steps

## Error Prevention Checklist

Before transcribing, verify:

- [ ] Docker is installed and running
- [ ] Docker image is pulled or built
- [ ] Audio file exists and is readable
- [ ] Volume mount path is correct
- [ ] Model cache volume is mounted (for performance)
- [ ] Model name is valid (base.en, not base-en)
- [ ] Output format is valid (txt, json, vtt, srt, tsv)
- [ ] `--fp16 False` is set (required for CPU)
