# Cyclomatic Complexity - Industry Thresholds

## McCabe's Original Recommendation (1976)

Thomas J. McCabe, who developed the metric, recommended:

> **Maximum cyclomatic complexity: 10**

**Rationale:**
- Based on empirical studies of software reliability
- Functions with complexity >10 showed significantly higher defect rates
- Corresponds to the limit of human short-term memory (7±2 items)

**McCabe's guidance:**
- "Programmers should count the complexity of the modules they are developing and split them into smaller modules whenever the cyclomatic complexity exceeds 10."

## NIST Guidelines (NIST 500-235)

**NIST Special Publication 500-235: "Structured Testing"**

> "A cyclomatic complexity of 10 is a good starting point."

**Extended guidance:**
- **Basic rule**: Use 10 as the default threshold
- **Experienced teams**: May use up to 15 for projects with:
  - Experienced staff
  - Formal design processes
  - Modern programming languages
  - Structured programming practices
  - Comprehensive code walkthroughs
  - Complete test plans

**NIST warning:**
> "Limits over 10 should be reserved for projects that have several operational advantages over typical projects."

## Microsoft Visual Studio Thresholds

**Visual Studio Code Metrics:**

| Threshold | Color | Meaning |
|-----------|-------|---------|
| 1-10 | Green | Low complexity, maintainable |
| 11-20 | Yellow | Moderate complexity, review recommended |
| 21-25 | Orange | High complexity, refactor recommended |
| 26+ | Red | Very high complexity, warning issued |

**Microsoft's official documentation:**
- **Warning threshold**: 25
- **Recommendation**: Keep below 25 to avoid warnings
- **Best practice**: Aim for 10 or below

**Reference**: [Code Metrics - Cyclomatic Complexity (Visual Studio)](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-cyclomatic-complexity)

## NASA Software Assurance Technology Center (SATC)

**Key finding:**
> "The most effective evaluation is a combination of size and cyclomatic complexity. The modules with both high complexity AND large size tend to have the lowest reliability."

**Combined metrics approach:**

| Complexity | Lines of Code | Risk Level | Action |
|-----------|---------------|------------|--------|
| ≤10 | Any | Low | Acceptable |
| 11-15 | <100 | Moderate | Review |
| 11-15 | 100-200 | High | Refactor recommended |
| 16-25 | Any | High | Refactor |
| >25 | Any | Critical | Immediate refactoring |

**NASA recommendation**: Don't evaluate complexity in isolation - always consider code size.

## SonarQube Thresholds

**Default configuration:**

```yaml
complexity:
  function: 10
  file: 10
  class: 80
```

**Severity levels:**
- **Info**: 10-15
- **Minor**: 16-20
- **Major**: 21-25
- **Critical**: 26+

**SonarQube also tracks:**
- **Cognitive Complexity** (complementary metric)
- **Nesting depth** (structural complexity)
- **Lines of code** (size)

## Industry Research (2024)

### LinearB Research

**Finding**: Cyclomatic complexity alone is insufficient.

> "Code with low cyclomatic complexity can still be difficult to maintain. A function might have few decision points yet suffer from unclear variable naming, poor documentation, inconsistent abstractions, or convoluted logic."

**Recommendation**: Use **Cognitive Complexity** alongside cyclomatic complexity.

### DX (DevEx) Research

**Study of 100+ engineering teams:**

| Threshold | Team Adoption | Outcomes |
|-----------|---------------|----------|
| 10 | 45% | Most successful at reducing defects |
| 15 | 35% | Balanced between strictness and pragmatism |
| 20 | 15% | Struggled with technical debt |
| 25+ | 5% | High defect rates, maintenance issues |

**Key insight**: Teams enforcing threshold of 10 had:
- 40% fewer bugs in complex modules
- 25% faster code review cycles
- Higher developer satisfaction (less cognitive load)

## Language-Specific Thresholds

### Go (Golang)

**gocyclo default**: 10 (strict)

**Justification:**
- Go emphasizes simplicity
- Explicit error handling increases complexity naturally
- Early returns and guard clauses are idiomatic

**Adjustment for Go:**
```bash
# Strict (default)
gocyclo -over 10 .

# Moderate (for established projects)
gocyclo -over 15 .
```

### JavaScript/TypeScript

**ESLint default**: 20 (lenient)

**Recommendation**: Lower to 10 for better maintainability

**Configuration:**
```javascript
// .eslintrc.js
rules: {
  'complexity': ['error', 10]  // Stricter than default
}
```

**Rationale**: JavaScript's flexibility can lead to overly complex functions. Stricter threshold encourages functional decomposition.

### Python

**radon default**: No threshold (report only)

**Common thresholds:**
- **A**: 1-5 (simple blocks)
- **B**: 6-10 (well-structured)
- **C**: 11-20 (moderate complexity)
- **D**: 21-50 (high complexity, refactor)
- **F**: 51+ (unstable, critical refactoring)

**Flake8 configuration:**
```ini
# setup.cfg
[flake8]
max-complexity = 10
```

## Domain-Specific Adjustments

### Financial/Tax Software

**Threshold**: 15-20 (higher tolerance)

**Rationale:**
- Regulatory requirements create inherent complexity
- Business rules are externally imposed
- Correctness > simplicity

**Mitigation:**
- Comprehensive test coverage (>90%)
- Extensive documentation
- Regular audits

### Validation Logic

**Threshold**: 12-15 (moderate tolerance)

**Rationale:**
- Input validation requires many checks
- Sequential validations are acceptable
- Alternative (strategy pattern) may be over-engineering

**Example:**
```typescript
function validateUser(user: User): ValidationResult {
  if (!user.email) return { valid: false, error: 'Email required' };
  if (!isValidEmail(user.email)) return { valid: false, error: 'Invalid email' };
  if (!user.age) return { valid: false, error: 'Age required' };
  if (user.age < 18) return { valid: false, error: 'Must be 18+' };
  // ... 8 more validations
  return { valid: true };
}
// Complexity: 12 (acceptable for validation)
```

### State Machines

**Threshold**: 20+ (high tolerance if well-structured)

**Rationale:**
- State machines have many transitions by design
- Explicit switch statement clearer than pattern abstractions
- Complexity is essential, not accidental

**Requirements:**
- Clear state diagram documentation
- Comprehensive state transition tests
- No nested state logic

## Chariot Platform Recommendations

Based on our codebase analysis:

### Backend (Go)

| Component | Threshold | Justification |
|-----------|-----------|---------------|
| Handlers | 10 | User-facing, frequent changes |
| Services | 12 | Business logic, moderate complexity |
| Repositories | 8 | Data access, should be simple |
| Validators | 15 | Input validation, sequential checks acceptable |

### Frontend (React/TypeScript)

| Component | Threshold | Justification |
|-----------|-----------|---------------|
| Components | 8 | UI logic should be simple |
| Hooks | 10 | State management, moderate complexity |
| Utils | 10 | Pure functions, easy to test |
| Forms | 12 | Validation logic, more complex acceptable |

### CI/CD Configuration

Recommended `.lizard.yml`:

```yaml
thresholds:
  default: 10

  # Stricter for critical paths
  src/handlers/auth: 8
  src/repositories: 8

  # Moderate for validation
  src/validators: 12

  # Tolerant for state machines
  src/state-machines: 15

# Warning (non-blocking)
warnings:
  complexity: 10

# Error (block PR)
errors:
  complexity: 25
```

## Setting Your Threshold: Decision Matrix

| Factor | Threshold 10 | Threshold 15 | Threshold 20+ |
|--------|-------------|--------------|---------------|
| **Team experience** | Junior | Mixed | Senior |
| **Code change frequency** | High | Moderate | Low |
| **Test coverage** | <80% | 80-90% | >90% |
| **Domain complexity** | Simple CRUD | Business logic | Financial/regulatory |
| **Bug tolerance** | Low (prod-critical) | Moderate | Higher |
| **Review rigor** | Automated only | Automated + manual | Comprehensive manual |

**Formula:**
```
Recommended threshold = 10 + adjustments
  + 2 if team is senior
  + 2 if test coverage >90%
  + 3 if domain is inherently complex (finance, regulations)
  - 2 if code changes frequently
  - 2 if bug tolerance is low
```

## Evolutionary Approach

**Don't enforce strict thresholds immediately** on legacy code:

### Phase 1: Measurement (Month 1)
- Run tools without blocking
- Identify complexity distribution
- Find hotspots (complexity + churn)

### Phase 2: Soft Warnings (Month 2-3)
- Warn at 20 (generous)
- Educate team on refactoring
- Review high-complexity PRs manually

### Phase 3: Moderate Enforcement (Month 4-6)
- Warn at 15
- Block at 25
- Allow exceptions with justification

### Phase 4: Strict Enforcement (Month 7+)
- Warn at 10
- Block at 15
- Exceptions require architectural review

## References

- McCabe, T.J. (1976). "A Complexity Measure"
- [NIST 500-235](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication500-235.pdf)
- [Microsoft Code Metrics](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-cyclomatic-complexity)
- [LinearB: Cyclomatic Complexity Explained](https://linearb.io/blog/cyclomatic-complexity)
- [DX: Why complexity metrics mislead](https://getdx.com/blog/cyclomatic-complexity/)
