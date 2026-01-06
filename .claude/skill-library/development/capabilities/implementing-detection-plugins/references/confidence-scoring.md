# Confidence Scoring

**Scoring algorithms and calibration for vulnerability findings.**

## Confidence Levels

### Score Ranges

| Range     | Level    | Meaning                                   |
| --------- | -------- | ----------------------------------------- |
| 0.9 - 1.0 | Critical | Confirmed exploitation, near-zero FP rate |
| 0.7 - 0.9 | High     | Strong indicators, low FP rate            |
| 0.5 - 0.7 | Medium   | Suspicious behavior, moderate FP rate     |
| 0.3 - 0.5 | Low      | Weak indicators, high FP rate             |
| 0.0 - 0.3 | Info     | Interesting but unconfirmed               |

## Scoring Factors

### 1. Detection Method

```go
func baseConfidenceByMethod(method DetectionMethod) float64 {
    switch method {
    case OOBCallback:
        return 0.95 // OOB interaction confirms vulnerability
    case ErrorBased:
        return 0.85 // Error message confirms SQL/code execution
    case TimeBased:
        return 0.75 // Timing correlation (some false positives)
    case Reflection:
        return 0.60 // Reflection alone doesn't confirm exploit
    case Differential:
        return 0.50 // Behavioral difference, needs verification
    default:
        return 0.30
    }
}
```

### 2. Context Validation

```go
func adjustForContext(baseConfidence float64, context Context) float64 {
    switch context {
    case ExecutableContext:
        // XSS in <script>, event handler, or JavaScript context
        return baseConfidence + 0.2
    case EncodedContext:
        // Payload is HTML/JS encoded or sanitized
        return baseConfidence - 0.3
    case AttributeContext:
        // Inside HTML attribute (may need escaping)
        return baseConfidence + 0.1
    case TextContext:
        // Plain text reflection (low exploit potential)
        return baseConfidence - 0.1
    default:
        return baseConfidence
    }
}
```

### 3. Payload Complexity

```go
func adjustForPayloadComplexity(baseConfidence float64, payload Payload) float64 {
    if payload.IsWAFBypass() {
        // Complex bypass suggests real vulnerability
        return baseConfidence + 0.1
    }
    if payload.IsBasic() {
        // Basic payload worked = strong signal
        return baseConfidence + 0.05
    }
    return baseConfidence
}
```

### 4. Verification Evidence

```go
func adjustForEvidence(baseConfidence float64, evidence Evidence) float64 {
    score := baseConfidence

    // Multiple verification methods increase confidence
    if evidence.HasReflection && evidence.HasBehavioralChange {
        score += 0.1
    }

    // Error messages with stack traces are strong evidence
    if evidence.HasStackTrace {
        score += 0.1
    }

    // Successful exploitation increases confidence
    if evidence.HasDataExfiltration {
        score += 0.15
    }

    return score
}
```

## Complete Scoring Algorithm

### XSS Confidence Scoring

```go
func (p *XSSPlugin) calculateConfidence(finding Finding, response *Response) float64 {
    // Base confidence from detection method
    baseConfidence := baseConfidenceByMethod(finding.Method)

    // Adjust for context
    context := detectContext(response, finding.Payload)
    confidence := adjustForContext(baseConfidence, context)

    // Adjust for payload complexity
    confidence = adjustForPayloadComplexity(confidence, finding.Payload)

    // Check for WAF detection
    if detectsWAF(response) {
        // Successfully bypassed WAF
        confidence += 0.1
    }

    // Clamp to [0.0, 1.0]
    return clamp(confidence, 0.0, 1.0)
}

func detectContext(response *Response, payload string) Context {
    // Find payload in response
    index := strings.Index(response.Body, payload)
    if index == -1 {
        return UnknownContext
    }

    // Check surrounding characters
    before := response.Body[max(0, index-50):index]
    after := response.Body[index+len(payload):min(len(response.Body), index+len(payload)+50)]

    // Script tag context
    if strings.Contains(before, "<script") || strings.Contains(after, "</script>") {
        return ExecutableContext
    }

    // Event handler context
    if strings.Contains(before, "on") && strings.Contains(after, "=") {
        return ExecutableContext
    }

    // Encoded context
    if strings.Contains(response.Body[index:index+len(payload)], "&lt;") ||
       strings.Contains(response.Body[index:index+len(payload)], "&#") {
        return EncodedContext
    }

    // Attribute context
    if strings.Contains(before, "\"") || strings.Contains(before, "'") {
        return AttributeContext
    }

    return TextContext
}
```

### SQLi Confidence Scoring

```go
func (p *SQLiPlugin) calculateConfidence(finding Finding, response *Response, timingData *TimingData) float64 {
    baseConfidence := baseConfidenceByMethod(finding.Method)

    switch finding.Method {
    case ErrorBased:
        // Check error specificity
        if containsStackTrace(response) {
            return clamp(baseConfidence + 0.1, 0.0, 1.0)
        }
        if containsGenericError(response) {
            return clamp(baseConfidence - 0.1, 0.0, 1.0)
        }

    case TimeBased:
        // Adjust based on timing correlation
        correlation := calculateTimingCorrelation(timingData)
        adjustment := (correlation - 0.5) * 0.4 // Scale to [-0.2, 0.2]
        return clamp(baseConfidence + adjustment, 0.0, 1.0)

    case UnionBased:
        // Union-based requires multiple columns to match
        if timingData.ColumnsMatched > 3 {
            return clamp(baseConfidence + 0.1, 0.0, 1.0)
        }
    }

    return clamp(baseConfidence, 0.0, 1.0)
}

func calculateTimingCorrelation(timingData *TimingData) float64 {
    // Correlation between expected delay and actual delay
    expectedDelay := timingData.ExpectedDelay.Seconds()
    actualDelay := timingData.ActualDelay.Seconds()
    baseline := timingData.Baseline.Seconds()

    // Check if actual delay is close to expected
    delta := math.Abs(actualDelay - (baseline + expectedDelay))
    tolerance := expectedDelay * 0.2 // 20% tolerance

    if delta < tolerance {
        return 1.0 // Perfect correlation
    }
    if delta < tolerance*2 {
        return 0.8 // Good correlation
    }
    if delta < tolerance*3 {
        return 0.6 // Moderate correlation
    }
    return 0.3 // Poor correlation
}
```

### SSRF Confidence Scoring

```go
func (p *SSRFPlugin) calculateConfidence(finding Finding, response *Response, oobInteraction *OOBInteraction) float64 {
    if oobInteraction != nil {
        // OOB callback received
        baseConfidence := 0.95

        // Adjust based on interaction type
        switch oobInteraction.Protocol {
        case "http", "https":
            // Full HTTP request received
            return clamp(baseConfidence + 0.05, 0.0, 1.0)
        case "dns":
            // DNS lookup only
            return clamp(baseConfidence, 0.0, 1.0)
        default:
            return clamp(baseConfidence - 0.05, 0.0, 1.0)
        }
    }

    // No OOB, check for response indicators
    if detectsInternalResponse(response) {
        return 0.80 // High confidence without OOB
    }

    if detectsMetadataResponse(response) {
        return 0.85 // Cloud metadata access is high confidence
    }

    return 0.60 // Behavioral indicators only
}
```

## False Positive Mitigation

### Statistical Analysis

```go
type ConfidenceCalibrator struct {
    historicalFindings []HistoricalFinding
}

type HistoricalFinding struct {
    InitialConfidence float64
    Verified          bool // Manual verification result
}

func (c *ConfidenceCalibrator) CalibrateScore(rawScore float64) float64 {
    // Adjust score based on historical false positive rate
    fpRate := c.calculateFalsePositiveRate(rawScore)

    // Reduce confidence if high FP rate in this score range
    adjustedScore := rawScore * (1.0 - fpRate)

    return clamp(adjustedScore, 0.0, 1.0)
}

func (c *ConfidenceCalibrator) calculateFalsePositiveRate(scoreRange float64) float64 {
    // Calculate FP rate for findings in similar score range
    rangeMin := scoreRange - 0.1
    rangeMax := scoreRange + 0.1

    total := 0
    falsePositives := 0

    for _, finding := range c.historicalFindings {
        if finding.InitialConfidence >= rangeMin && finding.InitialConfidence <= rangeMax {
            total++
            if !finding.Verified {
                falsePositives++
            }
        }
    }

    if total == 0 {
        return 0.0
    }

    return float64(falsePositives) / float64(total)
}
```

### Multi-Factor Verification

```go
type VerificationFactor struct {
    Name       string
    Score      float64
    Weight     float64
}

func calculateMultiFactorConfidence(factors []VerificationFactor) float64 {
    totalWeight := 0.0
    weightedSum := 0.0

    for _, factor := range factors {
        totalWeight += factor.Weight
        weightedSum += factor.Score * factor.Weight
    }

    if totalWeight == 0 {
        return 0.0
    }

    return weightedSum / totalWeight
}

func verifyXSSFinding(finding Finding, response *Response) float64 {
    factors := []VerificationFactor{
        {Name: "Reflection", Score: reflectionScore(response, finding.Payload), Weight: 0.3},
        {Name: "Context", Score: contextScore(response, finding.Payload), Weight: 0.4},
        {Name: "Encoding", Score: encodingScore(response, finding.Payload), Weight: 0.2},
        {Name: "WAFBypass", Score: wafBypassScore(response), Weight: 0.1},
    }

    return calculateMultiFactorConfidence(factors)
}
```

## Confidence-Based Actions

### Action Thresholds

```go
const (
    AutoReportThreshold   = 0.85 // Report without manual verification
    ManualReviewThreshold = 0.60 // Flag for manual review
    SuppressThreshold     = 0.40 // Suppress as likely false positive
)

func determineAction(finding Finding) Action {
    if finding.Confidence >= AutoReportThreshold {
        return ActionAutoReport
    }
    if finding.Confidence >= ManualReviewThreshold {
        return ActionManualReview
    }
    if finding.Confidence >= SuppressThreshold {
        return ActionFlagForReview
    }
    return ActionSuppress
}
```

### Batching by Confidence

```go
func groupFindingsByConfidence(findings []Finding) map[ConfidenceLevel][]Finding {
    groups := make(map[ConfidenceLevel][]Finding)

    for _, finding := range findings {
        level := classifyConfidence(finding.Confidence)
        groups[level] = append(groups[level], finding)
    }

    return groups
}

func classifyConfidence(score float64) ConfidenceLevel {
    if score >= 0.9 {
        return ConfidenceCritical
    }
    if score >= 0.7 {
        return ConfidenceHigh
    }
    if score >= 0.5 {
        return ConfidenceMedium
    }
    if score >= 0.3 {
        return ConfidenceLow
    }
    return ConfidenceInfo
}
```

## Best Practices

1. **Multi-Factor Scoring**: Combine detection method, context, and evidence
2. **Calibration**: Adjust scores based on historical FP rates
3. **Threshold Configuration**: Allow users to set confidence thresholds
4. **Transparency**: Log scoring factors for debugging and tuning
5. **Continuous Learning**: Update calibration based on verified findings
