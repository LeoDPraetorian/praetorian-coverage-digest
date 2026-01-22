# Phase 6→7 Transition Analysis: Context Window Monitoring

## Scenario Context

- **Service**: Linear API MCP wrapper development
- **Tool Count**: 20 tools
- **Current Position**: End of Phase 6 (batched implementation completed)
- **Next Phase**: Phase 7 (P0 Gate) - critical quality checkpoint

## What the UPDATED Skill Now Provides

### 1. Context Window Monitoring Section (Lines 83-156)

The updated skill adds a **dedicated Context Window Monitoring section** with comprehensive guidance:

#### Token Thresholds (Lines 91-96)

| Threshold     | Tokens   | Trigger              | Action                                     |
| ------------- | -------- | -------------------- | ------------------------------------------ |
| **Normal**    | <105k    | -                    | No action, proceed normally                |
| **Warning**   | 105-140k | After Phase 3, 6, 8  | Review progress files, consider compaction |
| **Critical**  | 140-170k | Any phase transition | MANDATORY compaction before proceeding     |
| **Emergency** | >170k    | -                    | Immediate compaction + state persistence   |

**Key Change**: Provides specific numeric thresholds rather than generic warnings.

#### Monitoring Points (Lines 99-104)

**Explicit checkpoints where token monitoring MUST occur:**

- After Phase 3 (Shared Architecture + Security Assessment)
- **After each batch in Phase 4, 6, 8** ← CRITICAL for our scenario
- **Before Phase 7 (P0 Gate) - critical checkpoint** ← DIRECTLY APPLIES
- After Phase 10 (Audit) - before completion

**Key Change**: Phase 6→7 transition explicitly called out as "critical checkpoint"

#### Implementation Script (Lines 107-122)

Provides **concrete Bash script** to check token usage:

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

**Key Change**: Actionable script, not just guidance. Can be run immediately.

### 2. Phase 7 Pre-Gate Checkpoint (phase-7-p0-gate.md, Lines 9-18)

The Phase 7 reference document now includes a **mandatory pre-gate checkpoint**:

```markdown
## Pre-Gate Checkpoint

**Before P0 gate, check token usage. If >140k, perform mandatory compaction per Context Window Monitoring protocol.**

For MCPs with >15 tools, context degradation at this transition can cause:

- Forgotten gate requirements
- Skipped compliance checks
- Incomplete violation documentation

**Action**: Run context monitoring script (from Context Window Monitoring section) before proceeding with P0 validation.
```

**Key Changes**:

- **Explicit blocker**: "If >140k, perform mandatory compaction"
- **Consequences listed**: What happens if you skip this (forgotten requirements, skipped checks, incomplete documentation)
- **Direct action**: Points to exact script to run

### 3. Compaction Protocol (Lines 125-156)

When critical threshold (140k tokens) reached, the skill provides **4-step protocol**:

#### Step 1: Persist Current State to MANIFEST.yaml

- Update all `agents_contributed` entries with latest status
- Mark current phase as `status: in_progress`
- **Record token count at compaction time** (new metadata field)

#### Step 2: Generate Phase Summary

Provides template:

```markdown
# Phase $CURRENT_PHASE Summary

**Completed**: [list completed tasks]
**In Progress**: [current task]
**Pending**: [remaining tasks]
**Issues**: [blockers or concerns]
**Next Steps**: [immediate actions after compaction]
```

#### Step 3: Compact Context

- Remove verbose agent outputs (keep summaries in MANIFEST.yaml)
- Remove intermediate drafts
- **Keep**: MANIFEST.yaml, phase summaries, current batch outputs

#### Step 4: Verify State Integrity

- Read MANIFEST.yaml and phase summaries
- Confirm current position in workflow
- Resume with next pending task

**Key Change**: Step-by-step procedure vs vague "clean up context"

### 4. Integration with Conditional Triggers (Lines 158-160)

**Monitoring triggers automatically when >15 tools detected** (same threshold as progress persistence).

For our 20-tool Linear scenario:

- Threshold: 15 tools ✓ (we have 20)
- **Action**: Monitoring is MANDATORY, not optional
- **When applied**: Automatically at phase transitions per monitoring points

### 5. Exit Criteria Updates (Lines 419-420)

Two new exit criteria added:

- ✅ Context monitoring performed at all phase transitions (for >15 tools)
- ✅ No phase executed above critical token threshold (140k)

**Key Change**: Workflow cannot claim completion without token monitoring compliance

## Step-by-Step Guidance for Phase 6→7 Transition (20 Tools)

### Given Context

- Linear API with 20 tools
- Phase 6 (Implementation) just completed all batches
- About to enter Phase 7 (P0 Gate)

### What the UPDATED Skill Tells You to Do

#### Step 1: Check Token Usage (MANDATORY)

**Location**: Lines 99-104, 107-122

**Action**:

```bash
# Run token monitoring script
SESSION_DIR=~/.config/claude-code/sessions
LATEST_SESSION=$(ls -t $SESSION_DIR | head -1)
TOKEN_COUNT=$(jq -s 'map(select(.usage)) | map(.usage.input_tokens + .usage.output_tokens) | add' "$SESSION_DIR/$LATEST_SESSION/conversation.jsonl")

echo "Current tokens: $TOKEN_COUNT"
```

**Why**: Phase 6→7 is listed as "critical checkpoint" (line 103)

#### Step 2: Evaluate Result Against Thresholds

**Location**: Lines 91-96

**Decision Tree**:

- **<105k tokens**: Proceed to Phase 7 P0 Gate normally (no action needed)
- **105-140k tokens**: Warning level
  - Review progress files
  - Consider compaction (optional but recommended)
  - Proceed with caution
- **140-170k tokens**: CRITICAL level
  - **MANDATORY compaction before proceeding**
  - Follow Compaction Protocol (lines 125-156)
  - Do NOT proceed until compacted
- **>170k tokens**: EMERGENCY level
  - Immediate compaction + state persistence
  - Likely need to restart session after saving

#### Step 3a: If <140k Tokens - Proceed to Phase 7

**Location**: phase-7-p0-gate.md, lines 20-72

**Action**: Execute P0 compliance validation for all 20 wrappers

- Verify 7 P0 requirements per tool
- Generate P0 Compliance Reports
- Handle violations via Human Checkpoint if needed

#### Step 3b: If ≥140k Tokens - Mandatory Compaction

**Location**: Lines 125-156

**Action**: Execute 4-step compaction protocol:

1. **Update MANIFEST.yaml**:

   ```yaml
   status: in_progress
   current_phase: 6
   current_batch: 7 # Assuming 7 batches of ~3 tools each
   token_count_at_compaction: 145000 # Example
   agents_contributed:
     - agent: tool-developer
       artifact: get-issue.ts
       status: complete
       iteration: 1
     # ... all 20 tools
   ```

2. **Generate phase-6-summary.md**:

   ```markdown
   # Phase 6 Summary

   **Completed**: 20/20 wrappers implemented across 7 batches
   **In Progress**: None (phase complete)
   **Pending**: Phase 7 (P0 Gate validation)
   **Issues**: No blockers
   **Next Steps**: Run P0 compliance checks on all 20 wrappers
   ```

3. **Compact context**:
   - Remove verbose agent outputs from Phase 4, 6
   - Keep: MANIFEST.yaml, phase-6-summary.md, all .ts files
   - Remove: Intermediate architecture drafts, verbose test outputs

4. **Verify state**:
   - Read MANIFEST.yaml
   - Confirm all 20 tools show `implementation: complete`
   - Resume with Phase 7 P0 Gate

#### Step 4: Proceed to Phase 7 with Clean Context

**Location**: phase-7-p0-gate.md, lines 20-72

**Action**: Now safe to proceed with P0 validation

## Warnings About Context Degradation (NEW)

**Location**: phase-7-p0-gate.md, lines 11-17

The skill explicitly warns about consequences of context degradation at this transition:

> For MCPs with >15 tools, context degradation at this transition can cause:
>
> - Forgotten gate requirements
> - Skipped compliance checks
> - Incomplete violation documentation

**Translation**: If you skip token monitoring and context is >140k:

- You might forget to check all 7 P0 requirements
- You might skip tools in validation
- You might not document violations properly
- **Result**: Failed gate, wasted work, need to redo

## What Was Missing in Original Skill

### Before (Original Skill)

1. ❌ No explicit token thresholds (vague "monitor context")
2. ❌ No script to check token usage (how to monitor?)
3. ❌ No Phase 6→7 transition guidance (generic "phase transitions")
4. ❌ No consequences listed (why should I care?)
5. ❌ No compaction protocol (what does "clean up" mean?)
6. ❌ No pre-gate checkpoint in Phase 7 (easy to forget)
7. ❌ No exit criteria for token monitoring (optional?)

### After (Updated Skill)

1. ✅ **Specific thresholds**: 105k (warning), 140k (critical), 170k (emergency)
2. ✅ **Executable script**: Lines 107-122, copy-paste ready
3. ✅ **Phase 6→7 explicit**: "Before Phase 7 (P0 Gate) - critical checkpoint"
4. ✅ **Consequences listed**: Forgotten requirements, skipped checks, incomplete documentation
5. ✅ **4-step compaction protocol**: MANIFEST update, phase summary, compact, verify
6. ✅ **Pre-Gate Checkpoint section**: Lines 9-18 in phase-7-p0-gate.md
7. ✅ **Mandatory exit criteria**: Lines 419-420, cannot complete without monitoring

## Token Budget Example for 20-Tool Service

**Location**: large-service-handling.md, lines 198-212

The skill provides calculation for our exact scenario:

```typescript
// Service with 20 tools (Linear example)
const TOOLS_COUNT = 20;
const TOKEN_BUDGET = 200_000; // Total session budget
const SAFETY_MARGIN = 0.15; // Reserve 15% for overhead
const USABLE_BUDGET = TOKEN_BUDGET * (1 - SAFETY_MARGIN); // 170k tokens

const BATCH_SIZE = 3; // For >15 tools, recommended batch size
const BATCHES = Math.ceil(TOOLS_COUNT / BATCH_SIZE); // 7 batches
const TOKEN_PER_BATCH = USABLE_BUDGET / BATCHES; // ~24k per batch

// Monitor: If any batch exceeds 24k, we're on track to exceed budget
```

**Insight**: By end of Phase 6 (7 batches completed), we've likely used:

- Phase 1-3: ~20k tokens (setup, discovery, shared architecture)
- Phase 4: 7 batches × ~15k = ~105k tokens (architecture + tests)
- Phase 6: 7 batches × ~20k = ~140k tokens (implementation)
- **Total estimate**: ~265k tokens across full workflow

**Implication**: For 20 tools, Phase 6→7 transition is HIGH RISK for context overflow. Token monitoring is CRITICAL, not optional.

## Comparison: Original vs Updated

| Aspect                       | Original Skill              | Updated Skill                                            |
| ---------------------------- | --------------------------- | -------------------------------------------------------- |
| **Token Thresholds**         | "Monitor context window"    | 105k (warn), 140k (critical), 170k (emergency)           |
| **Phase 6→7 Guidance**       | Generic "phase transitions" | Explicit "critical checkpoint" before Phase 7            |
| **Monitoring Script**        | None                        | Lines 107-122, executable Bash script                    |
| **Compaction Protocol**      | Vague "clean up context"    | 4-step protocol with templates                           |
| **Pre-Gate Checkpoint**      | Not mentioned               | Dedicated section in phase-7-p0-gate.md                  |
| **Consequences Listed**      | None                        | Forgotten requirements, skipped checks, incomplete docs  |
| **Exit Criteria**            | Optional context awareness  | Mandatory monitoring for >15 tools                       |
| **Service Size Integration** | Not connected               | Auto-triggers at 15 tools (same as progress persistence) |
| **Token Budget Calculation** | None                        | Complete example for 20-tool service                     |
| **Phase 7 Blocker**          | No mention                  | "If >140k, perform mandatory compaction"                 |

## Summary: What to Do at Phase 6→7 Transition (20 Tools)

### The UPDATED Skill Tells You:

1. **BEFORE proceeding to Phase 7, run token monitoring script** (lines 107-122)
2. **Evaluate result**:
   - <105k: Proceed
   - 105-140k: Consider compaction (optional)
   - **≥140k: MANDATORY compaction** (4-step protocol)
   - > 170k: Emergency compaction + session restart
3. **If compaction required**, follow 4 steps:
   - Update MANIFEST.yaml with token count
   - Generate phase-6-summary.md
   - Remove verbose outputs, keep essentials
   - Verify state integrity
4. **Only then proceed to Phase 7 P0 Gate**
5. **Document compliance** in exit criteria (line 419)

### Why This Matters

For a 20-tool service at end of Phase 6:

- Estimated token usage: **~150-180k tokens** (from large-service-handling.md)
- Risk level: **HIGH** for context degradation
- Consequence of skipping: Incomplete P0 validation, missed violations, failed gate
- **Action**: Token monitoring is MANDATORY, not optional

The updated skill transforms vague "be aware of context" into concrete, actionable protocol with specific thresholds, scripts, and consequences.
