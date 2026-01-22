# Loop Detection

Algorithm details for detecting when an agent is stuck producing similar outputs.

## Overview

Loop detection prevents infinite loops where an agent repeatedly attempts the same action without progress. Without detection, an agent could:

- Attempt same fix repeatedly
- Burn through iterations without progress
- Exhaust cost/time budgets

## Algorithm

### Core Concept

**Ralph's approach** (using rapidfuzz library):

- Sliding window of last 5 outputs
- Fuzzy string matching with 90% similarity threshold
- If any output matches previous at ≥90% → LOOP DETECTED

**Our adaptation** (without external library):

- Extract "signature" from each output (primary action or main error)
- Compare signatures (exact or near-exact match)
- If same signature appears 3+ times consecutively → LOOP DETECTED

### Signature Extraction

The signature is the core action or error from each iteration output.

**For test outputs**:

```
Output: "Running tests... 2 failed: auth.test.ts - login test timeout, logout test assertion"
Signature: "auth.test.ts:login-timeout,logout-assertion"
```

**For implementation outputs**:

```
Output: "Modified auth.ts line 45-52, added null check for user.profile"
Signature: "auth.ts:null-check"
```

**For research outputs**:

```
Output: "Searched GitHub for 'oauth2 refresh token', found 3 patterns..."
Signature: "search:oauth2-refresh-token"
```

**For error outputs**:

```
Output: "Error: TypeError - Cannot read property 'id' of null at auth.ts:45"
Signature: "error:TypeError-null-auth.ts"
```

### Detection Logic

```typescript
function extractSignature(output: string): string {
  // Extract primary action/error

  // Check for errors first
  const errorMatch = output.match(/Error:?\s*(\w+).*?at\s*(\S+)/i);
  if (errorMatch) {
    return `error:${errorMatch[1]}-${errorMatch[2]}`;
  }

  // Check for test failures
  const testMatch = output.match(/(\d+)\s*(?:tests?\s*)?fail/i);
  if (testMatch) {
    const failingTests = output.match(/fail.*?:\s*(\S+)/gi) || [];
    return `test-fail:${failingTests.slice(0, 2).join(",")}`;
  }

  // Check for file modifications
  const fileMatch = output.match(/(?:modified|changed|updated|fixed)\s+(\S+\.(?:ts|js|go|py))/i);
  if (fileMatch) {
    const actionMatch = output.match(/(added|removed|fixed|updated|changed)\s+(\w+)/i);
    const action = actionMatch ? actionMatch[2] : "modified";
    return `file:${fileMatch[1]}-${action}`;
  }

  // Fallback: first 50 chars normalized
  return output.slice(0, 50).toLowerCase().replace(/\s+/g, "-");
}

function detectLoop(
  currentOutput: string,
  previousSignatures: string[],
  threshold: number = 3
): boolean {
  const currentSig = extractSignature(currentOutput);

  // Check last N signatures for matches
  const recentSigs = previousSignatures.slice(-threshold);
  const matchCount = recentSigs.filter((sig) => sig === currentSig).length;

  // If current matches all recent signatures → loop
  if (matchCount >= threshold - 1 && recentSigs.length >= threshold - 1) {
    return true;
  }

  return false;
}
```

### Sliding Window

Maintain last 5 signatures:

```
Iteration 1: sig_a → [sig_a]
Iteration 2: sig_b → [sig_a, sig_b]
Iteration 3: sig_a → [sig_a, sig_b, sig_a]
Iteration 4: sig_a → [sig_a, sig_b, sig_a, sig_a]
Iteration 5: sig_a → [sig_b, sig_a, sig_a, sig_a] ← Loop check: 3 consecutive sig_a → DETECTED
```

## Threshold Rationale

**Why 3 consecutive?**

| Threshold | Behavior                                        |
| --------- | ----------------------------------------------- |
| 2         | Too sensitive - catches legitimate retries      |
| **3**     | Balanced - allows one retry, catches true loops |
| 4+        | Too lenient - wastes iterations on stuck loops  |

**Why not fuzzy matching?**

- Signature extraction is more targeted than full-text comparison
- Avoids dependency on external libraries
- Faster execution
- Catches semantic loops (same action) not just textual similarity

## Examples

### True Loop (Detected)

```
Iteration 3: Fixed auth.ts - added null check
Iteration 4: Fixed auth.ts - added null check   ← Same signature
Iteration 5: Fixed auth.ts - added null check   ← Same signature (3x) → LOOP
```

**Why it's a loop**: Agent keeps attempting same fix without success.

### False Positive (Not Detected)

```
Iteration 3: Fixed auth.ts - added null check
Iteration 4: Fixed auth.ts - updated validation
Iteration 5: Fixed auth.ts - refactored handler
```

**Why not a loop**: Different actions on same file = progress.

### Edge Case: Similar But Different

```
Iteration 3: 3 tests failing - auth, login, logout
Iteration 4: 2 tests failing - auth, login
Iteration 5: 1 test failing - auth
```

**Why not a loop**: Different failure counts = progress.

Signature extraction captures this:

```
sig_3: "test-fail:3-auth,login"
sig_4: "test-fail:2-auth,login"  ← Different
sig_5: "test-fail:1-auth"        ← Different
```

## Integration with Safety Guards

Loop detection is one of several safety guards:

```
Safety check order:
1. max_iterations     ← Checked first
2. max_runtime        ← Checked second
3. loop_detection     ← Checked after iteration output
4. consecutive_errors ← Checked after iteration failure
```

Loop detection fires immediately when detected - does not wait for other guards.

## Escalation on Loop Detection

```markdown
## Loop Detected

**Pattern**: Same output signature repeated 3 times
**Signature**: `error:TypeError-null-auth.ts`

**Iteration history**:

- Iteration 5: Fixed auth.ts - added null check
- Iteration 6: Fixed auth.ts - added null check
- Iteration 7: Fixed auth.ts - added null check ← Loop detected

**Options**:

1. **Continue with different approach** - Agent will be instructed to try new strategy
2. **Review and debug** - Examine why same fix keeps failing
3. **Cancel** - Stop task
```

## Debugging Loop Issues

If loops are detected too often:

| Symptom               | Likely Cause                      | Solution                           |
| --------------------- | --------------------------------- | ---------------------------------- |
| Same error repeating  | Fundamental issue not addressed   | Debug root cause before continuing |
| Same file/same action | Agent doesn't have enough context | Add more context to scratchpad     |
| False positive        | Signature too generic             | Check extraction logic             |

If loops are NOT detected when should be:

| Symptom                    | Likely Cause               | Solution                               |
| -------------------------- | -------------------------- | -------------------------------------- |
| Obvious loop not caught    | Signatures differ slightly | Normalize signatures more aggressively |
| Loop after many iterations | Window too small           | Increase window size                   |
