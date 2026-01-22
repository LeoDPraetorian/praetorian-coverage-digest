# Quality Scoring

Factor customization examples by workflow type for quantitative quality assessment.

## Overview

Quality scoring replaces subjective "good enough" judgments with measurable thresholds. Validation agents return a structured score with weighted factors that orchestrators use to make proceed/retry decisions.

## Base Structure

```json
{
  "quality_score": 85,
  "factors": {
    "completeness": { "weight": 40, "score": 90 },
    "correctness": { "weight": 30, "score": 85 },
    "quality": { "weight": 20, "score": 80 },
    "edge_cases": { "weight": 10, "score": 75 }
  },
  "threshold": 70,
  "verdict": "PASS"
}
```

**Formula**: `quality_score = Σ(factor.weight × factor.score / 100)`

**Example calculation**:

```
completeness: 40 × 90 / 100 = 36
correctness:  30 × 85 / 100 = 25.5
quality:      20 × 80 / 100 = 16
edge_cases:   10 × 75 / 100 = 7.5
                    TOTAL = 85
```

## Factor Customization by Workflow Type

### Implementation Workflow

**Emphasis**: Correctness and completeness over style

```json
{
  "factors": {
    "correctness": { "weight": 40, "score": 85 },
    "completeness": { "weight": 30, "score": 90 },
    "maintainability": { "weight": 20, "score": 80 },
    "performance": { "weight": 10, "score": 75 }
  },
  "threshold": 75
}
```

**Rationale**:

- Correctness (40%): Does it work as specified?
- Completeness (30%): All requirements implemented?
- Maintainability (20%): Can others understand and modify?
- Performance (10%): Acceptable speed, not premature optimization

**Example Scoring**:

| Scenario                             | Correctness | Completeness | Maintainability | Performance | Total     |
| ------------------------------------ | ----------- | ------------ | --------------- | ----------- | --------- |
| All tests pass, complete, clean code | 100         | 100          | 90              | 80          | **93** ✅ |
| Tests pass, missing 1 feature        | 100         | 70           | 90              | 80          | **86** ✅ |
| Tests failing, all features present  | 60          | 100          | 90              | 80          | **77** ✅ |
| Tests pass, spaghetti code           | 100         | 100          | 40              | 80          | **83** ✅ |
| Tests failing, missing features      | 60          | 70           | 90              | 80          | **70** ⚠️ |
| Half-implemented, messy              | 50          | 60           | 40              | 70          | **53** ❌ |

### Testing Workflow

**Emphasis**: Coverage and edge case handling

```json
{
  "factors": {
    "coverage": { "weight": 40, "score": 85 },
    "edge_cases": { "weight": 30, "score": 80 },
    "test_quality": { "weight": 20, "score": 90 },
    "flakiness": { "weight": 10, "score": 95 }
  },
  "threshold": 70
}
```

**Rationale**:

- Coverage (40%): Percentage of code tested
- Edge cases (30%): Error scenarios, boundaries, null handling
- Test quality (20%): Meaningful assertions, behavior vs implementation
- Flakiness (10%): Reliability, no time-dependent tests

**Scoring Guidelines**:

**Coverage** (40%):

- 95-100% → 100 points
- 85-94% → 90 points
- 75-84% → 80 points
- 65-74% → 70 points
- <65% → 50 points

**Edge Cases** (30%):

- All error scenarios tested → 100 points
- Most error scenarios → 85 points
- Some error scenarios → 70 points
- Happy path only → 40 points

**Test Quality** (20%):

- Behavior testing, meaningful assertions → 100 points
- Mix of behavior + implementation → 80 points
- Mostly implementation testing → 60 points
- Mock-only tests → 30 points

**Flakiness** (10%):

- All tests deterministic → 100 points
- Minor timing sensitivity → 85 points
- Occasional flakiness → 60 points
- Frequent flakiness → 20 points

### Documentation Workflow

**Emphasis**: Completeness and clarity

```json
{
  "factors": {
    "completeness": { "weight": 50, "score": 85 },
    "clarity": { "weight": 30, "score": 90 },
    "accuracy": { "weight": 15, "score": 95 },
    "formatting": { "weight": 5, "score": 100 }
  },
  "threshold": 70
}
```

**Rationale**:

- Completeness (50%): All topics covered, no gaps
- Clarity (30%): Easy to understand, good examples
- Accuracy (15%): Correct information, up-to-date
- Formatting (5%): Markdown compliance, readable

**Scoring Example**:

```
Completeness: 85 (covers most topics, missing edge case docs)
Clarity: 90 (clear examples, well-structured)
Accuracy: 95 (all information correct)
Formatting: 100 (perfect markdown)

Score = 50×0.85 + 30×0.90 + 15×0.95 + 5×1.00
      = 42.5 + 27 + 14.25 + 5
      = 88.75 ✅ PASS
```

### Architecture Review Workflow

**Emphasis**: Scalability and maintainability

```json
{
  "factors": {
    "scalability": { "weight": 35, "score": 85 },
    "maintainability": { "weight": 30, "score": 80 },
    "security_considerations": { "weight": 25, "score": 90 },
    "clarity": { "weight": 10, "score": 95 }
  },
  "threshold": 75
}
```

**Rationale**:

- Scalability (35%): Can handle growth, extensible
- Maintainability (30%): Clean boundaries, understandable
- Security (25%): Threat modeling, attack surface
- Clarity (10%): Well-documented decisions, rationale

### Security Review Workflow

**Emphasis**: Vulnerability prevention

```json
{
  "factors": {
    "input_validation": { "weight": 30, "score": 85 },
    "authentication_authz": { "weight": 30, "score": 90 },
    "data_protection": { "weight": 20, "score": 80 },
    "owasp_compliance": { "weight": 20, "score": 75 }
  },
  "threshold": 80
}
```

**Note**: Security has higher threshold (80 vs 70) - less tolerance for issues.

**Rationale**:

- Input validation (30%): Injection prevention, sanitization
- Auth/Authz (30%): Proper access controls
- Data protection (20%): Encryption, secure storage
- OWASP Top 10 (20%): No common vulnerabilities

## Score Interpretation

| Score  | Interpretation     | Action                               |
| ------ | ------------------ | ------------------------------------ |
| 90-100 | Excellent          | Proceed immediately                  |
| 70-89  | Good, acceptable   | Proceed                              |
| 50-69  | Needs improvement  | Feedback loop (respect retry limits) |
| <50    | Significant issues | Escalate to user                     |

## Using Quality Scores in Orchestration

### Automatic Proceed

```typescript
if quality_score >= threshold:
  mark_phase_complete()
  proceed_to_next_phase()
```

### Feedback Loop

```typescript
if 50 <= quality_score < threshold:
  if retry_count < max_retries:
    provide_feedback_to_agent()
    retry_count++
  else:
    escalate_to_user()
```

### Immediate Escalation

```typescript
if quality_score < 50:
  escalate_to_user("Significant quality issues detected")
```

## Threshold Customization

Default threshold is 70, but adjust based on:

**Higher threshold (75-80):**

- Security-critical code
- Production deployment
- Public-facing APIs
- Payment processing

**Standard threshold (70):**

- Internal tools
- MVP development
- Prototype features

**Lower threshold (60-65):**

- Exploratory work
- Proof of concept
- Non-critical utilities

**Example**: Security review for payment processing

```json
{
  "threshold": 85,
  "rationale": "Payment processing requires high security bar"
}
```

## Combining with Gated Verification

Quality scoring works within gated verification:

**Stage 1 (Spec Compliance)**:

- Binary: COMPLIANT | NOT_COMPLIANT
- No quality score (compliance is yes/no)

**Stage 2 (Quality Assessment)**:

- Returns quality_score
- Uses threshold for proceed decision

```
Stage 1: COMPLIANT? → Yes
Stage 2: quality_score = 82, threshold = 70 → PASS (82 >= 70)
Result: Proceed to next phase
```

## Factor Weight Guidelines

**How to choose weights:**

1. **Identify critical factors** (30-50% weight each)
2. **Add important factors** (15-25% weight each)
3. **Include secondary factors** (5-15% weight each)
4. **Ensure sum = 100%**

**Anti-pattern**: Equal weights for all factors

```json
// WRONG - treats everything as equally important
{
  "correctness": { "weight": 25, "score": 85 },
  "completeness": { "weight": 25, "score": 90 },
  "style": { "weight": 25, "score": 80 },
  "performance": { "weight": 25, "score": 75 }
}
```

Code style is NOT as important as correctness. Use differentiated weights.

## User Override

User can override threshold via AskUserQuestion:

```typescript
if quality_score < threshold:
  AskUserQuestion({
    question: `Quality score ${quality_score} below threshold ${threshold}. Proceed?`,
    options: [
      { label: "Proceed anyway", description: "Accept current quality" },
      { label: "Show breakdown", description: "Review factor scores" },
      { label: "Retry", description: "Attempt improvement" }
    ]
  })
```

## Scoring Consistency

**Same agent should score same quality consistently**

Test calibration:

```
Input A → Agent scores 85
Input A (retry) → Agent should score ~85 (within ±5)
```

If agent scoring is inconsistent (e.g., 85 then 65 for same input), issue with agent prompt clarity.

## Progressive Scoring

For iterative workflows, score can improve:

```
Attempt 1: quality_score = 55 (below threshold, retry)
Attempt 2: quality_score = 72 (above threshold, proceed)
```

Track score progression in metadata:

```json
{
  "attempts": [
    { "attempt": 1, "quality_score": 55, "verdict": "RETRY" },
    { "attempt": 2, "quality_score": 72, "verdict": "PASS" }
  ]
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hardcoded Thresholds

**WRONG**: Always using 70, regardless of context

**RIGHT**: Adjust threshold based on workflow type and criticality

### Anti-Pattern 2: Ignoring Factor Breakdown

**WRONG**: Only looking at total score

**RIGHT**: Review which factors failed when score is low

```typescript
if quality_score < threshold:
  // Find failing factors
  failing_factors = factors.filter(f => f.score < 70)
  log(`Failing factors: ${failing_factors.join(', ')}`)
```

### Anti-Pattern 3: Subjective Scoring

**WRONG**: "This looks pretty good, I'll give it 80"

**RIGHT**: Objective criteria per factor

- Completeness: 5/5 requirements → 100, 4/5 → 80, 3/5 → 60
- Coverage: 95% → 100, 85% → 90, 75% → 80

### Anti-Pattern 4: Too Many Factors

**WRONG**: 10 factors at 10% each (hard to score accurately)

**RIGHT**: 3-5 factors with clear weights

## Example: Implementation Review

**Context**: Backend developer implemented asset creation handler

**Reviewer Scoring Process**:

1. **Correctness (40% weight)**:
   - All tests pass ✅
   - Error handling works ✅
   - Edge cases covered ✅
   - → Score: 95

2. **Completeness (30% weight)**:
   - 5/5 requirements from plan ✅
   - → Score: 100

3. **Maintainability (20% weight)**:
   - Clear function names ✅
   - Comments where needed ✅
   - No code duplication ✅
   - Slightly long function (150 lines) ⚠️
   - → Score: 85

4. **Performance (10% weight)**:
   - Acceptable latency ✅
   - No obvious inefficiencies ✅
   - → Score: 90

**Calculation**:

```
quality_score = (40×95 + 30×100 + 20×85 + 10×90) / 100
              = (3800 + 3000 + 1700 + 900) / 100
              = 94

Threshold: 75
Verdict: PASS (94 >= 75) ✅
```

**Returned to orchestrator**:

```json
{
  "quality_score": 94,
  "factors": {
    "correctness": { "weight": 40, "score": 95 },
    "completeness": { "weight": 30, "score": 100 },
    "maintainability": { "weight": 20, "score": 85 },
    "performance": { "weight": 10, "score": 90 }
  },
  "threshold": 75,
  "verdict": "PASS",
  "summary": "Excellent implementation. Minor note: consider extracting validation logic to reduce function length."
}
```

## Summary

**Quality scoring benefits:**

1. **Objective**: Replaces "looks good" with numbers
2. **Actionable**: Shows which factors need improvement
3. **Consistent**: Same criteria across all reviews
4. **Trackable**: Can measure quality trends over time
5. **Customizable**: Adjust weights per workflow type

**Use quality scoring when:**

- Validation/review phases
- Need objective proceed/retry decision
- Want to track quality trends
- Multiple quality dimensions matter

**Skip quality scoring when:**

- Binary decision sufficient (works/doesn't work)
- Single quality dimension (e.g., "does it build?")
- Overhead not justified for simple tasks
