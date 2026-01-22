# Context Monitoring (Integration Development)

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

| Token Type                    | Meaning                              | Counts Against Context?     |
| ----------------------------- | ------------------------------------ | --------------------------- |
| `cache_read_input_tokens`     | Conversation history read from cache | Yes - this IS the context   |
| `cache_creation_input_tokens` | New content being cached             | Yes - added to context      |
| `input_tokens`                | New non-cached input                 | Yes - added to context      |
| `output_tokens`               | Model's response                     | Separate from input context |

**Important:** Usage data only exists on assistant message entries. User messages, tool calls, and tool results do not contain usage fields. Always filter for entries containing `cache_read_input_tokens` to get valid usage data.

### Get Cumulative Session Tokens (for cost tracking)

If you need TOTAL tokens used in session (for cost estimation, not context size):

```bash
# Sum all input tokens across session (for cost tracking only)
TOTAL_INPUT=$(grep -o '"input_tokens":[0-9]*' "$JSONL" | cut -d: -f2 | awk '{s+=$1}END{print s}')
TOTAL_OUTPUT=$(grep -o '"output_tokens":[0-9]*' "$JSONL" | cut -d: -f2 | awk '{s+=$1}END{print s}')
TOTAL_CACHE_CREATE=$(grep -o '"cache_creation_input_tokens":[0-9]*' "$JSONL" | cut -d: -f2 | awk '{s+=$1}END{print s}')

echo "Session totals - Input: $TOTAL_INPUT, Output: $TOTAL_OUTPUT, Cache created: $TOTAL_CACHE_CREATE"
```

**Note:** Cumulative totals are for COST tracking. For CONTEXT SIZE, always use the latest entry method.

### Get Message Count

```bash
# Count assistant responses (proxy for turn count)
grep -c '"type":"assistant"' "$JSONL"
```

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

## Integration Development Context Estimates

For integration workflows, typical context consumption:

| Phase                 | Estimated Tokens | Notes                            |
| --------------------- | ---------------- | -------------------------------- |
| Setup + Triage        | 5-10k            | Light context                    |
| Codebase Discovery    | 15-25k           | Scanning existing integrations   |
| Architecture Planning | 20-30k           | Client/Collector design          |
| Implementation        | 30-50k           | Heaviest - multiple agent spawns |
| Review + Testing      | 20-30k           | P0 compliance checks             |

**Integration-specific guidance:**

- Large API responses from vendor discovery can spike context
- P0 compliance tables add ~2-3k tokens each check
- Mock server patterns in testing phase are context-heavy

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

echo "CONTEXT_CHECK: $CURRENT_CONTEXT tokens (cache_read: $CACHE_READ, cache_create: $CACHE_CREATE, input: $INPUT), $MESSAGES messages"

if [ "$CURRENT_CONTEXT" -gt 170000 ]; then
  echo "CONTEXT_STATUS: BLOCKED - Hook will prevent agent spawn (>85% of 200k)"
  exit 2
elif [ "$CURRENT_CONTEXT" -gt 160000 ]; then
  echo "CONTEXT_STATUS: MUST COMPACT - Compact NOW before proceeding (>80% of 200k)"
  exit 2
elif [ "$CURRENT_CONTEXT" -gt 150000 ]; then
  echo "CONTEXT_STATUS: SHOULD COMPACT - Proactive compaction recommended (>75% of 200k)"
  exit 1
else
  echo "CONTEXT_STATUS: OK ($((CURRENT_CONTEXT * 100 / 200000))% of 200k)"
  exit 0
fi
```

### Log to MANIFEST.yaml

Include token metrics in MANIFEST.yaml:

```yaml
metrics:
  tokens:
    checked_at: "2026-01-17T12:00:00Z"
    input_tokens: 95000
    output_tokens: 12000
    total_tokens: 107000
    context_percentage: 53.5
    message_count: 28
    compaction_triggered: false
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
5. **Context vs Cumulative**: The scripts measure CURRENT context window usage (latest entry), not cumulative tokens used in session. For cost tracking, sum all entries. For context monitoring, use latest entry only.

## Troubleshooting

**No JSONL found:**

- Verify project path conversion: `echo $(pwd | tr '/' '-')`
- Check if directory exists: `ls ~/.claude/projects/`
- May need to start a new session first

**Token count seems wrong:**

- Cache tokens are separate from input tokens
- Output tokens are model responses, not user input
- Multiple grep matches may include nested objects

---

## Related References

- [compaction-gates.md](compaction-gates.md) - Compaction protocol
- [checkpoint-configuration.md](checkpoint-configuration.md) - When to checkpoint
