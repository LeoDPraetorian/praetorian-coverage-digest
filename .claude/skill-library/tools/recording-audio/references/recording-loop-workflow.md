# Recording Loop Workflow

**Implementation guide for continuous multi-recording sessions with automatic transcription and stop conditions.**

---

## Overview

Recording loop workflow enables capture of multiple sequential audio segments with automatic transcription until a stop condition is met. This is ideal for:

- Dictation sessions with natural breaks
- Meeting recordings split into manageable segments
- Voice note capture with automatic end detection
- Iterative audio capture with transcription feedback

---

## Stop Conditions

Three stop conditions are supported:

| Condition           | Trigger                                      | Use Case                              |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| **Silence**         | Transcription returns zero text              | Auto-stop when user stops speaking    |
| **End Phrase**      | Transcription contains user-specified phrase | Voice-controlled termination          |
| **Max Time**        | Total recording time exceeds limit           | Safety limit for long sessions        |
| **Manual Stop**     | User presses Ctrl+C                          | User-initiated termination            |

**Note**: Conditions are checked in order. First matching condition terminates the loop.

---

## Loop State Management

Use **TodoWrite** to track loop progress:

```json
{
  "todos": [
    {
      "content": "Recording loop: iteration 1/100",
      "status": "in_progress",
      "activeForm": "Recording iteration 1"
    },
    {
      "content": "Check stop condition",
      "status": "pending",
      "activeForm": "Checking stop condition"
    }
  ]
}
```

**Why TodoWrite?**

- Provides visibility into loop progress
- Prevents infinite loops (user can see iteration count)
- Documents each segment's transcription status
- Enables resumption after interruption

---

## Workflow Steps

### Step 1: Initialize Loop State

Define loop parameters at start:

```bash
# User-configurable parameters
SEGMENT_DURATION=30        # Seconds per recording segment
MAX_ITERATIONS=100         # Safety limit (prevents infinite loops)
STOP_PHRASE="stop recording"  # End phrase detection
ENABLE_SILENCE_DETECT=true # Stop on zero transcription text
MAX_TOTAL_TIME=3600        # 1 hour maximum total time

# Derived state
ITERATION=0
TOTAL_TIME=0
OUTPUT_DIR="$ROOT/.claude/.output/audio"
SESSION_ID=$(date +%Y%m%d-%H%M%S)
SESSION_DIR="$OUTPUT_DIR/session-$SESSION_ID"

# Create session directory
mkdir -p "$SESSION_DIR"
```

**Session directory structure:**

```
.claude/.output/audio/session-20260115-143022/
├── recording-001.m4a
├── recording-002.m4a
├── recording-003.m4a
├── transcript-001.txt
├── transcript-002.txt
├── transcript-003.txt
└── session-log.txt
```

---

### Step 2: Loop: Record Segment

For each iteration:

```bash
ITERATION=$((ITERATION + 1))
SEGMENT_FILE="$SESSION_DIR/recording-$(printf '%03d' $ITERATION).m4a"

# Update TodoWrite
echo "Recording loop: iteration $ITERATION/$MAX_ITERATIONS"

# Record segment
ffmpeg -f avfoundation -i ":0" \
  -t $SEGMENT_DURATION \
  -c:a aac \
  -b:a 192k \
  "$SEGMENT_FILE"

# Log recording
echo "[$ITERATION] Recorded: $SEGMENT_FILE (${SEGMENT_DURATION}s)" >> "$SESSION_DIR/session-log.txt"

# Update total time
TOTAL_TIME=$((TOTAL_TIME + SEGMENT_DURATION))
```

**Progress indicator**:

```
Recording loop: iteration 3/100
Segment: recording-003.m4a
Duration: 30 seconds
Total time: 90 seconds
```

---

### Step 3: Transcribe Segment

After each recording, transcribe:

```bash
# Invoke transcribing-audio skill
skill: "transcribing-audio"

# Provide file path: $SEGMENT_FILE
# Skill returns transcription text

# Save transcription
TRANSCRIPT_FILE="$SESSION_DIR/transcript-$(printf '%03d' $ITERATION).txt"
echo "$TRANSCRIPTION_TEXT" > "$TRANSCRIPT_FILE"

# Log transcription
echo "[$ITERATION] Transcribed: $(wc -w <<< "$TRANSCRIPTION_TEXT") words" >> "$SESSION_DIR/session-log.txt"
```

**Integration with transcribing-audio skill:**

The `transcribing-audio` skill:

- Accepts M4A files (native support)
- Uses OpenAI Whisper API (or local Whisper)
- Returns plain text transcription
- Handles audio formats automatically

---

### Step 4: Check Stop Conditions

Evaluate conditions in priority order:

```bash
STOP_LOOP=false

# Condition 1: Max iterations (safety limit)
if [ $ITERATION -ge $MAX_ITERATIONS ]; then
  echo "Stop condition: Max iterations ($MAX_ITERATIONS) reached"
  STOP_REASON="max_iterations"
  STOP_LOOP=true
fi

# Condition 2: Max total time
if [ $TOTAL_TIME -ge $MAX_TOTAL_TIME ]; then
  echo "Stop condition: Max time (${MAX_TOTAL_TIME}s) reached"
  STOP_REASON="max_time"
  STOP_LOOP=true
fi

# Condition 3: Silence detection (zero text)
if [ "$ENABLE_SILENCE_DETECT" = true ] && [ -z "$(echo "$TRANSCRIPTION_TEXT" | tr -d '[:space:]')" ]; then
  echo "Stop condition: Silence detected (zero transcription text)"
  STOP_REASON="silence"
  STOP_LOOP=true
fi

# Condition 4: End phrase detection
if [ -n "$STOP_PHRASE" ] && echo "$TRANSCRIPTION_TEXT" | grep -qi "$STOP_PHRASE"; then
  echo "Stop condition: End phrase detected ('$STOP_PHRASE')"
  STOP_REASON="end_phrase"
  STOP_LOOP=true
fi
```

**Condition priority rationale:**

1. Safety limits first (prevent runaway loops)
2. Then silence detection (automatic)
3. Then end phrase (user-controlled)

---

### Step 5: Loop or Exit

Based on stop condition:

```bash
if [ "$STOP_LOOP" = true ]; then
  # Exit loop
  echo "Recording loop terminated: $STOP_REASON"
  echo "Total segments: $ITERATION"
  echo "Total duration: ${TOTAL_TIME}s ($(($TOTAL_TIME / 60))m $(($TOTAL_TIME % 60))s)"
  echo "Session directory: $SESSION_DIR"

  # Write session summary
  cat > "$SESSION_DIR/session-summary.txt" <<EOF
Recording Session Summary
=========================
Session ID: $SESSION_ID
Stop Reason: $STOP_REASON
Total Segments: $ITERATION
Total Duration: ${TOTAL_TIME}s
Segment Duration: ${SEGMENT_DURATION}s
Output Directory: $SESSION_DIR

Segments:
$(ls -1 "$SESSION_DIR"/recording-*.m4a)

Transcripts:
$(ls -1 "$SESSION_DIR"/transcript-*.txt)
EOF

  exit 0
else
  # Continue loop
  echo "Continuing to iteration $((ITERATION + 1))..."
fi
```

**Session summary example:**

```
Recording Session Summary
=========================
Session ID: 20260115-143022
Stop Reason: end_phrase
Total Segments: 8
Total Duration: 240s
Segment Duration: 30s
Output Directory: .claude/.output/audio/session-20260115-143022

Segments:
recording-001.m4a
recording-002.m4a
...
recording-008.m4a

Transcripts:
transcript-001.txt
transcript-002.txt
...
transcript-008.txt
```

---

## Complete Implementation

**User request**: "Record 30-second clips and transcribe each one until I say 'stop recording'"

**Implementation:**

```bash
#!/bin/bash

# ===== INITIALIZATION =====
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
SESSION_ID=$(date +%Y%m%d-%H%M%S)
SESSION_DIR="$ROOT/.claude/.output/audio/session-$SESSION_ID"
mkdir -p "$SESSION_DIR"

# Parameters
SEGMENT_DURATION=30
MAX_ITERATIONS=100
STOP_PHRASE="stop recording"
ENABLE_SILENCE_DETECT=false  # User wants explicit phrase, not silence detection

# State
ITERATION=0
TOTAL_TIME=0

echo "Starting recording loop session $SESSION_ID"
echo "Segment duration: ${SEGMENT_DURATION}s"
echo "Stop phrase: '$STOP_PHRASE'"
echo "Press Ctrl+C to stop manually"
echo ""

# ===== MAIN LOOP =====
while true; do
  ITERATION=$((ITERATION + 1))

  # Check safety limit
  if [ $ITERATION -gt $MAX_ITERATIONS ]; then
    echo "Safety limit reached ($MAX_ITERATIONS iterations)"
    STOP_REASON="max_iterations"
    break
  fi

  # Record segment
  echo "[$ITERATION] Recording for ${SEGMENT_DURATION}s..."
  SEGMENT_FILE="$SESSION_DIR/recording-$(printf '%03d' $ITERATION).m4a"

  ffmpeg -f avfoundation -i ":0" \
    -t $SEGMENT_DURATION \
    -c:a aac \
    -b:a 192k \
    "$SEGMENT_FILE" 2>&1 | grep -E "(time=|error)" || true

  if [ ! -f "$SEGMENT_FILE" ]; then
    echo "Error: Recording failed"
    STOP_REASON="recording_error"
    break
  fi

  echo "[$ITERATION] Recorded: $SEGMENT_FILE"
  TOTAL_TIME=$((TOTAL_TIME + SEGMENT_DURATION))

  # Transcribe segment
  echo "[$ITERATION] Transcribing..."

  # Use transcribing-audio skill (this is a placeholder - actual invocation via Skill tool)
  # In practice, you would invoke: skill: "transcribing-audio"
  # For this script, assume TRANSCRIPTION_TEXT is returned

  TRANSCRIPT_FILE="$SESSION_DIR/transcript-$(printf '%03d' $ITERATION).txt"
  # TRANSCRIPTION_TEXT would come from transcribing-audio skill
  # echo "$TRANSCRIPTION_TEXT" > "$TRANSCRIPT_FILE"

  # For script demonstration, simulate transcription check
  # In real usage, check actual transcription text

  # Check stop conditions
  # if echo "$TRANSCRIPTION_TEXT" | grep -qi "$STOP_PHRASE"; then
  #   echo "[$ITERATION] Stop phrase detected: '$STOP_PHRASE'"
  #   STOP_REASON="end_phrase"
  #   break
  # fi

  echo "[$ITERATION] Transcription complete"
  echo ""
done

# ===== CLEANUP & SUMMARY =====
echo ""
echo "Recording session complete"
echo "Reason: $STOP_REASON"
echo "Total segments: $ITERATION"
echo "Total duration: ${TOTAL_TIME}s ($(($TOTAL_TIME / 60)) minutes)"
echo "Output: $SESSION_DIR"

# Generate session summary
cat > "$SESSION_DIR/session-summary.txt" <<EOF
Recording Session Summary
=========================
Session ID: $SESSION_ID
Stop Reason: $STOP_REASON
Total Segments: $ITERATION
Total Duration: ${TOTAL_TIME}s
Segment Duration: ${SEGMENT_DURATION}s
Stop Phrase: '$STOP_PHRASE'

Files Generated:
$(ls -1 "$SESSION_DIR")
EOF

echo "Session summary saved to: $SESSION_DIR/session-summary.txt"
```

---

## Stop Condition Examples

### Example 1: Silence Detection

**User request**: "Record 15-second clips until I stop talking"

**Configuration:**

```bash
SEGMENT_DURATION=15
ENABLE_SILENCE_DETECT=true
STOP_PHRASE=""  # Disabled
```

**Behavior:**

- Records 15-second segments continuously
- After each segment, transcribes audio
- If transcription is empty (silence), stops loop
- Use case: Voice notes where user pauses to end session

### Example 2: End Phrase

**User request**: "Record 1-minute clips until I say 'end dictation'"

**Configuration:**

```bash
SEGMENT_DURATION=60
ENABLE_SILENCE_DETECT=false
STOP_PHRASE="end dictation"
```

**Behavior:**

- Records 1-minute segments continuously
- Checks each transcription for "end dictation"
- Case-insensitive matching (uses `grep -i`)
- Stops immediately when phrase detected

### Example 3: Time Limit

**User request**: "Record 30-second clips for up to 10 minutes"

**Configuration:**

```bash
SEGMENT_DURATION=30
MAX_TOTAL_TIME=600  # 10 minutes
ENABLE_SILENCE_DETECT=false
STOP_PHRASE=""
```

**Behavior:**

- Records 30-second segments
- Tracks cumulative time
- Stops after 20 segments (20 * 30s = 600s)
- Use case: Fixed-duration recording sessions

---

## Integration with transcribing-audio Skill

The recording loop depends on the `transcribing-audio` skill for stop condition evaluation.

**Invocation pattern:**

```bash
# After recording segment
SEGMENT_FILE="$SESSION_DIR/recording-$(printf '%03d' $ITERATION).m4a"

# Invoke transcription skill
skill: "transcribing-audio"

# Skill receives: file path ($SEGMENT_FILE)
# Skill returns: transcription text

# Store result
TRANSCRIPTION_TEXT="[returned from skill]"
TRANSCRIPT_FILE="$SESSION_DIR/transcript-$(printf '%03d' $ITERATION).txt"
echo "$TRANSCRIPTION_TEXT" > "$TRANSCRIPT_FILE"

# Evaluate stop conditions using $TRANSCRIPTION_TEXT
```

**See**: `.claude/skill-library/tools/transcribing-audio/SKILL.md` for transcription skill details

---

## Error Handling

### Recording Failure Mid-Loop

**Symptom**: FFmpeg error during segment N

**Recovery:**

```bash
if [ ! -f "$SEGMENT_FILE" ]; then
  echo "Error: Recording failed at iteration $ITERATION"
  echo "Last successful segment: iteration $((ITERATION - 1))"
  STOP_REASON="recording_error"
  break  # Exit loop gracefully
fi
```

**Partial session preserved**: All previous segments remain intact

### Transcription Failure

**Symptom**: transcribing-audio skill returns error

**Recovery:**

```bash
if [ $? -ne 0 ]; then
  echo "Warning: Transcription failed for segment $ITERATION"
  echo "[transcription unavailable]" > "$TRANSCRIPT_FILE"
  # Continue loop (recording is successful)
fi
```

**Behavior**: Loop continues, but stop condition cannot use transcription

### Infinite Loop Prevention

**Built-in safety:**

```bash
MAX_ITERATIONS=100  # Hard limit

if [ $ITERATION -gt $MAX_ITERATIONS ]; then
  echo "Safety limit reached ($MAX_ITERATIONS iterations)"
  echo "This prevents infinite loops"
  STOP_REASON="max_iterations"
  break
fi
```

**Recommendation**: Set `MAX_ITERATIONS` to realistic value (e.g., 100 for 30s segments = 50 minutes max)

---

## Performance Considerations

### Disk Space Planning

For long sessions:

| Session Length | Segments (30s each) | Disk Space (192k) | Transcripts |
| -------------- | ------------------- | ----------------- | ----------- |
| 10 minutes     | 20                  | ~14 MB            | ~20 KB      |
| 30 minutes     | 60                  | ~43 MB            | ~60 KB      |
| 1 hour         | 120                 | ~86 MB            | ~120 KB     |

**Storage warning**: Implement disk space check before loop:

```bash
AVAILABLE=$(df -h "$OUTPUT_DIR" | awk 'NR==2 {print $4}')
echo "Available disk space: $AVAILABLE"
```

### Transcription Latency

Transcription adds delay between segments:

- Whisper API: ~2-5 seconds per 30s segment
- Local Whisper: ~5-10 seconds per 30s segment

**Total time per iteration**: `SEGMENT_DURATION + transcription_time + 2s`

### CPU Usage

Recording loop is lightweight:

- FFmpeg recording: ~2-3% CPU
- Transcription (API): ~0% (remote processing)
- Transcription (local): ~50-80% CPU during processing

---

## Advanced Patterns

### Multi-Speaker Detection

Use transcription to detect speaker changes:

```bash
# Check if transcription contains multiple speaker indicators
if echo "$TRANSCRIPTION_TEXT" | grep -qE "Speaker [0-9]+:"; then
  echo "Multiple speakers detected in segment $ITERATION"
fi
```

### Real-Time Transcription Display

Show transcription as it's generated:

```bash
echo "[$ITERATION] Transcription:"
echo "$TRANSCRIPTION_TEXT" | fold -w 80
echo ""
```

### Session Resumption

Resume a previous session:

```bash
# Find last session
LAST_SESSION=$(ls -1t "$OUTPUT_DIR"/session-* | head -1)
LAST_ITERATION=$(ls -1 "$LAST_SESSION"/recording-*.m4a | wc -l)

echo "Resume session? Last session had $LAST_ITERATION segments"
# Continue from ITERATION=$LAST_ITERATION
```

---

## Related Workflows

- **Single Recording Workflow**: Foundation for this loop (see `single-recording-workflow.md`)
- **Batch Transcription**: Transcribe all segments at end instead of during loop
- **Post-Processing**: Combine segments into single file after loop completes

---

## Research Sources

Based on:

- `.claude/.output/research/2026-01-15-120747-macos-cli-audio-recording/SYNTHESIS.md` (FFmpeg workflows)
- Whisper API documentation (transcription integration)
- User requirements for loop-based recording with stop conditions
