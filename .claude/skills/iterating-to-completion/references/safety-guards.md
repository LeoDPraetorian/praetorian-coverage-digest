# Safety Guards

Configuration details for all safety mechanisms preventing runaway loops.

## Overview

Safety guards are **MANDATORY**. A loop without guards risks:
- Infinite iterations (cost, time)
- Stuck agents repeating same errors
- Context window exhaustion
- Undetected failures

## Guard Configuration

### max_iterations

**Default**: 10
**Purpose**: Hard limit on number of loop iterations.

| Task Type | Recommended | Rationale |
|-----------|-------------|-----------|
| Test fixing | 5-8 | Most test issues resolve quickly |
| Implementation | 10-15 | May need multiple attempts |
| Research | 6-10 | Diminishing returns after ~6 |
| Validation | 5 | Should pass or need different approach |

**When to increase**:
- Complex multi-file refactoring
- Flaky external dependencies
- Tasks with many independent sub-steps

**When to decrease**:
- Simple targeted fixes
- Well-defined single-file changes
- Time-sensitive tasks

### max_runtime_minutes

**Default**: 15 minutes
**Purpose**: Time limit regardless of iteration count.

| Task Type | Recommended | Rationale |
|-----------|-------------|-----------|
| Test fixing | 10-15 | Quick feedback loops |
| Implementation | 15-30 | Allow time for complex changes |
| Research | 20-30 | Research can take time |
| Build fixes | 10 | Builds should be fast |

**Calculation**: Track `start_time` at loop init, check `elapsed = now - start_time` each iteration.

### consecutive_error_limit

**Default**: 3
**Purpose**: Stop after N consecutive errors (same error type).

**Error tracking**:
```markdown
error_count = 0

After each iteration:
  IF iteration_failed:
    error_count += 1
    IF error_count >= consecutive_error_limit:
      BREAK → escalate
  ELSE:
    error_count = 0  # Reset on success
```

**When to increase**:
- Network-dependent tasks (retries expected)
- Flaky CI environments
- External service integration

### loop_threshold

**Default**: 3 consecutive similar outputs
**Purpose**: Detect stuck loops producing same result.

**NOT configurable** - keep at 3. Lower causes false positives, higher misses real loops.

## Guard Interaction

Guards are checked in order. First triggered wins:

```
1. max_iterations (checked at start of each iteration)
2. max_runtime (checked at start of each iteration)
3. loop_detection (checked after each iteration output)
4. consecutive_errors (checked after each iteration failure)
```

## Implementation Pattern

```typescript
interface SafetyConfig {
  max_iterations: number;
  max_runtime_minutes: number;
  consecutive_error_limit: number;
  loop_threshold: number;
}

const DEFAULT_CONFIG: SafetyConfig = {
  max_iterations: 10,
  max_runtime_minutes: 15,
  consecutive_error_limit: 3,
  loop_threshold: 3,
};

function checkSafetyGuards(
  iteration: number,
  startTime: Date,
  consecutiveErrors: number,
  recentOutputs: string[],
  config: SafetyConfig
): { safe: boolean; reason?: string } {

  // Check iteration limit
  if (iteration >= config.max_iterations) {
    return { safe: false, reason: `max_iterations (${config.max_iterations}) exceeded` };
  }

  // Check runtime limit
  const elapsedMinutes = (Date.now() - startTime.getTime()) / 60000;
  if (elapsedMinutes >= config.max_runtime_minutes) {
    return { safe: false, reason: `max_runtime (${config.max_runtime_minutes}min) exceeded` };
  }

  // Check consecutive errors
  if (consecutiveErrors >= config.consecutive_error_limit) {
    return { safe: false, reason: `consecutive_error_limit (${config.consecutive_error_limit}) exceeded` };
  }

  // Check loop detection
  if (detectLoop(recentOutputs, config.loop_threshold)) {
    return { safe: false, reason: 'Loop detected - same output repeated' };
  }

  return { safe: true };
}
```

## Escalation on Guard Trigger

When any guard triggers, escalate with context:

```markdown
## Guard Triggered: {guard_name}

**Iteration**: {current} of {max}
**Runtime**: {elapsed} of {max} minutes
**Consecutive errors**: {count}

**Last output summary**:
{brief summary of last iteration output}

**Options**:
1. Continue with {N} more iterations
2. Accept current state
3. Review iteration history
4. Cancel task
```

## Override Patterns

**Per-task override** (in Task prompt):

```markdown
INVOKE: iterating-to-completion
WITH:
  completion_promise: 'ALL_TESTS_PASSING'
  max_iterations: 15  # Override default 10
  max_runtime_minutes: 30  # Override default 15
```

**Never override**:
- `loop_threshold` - Keep at 3
- Cannot set `max_iterations` > 50 or `max_runtime_minutes` > 60

## Monitoring

Track metrics for tuning:

| Metric | Purpose |
|--------|---------|
| Average iterations to completion | Tune defaults |
| Guard trigger frequency | Identify problematic task types |
| Loop detection rate | Verify algorithm effectiveness |
| Time per iteration | Identify slow tasks |

## Common Issues

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Always hits max_iterations | Task too complex for iteration | Break into smaller tasks |
| Loop detected too often | Agent stuck on same approach | Add more context to prompt |
| Consecutive errors trigger | Fundamental blocker | Debug root cause before continuing |
| Runtime exceeded | Slow iterations | Optimize per-iteration work |
