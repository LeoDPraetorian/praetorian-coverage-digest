# Context Monitoring (Capability Development)

Programmatic access to token usage via Claude Code's local JSONL files.

## Data Source

Claude Code writes session data to:

```
~/.claude/projects/<project-name>/<session-id>.jsonl
```

Where `<project-name>` is the working directory path with `/` replaced by `-`.

Example: `/Users/nathan/my-project` → `-Users-nathan-my-project`

## JSONL Structure

Each line is a JSON object. API responses include usage data:

```json
{
  "type": "assistant",
  "message": { ... },
  "usage": {
    "input_tokens": 15000,
    "output_tokens": 2000,
    "cache_creation_input_tokens": 35420,
    "cache_read_input_tokens": 12000
  },
  "timestamp": "2026-01-17T12:00:00Z"
}
```

## Token Calculation Scripts

### Find Current Session JSONL

```bash
# Convert current directory to Claude's project path format
PROJECT_PATH=$(pwd | tr '/' '-')

# Find most recently modified JSONL in that project
JSONL=$(ls -t ~/.claude/projects/"$PROJECT_PATH"/*.jsonl 2>/dev/null | head -1)

if [ -z "$JSONL" ]; then
  echo "No session JSONL found"
  exit 1
fi
```

### Get Current Context Size (CORRECT METHOD)

The context window is determined by the **latest message's** token counts:

```bash
# Get the latest entry that HAS usage data (assistant responses only)
LATEST=$(grep '"cache_read_input_tokens"' "$JSONL" | tail -1)

# Extract cache and input tokens from latest entry
CACHE_READ=$(echo "$LATEST" | grep -o '"cache_read_input_tokens":[0-9]*' | cut -d: -f2)
CACHE_CREATE=$(echo "$LATEST" | grep -o '"cache_creation_input_tokens":[0-9]*' | cut -d: -f2)
INPUT=$(echo "$LATEST" | grep -o '"input_tokens":[0-9]*' | head -1 | cut -d: -f2)

# Current context = what's cached + what's new
CURRENT_CONTEXT=$((CACHE_READ + CACHE_CREATE + INPUT))
echo "Current context: $CURRENT_CONTEXT tokens"
```

### Understanding the Token Types

| Token Type                    | Meaning                              | Counts Against Context?      |
| ----------------------------- | ------------------------------------ | ---------------------------- |
| `cache_read_input_tokens`     | Conversation history read from cache | ✅ Yes - this IS the context |
| `cache_creation_input_tokens` | New content being cached             | ✅ Yes - added to context    |
| `input_tokens`                | New non-cached input                 | ✅ Yes - added to context    |
| `output_tokens`               | Model's response                     | Separate from input context  |

**Important:** Usage data only exists on assistant message entries. User messages, tool calls, and tool results do not contain usage fields.

## Capability Development Context Estimates

| Capability Type      | Typical Size       | Context Impact |
| -------------------- | ------------------ | -------------- |
| VQL capabilities     | 100-300 lines      | Low            |
| Nuclei templates     | YAML, 50-200 lines | Low            |
| Janus tool chains    | 200-500 lines      | Moderate       |
| fingerprintx modules | 200-400 lines      | Moderate       |

**Note:** Capability development typically has lower context overhead than frontend/backend work due to smaller file sizes.

## Threshold Guidelines

Based on Claude's context window limits:

| Model  | Context Window | 75% (SHOULD) | 80% (MUST) | 85% (BLOCKED) |
| ------ | -------------- | ------------ | ---------- | ------------- |
| Sonnet | 200k           | 150k         | 160k       | 170k          |
| Opus   | 200k           | 150k         | 160k       | 170k          |
| Haiku  | 200k           | 150k         | 160k       | 170k          |

**Layered enforcement model:**

| Threshold  | Layer       | Action                                                |
| ---------- | ----------- | ----------------------------------------------------- |
| 60% (120k) | Awareness   | Log warning, plan compaction at next gate             |
| 75% (150k) | Guidance    | **SHOULD compact** - proactive compaction recommended |
| 80% (160k) | Guidance    | **MUST compact** - compact NOW before proceeding      |
| 85% (170k) | Enforcement | **BLOCKED** - hook prevents agent spawn               |
| 95% (190k) | Emergency   | Summarize and checkpoint before continuing            |

See [compaction-gates.md](compaction-gates.md) for the BLOCKING compaction protocol.

## Orchestration Integration

### Check Before Phase Transition

```bash
#!/bin/bash
# check-context.sh - Run before major phase transitions

PROJECT_PATH=$(pwd | tr '/' '-')
JSONL=$(ls -t ~/.claude/projects/"$PROJECT_PATH"/*.jsonl 2>/dev/null | head -1)

if [ -z "$JSONL" ]; then
  echo "CONTEXT_CHECK: No session found"
  exit 0
fi

# Get LATEST entry's context (not cumulative) - must have usage data
LATEST=$(grep '"cache_read_input_tokens"' "$JSONL" | tail -1)
CACHE_READ=$(echo "$LATEST" | grep -o '"cache_read_input_tokens":[0-9]*' | cut -d: -f2)
CACHE_CREATE=$(echo "$LATEST" | grep -o '"cache_creation_input_tokens":[0-9]*' | cut -d: -f2)
INPUT=$(echo "$LATEST" | grep -o '"input_tokens":[0-9]*' | head -1 | cut -d: -f2)

# Handle missing values
CACHE_READ=${CACHE_READ:-0}
CACHE_CREATE=${CACHE_CREATE:-0}
INPUT=${INPUT:-0}

CURRENT_CONTEXT=$((CACHE_READ + CACHE_CREATE + INPUT))
MESSAGES=$(grep -c '"type":"assistant"' "$JSONL" 2>/dev/null || echo "0")

echo "CONTEXT_CHECK: $CURRENT_CONTEXT tokens, $MESSAGES messages"

if [ "$CURRENT_CONTEXT" -gt 170000 ]; then
  echo "CONTEXT_STATUS: BLOCKED (>85%)"
  exit 2
elif [ "$CURRENT_CONTEXT" -gt 160000 ]; then
  echo "CONTEXT_STATUS: MUST COMPACT (>80%)"
  exit 2
elif [ "$CURRENT_CONTEXT" -gt 150000 ]; then
  echo "CONTEXT_STATUS: SHOULD COMPACT (>75%)"
  exit 1
else
  echo "CONTEXT_STATUS: OK ($((CURRENT_CONTEXT * 100 / 200000))%)"
  exit 0
fi
```

## Alternative: Message Count Heuristic

If JSONL parsing is unreliable, use message count as proxy:

| Messages | Estimated Tokens | Action            |
| -------- | ---------------- | ----------------- |
| < 20     | < 60k            | Continue          |
| 20-40    | 60-120k          | Monitor           |
| 40-60    | 120-180k         | Compact           |
| > 60     | > 180k           | Emergency compact |

Estimation: ~3k tokens per message average (varies by content).

## Limitations

1. **Session ID unknown**: Must use most-recently-modified heuristic
2. **Cache tokens**: Cache read tokens don't count against context in same way
3. **File permissions**: JSONL files are user-readable only
4. **Cross-session**: Each session has separate JSONL, no aggregation
5. **Context vs Cumulative**: Scripts measure CURRENT context (latest entry), not cumulative
