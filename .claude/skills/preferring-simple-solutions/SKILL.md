---
name: preferring-simple-solutions
description: Use when implementing any code - enforces KISS principle by requiring simplest solution that works before considering abstractions, dependencies, or architectural patterns
allowed-tools: Read, AskUserQuestion
---

# Preferring Simple Solutions (KISS)

## When to Use This Skill

Use this skill **for every implementation task** to ensure solutions are as simple as possible.

**Symptoms that trigger this skill:**

- You're about to write code
- You're considering adding a dependency
- You're thinking about creating an abstraction
- You're designing an interface or struct
- You see an opportunity for "clean architecture"

**CRITICAL**: This skill complements `adhering-to-yagni` (don't add features) and `adhering-to-dry` (don't repeat code). This skill says: **don't add complexity**.

## Core Principle

```
The simplest solution that works is the correct solution.
```

**The Complexity Test**: Before writing any code, ask:

1. Can stdlib do this? → Use stdlib
2. Can 3-5 lines do this? → Write 3-5 lines
3. Does existing code do 80% of this? → Extend existing code
4. ONLY THEN consider new abstractions

## The Simplicity Ladder

**Always start at the top. Only move down when the simpler option genuinely cannot work.**

| Level | Solution Type            | When Appropriate                                   |
| ----- | ------------------------ | -------------------------------------------------- |
| 1     | Inline code (3-5 lines)  | One-time operations                                |
| 2     | Simple function          | Used 2-3 times, no state                           |
| 3     | Function with parameters | Variations on same logic                           |
| 4     | Struct with methods      | State + behavior together                          |
| 5     | Interface                | Multiple implementations EXIST (not "might exist") |
| 6     | External dependency      | Stdlib genuinely can't do it                       |

**Real Example (from RED phase testing):**

```
Task: Filter whether to send Slack notification on integration failure
- Only if >3 consecutive failures
- Only during business hours (9am-5pm)
- Skip rate_limit errors

❌ WRONG (Level 5 - what LLM produced):
- NotificationFilter struct
- FailureTracker interface (3 methods)
- Clock interface for "testability"
- SyncResult struct
- InMemoryFailureTracker with mutex
- ~100+ lines

✅ RIGHT (Level 2 - what was needed):
// Function accepts all inputs - trivially testable, no mocking needed
func shouldNotify(failures int, errorType string, hour int) bool {
    if errorType == "rate_limit" {
        return false
    }
    if failures <= 3 {
        return false
    }
    return hour >= 9 && hour < 17
}

// Caller provides the values
if shouldNotify(consecutiveFailures, result.ErrorType, time.Now().Hour()) {
    sendSlackNotification(...)
}
// 8 lines. Testable. Done.
```

## Anti-Patterns to Catch

### 1. Premature Abstraction

**Pattern**: Creating interfaces before multiple implementations exist.

```go
// ❌ WRONG: Interface for one implementation
type UserRepository interface {
    GetUser(id string) (*User, error)
}
type postgresUserRepository struct { db *sql.DB }

// ✅ RIGHT: Just use the concrete type
type UserRepository struct { db *sql.DB }
func (r *UserRepository) GetUser(id string) (*User, error) { ... }
```

**Rule**: Only create an interface when you have 2+ concrete implementations TODAY.

### 2. Unnecessary Dependency Injection

**Pattern**: Creating interfaces and injecting dependencies when a simple function with parameters works.

```go
// ❌ WRONG: Clock interface "for testing"
type Clock interface { Now() time.Time }
type Service struct { clock Clock }

func (s *Service) IsBusinessHours() bool {
    return s.clock.Now().Hour() >= 9 && s.clock.Now().Hour() < 17
}

// ✅ RIGHT: Function that accepts the value it needs
func isBusinessHours(hour int) bool {
    return hour >= 9 && hour < 17
}

// Caller derives the value, function is trivially testable
if isBusinessHours(time.Now().Hour()) { ... }
```

**The Chariot Pattern** (from `asset.go`):

```go
// Small helper that takes inputs - no DI needed, trivially testable
func skipDefaulting(event events.APIGatewayProxyRequest) bool {
    key := getKey(event)
    missingKey := key == ""
    isPut := event.HTTPMethod == http.MethodPut
    isObjectCreation := missingKey && isPut
    return !isObjectCreation
}
```

**Rule**: Design functions to accept inputs as parameters. This makes them testable without mocking.

**When DI IS appropriate**: Real service dependencies that represent external systems:

- AWS clients, database connections, HTTP clients
- Services that make network calls or have side effects
- Dependencies you genuinely swap in production (e.g., different cloud providers)

### 3. New Config When Existing Flags Suffice

**Pattern**: Adding new configuration fields when existing flags/mechanisms already control the behavior.

```go
// Task: Run high-severity nuclei scans daily, low-severity weekly

// ❌ WRONG: Add new config field + require schedule changes
// Added "severity" config to Job.Config
// Required creating TWO schedules with different configs
// Required API calls to configure schedules
if severity := task.Job.Config["severity"]; severity != "" {
    baseArgs = append(baseArgs, "-severity", severity)
}
// Result: New config field, schedule management burden, API complexity

// ✅ RIGHT: Use existing Full flag (already controls daily vs weekly)
excludeSeverity := "unknown,low,info"  // Daily: high severity only
if task.Job.Full {
    excludeSeverity = "unknown"         // Weekly: all severities
}
// 4 lines. No new config. No schedule changes. Done.
```

**Rule**: Before adding new config, ask: "Does an existing flag already distinguish this case?"

### 4. Config Systems for Few Options

**Pattern**: Building configuration infrastructure for 2-3 values.

```go
// ❌ WRONG: Config struct for 2 values
type NotificationConfig struct {
    MinFailures   int
    BusinessStart int
    BusinessEnd   int
}

// ✅ RIGHT: Constants or hardcoded values
const minFailures = 3
// If it needs to change, change the code. It's 1 line.
```

**Rule**: Hardcode until you have 5+ config values or external configuration requirements.

### 5. Helper Functions for One-Time Code

**Pattern**: Extracting code that's only used once.

```go
// ❌ WRONG: Helper for one-time use
func formatUserName(first, last string) string {
    return first + " " + last
}
// Used exactly once

// ✅ RIGHT: Inline it
name := user.First + " " + user.Last
```

**Rule**: Extract to a function only when used 3+ times (Rule of Three).

### 6. External Dependencies for Stdlib Capabilities

**Pattern**: Adding npm/go packages when stdlib works.

```go
// ❌ WRONG: Import library for simple task
import "github.com/some/uuid-library"
id := uuid.New()

// ✅ RIGHT: Use stdlib (Go 1.20+)
import "crypto/rand"
id := make([]byte, 16)
rand.Read(id)
```

**Rule**: Check stdlib first. Only import if stdlib genuinely lacks the capability.

## Decision Checklist

Before writing any code, answer:

- [ ] Does an existing flag/mechanism already handle this case? → Use it
- [ ] Does stdlib have this? → Use it
- [ ] Is this used only once? → Inline it
- [ ] Am I creating an interface? → Do 2+ implementations exist TODAY?
- [ ] Am I adding a dependency? → Does stdlib genuinely lack this?
- [ ] Am I creating a config? → Do I have 5+ values?
- [ ] Am I "preparing for the future"? → STOP. Solve today's problem.

## Common Rationalizations (DO NOT ACCEPT)

| Rationalization                 | Why It's Wrong                                                                            | What to Do                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| "It's more testable"            | Testability comes from functions accepting inputs as parameters, not from DI and mocking. | Pass values as parameters. `isBusinessHours(hour int)` is more testable than `Clock` interface. |
| "We might need to swap it"      | YAGNI. You won't. And if you do, refactoring is cheap.                                    | Use concrete types. Refactor when (if) needed.                                                  |
| "It's cleaner"                  | Abstraction isn't cleaner. Fewer lines is cleaner.                                        | Count the lines. Simple = fewer lines.                                                          |
| "Best practices say..."         | Best practices are context-dependent. Internal tooling ≠ library code.                    | Match complexity to context.                                                                    |
| "It's more extensible"          | Extension points you don't need are complexity you do have.                               | Build for today. Extend when needed.                                                            |
| "Senior devs expect this"       | They expect working code. They don't expect overengineering.                              | Ask them. They'll probably say simplify.                                                        |
| "We need a new config for this" | Existing flags often already distinguish the cases you need.                              | Check existing flags first. `Full` flag already meant daily vs weekly.                          |

## When Complexity IS Appropriate

**Legitimate reasons to add complexity:**

1. **Multiple implementations exist TODAY** → Interface is appropriate
2. **External configuration is required** (env vars, feature flags) → Config struct
3. **Code is genuinely repeated 3+ times** → Extract to function
4. **Stdlib genuinely can't do it** (crypto, compression, etc.) → External dep
5. **Performance is measured and insufficient** → Optimize (with benchmarks)

**Notice**: All these require EVIDENCE, not prediction.

## Integration with Other Skills

| Skill                               | Relationship                                                       |
| ----------------------------------- | ------------------------------------------------------------------ |
| `adhering-to-yagni`                 | YAGNI = don't add FEATURES. KISS = don't add COMPLEXITY.           |
| `adhering-to-dry`                   | DRY = don't REPEAT. But don't extract prematurely (Rule of Three). |
| `discovering-reusable-code`         | Search for existing code BEFORE writing new code.                  |
| `enforcing-evidence-based-analysis` | Verify stdlib capabilities before claiming you need dependencies.  |

## Output Format

When completing a task, note simplicity decisions:

```markdown
## Implementation Notes

**Simplicity decisions:**

- Used stdlib `time.Now()` instead of injected clock
- Inlined user validation (used once)
- Hardcoded threshold (only 2 config values)
- No interface (single implementation)

**Complexity I avoided:**

- Did not create NotificationFilter struct
- Did not create FailureTracker interface
- Did not add config package
```

## Related Skills

- `adhering-to-yagni` - Don't add features
- `adhering-to-dry` - Don't repeat code (with Rule of Three)
- `discovering-reusable-code` - Find existing code before writing new
