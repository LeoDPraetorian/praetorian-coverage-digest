# Complementary Code Quality Metrics

Use these metrics alongside cyclomatic complexity for comprehensive code quality assessment.

## Cognitive Complexity (SonarSource)

**What it measures**: Human mental effort required to understand code

**Key difference from cyclomatic complexity**: Penalizes nesting heavily

### Calculation

```
Cognitive Complexity = Base complexity + Nesting penalties
```

**Nesting multipliers:**

- Each nesting level: +1 per decision point
- Sequences: No penalty

**Example:**

```typescript
// Cyclomatic: 4, Cognitive: 7
function example(x, y) {
  if (x > 0) {
    // +1 base, +0 nesting = 1
    if (y > 0) {
      // +1 base, +1 nesting = 2
      if (x > y) {
        // +1 base, +2 nesting = 3
        return x;
      }
    }
  }
  return 0; // +1 base = 1
}
// Total cognitive: 7
```

**Tools:**

- SonarQube/SonarCloud (built-in)
- ESLint plugin: `eslint-plugin-sonarjs`

**Thresholds:**

- ≤15: Good
- 16-25: Review
- > 25: Refactor

## Nesting Depth

**What it measures**: Maximum indentation level

**Why it matters**: Deep nesting = hard to follow logic

**Example:**

```typescript
function badNesting(a, b, c) {
  if (a) {
    // Depth 1
    if (b) {
      // Depth 2
      if (c) {
        // Depth 3
        if (a > b) {
          // Depth 4
          if (b > c) {
            // Depth 5 ❌
            return true;
          }
        }
      }
    }
  }
  return false;
}
// Max nesting: 5 (too deep)
```

**Thresholds:**

- ≤3: Good
- 4: Acceptable
- ≥5: Refactor with guard clauses

**Tools:**

- ESLint: `max-depth` rule
- Lizard: reports nesting depth
- Manual: Count indentation levels

## Lines of Code (LOC)

**What it measures**: Function/class size

**NASA SATC finding**: _"Modules with both high complexity AND large size have lowest reliability."_

### Combined Risk Matrix

| Complexity | LOC <50     | LOC 50-100  | LOC 100-200 | LOC >200    |
| ---------- | ----------- | ----------- | ----------- | ----------- |
| **≤10**    | ✅ Low      | ✅ Low      | ⚠️ Moderate | ❌ High     |
| **11-15**  | ⚠️ Moderate | ⚠️ Moderate | ❌ High     | ❌ Critical |
| **16-25**  | ❌ High     | ❌ High     | ❌ Critical | ❌ Critical |
| **>25**    | ❌ Critical | ❌ Critical | ❌ Critical | ❌ Critical |

**Thresholds:**

- Functions: ≤50 lines
- Classes: ≤300 lines
- Files: ≤500 lines

**Exception**: Generated code, data structures

## Parameter Count

**What it measures**: Number of function parameters

**Why it matters**: Many parameters = complex interface, hard to test

**Thresholds:**

- ≤3: Good
- 4-5: Acceptable
- ≥6: Refactor (use object parameter)

**Refactoring:**

```typescript
// Before: 6 parameters
function createUser(name, email, age, address, phone, role) {}

// After: 1 object parameter
function createUser(userData: UserData) {}
```

## Change Frequency (Churn)

**What it measures**: How often code changes

**Why it matters**: High complexity + high churn = bug magnet

**Calculation:**

```bash
# Git commits touching a file in last 90 days
git log --since="90 days ago" --oneline --follow path/to/file.ts | wc -l
```

**Combined risk:**
| Complexity | Churn <5 | Churn 5-20 | Churn >20 |
|-----------|----------|------------|-----------|
| **≤10** | ✅ Low | ⚠️ Moderate | ⚠️ Moderate |
| **11-15** | ⚠️ Moderate | ❌ High | ❌ High |
| **>15** | ❌ High | ❌ Critical | ❌ Critical |

**Action**: Prioritize refactoring high-complexity, high-churn code.

## Test Coverage

**What it measures**: Percentage of code executed by tests

**Why it matters**: High complexity + low coverage = untested paths

**Combined risk:**
| Complexity | Coverage <50% | Coverage 50-80% | Coverage >80% |
|-----------|---------------|-----------------|---------------|
| **≤10** | ⚠️ Moderate | ✅ Good | ✅ Good |
| **11-15** | ❌ High | ⚠️ Moderate | ✅ Good |
| **>15** | ❌ Critical | ❌ High | ⚠️ Moderate |

**Thresholds:**

- Simple code (complexity ≤5): 70% acceptable
- Moderate (6-10): 80% recommended
- Complex (>10): 90%+ required

## Maintainability Index (MI)

**Formula** (Microsoft Visual Studio):

```
MI = 171 - 5.2 * ln(Halstead Volume)
        - 0.23 * Cyclomatic Complexity
        - 16.2 * ln(Lines of Code)
```

**Interpretation:**

- 85-100: Highly maintainable
- 65-85: Moderately maintainable
- <65: Difficult to maintain

**Tools:**

- Visual Studio (built-in)
- radon (Python): `radon mi`

## Comprehensive Quality Model

### The NASA Approach

**Factors:**

1. Cyclomatic Complexity
2. Lines of Code
3. Test Coverage
4. Change Frequency
5. Defect Density

**Risk score** = (Complexity × LOC × Churn) / (Coverage × 100)

**Example:**

```
Function A:
- Complexity: 15
- LOC: 80
- Churn: 12 changes/90d
- Coverage: 75%

Risk = (15 × 80 × 12) / (75 × 100)
     = 14,400 / 7,500
     = 1.92 (High risk)

Function B:
- Complexity: 8
- LOC: 40
- Churn: 3 changes/90d
- Coverage: 90%

Risk = (8 × 40 × 3) / (90 × 100)
     = 960 / 9,000
     = 0.11 (Low risk)
```

## Chariot Platform Quality Dashboard

**Recommended metrics to track:**

```typescript
interface QualityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  linesOfCode: number;
  parameterCount: number;
  testCoverage: number; // percentage
  changeFrequency: number; // commits/90d
  defectDensity: number; // bugs per 1000 LOC
  maintainabilityIndex: number;
}

interface RiskAssessment {
  level: "low" | "moderate" | "high" | "critical";
  score: number;
  factors: string[];
  recommendations: string[];
}

function assessRisk(metrics: QualityMetrics): RiskAssessment {
  // Combined scoring logic
  let score = 0;

  // Cyclomatic complexity (0-30 points)
  if (metrics.cyclomaticComplexity > 15) score += 30;
  else if (metrics.cyclomaticComplexity > 10) score += 15;

  // Size (0-20 points)
  if (metrics.linesOfCode > 200) score += 20;
  else if (metrics.linesOfCode > 100) score += 10;

  // Churn (0-25 points)
  if (metrics.changeFrequency > 20) score += 25;
  else if (metrics.changeFrequency > 10) score += 15;

  // Coverage penalty (0-25 points)
  if (metrics.testCoverage < 50) score += 25;
  else if (metrics.testCoverage < 80) score += 10;

  // Determine level
  if (score >= 70) return { level: "critical", score, factors: [], recommendations: [] };
  if (score >= 50) return { level: "high", score, factors: [], recommendations: [] };
  if (score >= 30) return { level: "moderate", score, factors: [], recommendations: [] };
  return { level: "low", score, factors: [], recommendations: [] };
}
```

## Tool Integration

**Multi-metric analysis:**

```bash
# Backend (Go)
gocyclo -over 10 . > complexity.txt
go test -cover ./... > coverage.txt
git log --since="90 days ago" --numstat --format="" -- "*.go" | awk '{sum+=$1+$2} END {print "Churn:", sum}'

# Frontend (TypeScript)
npx eslint src/ --format json > eslint-report.json
npx nyc --reporter=text-summary npm test
```

**Combined report:**

```typescript
// scripts/quality-report.ts
const metrics = {
  complexity: parseComplexityReport(),
  coverage: parseCoverageReport(),
  churn: parseGitLog(),
};

const risks = identifyHighRiskFiles(metrics);
console.log("High-risk files:", risks);
```

## References

- [SonarSource: Cognitive Complexity](https://www.sonarsource.com/resources/white-papers/cognitive-complexity/)
- [Microsoft: Code Metrics](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values)
- [NASA: Software Assurance](https://www.nasa.gov/reference/software-assurance/)
