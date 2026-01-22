# Tight Feedback Loop (Capability Development)

**Key distinction from `iterating-to-completion`:**

- `iterating-to-completion` = INTRA-task (same agent loops on one task)
- Tight feedback loop = INTER-phase (Implementation→Review→Test cycle across different agents)

## Pattern Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIGHT FEEDBACK LOOP (Capability Development)                               │
│  Completion Promise: [PHASE]_VERIFIED (e.g., CAPABILITY_VERIFIED)           │
│  Scratchpad: {OUTPUT_DIR}/feedback-scratchpad.md                            │
│                                                                             │
│  LOOP until VERIFIED or max_feedback_iterations:                            │
│                                                                             │
│    ┌──────────────┐                                                         │
│    │ Implement    │ ← Spawn capability-developer with scratchpad context    │
│    │              │   Include: review issues, test failures from prior iter │
│    └──────┬───────┘                                                         │
│           ▼                                                                 │
│    ┌──────────────┐                                                         │
│    │ Review       │ ← capability-reviewer checks P0 compliance (BLOCKING)   │
│    │              │   If NOT_COMPLIANT → update scratchpad → next iteration │
│    └──────┬───────┘                                                         │
│           ▼ COMPLIANT                                                       │
│    ┌──────────────┐                                                         │
│    │ Test         │ ← capability-tester runs tests                          │
│    │              │   If FAIL → update scratchpad → next iteration          │
│    └──────┬───────┘                                                         │
│           ▼ PASS                                                            │
│                                                                             │
│    [CAPABILITY]_VERIFIED ← Exit loop successfully                           │
│                                                                             │
│  IF max reached without VERIFIED: Escalate to user                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Configuration (Defaults)

| Guard                             | Config Path                                   | Default | Purpose                                    |
| --------------------------------- | --------------------------------------------- | ------- | ------------------------------------------ |
| `max_feedback_iterations`         | `inter_phase.max_feedback_iterations`         | 5       | Max full Implementation→Review→Test cycles |
| `max_consecutive_review_failures` | `inter_phase.max_consecutive_review_failures` | 3       | Escalate if same review issue persists     |
| `max_consecutive_test_failures`   | `inter_phase.max_consecutive_test_failures`   | 3       | Escalate if same test failure persists     |

## Capability-Specific Feedback Cycles

### VQL Capability Feedback

```text
Implement VQL → Review VQL syntax + P0 → Test against Velociraptor client
     ↑                                              ↓
     └────────── Fix based on feedback ←───────────┘
```

**Common VQL feedback issues:**

- Missing `SCOPE()` declarations
- Incorrect artifact parameters
- VQL syntax errors (detected by review)
- Execution failures (detected by test)

### Nuclei Template Feedback

```text
Write YAML template → Review template syntax + P0 → Run against test target
     ↑                                                        ↓
     └────────────── Fix based on feedback ←─────────────────┘
```

**Common Nuclei feedback issues:**

- YAML syntax errors
- Incorrect matcher patterns
- False positives against test targets
- Missing metadata fields

### fingerprintx Module Feedback

```text
Implement Go module → Review Go code + P0 → Test service detection
     ↑                                              ↓
     └────────── Fix based on feedback ←───────────┘
```

**Common fingerprintx feedback issues:**

- Incorrect protocol implementation
- Missing edge cases in service detection
- Performance issues with slow services
- Go compilation errors

## Key Elements

### 1. Completion Promise

- A clear signal that the loop completed successfully
- Examples: `VQL_VERIFIED`, `NUCLEI_VERIFIED`, `FINGERPRINTX_VERIFIED`
- Loop exits ONLY when promise is achieved OR max iterations exceeded

### 2. Scratchpad

- Persistent file tracking iteration history
- Updated after each iteration with: what was done, review result, test result
- Passed to subsequent iterations as context

### 3. Error Context Injection

When re-spawning capability-developer after failure, include prior iteration context:

```markdown
## Prior Iteration Context

READ FIRST: {OUTPUT_DIRECTORY}/feedback-scratchpad.md

### From Iteration {N-1}:

**Review Issues to Address:** [list]
**Test Failures to Fix:** [list]

You MUST address these specific issues before proceeding.
```

### 4. Consecutive Failure Detection

- Track if SAME issue appears multiple iterations
- Escalate after N consecutive failures (default: 3)
- Prevents infinite loops on unfixable issues

### 5. Escalation Options

When max iterations reached, present via AskUserQuestion:

- 'Continue' - Add N more iterations
- 'Accept current state' - Proceed with known issues
- 'Review iteration history' - Show full scratchpad
- 'Cancel' - Abort

## When to Use

| Scenario                                             | Use Tight Feedback Loop?    |
| ---------------------------------------------------- | --------------------------- |
| VQL capability that must pass review AND tests       | Yes                         |
| Nuclei template with specific detection requirements | Yes                         |
| fingerprintx module needing protocol validation      | Yes                         |
| Single-pass validation of simple capability          | No - use Gated Verification |
| Exploratory capability research                      | No                          |

## Scratchpad Format

```markdown
# Feedback Scratchpad: {Capability Name}

## Iteration 1

- **Completed**: Initial VQL implementation
- **Review**: NOT_COMPLIANT
  - Missing SCOPE() declaration in artifact.yaml
  - Incorrect return type in VQL query
- **Next**: Address review issues

## Iteration 2

- **Completed**: Added SCOPE(), fixed return type
- **Review**: COMPLIANT
- **Test**: FAIL
  - Velociraptor execution error: undefined column 'process_name'
- **Next**: Fix column reference

## Iteration 3

- **Completed**: Fixed column reference to 'Name'
- **Review**: COMPLIANT
- **Test**: PASS
- **Result**: VQL_VERIFIED ✅
```

## Based On

[Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum) - Iterative refinement with explicit completion criteria.
