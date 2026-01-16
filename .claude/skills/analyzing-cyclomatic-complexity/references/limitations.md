# Cyclomatic Complexity - Limitations

## The Core Problem

> "Cyclomatic complexity is not the same as code complexity. In practice, code complexity is about cognitive load—how complex code is for humans to read, understand, and modify." — DX Research

Cyclomatic complexity **measures decision points**, not **readability** or **maintainability**.

## Limitation 1: Ignores Nesting Depth

**Cyclomatic complexity treats these as equivalent:**

```typescript
// Sequential: Complexity 5, Easy to understand
function validate(data) {
  if (!data.name) return false; // +1
  if (!data.email) return false; // +1
  if (!data.age) return false; // +1
  if (!data.address) return false; // +1
  if (!data.phone) return false; // +1
  return true;
}

// Nested: Complexity 5, Hard to understand
function validate(data) {
  if (data.name) {
    // +1
    if (data.email) {
      // +1
      if (data.age) {
        // +1
        if (data.address) {
          // +1
          if (data.phone) {
            // +1
            return true;
          }
        }
      }
    }
  }
  return false;
}
```

**Both have complexity 5**, but nested version has **cognitive complexity 15+** (nesting multipliers).

**Solution**: Use **Cognitive Complexity** alongside cyclomatic complexity.

## Limitation 2: Ignores Variable Naming

```typescript
// Complexity 3, Unreadable
function f(x, y, z) {
  if (x) {
    if (y) {
      return z * 2;
    }
  }
  return 0;
}

// Complexity 3, Readable
function calculateBonus(employee, hasMetGoals, baseAmount) {
  if (employee) {
    if (hasMetGoals) {
      return baseAmount * 2;
    }
  }
  return 0;
}
```

**Same complexity**, dramatically different readability.

**Solution**: Code review focusing on naming and documentation.

## Limitation 3: False Positives (Low Complexity, Bad Code)

### God Objects

```typescript
class UserManager {
  create(user) {
    /* complexity 2 */
  }
  update(user) {
    /* complexity 2 */
  }
  delete(user) {
    /* complexity 2 */
  }
  notify(user) {
    /* complexity 2 */
  }
  validate(user) {
    /* complexity 2 */
  }
  // ... 50 more methods
}
// Each method: low complexity
// Class: 100 methods, massive coupling
```

**Low per-method complexity** hides **architectural problems**.

### Duplicate Logic

```typescript
// File 1
function calculateShippingA(order) {
  if (order.total < 50) return 10;
  if (order.total < 100) return 5;
  return 0;
}

// File 2
function calculateShippingB(order) {
  if (order.total < 50) return 10;
  if (order.total < 100) return 5;
  return 0;
}
```

**Both have complexity 2**, but **violates DRY principle**.

## Limitation 4: False Negatives (High Complexity, Acceptable Code)

### State Machines

```typescript
function processState(state: State, event: Event): State {
  switch (state) {
    case "idle":
      return event === "start" ? "running" : "idle";
    case "running":
      return event === "pause" ? "paused" : event === "stop" ? "idle" : "running";
    case "paused":
      return event === "resume" ? "running" : event === "stop" ? "idle" : "paused";
    // ... 10 more states
  }
}
// Complexity: 20+
```

**High complexity is essential** — state machines require many transitions. Alternatives (strategy pattern) would be **over-engineering**.

### Regulatory/Tax Logic

```typescript
function calculateTax(income: number, state: string, filingStatus: string): number {
  if (state === "CA") {
    if (filingStatus === "single") {
      if (income < 10000) return income * 0.01;
      if (income < 25000) return 100 + (income - 10000) * 0.02;
      // ... 10 more brackets
    } else if (filingStatus === "married") {
      // ... 10 more brackets
    }
  } else if (state === "NY") {
    // ... similar complexity
  }
}
// Complexity: 40+
```

**Complexity reflects domain**, not poor design. Simplifying would **lose correctness**.

## Limitation 5: Tool Inconsistencies

Different tools count differently:

| Code                  | Lizard | ESLint | gocyclo  |
| --------------------- | ------ | ------ | -------- |
| `if (a && b)`         | 3      | 1      | 1        |
| `a ? b : c`           | 2      | 1      | 1        |
| `switch` with 5 cases | 5      | 5      | 5        |
| `try/catch`           | 2      | 1      | N/A (Go) |

**Comparing values across tools is meaningless.**

**Solution**: Use same tool consistently; focus on **trends**, not absolute values.

## When Cyclomatic Complexity Misleads

### Scenario 1: Simple Utility Functions

```typescript
// Complexity 8, but perfectly fine
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
```

**Refactoring would make it worse**, not better.

### Scenario 2: Configuration Mapping

```typescript
// Complexity 10
function getConfig(env: string): Config {
  switch (env) {
    case "dev":
      return devConfig;
    case "test":
      return testConfig;
    case "staging":
      return stagingConfig;
    // ... 8 more environments
  }
}
```

**Lookup table alternative** (complexity 1) is debatable — explicit switch is self-documenting.

### Scenario 3: Input Validation

```typescript
// Complexity 12
function validateRequest(req: Request): ValidationResult {
  if (!req.body) return { valid: false, error: "No body" };
  if (!req.body.email) return { valid: false, error: "No email" };
  if (!isValidEmail(req.body.email)) return { valid: false, error: "Invalid email" };
  // ... 10 more validations
}
```

**Sequential guards are clear** — extracting each validation to a separate function is **over-engineering**.

## Modern Research Findings

### LinearB Study (2024)

> "60% of functions flagged for high cyclomatic complexity had **zero bugs** over 12 months. Meanwhile, 40% of 'low complexity' functions had **multiple bugs** due to unclear naming and hidden state."

**Conclusion**: Complexity scores don't predict bugs as reliably as once thought.

### DX Engineering Report (2024)

**Teams over-optimizing for low complexity scores reported:**

- Longer code review times (fragmented logic)
- Harder onboarding (too many small functions)
- Debugging difficulty (call stacks 10+ levels deep)

**Recommendation**: "Use cyclomatic complexity as a signal, not a target."

## Complementary Metrics (Use Together)

| Metric                    | What It Measures            | When to Use                                     |
| ------------------------- | --------------------------- | ----------------------------------------------- |
| **Cyclomatic Complexity** | Decision points             | Base metric, use always                         |
| **Cognitive Complexity**  | Mental effort to understand | When cyclomatic is low but code is hard to read |
| **Nesting Depth**         | Indentation levels          | Detect "arrow code" anti-pattern                |
| **Lines of Code**         | Size                        | Combine with cyclomatic (NASA approach)         |
| **Change Frequency**      | Git churn                   | Find hotspots (complexity + churn = risk)       |
| **Code Coverage**         | Test completeness           | High complexity + low coverage = danger         |

## Best Practices Given Limitations

### 1. Use Cyclomatic Complexity as a Signal

**Not**: "Complexity 12? Must refactor."
**Instead**: "Complexity 12? Let's review. Is it clear? Well-tested? Changes often?"

### 2. Combine with Manual Review

**Automated**: Cyclomatic complexity >10 → Warning
**Human review**: Is the code actually hard to understand?

### 3. Consider Context

**High complexity acceptable when:**

- Well-documented
- Comprehensive tests
- Rarely changes
- Domain complexity (not accidental)

**High complexity unacceptable when:**

- Unclear naming
- No tests
- Frequent bugs
- Could be simplified

### 4. Track Trends, Not Absolutes

**Good**: "Average complexity decreased from 8 to 6 over 3 months"
**Bad**: "This function is exactly 11, rewrite it"

## References

- [DX: Why cyclomatic complexity misleads](https://getdx.com/blog/cyclomatic-complexity/)
- [LinearB: Cyclomatic Complexity Explained](https://linearb.io/blog/cyclomatic-complexity)
- [SonarSource: Cognitive Complexity White Paper](https://www.sonarsource.com/resources/white-papers/cognitive-complexity/)
