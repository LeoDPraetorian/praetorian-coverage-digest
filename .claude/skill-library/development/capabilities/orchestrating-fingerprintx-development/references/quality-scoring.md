# Quality Scoring (Fingerprintx Development)

Quantitative quality assessment for fingerprintx module implementations.

## Overview

Quality scoring replaces subjective "good enough" judgments with measurable thresholds. Validation agents return structured scores that orchestrators use to make proceed/retry decisions.

## Fingerprintx Quality Factors

```json
{
  "quality_score": 85,
  "factors": {
    "detection_accuracy": { "weight": 35, "score": 90 },
    "version_extraction": { "weight": 25, "score": 85 },
    "code_coverage": { "weight": 20, "score": 80 },
    "code_quality": { "weight": 20, "score": 85 }
  },
  "threshold": 75,
  "verdict": "PASS"
}
```

**Formula**: `quality_score = Σ(factor.weight × factor.score / 100)`

## Factor Definitions

### Detection Accuracy (35%)

How reliably does the plugin detect the target service?

| Score | Criteria                           |
| ----- | ---------------------------------- |
| 100   | ≥98% detection on test samples     |
| 90    | 95-97% detection                   |
| 80    | 90-94% detection                   |
| 70    | 85-89% detection                   |
| 60    | 80-84% detection                   |
| <60   | <80% detection (needs improvement) |

### Version Extraction (25%)

How reliably does the plugin extract version information?

| Score | Criteria                                   |
| ----- | ------------------------------------------ |
| 100   | Version extracted for ≥90% of detections   |
| 85    | Version extracted for 70-89% of detections |
| 70    | Version extracted for 50-69% of detections |
| 50    | Version extracted for 30-49% of detections |
| <50   | Version rarely extracted                   |

### Code Coverage (20%)

Test coverage percentage for the plugin module.

| Score | Coverage                |
| ----- | ----------------------- |
| 100   | ≥95%                    |
| 90    | 85-94%                  |
| 80    | 75-84%                  |
| 70    | 65-74%                  |
| <70   | <65% (needs more tests) |

### Code Quality (20%)

Go code quality metrics (golint, govet, complexity).

| Score | Criteria                                   |
| ----- | ------------------------------------------ |
| 100   | No lint warnings, low complexity           |
| 85    | Minor lint warnings, acceptable complexity |
| 70    | Some lint issues, moderate complexity      |
| <70   | Significant quality issues                 |

## Score Interpretation

| Score  | Interpretation     | Action                               |
| ------ | ------------------ | ------------------------------------ |
| 90-100 | Excellent          | Proceed immediately                  |
| 75-89  | Good, acceptable   | Proceed                              |
| 60-74  | Needs improvement  | Feedback loop (respect retry limits) |
| <60    | Significant issues | Escalate to user                     |

**Threshold**: 75 (default for fingerprintx)

## Example Scoring

**Context**: MySQL plugin implementation review

**Scoring Process**:

1. **Detection Accuracy (35%)**:
   - Tested against 50 MySQL instances
   - 49/50 detected correctly
   - → Score: 95 (98% detection)

2. **Version Extraction (25%)**:
   - 45/49 detections had version
   - → Score: 90 (92% version extraction)

3. **Code Coverage (20%)**:
   - `go test -cover` shows 82%
   - → Score: 80

4. **Code Quality (20%)**:
   - `golint` shows 2 minor warnings
   - `govet` clean
   - → Score: 85

**Calculation**:

```
quality_score = (35×95 + 25×90 + 20×80 + 20×85) / 100
              = (3325 + 2250 + 1600 + 1700) / 100
              = 88.75 ≈ 89

Threshold: 75
Verdict: PASS (89 >= 75) ✅
```

## Using Quality Scores

### Automatic Proceed

```typescript
if quality_score >= threshold:
  mark_phase_complete()
  proceed_to_next_phase()
```

### Feedback Loop

```typescript
if 60 <= quality_score < threshold:
  if retry_count < max_retries:
    provide_feedback_to_agent()
    retry_count++
  else:
    escalate_to_user()
```

### Immediate Escalation

```typescript
if quality_score < 60:
  escalate_to_user("Significant quality issues detected")
```

## Threshold Customization

**Higher threshold (80-85)**:

- Critical infrastructure detection
- Production deployments
- High-security services

**Standard threshold (75)**:

- Most fingerprintx modules
- Standard development

**Lower threshold (70)**:

- Proof of concept
- Experimental protocols

## Anti-Patterns

| Anti-Pattern       | Why Wrong                              | Correct Approach           |
| ------------------ | -------------------------------------- | -------------------------- |
| Equal weights      | Detection is more important than style | Use differentiated weights |
| Ignoring breakdown | Need to know WHY score is low          | Review failing factors     |
| Subjective scoring | "Looks good" isn't measurable          | Use objective criteria     |
| Too many factors   | Hard to score accurately               | Stick to 3-5 factors       |

## Related References

- [orchestration-guards.md](orchestration-guards.md) - Retry limits and escalation
- [phase-11-code-quality.md](phase-11-code-quality.md) - Code quality review phase
