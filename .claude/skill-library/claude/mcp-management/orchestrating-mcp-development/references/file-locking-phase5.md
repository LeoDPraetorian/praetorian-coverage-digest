# File Locking for Phase 5 Parallel Architecture

**Foundation reference:** `orchestrating-multi-agent-workflows` Pattern 3.7, lines 143-152, references/file-locking.md

Phase 5 spawns tool-lead + security-lead in parallel. Both write to shared workspace and update MANIFEST.yaml. Requires lock coordination to prevent race conditions.

## File Ownership Map

| Agent         | Owned Files (exclusive write) | Shared Files (locked write) |
| ------------- | ----------------------------- | --------------------------- |
| tool-lead     | architecture-shared.md        | MANIFEST.yaml               |
| security-lead | security-assessment.md        | MANIFEST.yaml               |

**Conflict risk:** Both agents update MANIFEST.yaml `agents_contributed` array concurrently.

## Lock Protocol

### Setup (Before Phase 3)

```bash
OUTPUT_DIR=".claude/.output/mcp-wrappers/$TIMESTAMP-$SERVICE"
mkdir -p $OUTPUT_DIR/locks

# Create lock directory and initial MANIFEST.yaml
cat > $OUTPUT_DIR/MANIFEST.yaml <<EOF
agents_contributed: []
status: phase_3_in_progress
EOF
```

### Agent Handoff Prompts

**tool-lead spawn:**

````
Your workspace: $OUTPUT_DIR
Your exclusive file: architecture-shared.md (write freely)
Shared file: MANIFEST.yaml (use lock protocol)

**Lock Protocol for MANIFEST.yaml:**
1. Before writing MANIFEST.yaml:
   ```bash
   LOCK_FILE="$OUTPUT_DIR/locks/manifest.lock"
   MAX_WAIT=60  # seconds
   ELAPSED=0

   while [ -f "$LOCK_FILE" ] && [ $ELAPSED -lt $MAX_WAIT ]; do
     sleep 1
     ELAPSED=$((ELAPSED + 1))
   done

   if [ $ELAPSED -ge $MAX_WAIT ]; then
     echo "Lock timeout on MANIFEST.yaml. Another agent may be stuck."
     exit 1
   fi

   echo "$$@$(date +%s)" > "$LOCK_FILE"
````

2. Update MANIFEST.yaml (you now hold the lock)

3. After writing, release lock:
   ```bash
   rm -f "$LOCK_FILE"
   ```

**CRITICAL:** Always release lock, even if errors occur. Use trap for cleanup.

````

**security-lead spawn:** (same lock protocol in prompt)

### Verification (After Phase 3)

```bash
# Check both agents recorded in MANIFEST.yaml
AGENT_COUNT=$(yq '.agents_contributed | length' $OUTPUT_DIR/MANIFEST.yaml)
if [ "$AGENT_COUNT" -ne 2 ]; then
  echo "❌ CRITICAL: Expected 2 agents in MANIFEST.yaml, found $AGENT_COUNT"
  echo "Race condition detected. Check locks/ directory for stale locks."
  exit 1
fi

# Check for stale locks
if [ -f "$OUTPUT_DIR/locks/manifest.lock" ]; then
  echo "⚠️ WARNING: Stale lock detected. An agent may have crashed."
  cat "$OUTPUT_DIR/locks/manifest.lock"
fi
````

## Conflict Resolution

If verification fails:

1. **Missing agent entry:** Check agent output for errors. Re-spawn with lock protocol.
2. **Stale lock:** Remove lock file manually, verify MANIFEST.yaml integrity, document in phase-3-summary.md.
3. **Corrupted MANIFEST.yaml:** Restore from agent outputs, rebuild agents_contributed array.

## When NOT to Lock

Single-agent phases (1, 2, 5, 7, 9, 10, 11) do not need locks - only one writer exists.

Batched phases (4, 6, 8) process tools in sequence per batch, avoiding simultaneous writes to same tool's files. Lock only MANIFEST.yaml updates between batch boundaries.
