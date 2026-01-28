# Context Monitoring (Fingerprintx Development)

Programmatic access to token usage via Claude Code's local JSONL files.

## Data Source

Claude Code writes session data to:

```
~/.claude/projects/<project-name>/<session-id>.jsonl
```

Where `<project-name>` is the working directory path with `/` replaced by `-`.

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
PROJECT_PATH=$(pwd | tr '/' '-')
JSONL=$(ls -t ~/.claude/projects/"$PROJECT_PATH"/*.jsonl 2>/dev/null | head -1)

if [ -z "$JSONL" ]; then
  echo "No session JSONL found"
  exit 1
fi
```

### Get Current Context Size

```bash
LATEST=$(grep '"cache_read_input_tokens"' "$JSONL" | tail -1)
CACHE_READ=$(echo "$LATEST" | grep -o '"cache_read_input_tokens":[0-9]*' | cut -d: -f2)
CACHE_CREATE=$(echo "$LATEST" | grep -o '"cache_creation_input_tokens":[0-9]*' | cut -d: -f2)
INPUT=$(echo "$LATEST" | grep -o '"input_tokens":[0-9]*' | head -1 | cut -d: -f2)

CURRENT_CONTEXT=$((CACHE_READ + CACHE_CREATE + INPUT))
echo "Current context: $CURRENT_CONTEXT tokens"
```

## Fingerprintx Context Estimates

| Component         | Typical Size  | Context Impact            |
| ----------------- | ------------- | ------------------------- |
| Go plugin module  | 200-400 lines | Moderate                  |
| Protocol research | Variable      | Can be high with RFC docs |
| Test fixtures     | 100-300 lines | Low-moderate              |
| Docker setup      | 50-100 lines  | Low                       |
| Integration tests | 200-500 lines | Moderate                  |

**Note:** Protocol research can add significant context when loading RFC documents or service specifications.

## Threshold Guidelines

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
PROJECT_PATH=$(pwd | tr '/' '-')
JSONL=$(ls -t ~/.claude/projects/"$PROJECT_PATH"/*.jsonl 2>/dev/null | head -1)

if [ -z "$JSONL" ]; then
  echo "CONTEXT_CHECK: No session found"
  exit 0
fi

LATEST=$(grep '"cache_read_input_tokens"' "$JSONL" | tail -1)
CACHE_READ=$(echo "$LATEST" | grep -o '"cache_read_input_tokens":[0-9]*' | cut -d: -f2)
CACHE_CREATE=$(echo "$LATEST" | grep -o '"cache_creation_input_tokens":[0-9]*' | cut -d: -f2)
INPUT=$(echo "$LATEST" | grep -o '"input_tokens":[0-9]*' | head -1 | cut -d: -f2)

CACHE_READ=${CACHE_READ:-0}
CACHE_CREATE=${CACHE_CREATE:-0}
INPUT=${INPUT:-0}

CURRENT_CONTEXT=$((CACHE_READ + CACHE_CREATE + INPUT))
echo "CONTEXT_CHECK: $CURRENT_CONTEXT tokens"

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
