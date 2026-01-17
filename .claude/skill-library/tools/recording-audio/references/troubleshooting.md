# Troubleshooting Audio Recording

**Comprehensive troubleshooting guide for FFmpeg audio recording issues on macOS.**

---

## Quick Diagnosis

Use this flowchart to identify the issue:

```
Recording fails immediately?
├─ Yes → Check permissions (Section 1)
└─ No → Recording completes but...
    ├─ File is silent → Check device index (Section 2)
    ├─ File is too large → Check bitrate settings (Section 3)
    ├─ Quality is poor → Check codec/sample rate (Section 4)
    └─ FFmpeg crashes → Check FFmpeg installation (Section 5)
```

---

## Section 1: Permission Errors

### Error: "Error opening input device"

**Full error message:**

```
[AVFoundation indev @ 0x...] Error opening input device: No such file or directory
:0: Input/output error
```

**Cause**: Terminal app lacks microphone permission

**Solution:**

1. **Open System Settings** (macOS 13+) or System Preferences (macOS 12 and earlier)
2. **Navigate to Privacy & Security → Microphone**
3. **Find your terminal app**:
   - Terminal (default macOS terminal)
   - iTerm2
   - Warp
   - VS Code integrated terminal
   - Other terminal emulator
4. **Enable the checkbox** next to the app name
5. **Restart terminal** (critical - permissions don't apply until restart)
6. **Verify**: Look for orange dot in menu bar during recording

**Verification command:**

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

**If successful**, you'll see a list of devices. If still failing, permission is not applied.

### Error: "Operation not permitted"

**Full error message:**

```
[AVFoundation indev @ 0x...] Cannot use AVFoundation: Operation not permitted
```

**Cause**: System Integrity Protection (SIP) blocking access

**Solution:**

This usually indicates:

1. Terminal not in the Microphone permissions list (add it)
2. Running from a sandboxed environment (use native Terminal app)
3. macOS security update changed permissions (reboot macOS)

**Workaround**:

```bash
# Use native Terminal.app instead of third-party terminal
open -a Terminal
```

---

## Section 2: Silent Recording (No Audio)

### Symptom: File created but contains no audio

**Diagnosis:**

```bash
# Check file size
ls -lh output.m4a

# If file is very small (< 10KB for 30s recording), likely silent

# Check audio stream info
ffmpeg -i output.m4a 2>&1 | grep "Audio:"

# Expected: Audio: aac ... 44100 Hz, mono, ...
# If "No audio", file is definitely silent
```

**Cause 1: Wrong device index**

**Solution**: List devices and try different indices

```bash
# List all audio devices
ffmpeg -f avfoundation -list_devices true -i ""

# Try device 0
ffmpeg -f avfoundation -i ":0" -t 5 test-0.m4a

# Try device 1
ffmpeg -f avfoundation -i ":1" -t 5 test-1.m4a

# Try device 2
ffmpeg -f avfoundation -i ":2" -t 5 test-2.m4a

# Play back to test
afplay test-0.m4a
afplay test-1.m4a
afplay test-2.m4a
```

**Cause 2: Microphone muted in system**

**Solution**: Check Sound settings

1. System Settings → Sound → Input
2. Verify input level meter moves when speaking
3. Verify input volume is not zero
4. Test microphone in Voice Memos app

**Cause 3: Microphone physically muted**

**Solution**: Check hardware

- External USB microphone: check mute button
- Bluetooth headset: check mute button
- Built-in microphone: check if camera privacy cover is blocking mic

---

## Section 3: File Size Issues

### Symptom: File too large

**Expected file sizes:**

| Duration | 128k     | 192k     | 256k     |
| -------- | -------- | -------- | -------- |
| 30 sec   | 480 KB   | 720 KB   | 960 KB   |
| 5 min    | 4.8 MB   | 7.2 MB   | 9.6 MB   |
| 1 hour   | 58 MB    | 86 MB    | 115 MB   |

**If file is significantly larger** (2-10x expected size):

**Cause 1: Using uncompressed format**

**Diagnosis:**

```bash
ffmpeg -i output.m4a 2>&1 | grep "Audio:"

# Bad: Audio: pcm_s16le ... (uncompressed)
# Good: Audio: aac ... (compressed)
```

**Solution**: Explicitly specify AAC codec

```bash
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 192k output.m4a
```

**Cause 2: Excessive bitrate**

**Solution**: Lower bitrate

```bash
# Was using: -b:a 512k (unnecessarily high)
# Use instead: -b:a 192k (general purpose) or -b:a 128k (voice)
```

### Symptom: File too small or corrupt

**If file is unexpectedly small** (< 50% expected size):

**Cause**: Recording interrupted or device disconnected

**Diagnosis:**

```bash
# Check actual duration
ffmpeg -i output.m4a 2>&1 | grep Duration

# Expected: Duration: 00:00:30.04
# If much shorter, recording was interrupted
```

**Solution**: Ensure recording completes

```bash
# Add error checking
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a
if [ $? -ne 0 ]; then
  echo "Recording failed"
  exit 1
fi
```

---

## Section 4: Quality Issues

### Symptom: Audio sounds distorted or robotic

**Cause 1: Bitrate too low**

**Solution**: Increase bitrate

```bash
# Voice: 128k minimum
# Music: 192k minimum (preferably 256k)

ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac -b:a 256k output.m4a
```

**Cause 2: Wrong sample rate**

**Solution**: Use standard sample rates

```bash
# Voice: 44100 Hz (CD quality)
# Music: 48000 Hz (professional)

ffmpeg -f avfoundation -i ":0" -t 30 -ar 48000 output.m4a
```

### Symptom: Background noise or hiss

**Cause**: High input gain

**Solution**: Adjust input volume

1. System Settings → Sound → Input
2. Reduce input volume slider
3. Test with: `afplay -v 1.0 output.m4a`

**Post-processing option**:

```bash
# Apply noise reduction (requires additional tools)
ffmpeg -i noisy.m4a -af "highpass=f=200, lowpass=f=3000" clean.m4a
```

### Symptom: Audio cutting out (dropouts)

**Cause**: CPU overload or disk I/O bottleneck

**Solution**: Reduce encoding complexity

```bash
# Lower bitrate
ffmpeg -f avfoundation -i ":0" -t 30 -b:a 128k output.m4a

# Or use faster encoding preset
ffmpeg -f avfoundation -i ":0" -t 30 -compression_level 0 output.m4a
```

---

## Section 5: FFmpeg Installation Issues

### Error: "ffmpeg: command not found"

**Cause**: FFmpeg not installed or not in PATH

**Solution**: Install via Homebrew

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg

# Verify installation
which ffmpeg
ffmpeg -version
```

### Error: "Unknown input format: 'avfoundation'"

**Cause**: FFmpeg compiled without AVFoundation support

**Diagnosis:**

```bash
ffmpeg -formats 2>&1 | grep avfoundation

# Expected: D. avfoundation   AVFoundation input device
# If not found, FFmpeg lacks AVFoundation support
```

**Solution**: Reinstall FFmpeg with full options

```bash
brew uninstall ffmpeg
brew install ffmpeg --with-avfoundation  # Older Homebrew syntax
# Or
brew install ffmpeg  # Modern Homebrew (includes AVFoundation by default)
```

### Error: FFmpeg crashes with "Illegal instruction"

**Cause**: FFmpeg binary incompatible with CPU architecture

**Solution**: Reinstall native version

```bash
# For Apple Silicon (M1/M2/M3)
arch -arm64 brew install ffmpeg

# For Intel
arch -x86_64 brew install ffmpeg
```

---

## Section 6: Workflow-Specific Issues

### Recording Loop Stops Prematurely

**Symptom**: Loop exits after 1-2 iterations instead of continuing

**Cause**: Stop condition triggered unintentionally

**Diagnosis:**

Check stop condition logic:

```bash
# If using silence detection
if [ -z "$TRANSCRIPTION_TEXT" ]; then
  echo "Stop condition: silence detected"
  # Was TRANSCRIPTION_TEXT actually empty, or is there a bug?
fi

# If using end phrase
if echo "$TRANSCRIPTION_TEXT" | grep -qi "stop recording"; then
  echo "Stop condition: end phrase detected"
  # Did user accidentally say the end phrase?
fi
```

**Solution**: Log stop conditions

```bash
echo "Iteration $ITERATION: transcription = '$TRANSCRIPTION_TEXT'" >> session.log
```

### Transcription Integration Fails

**Symptom**: Recording succeeds but transcription fails

**Diagnosis:**

```bash
# Check if transcribing-audio skill is available
skill: "transcribing-audio"

# Check file format compatibility
ffmpeg -i recording.m4a 2>&1 | grep "Audio:"

# transcribing-audio expects: AAC, MP3, WAV, FLAC
```

**Solution**: Ensure compatible format

```bash
# M4A (AAC) is supported
ffmpeg -f avfoundation -i ":0" -t 30 -c:a aac output.m4a

# If transcription fails, try WAV format
ffmpeg -f avfoundation -i ":0" -t 30 -c:a pcm_s16le -f wav output.wav
```

---

## Section 7: Advanced Diagnostics

### Enable FFmpeg Debug Logging

```bash
ffmpeg -loglevel debug -f avfoundation -i ":0" -t 5 output.m4a 2>&1 | tee debug.log

# Review debug.log for detailed diagnostics
grep -i error debug.log
grep -i warning debug.log
```

### Check AVFoundation Device Accessibility

```bash
# List devices with verbose output
ffmpeg -loglevel verbose -f avfoundation -list_devices true -i "" 2>&1

# Look for device properties:
# - Device name
# - Device ID
# - Supported formats
# - Frame rates
```

### Monitor System Resources During Recording

```bash
# Monitor CPU and memory usage
top -pid $(pgrep ffmpeg) -stats pid,command,cpu,mem

# Monitor disk I/O
iostat -d 1

# Monitor available disk space
watch -n 1 df -h .
```

---

## Section 8: Platform-Specific Issues

### macOS Version Compatibility

| macOS Version    | FFmpeg AVFoundation | Notes                                     |
| ---------------- | ------------------- | ----------------------------------------- |
| macOS 10.15+     | ✅ Fully supported  | Recommended                               |
| macOS 10.14      | ⚠️ Limited support  | May require older FFmpeg version          |
| macOS 10.13 and earlier | ❌ Not supported | Upgrade macOS or use QuickTime/CoreAudio |

### Apple Silicon (M1/M2/M3) vs Intel

**No functional difference**, but ensure native binary:

```bash
# Check architecture
file $(which ffmpeg)

# Expected on Apple Silicon:
# /opt/homebrew/bin/ffmpeg: Mach-O 64-bit executable arm64

# Expected on Intel:
# /usr/local/bin/ffmpeg: Mach-O 64-bit executable x86_64
```

### Permission Changes in macOS 14+

macOS 14 (Sonoma) introduced stricter microphone permissions:

- Orange dot always visible when mic active
- Permission prompts more frequent
- Need to re-grant after OS update

**Solution**: Check and re-enable microphone permissions after macOS updates

---

## Section 9: Error Message Reference

### Common Error Messages

| Error Message                           | Cause                      | Solution                    |
| --------------------------------------- | -------------------------- | --------------------------- |
| `Error opening input device`            | Missing mic permission     | Enable in System Settings   |
| `Operation not permitted`               | SIP blocking access        | Use native Terminal app     |
| `Unknown input format: 'avfoundation'`  | FFmpeg lacks AVFoundation  | Reinstall FFmpeg            |
| `Device or resource busy`               | Mic in use by other app    | Close other audio apps      |
| `Cannot find a matching stream`         | Invalid device index       | List devices, use correct index |
| `No such file or directory`             | Invalid output path        | Verify directory exists     |
| `Invalid data found when processing`    | Corrupted recording        | Check disk space, re-record |

---

## Section 10: Prevention Best Practices

### Pre-Recording Checklist

Before starting any recording:

```bash
# 1. Verify FFmpeg installed
which ffmpeg || echo "Install FFmpeg first"

# 2. Verify microphone permission
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -q "audio devices" || echo "Check permissions"

# 3. Verify output directory exists
OUTPUT_DIR=".claude/.output/audio"
mkdir -p "$OUTPUT_DIR"

# 4. Verify disk space (require 100MB free)
AVAILABLE=$(df -k "$OUTPUT_DIR" | awk 'NR==2 {print $4}')
[ $AVAILABLE -gt 102400 ] || echo "Low disk space"

# 5. Test 5-second recording
ffmpeg -f avfoundation -i ":0" -t 5 "$OUTPUT_DIR/test.m4a"
[ -f "$OUTPUT_DIR/test.m4a" ] && echo "Pre-flight check: PASS" || echo "Pre-flight check: FAIL"
```

### Error Handling Template

```bash
#!/bin/bash

# Error handling function
handle_error() {
  echo "Error: $1"
  echo "See troubleshooting guide: references/troubleshooting.md"
  exit 1
}

# Example: Recording with error handling
ffmpeg -f avfoundation -i ":0" -t 30 output.m4a 2>&1 | tee ffmpeg.log

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  if grep -q "Error opening input device" ffmpeg.log; then
    handle_error "Microphone permission denied. Enable in System Settings → Privacy & Security → Microphone"
  elif grep -q "Device or resource busy" ffmpeg.log; then
    handle_error "Microphone in use by another app. Close other audio apps."
  else
    handle_error "Recording failed with exit code $EXIT_CODE. Check ffmpeg.log for details."
  fi
fi

echo "Recording successful: output.m4a"
```

---

## Section 11: When to Seek Help

If troubleshooting steps don't resolve the issue:

### Gather Diagnostic Information

```bash
# System info
sw_vers

# FFmpeg version
ffmpeg -version

# FFmpeg build configuration
ffmpeg -buildconf

# Device list
ffmpeg -f avfoundation -list_devices true -i "" 2>&1

# Debug recording attempt
ffmpeg -loglevel debug -f avfoundation -i ":0" -t 5 test.m4a 2>&1 > debug-output.txt
```

### Where to Get Help

1. **FFmpeg community**:
   - FFmpeg mailing list: https://ffmpeg.org/contact.html
   - FFmpeg IRC: #ffmpeg on Libera.Chat
2. **macOS audio forums**:
   - Apple Support Communities
   - Stack Overflow (tag: ffmpeg, macos, avfoundation)
3. **Include in support request**:
   - macOS version
   - FFmpeg version
   - Full error message
   - Output of diagnostic commands above

---

## Research Sources

Based on:

- `.claude/.output/research/2026-01-15-120747-macos-cli-audio-recording/SYNTHESIS.md` (security, permissions)
- FFmpeg documentation - Troubleshooting AVFoundation
- macOS Security Model - TCC (Transparency, Consent, and Control)
- Community troubleshooting guides from GitHub issues and Stack Overflow
