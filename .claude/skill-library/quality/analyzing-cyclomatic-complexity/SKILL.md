---
name: analyzing-cyclomatic-complexity
description: Use when reviewing code quality - measures decision logic complexity, identifies refactoring candidates, sets quality gates for CI/CD.
allowed-tools: Read, Bash, Grep, Glob
---

# Analyzing Cyclomatic Complexity

## When to Use This Skill

Use this skill when:
- **Conducting code reviews** and assessing maintainability
- **Identifying refactoring candidates** in large codebases
- **Setting up CI/CD quality gates** for automated checks
- **Evaluating technical debt** and complexity trends
- **Performing architecture reviews** to identify hotspots

**Symptoms that indicate you need this skill:**
- Functions are hard to understand or test
- Bug-prone code areas with high defect density
- Code review discussions about "complexity" without metrics
- PRs with deeply nested conditionals or switch statements
- Difficulty writing comprehensive unit tests

## Quick Start

**Measure a file's complexity:**
```bash
# Multi-language tool (recommended)
npx lizard path/to/file.ts --CCN 10

# Language-specific tools
npx eslint path/to/file.ts  # JavaScript/TypeScript
gocyclo -over 10 path/to/    # Go
radon cc path/to/file.py     # Python
```

**Interpret results:**
| Score | Risk Level | Action |
|-------|-----------|---------|
| 1-10 | Low | Acceptable - well-structured code |
| 11-15 | Moderate | **Refactor recommended** - rare exceptions allowed |
| 16-25 | High | **Refactor required** - must meet all 5 exception criteria (see Rule 5) |
| 26+ | Very High | **Block PR - mandatory refactoring** - no exceptions |

## What is Cyclomatic Complexity?

Cyclomatic complexity is a software metric that measures the number of linearly independent paths through a program's source code. Developed by Thomas J. McCabe in 1976, it quantifies **decision logic complexity**.

**Simple calculation**:
```
Complexity = 1 + (number of ifs) + (number of loops) + (number of switch cases)
```

**Why it matters:**
- **Testability**: More paths = more test cases needed for full coverage
- **Maintainability**: Higher complexity = harder to understand and modify
- **Bug correlation**: Studies show high complexity correlates with higher defect rates
- **Cognitive load**: Complexity affects how easily developers can reason about code

See [Calculation Methods](references/calculation-methods.md) for detailed formulas.

## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Concepts
- **[Calculation Methods](references/calculation-methods.md)** - Formulas, graph-based analysis, worked examples
- **[Industry Thresholds](references/thresholds.md)** - McCabe, NIST, Microsoft, NASA standards
- **[Measurement Tools](references/tools.md)** - Language-specific analyzers and CI/CD integration

### Refactoring Techniques
- **[Refactoring Patterns](references/refactoring-patterns.md)** - Extract Method, Guard Clauses, Strategy Pattern, Simplify Boolean Logic
- **[TypeScript Examples](examples/typescript-before-after.md)** - Real-world refactorings
- **[Go Examples](examples/go-before-after.md)** - Handler and service patterns
- **[Python Examples](examples/python-before-after.md)** - Function refactorings

### Advanced Topics
- **[Limitations](references/limitations.md)** - When cyclomatic complexity misleads
- **[Complementary Metrics](references/complementary-metrics.md)** - Cognitive complexity, nesting depth, LOC

## Core Workflow

### Step 1: Measure Complexity

Choose the appropriate tool for your language:

**Multi-language (recommended for polyglot codebases):**
```bash
# Install globally
npm install -g lizard

# Measure single file
npx lizard path/to/file.ts --CCN 10

# Measure entire directory
npx lizard src/ --CCN 10
```

**Language-specific tools:**
```bash
# JavaScript/TypeScript: ESLint
npx eslint --rule 'complexity: ["error", 10]' src/

# Go: gocyclo
go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
gocyclo -over 10 .

# Python: radon
pip install radon
radon cc path/to/code.py -s
```

See [Measurement Tools](references/tools.md) for detailed setup and CI/CD integration.

### Step 2: Identify Hotspots

**Sort functions by complexity (descending) and prioritize:**

1. **Complexity > 15**: Immediate refactoring candidates
2. **Complexity 10-15** AND **frequently changed**: Medium priority (churn + complexity)
3. **Complexity > 25**: Block PR, mandatory refactoring
4. **Complexity > 10** AND **high bug rate**: Critical (proven defect correlation)

**Focus on the intersection of:**
- High complexity (>10)
- High change frequency (git log)
- High defect rate (bug tracker)

### Step 3: Apply Refactoring Techniques

Choose the appropriate refactoring pattern for your situation:

| Pattern | When to Use | Complexity Reduction |
|---------|-------------|---------------------|
| **Extract Method** | Function does multiple things | High (splits paths) |
| **Guard Clauses** | Deeply nested conditionals | Medium (flattens structure) |
| **Strategy Pattern** | Large switch/if-else chains | High (eliminates branches) |
| **Simplify Boolean Logic** | Nested if statements | Low (combines conditions) |
| **Lookup Tables** | Switch statements with simple logic | Medium (replaces branches) |

See [Refactoring Patterns](references/refactoring-patterns.md) for detailed techniques with examples.

**Quick example - Guard Clauses:**

```typescript
// Before: Complexity = 5
function processUser(user) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        // do work
      }
    }
  }
}

// After: Complexity = 3
function processUser(user) {
  if (!user) return;
  if (!user.isActive) return;
  if (!user.hasPermission) return;
  // do work
}
```

### Step 4: Verify Improvement

After refactoring, **always verify**:

1. **Re-measure complexity**:
   ```bash
   npx lizard path/to/refactored-file.ts
   ```
   Target: Complexity ≤10 per function

2. **Run tests** (preserve behavior):
   ```bash
   npm test path/to/refactored-file.test.ts
   ```
   All tests must pass - refactoring should not change behavior

3. **Code review** (improved readability):
   - Is the code easier to understand?
   - Are edge cases clearer?
   - Is the intent more obvious?

4. **Update documentation**:
   - Add comments if logic is inherently complex
   - Document why complexity is necessary (if unavoidable)

## Best Practices

### ✅ Do This

- **Use as a signal, not a rule**: Complexity >10 suggests review, not automatic rejection
- **Combine with cognitive complexity**: Low cyclomatic complexity ≠ readable code
- **Focus on hotspots**: Prioritize frequently changed + high complexity areas
- **Set CI/CD thresholds**: Warn at 15, fail at 25 (configurable per project)
- **Test before refactoring**: Ensure comprehensive test coverage before modifying
- **Measure trends**: Track complexity over time, not just absolute values
- **Consider domain complexity**: Some logic is inherently complex (e.g., tax calculations)

### ❌ Don't Do This

- **Don't optimize prematurely**: Only refactor if complexity >10 AND hard to understand
- **Don't ignore context**: State machines, validation logic may need complexity
- **Don't use alone**: Combine with code size, nesting depth, cognitive complexity
- **Don't refactor without tests**: High risk of breaking behavior
- **Don't block simple high-complexity**: A function with 15 sequential validations is fine
- **Don't cargo-cult thresholds**: Adjust thresholds based on team, domain, and language
- **Don't refactor for metrics**: Refactor for readability and maintainability

## Critical Rules

### Rule 1: Thresholds Are Guidelines, Not Laws

A function with complexity 12 that's **clear and well-tested** doesn't need refactoring.
A function with complexity 8 that's **unreadable and untested** does.

**Context matters more than numbers.**

### Rule 2: Combine Metrics for Accurate Assessment

**NASA SATC finding**: *"Modules with both high complexity AND large size have lowest reliability."*

Always evaluate:
- **Cyclomatic complexity** (decision points)
- **Lines of code** (size)
- **Nesting depth** (cognitive load)
- **Change frequency** (churn)

See [Complementary Metrics](references/complementary-metrics.md) for the complete quality model.

### Rule 3: Context Determines Acceptability

**When high complexity is acceptable:**
- State machines with many well-defined states
- Input validation with many specific rules
- Configuration mapping with explicit cases
- Command pattern dispatch logic
- Tax/financial calculations with regulatory requirements

**When low complexity can be problematic:**
- Duplicate logic scattered across files (DRY violation)
- God objects (low complexity per method, high coupling)
- Over-abstraction (strategy pattern for 2 simple cases)

**Document why complexity is necessary** when exceeding thresholds for valid reasons.

### Rule 4: Refactor for Understanding, Not Metrics

The goal is **maintainable code**, not low numbers.

**Bad refactoring example:**
```typescript
// Before: Complexity 6 (clear logic)
if (user.isAdmin || (user.isPremium && user.hasFeature('advanced'))) {
  enableAdvancedMode();
}

// After: Complexity 1 (worse - hidden complexity)
if (shouldEnableAdvancedMode(user)) {
  enableAdvancedMode();
}
```

If the condition is clear and self-documenting, don't extract it just to reduce the number.

### Rule 5: "Recommended" Means "Do It" (With Rare Exceptions)

**The threshold table says complexity 16-25 is "Refactor recommended".**

**This does NOT mean optional.** It means:
- ✅ **Default action**: Refactor to <15
- ❌ **Exception only if**: All conditions below met

**Criteria for deferring refactoring (complexity 16-25):**

1. ✅ **Domain requires it**: State machine OR tax/financial/regulatory logic with legal requirements
2. ✅ **Well-documented**: Explicit comment explaining WHY complexity is essential
3. ✅ **High test coverage**: ≥90% coverage (not just "tests pass")
4. ✅ **Code review approval**: Explicit sign-off granting exception
5. ✅ **Tracked as tech debt**: Logged with timeline for resolution

**If you can't check ALL 5 boxes, refactor now.**

**Common invalid excuses:**
- ❌ "I'm too tired/rushed to refactor safely" → Don't commit tired code
- ❌ "This is payment/fraud/business logic" → Not the same as regulatory requirements
- ❌ "Tests pass so it's fine" → Tests validate behavior, not maintainability
- ❌ "It works and is clear to me" → "Clear to author" ≠ "maintainable by team"

### Rule 6: Examples Are Not Thresholds

**Rule 1 states: "A function with complexity 12 that's clear and well-tested doesn't need refactoring."**

**This is an EXAMPLE, not a blanket exception.**

**What this means:**
- ✅ Complexity **11-12** with good tests → Acceptable edge case
- ❌ Complexity **13-15** → Should refactor
- ❌ Complexity **16+** → Must refactor (or meet Rule 5 criteria)

**Do NOT extend this example:**
- ❌ "12 is fine, so 16 is probably fine" → Wrong
- ❌ "The principle applies to 18" → Wrong
- ❌ "I'll round 22 down to ~12" → Wrong

**The example uses 12 because it's 2 above threshold (10+2). It does NOT scale.**

## Red Flags - Stop and Refactor

If you're thinking any of these thoughts, **you're rationalizing**:

### Time Pressure Rationalizations
- ❌ "No time to refactor, deadline tomorrow"
- ❌ "Sprint ends in an hour, just ship it"
- ❌ "Customer demo Monday, can't delay"

**Reality**: Refactoring with Extract Method takes 20-45 minutes. If your timeline can't absorb this, you have a project management problem, not a code quality problem.

### Sunk Cost Rationalizations
- ❌ "I spent 12 hours on this, can't delete it"
- ❌ "Throwing away working code is wasteful"
- ❌ "I'll keep it as reference while rewriting"

**Reality**: Sunk cost fallacy. Bad code costs more to maintain than it took to write. Delete and start fresh with better design.

### Authority Rationalizations
- ❌ "Senior says ship it, they have more experience"
- ❌ "Manager wants it now, I'll defer to authority"
- ❌ "Don't want to look dogmatic about metrics"

**Reality**: The skill exists to give you objective standards. Authority doesn't override engineering principles.

### Domain Complexity Rationalizations
- ❌ "This is like tax calculations, it's inherently complex"
- ❌ "Payment/fraud/validation logic needs high complexity"
- ❌ "Business requirements force this complexity"

**Reality**: Tax/financial/regulatory = legal requirements, not "business is complex". If you can't cite the specific regulation/statute, it's not domain complexity.

### Testing Rationalizations
- ❌ "Tests pass, so complexity doesn't matter"
- ❌ "I manually tested all paths"
- ❌ "78% coverage is good enough"

**Reality**: Tests validate correctness, not maintainability. High complexity + even 90% coverage = untested edge cases = bugs.

### Exhaustion Rationalizations
- ❌ "I'm too tired to refactor safely now"
- ❌ "Better to commit as-is than introduce bugs while exhausted"
- ❌ "I'll fix it Monday when I'm fresh"

**Reality**: If you're too tired to refactor, you're too tired to commit. Save your work, close the laptop, start fresh tomorrow.

## Troubleshooting

### Issue: "Complexity is 8 but code is still unreadable"

**Cause**: Cyclomatic complexity doesn't measure cognitive load.

**Solutions**:
1. Check **variable naming clarity**
2. Measure **nesting depth** (should be ≤3)
3. Assess **cognitive complexity** (SonarSource metric)
4. Review **documentation quality**
5. Consider **abstraction appropriateness**

See [Limitations](references/limitations.md) for detailed discussion.

### Issue: "I refactored but complexity increased"

**This is often fine** when extracting methods.

**Example:**
```typescript
// Before: 1 function, complexity 12
function processOrder() {
  // ... 50 lines of mixed logic
}

// After: 3 functions, total complexity 12
function processOrder() { // complexity 4
  validateOrder();
  calculateTotal();
  submitPayment();
}
function validateOrder() { // complexity 4 }
function calculateTotal() { // complexity 2 }
function submitPayment() { // complexity 2 }
```

**Total complexity unchanged**, but each function is simpler and more testable.

### Issue: "Tool reports different values"

**Cause**: Tools count differently:
- Some count `default:` in switch statements
- Some count ternary operators (`? :`)
- Some count boolean operators (`&&`, `||`)

**Solution**:
- **Use the same tool consistently** for comparisons
- **Document which tool** your project uses
- **Focus on relative changes**, not absolute values

### Issue: "CI/CD is blocking valid complexity"

**Cause**: Blanket thresholds don't account for context.

**Solutions**:
1. **Adjust thresholds per directory**:
   ```yaml
   # .lizard.yml
   thresholds:
     default: 10
     src/validation/: 15  # More complex validation logic allowed
   ```

2. **Add inline suppressions with justification**:
   ```typescript
   // eslint-disable-next-line complexity -- State machine requires 12 states
   function processStateMachine(state) { ... }
   ```

3. **Document exceptions in code review**

## Related Skills

- `gateway-testing` - Test quality and coverage assessment patterns
- `gateway-backend` - Go code quality and review patterns
- `gateway-frontend` - React/TypeScript quality patterns
- `debugging-systematically` - Root cause analysis for bugs in complex code
- `verifying-before-completion` - Pre-PR quality verification checklist

## References

Key resources used in this skill:

- [Cyclomatic complexity - Wikipedia](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [McCabe Cyclomatic Complexity - Klocwork](https://help.klocwork.com/2024/en-us/concepts/mccabecyclomaticcomplexity.htm)
- [Code metrics - Microsoft Learn](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-cyclomatic-complexity)
- [Why complexity metrics mislead - DX](https://getdx.com/blog/cyclomatic-complexity/)
- [Reducing Cyclomatic Complexity - Medium](https://medium.com/@brooknovak/reducing-cyclomatic-complexity-in-your-code-bb132d1665a2)
- [How to Reduce Cyclomatic Complexity - LinearB](https://linearb.io/blog/reduce-cyclomatic-complexity/)
- [Lizard - Multi-language analyzer](https://github.com/terryyin/lizard)
