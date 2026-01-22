# Context Window Monitoring

**Foundation reference:** `orchestrating-multi-agent-workflows` Pattern 5.3, lines 336-344, references/context-monitoring.md

For MCPs with >15 tools, monitor token usage at phase transitions to prevent context degradation.

## Token Thresholds

| Threshold | Tokens   | Trigger              | Action                                     |
| --------- | -------- | -------------------- | ------------------------------------------ |
| Normal    | <105k    | -                    | No action, proceed normally                |
| Warning   | 105-140k | After Phase 3, 6, 8  | Review progress files, consider compaction |
| Critical  | 140-170k | Any phase transition | MANDATORY compaction before proceeding     |
| Emergency | >170k    | -                    | Immediate compaction + state persistence   |

## Monitoring Points

**Check token usage at:**

- After Phase 5 (Shared Architecture + Security Assessment)
- After each batch in Phase 4, 6, 8
- Before Phase 9 (P0 Compliance) - critical checkpoint
- After Phase 12 (Audit) - before completion

**Implementation:**

```bash
# Read Claude Code session JSONL for token count
SESSION_DIR=~/.config/claude-code/sessions
LATEST_SESSION=$(ls -t $SESSION_DIR | head -1)
TOKEN_COUNT=$(jq -s 'map(select(.usage)) | map(.usage.input_tokens + .usage.output_tokens) | add' "$SESSION_DIR/$LATEST_SESSION/conversation.jsonl")

echo "Current tokens: $TOKEN_COUNT"

if [ "$TOKEN_COUNT" -gt 140000 ]; then
  echo "⚠️ CRITICAL: Context at 70%+ (${TOKEN_COUNT} tokens). Mandatory compaction required."
  exit 1
elif [ "$TOKEN_COUNT" -gt 105000 ]; then
  echo "ℹ️ WARNING: Context at 50%+ (${TOKEN_COUNT} tokens). Consider compaction."
fi
```

## Compaction Protocol

**When critical threshold reached:**

1. **Persist current state to MANIFEST.yaml:**
   - Update all `agents_contributed` entries with latest status
   - Mark current phase as `status: in_progress`
   - Record token count at compaction time

2. **Generate phase summary:**

   ```bash
   cat > $OUTPUT_DIR/phase-$CURRENT_PHASE-summary.md <<EOF
   # Phase $CURRENT_PHASE Summary

   **Completed**: [list completed tasks]
   **In Progress**: [current task]
   **Pending**: [remaining tasks]
   **Issues**: [blockers or concerns]
   **Next Steps**: [immediate actions after compaction]
   EOF
   ```

3. **Compact context:**
   - Remove verbose agent outputs (keep summaries in MANIFEST.yaml)
   - Remove intermediate drafts
   - Keep: MANIFEST.yaml, phase summaries, current batch outputs

4. **Verify state integrity:**
   - Read MANIFEST.yaml and phase summaries
   - Confirm current position in workflow
   - Resume with next pending task

**See:** `persisting-progress-across-sessions` for detailed compaction patterns.

## Integration with Conditional Triggers

**Monitoring triggers automatically when >15 tools detected** (same threshold as progress persistence).
