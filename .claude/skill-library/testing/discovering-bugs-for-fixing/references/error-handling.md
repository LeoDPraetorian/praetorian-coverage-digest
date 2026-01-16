# Error Handling

**Comprehensive error scenarios and recovery strategies.**

## Error Categories

### Stage 1 Errors

| Error                    | Cause                          | Response                                         |
| ------------------------ | ------------------------------ | ------------------------------------------------ |
| No candidates found      | Grep returns no results        | Ask user for more context                        |
| Too many candidates (>5) | Bug description too vague      | Ask user to narrow scope                         |
| Invalid bug description  | Empty or non-descriptive input | Request specific symptoms and reproduction steps |
| Grep timeout             | Large codebase, slow disk I/O  | Increase timeout, narrow search scope            |

### Stage 2 Errors

| Error                | Cause                                 | Response                                        |
| -------------------- | ------------------------------------- | ----------------------------------------------- |
| Agent timeout        | Explore agent exceeds time limit      | Mark incomplete, proceed with available results |
| Agent crash          | Out of memory, tool error             | Retry once, then mark failed                    |
| Empty agent output   | Agent found no relevant code          | Mark low confidence, include in consolidation   |
| Conflicting findings | Agents identify different root causes | Present all theories, prioritize by confidence  |

### Integration Errors

| Error                  | Cause                                | Response                                       |
| ---------------------- | ------------------------------------ | ---------------------------------------------- |
| OUTPUT_DIR not set     | persisting-agent-outputs not invoked | Fail fast with clear error message             |
| Cannot write artifacts | Permission denied, disk full         | Retry with temp directory, notify user         |
| Missing dependencies   | debugger agent not available         | Document finding, suggest manual investigation |

## Stage 1 Error Handling

### Error 1.1: No Candidates Found

**Scenario**: Grep searches return no results for any keywords.

**Diagnosis**:

```bash
grep_findings: []
candidate_locations: []
```

**Response Strategy**:

1. **Check for typos**: Verify grep patterns match actual code conventions
2. **Broaden search**: Try related terms, parent directories
3. **Ask user for context**:

```
Unable to locate candidate files for this bug.

Can you provide additional information?
- Specific error message or stack trace
- File name or component where bug occurs
- Recent code changes related to this issue

Without more context, I cannot proceed with discovery.
```

**Example**:

```
Bug: "Checkout button doesn't work"
Grep: "checkout", "Checkout", "CheckoutButton" → 0 results

Ask: "Can you provide the path to the checkout component or the error message you see?"
User: "It's in src/pages/cart/CheckoutPage.tsx, error is 'payment.process is not a function'"
Re-grep: "payment", "process" → finds candidates
```

### Error 1.2: Too Many Candidates (>5)

**Scenario**: Bug description too vague, grep returns >5 unrelated files.

**Diagnosis**:

```bash
candidate_locations: [
  { path: "file1.ts", confidence: "low" },
  { path: "file2.ts", confidence: "low" },
  { path: "file3.ts", confidence: "low" },
  { path: "file4.ts", confidence: "low" },
  { path: "file5.ts", confidence: "low" },
  { path: "file6.ts", confidence: "low" }
]
```

**Response Strategy**:

```
Bug description is too broad. Found 6+ potential locations with low confidence.

Please narrow the scope by providing:
1. Specific component or page where bug occurs
2. User action that triggers the bug
3. Expected vs actual behavior

Example: Instead of "data is wrong", provide:
"User profile page shows incorrect email after login - expected: new email, actual: old email from previous session"
```

**Agent Count Decision**:

```
agent_count = 0  # Don't spawn agents for low-quality scoping
skip_discovery = true  # Ask for clarification first
```

### Error 1.3: Grep Timeout

**Scenario**: Large codebase causes grep to exceed timeout (30 seconds).

**Diagnosis**:

```
Error: Grep command timed out after 30000ms
Pattern: "user"
```

**Response Strategy**:

1. **Narrow search scope**:

```bash
# Instead of full repo
grep -r "pattern" .

# Use targeted directories
grep -r "pattern" src/features/profile/
```

2. **Use type filters**:

```bash
# Instead of all files
grep -r "pattern" --include="*.ts" --include="*.tsx"
```

3. **Incremental search**:

```bash
# Search most likely locations first
for dir in src/hooks src/features src/utils; do
  grep -r "pattern" "$dir" --include="*.ts" && break
done
```

## Stage 2 Error Handling

### Error 2.1: Agent Timeout

**Scenario**: Explore agent exceeds time limit (5 minutes).

**Diagnosis**:

```
Agent: Explore (investigating src/hooks/useUserProfile.ts)
Status: TIMEOUT (exceeded 300s)
```

**Response Strategy**:

1. **Mark component incomplete**:

```json
{
  "path": "src/hooks/useUserProfile.ts",
  "status": "incomplete",
  "reason": "Agent timeout during exploration"
}
```

2. **Proceed with other agents**:

- Don't block entire workflow on one timeout
- Consolidate available results
- Note incomplete investigation in candidate-locations.md

3. **Include in output**:

```markdown
## Incomplete Discovery

**Timed Out**:

- src/hooks/useUserProfile.ts (exploration incomplete after 5 min)

**Recommendation**: If investigation fails with available candidates, manually inspect timed-out component.
```

### Error 2.2: Agent Crash

**Scenario**: Agent terminates unexpectedly (out of memory, tool error).

**Diagnosis**:

```
Agent: Explore (investigating src/hooks/useUserProfile.ts)
Status: FAILED
Error: "Bash tool error: Cannot allocate memory"
```

**Response Strategy**:

1. **Retry once** with reduced scope:

```
Retry prompt:
- Reduce max file reads from 15 to 5
- Focus only on the target file, not imports
- Use quick mode with minimal context
```

2. **If retry fails**, mark as failed:

```json
{
  "path": "src/hooks/useUserProfile.ts",
  "status": "failed",
  "reason": "Agent crashed: Cannot allocate memory",
  "retry_count": 1
}
```

3. **Continue workflow**:

- Don't fail entire discovery for one agent
- Note failure in candidate-locations.md
- Suggest manual investigation if this was a high-confidence candidate

### Error 2.3: Empty Agent Output

**Scenario**: Agent completes but finds no relevant code.

**Diagnosis**:

```markdown
# Discovery: useUserProfile Hook

## Component

src/hooks/useUserProfile.ts

## Findings

None found. Hook appears unrelated to bug symptoms.
```

**Response Strategy**:

1. **Mark as low confidence**:

```json
{
  "path": "src/hooks/useUserProfile.ts",
  "confidence": "low",
  "rationale": "Agent investigation found no bug-relevant code"
}
```

2. **Include in consolidation** (don't omit):

```markdown
### Low Confidence

#### src/hooks/useUserProfile.ts

**Relevance**: Low
**Why**: Agent investigation found no code paths matching symptoms

**Note**: May be false negative. If other candidates fail, revisit this component.
```

### Error 2.4: Conflicting Findings

**Scenario**: Multiple agents identify different root causes.

**Example**:

```
Agent 1 (useUserProfile.ts):
"Root cause: Cache invalidation issue in useQuery"

Agent 2 (ProfilePage.tsx):
"Root cause: Race condition in async fetch on mount"
```

**Response Strategy**:

1. **Present all theories**:

```markdown
## Multiple Possible Root Causes

### Theory A: Cache Invalidation Issue (Agent 1)

**File**: src/hooks/useUserProfile.ts
**Confidence**: High
**Evidence**: useQuery doesn't invalidate on userId change

### Theory B: Race Condition (Agent 2)

**File**: src/features/profile/ProfilePage.tsx
**Confidence**: Medium
**Evidence**: Async fetch races with navigation state update

**Recommendation**: Investigate Theory A first (higher confidence, clearer evidence). If fix doesn't resolve symptoms, investigate Theory B.
```

2. **Prioritize by confidence**:

- Agent 1 findings have specific code evidence → High confidence
- Agent 2 findings are speculative → Medium confidence

## Integration Error Handling

### Error 3.1: OUTPUT_DIR Not Set

**Scenario**: persisting-agent-outputs skill not invoked before discovery.

**Diagnosis**:

```
Error: OUTPUT_DIR environment variable not set
Cannot write bug-scoping-report.json
```

**Response Strategy**:

**Fail fast** with clear instructions:

```
ERROR: OUTPUT_DIR not configured

This skill requires persisting-agent-outputs to establish OUTPUT_DIR.

Fix: Invoke persisting-agent-outputs before running discovery:
  skill: "persisting-agent-outputs"

Then retry: skill: "discovering-bugs-for-fixing"
```

**Do NOT**:

- Proceed without OUTPUT_DIR
- Create temp directory silently
- Write artifacts to cwd

**Rationale**: OUTPUT_DIR is contract requirement for workflow continuity.

### Error 3.2: Cannot Write Artifacts

**Scenario**: Permission denied or disk full when writing outputs.

**Diagnosis**:

```
Error: EACCES: permission denied, open '.claude/.output/bugs/...'
```

**Response Strategy**:

1. **Check permissions**:

```bash
ls -ld .claude/.output/bugs/
# Expected: drwxr-xr-x (write permission)
```

2. **Attempt fallback**:

```bash
# Try temp directory
OUTPUT_DIR_FALLBACK=/tmp/.claude-bugs-$(date +%s)
mkdir -p "$OUTPUT_DIR_FALLBACK"
```

3. **Notify user**:

```
WARNING: Cannot write to .claude/.output/bugs/ (permission denied)

Using fallback directory: /tmp/.claude-bugs-1234567890/

Artifacts will be saved to temp location. Please fix permissions:
  chmod +w .claude/.output/bugs/
```

## Recovery Strategies

### Partial Success Pattern

**Scenario**: Stage 1 completes, Stage 2 partially fails (2/3 agents succeed).

**Strategy**:

```
Stage 1: ✅ Completed
Stage 2: ⚠️ Partial (2/3 agents completed)

Consolidate results from successful agents.
Note failed agents in candidate-locations.md.
Hand off to debugger with available findings.
```

### Complete Failure Pattern

**Scenario**: Both stages fail (no candidates found, all agents fail).

**Strategy**:

```
Stage 1: ❌ Failed (no candidates found)
Stage 2: ⏭️ Skipped (no candidates to investigate)

Ask user for more context:
- Specific file location
- Stack trace
- Reproduction steps

OR

Escalate to manual investigation:
"Unable to locate bug automatically. Please provide more specific location information or investigate manually."
```

## Related Documentation

- [stage-1-bug-scoping.md](stage-1-bug-scoping.md) - Stage 1 workflow and edge cases
- [stage-2-discovery.md](stage-2-discovery.md) - Stage 2 agent spawning and timeouts
- [output-artifacts.md](output-artifacts.md) - Artifact structure and persistence
