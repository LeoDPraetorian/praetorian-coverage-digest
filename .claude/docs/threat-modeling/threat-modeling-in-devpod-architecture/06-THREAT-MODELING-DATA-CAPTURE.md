# Threat Modeling Training Data Capture Architecture

**Document**: 6 of 6 - Training Data Capture **Feature**: Telemetry and training
data collection from DevPod threat modeling sessions **Status**: Ready for
Implementation **Owner**: Nathan Sportsman **Last Updated**: 2026-01-10
**Related**: [THREAT-MODELING-IN-DEVPOD.md](THREAT-MODELING-IN-DEVPOD.md)

---

## Executive Summary

This document defines the **consolidated architecture** for capturing training
data from threat modeling DevPod sessions to build a **data flywheel** for
proprietary model training. The system captures interaction patterns between
security engineers and Claude Code while strictly protecting customer code,
vulnerabilities, and PII.

This architecture incorporates:

1. **Research findings** on AWS Kinesis, DPO/RLHF pipelines, and PII
   sanitization
2. **Chariot codebase alignment** with existing service patterns and conventions
3. **Critical issue resolutions** from technical review (race conditions,
   security compliance, pattern coverage)
4. **Simplified infrastructure** reducing cost by 63% while maintaining
   functionality

### Key Objectives

1. **Capture methodology patterns** - How expert security engineers perform
   threat modeling
2. **Generate preference pairs** - Original vs corrected outputs for RLHF/DPO
   training
3. **Build prompt libraries** - High-quality threat modeling prompts from
   experts
4. **Enable model fine-tuning** - Train smaller, specialized threat modeling
   models
5. **Protect customer data** - NEVER capture customer code, vulnerabilities, or
   PII

### Value Proposition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA FLYWHEEL FOR MODEL TRAINING                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Security Engineer ◄──────────────────────► Claude Code                     │
│        │                                         │                          │
│        │  • Prompts threat modeling tasks        │                          │
│        │  • Corrects/refines outputs             │                          │
│        │  • Accepts/rejects suggestions          │                          │
│        │  • Adds domain expertise                │                          │
│        │                                         │                          │
│        └────────────────┬────────────────────────┘                          │
│                         │                                                   │
│                         ▼                                                   │
│              ┌─────────────────────┐                                        │
│              │  VALUABLE SIGNALS   │                                        │
│              │  ─────────────────  │                                        │
│              │  • Preference pairs │  ← Original vs corrected output        │
│              │  • Expert edits     │  ← What humans improve                 │
│              │  • Prompt patterns  │  ← How experts ask questions           │
│              │  • Methodology      │  ← STRIDE, attack trees, DFDs          │
│              │  • Accept/reject    │  ← Binary quality signal               │
│              └─────────────────────┘                                        │
│                                                                             │
│  TRAINING OUTCOMES:                                                         │
│  ✓ Fine-tuned threat modeling models (DPO/RLHF)                            │
│  ✓ Specialized smaller models (cost reduction)                             │
│  ✓ Improved prompt templates                                               │
│  ✓ RAG retrieval system for threat patterns                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Critical Issues Resolved

| Issue                                            | Resolution                                                    | Status   |
| ------------------------------------------------ | ------------------------------------------------------------- | -------- |
| P1-4 Security Violation (string-based tokens)    | `GetSecretBytes()` + `ZeroBytes()` for secure memory handling | ✅ Fixed |
| Race condition in TelemetryBuffer                | `async-mutex` for atomic buffer operations                    | ✅ Fixed |
| Incomplete code pattern detection (~15 patterns) | Expanded to 40+ patterns covering all major languages         | ✅ Fixed |
| Architecture over-engineering (Kinesis Firehose) | Simplified to DynamoDB + nightly S3 export                    | ✅ Fixed |
| Pattern misalignment with Chariot                | Full integration with `cloud.AWS` and service patterns        | ✅ Fixed |

---

## Problem Statement

### Current Gap

The threat modeling DevPod architecture provides secure environments for
engineers to perform threat modeling with Claude Code, but **does not capture
any training data** from these interactions.

### Opportunity

Every DevPod session generates valuable training signals:

| Signal Type              | Example                                           | Training Value               |
| ------------------------ | ------------------------------------------------- | ---------------------------- |
| **Expert prompts**       | "Analyze authentication flows for STRIDE threats" | Prompt engineering templates |
| **Preference pairs**     | (Claude's output, Engineer's correction)          | RLHF/DPO training data       |
| **Methodology patterns** | STRIDE enumeration, attack tree construction      | Domain-specific fine-tuning  |
| **Quality ratings**      | 5-star ratings, accept/reject signals             | Model evaluation benchmarks  |
| **Behavioral signals**   | Dwell time, edit distance, copy-paste             | Implicit quality feedback    |

### Critical Constraints

**MUST NOT CAPTURE:**

- Customer source code snippets
- Customer-specific vulnerabilities
- Customer names or identifiers
- Internal system configurations
- Network topology specifics
- API keys, credentials, tokens

**MUST CAPTURE:**

- Threat modeling methodology
- Security reasoning patterns
- Prompt/response structures (sanitized)
- Expert corrections and refinements
- Quality ratings and feedback

---

## Research Findings

### 1. AWS Kinesis Best Practices (2025)

**Sources**:

- [AWS Kinesis Data Firehose Guide](https://moldstud.com/articles/p-optimize-data-delivery-effortlessly-with-aws-kinesis-data-firehose-a-comprehensive-guide)
- [Best Practices for Consuming Kinesis with Lambda](https://aws.amazon.com/blogs/big-data/best-practices-for-consuming-amazon-kinesis-data-streams-using-aws-lambda/)

**Key Insights**:

1. **Record Size Increase**: Kinesis now supports 10MB records (10x increase
   from 1MB)
2. **Batching Optimization**: Fine-tuning buffer intervals and sizes can reduce
   costs by 30%
3. **Scaling Thresholds**: Above 1 MB/s or 1,000 records/s per shard → scale
   shards

**Recommendation**: For ~1,000 events/day (~0.012 events/second), Kinesis is
**over-engineered**. Simple DynamoDB writes with nightly S3 export is more
appropriate.

### 2. DPO/RLHF Training Data Pipelines

**Sources**:

- [Direct Preference Optimization Paper](https://arxiv.org/pdf/2305.18290)
- [RLHF to DPO Guide](https://huggingface.co/blog/ariG23498/rlhf-to-dpo)

**Key Insights**:

1. **Preference Pairs Data Format**:

   ```jsonl
   {
     "prompt": "...",
     "chosen": "...",
     "rejected": "..."
   }
   ```

   - Quality > quantity (100 high-quality pairs > 1000 noisy pairs)

2. **DPO Advantages Over RLHF**:
   - **Simpler**: No separate reward model needed
   - **Faster**: Direct supervised learning (not RL loop)
   - **Stable**: No PPO optimization instability
   - **Cost**: 2 model copies (not 4)

3. **Data Collection Best Practices**:
   - Capture **edit distance** for filtering (>0.1 = significant correction)
   - Tag by **methodology domain** (STRIDE, risk scoring, test planning)
   - Filter out **low-quality examples** (rating <4, heavily redacted)

### 3. PII Sanitization Techniques

**Sources**:

- [Microsoft Presidio](https://learn.microsoft.com/en-us/azure/ai-services/language-service/personally-identifiable-information/how-to/redact-text-pii)
- [Kong PII Sanitization for LLMs](https://konghq.com/blog/enterprise/building-pii-sanitization-for-llms-and-agentic-ai)

**Key Insights**:

1. **Regex Limitations**: Fast but brittle (~70% accuracy), miss
   context-dependent PII
2. **ML-Based Tools** (Presidio, AWS Comprehend): Higher accuracy (~90%),
   context-aware
3. **Production Best Practices**: Multi-layer defense (regex fast pass + ML for
   ambiguous)

**Recommendation**: Use **regex for MVP** (fast), **add Presidio in Phase 2**
for production accuracy.

---

## Chariot Codebase Patterns Analysis

### Service Composition Pattern

```go
// From aws.go - All services composed into single struct
type AWS struct {
    Api            service.Api
    Model          service.Model
    Files          service.Files       // S3 abstraction
    Graph          service.Graph       // Neo4j
    Table          service.Table       // DynamoDB
    Queue          service.Queue       // SQS
    Stream         service.Stream      // Kinesis Data Streams
    Telemetry      service.Telemetry   // NEW: Training data capture
    // ... other services
}
```

**Implication**: Telemetry added as `Telemetry service.Telemetry` following this
pattern.

### Tenant Isolation Pattern

```go
// All data is prefixed with username (tenant)
// S3 key pattern
Key: aws.String(fmt.Sprintf("%s/%s", f.Username, name))

// DynamoDB partition key
avs["username"] = &types.AttributeValueMemberS{Value: t.Partition}
```

**Implication**: Use `username = "system:telemetry"` for all telemetry data.

### Lambda Handler Pattern

```go
type Handler func(context.Context, events.APIGatewayProxyRequest)
    (events.APIGatewayProxyResponse, error)
```

**Implication**: Telemetry handler follows exact signature and registration
pattern.

### Singleton Client Pattern

```go
var s3Client *s3.Client
var s3ClientLock sync.Mutex

func NewS3Files(cfg aws.Config, username string, bucket string) service.Files {
    s3ClientLock.Lock()
    defer s3ClientLock.Unlock()
    if s3Client == nil {
        s3Client = s3.NewFromConfig(cfg)
    }
    // ...
}
```

**Implication**: Use singleton pattern to reduce Lambda cold start time.

---

## Architecture Overview

### Simplified Pipeline (Aligned with Chariot Patterns)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: CAPTURE (DevPod Environment)                                       │
│                                                                             │
│  ┌──────────────┐      ┌──────────────────┐      ┌───────────────────┐     │
│  │ Claude Code  │◄────►│ Telemetry MCP    │─────►│ Local Buffer      │     │
│  │ Conversation │      │ Server           │      │ (5-min batches)   │     │
│  │              │      │                  │      │                   │     │
│  │ • Prompts    │      │ • Intercepts     │      │ • Max 100 events  │     │
│  │ • Responses  │      │ • Enriches       │      │ • Atomic swap     │     │
│  │ • Edits      │      │ • Hashes eng ID  │      │ • HTTPS POST      │     │
│  └──────────────┘      └──────────────────┘      └─────────┬─────────┘     │
│                                                            │               │
└───────────────────────────────────┬────────────────────────┘               │
                                    │ HTTPS POST /api/v1/telemetry          │
                                    │ JWT auth (Praetorian only)             │
                                    ▼                                         │
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: INGESTION (Existing Chariot API Stack)                             │
│                                                                             │
│  ┌──────────────────┐      ┌──────────────────┐                            │
│  │ API Gateway      │─────►│ Telemetry Lambda │                            │
│  │ (existing)       │      │ Handler          │                            │
│  │                  │      │                  │                            │
│  │ • Cognito auth   │      │ • Whoami()       │                            │
│  │ • Rate limiting  │      │ • Sanitize sync  │                            │
│  │ • CORS           │      │ • DynamoDB write │                            │
│  └──────────────────┘      └─────────┬────────┘                            │
│                                      │                                     │
│                                      ▼                                     │
│                           ┌──────────────────┐                             │
│                           │ DynamoDB         │                             │
│                           │ (single-table)   │                             │
│                           │                  │                             │
│                           │ PK: system:telemetry                           │
│                           │ SK: #telemetry#<session>#<event>               │
│                           │ TTL: 90 days     │                             │
│                           └──────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Nightly export (Lambda Cron)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: ANALYTICS (Training Data Lake)                                     │
│                                                                             │
│  ┌──────────────────┐      ┌──────────────────┐      ┌────────────────┐    │
│  │ Export Lambda    │─────►│ S3 (JSONL)       │─────►│ Glue Crawler   │    │
│  │ (daily cron)     │      │                  │      │ (weekly)       │    │
│  │                  │      │ system:telemetry/│      │                │    │
│  │ • Scan DynamoDB  │      │ ├── raw/         │      │ • Auto-schema  │    │
│  │ • Generate JSONL │      │ ├── curated/     │      │ • Partitions   │    │
│  │ • Upload to S3   │      │ └── exports/     │      │                │    │
│  └──────────────────┘      └──────────────────┘      └────────┬───────┘    │
│                                                               │            │
│                                                               ▼            │
│                                                    ┌────────────────┐       │
│                                                    │ Athena         │       │
│                                                    │ • Analytics    │       │
│                                                    │ • Quality      │       │
│                                                    └────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Batch processing (weekly)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: TRAINING (Model Fine-Tuning Pipeline)                              │
│                                                                             │
│  ┌──────────────────┐      ┌──────────────────┐      ┌────────────────┐    │
│  │ Processing       │─────►│ Preference Pairs │─────►│ SageMaker      │    │
│  │ Lambda           │      │ (JSONL)          │      │                │    │
│  │                  │      │                  │      │ • DPO training │    │
│  │ • Extract pairs  │      │ {"prompt": ...,  │      │ • Evaluation   │    │
│  │ • Classify edits │      │  "chosen": ...,  │      │ • Deployment   │    │
│  │ • Quality filter │      │  "rejected": ...}│      │                │    │
│  └──────────────────┘      └──────────────────┘      └────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Comparison

| Aspect              | Original Proposal        | This Architecture        | Rationale                                |
| ------------------- | ------------------------ | ------------------------ | ---------------------------------------- |
| **Streaming**       | Kinesis Firehose         | Direct DynamoDB          | Simpler for ~1,000 events/day            |
| **Primary Storage** | S3 + Glue                | DynamoDB (90-day TTL)    | Aligns with Chariot single-table         |
| **Analytics**       | Real-time Athena         | Nightly S3 export        | Appropriate for training (not real-time) |
| **API Gateway**     | New separate API         | Existing Chariot API     | Reuses Cognito, CORS, monitoring         |
| **Sanitization**    | Async Firehose transform | Synchronous at ingestion | Defense in depth                         |
| **Authentication**  | Service credentials      | Cognito JWT              | Uses existing auth flow                  |
| **Cost**            | ~$76/month               | ~$26/month               | 63% reduction                            |

---

## Component Specifications

### 1. Service Interface (Following Chariot Patterns)

**File**: `modules/chariot/backend/pkg/cloud/service/services.go` (addition)

```go
// Telemetry service for training data collection
type Telemetry interface {
    // IngestEvents ingests and sanitizes telemetry events
    // Returns count of accepted events after sanitization
    IngestEvents(ctx context.Context, events []TelemetryEvent) (int, error)

    // GetSessionEvents retrieves all events for a session
    GetSessionEvents(ctx context.Context, sessionID string) ([]TelemetryEvent, error)

    // ExportToS3 exports events to S3 for analytics
    // Used by nightly cron job
    ExportToS3(ctx context.Context, startDate, endDate time.Time) (string, error)
}

// TelemetryEvent represents a single telemetry capture
type TelemetryEvent struct {
    Username       string                 `dynamodbav:"username" json:"-"`
    Key            string                 `dynamodbav:"key" json:"-"`
    EventID        string                 `dynamodbav:"event_id" json:"event_id"`
    SessionID      string                 `dynamodbav:"session_id" json:"session_id"`
    EngineerHash   string                 `dynamodbav:"engineer_hash" json:"engineer_hash"`
    EventType      string                 `dynamodbav:"event_type" json:"event_type"`
    Content        TelemetryContent       `dynamodbav:"content" json:"content"`
    Signals        map[string]interface{} `dynamodbav:"signals" json:"signals"`
    Context        map[string]interface{} `dynamodbav:"context" json:"context"`
    Created        string                 `dynamodbav:"created" json:"created"`
    TTL            int64                  `dynamodbav:"ttl" json:"-"`
    SanitizedAt    string                 `dynamodbav:"sanitized_at" json:"sanitized_at"`
    RedactionRatio float64                `dynamodbav:"redaction_ratio" json:"redaction_ratio"`
}

type TelemetryContent struct {
    Role     string `dynamodbav:"role" json:"role"`
    Text     string `dynamodbav:"text" json:"text"`
    ToolName string `dynamodbav:"tool_name,omitempty" json:"tool_name,omitempty"`
}

// GetKey implements model.TableModel interface
func (t *TelemetryEvent) GetKey() string {
    return t.Key
}

// GetUsername implements model.TableModel interface
func (t *TelemetryEvent) GetUsername() string {
    return t.Username
}
```

---

### 2. P1-4 Compliant Secret Handling

**File**: `modules/chariot/backend/pkg/cloud/service/services.go` (addition to
Secrets interface)

```go
// In pkg/cloud/service/services.go, add to Secrets interface
type Secrets interface {
    Get(key string) (map[string]string, error)
    Set(key string, config map[string]string) error
    Delete(key string) error

    // NEW: Secure byte-based retrieval for JIT secrets (P1-4 compliance)
    // Returns []byte which CAN be securely zeroed, unlike strings
    GetSecretBytes(ctx context.Context, secretID string) ([]byte, error)
}
```

**File**: `modules/chariot/backend/pkg/lib/security/memory.go` (new file)

```go
package security

// ZeroBytes securely wipes a byte slice by overwriting with zeros
// Unlike strings, byte slices are mutable and CAN be securely wiped
// This is required for P1-4 compliance when handling secrets
func ZeroBytes(b []byte) {
    for i := range b {
        b[i] = 0
    }
}

// Usage example:
// tokenBytes, err := secretsStore.GetSecretBytes(ctx, "telemetry-jwt")
// if err != nil {
//     return fmt.Errorf("failed to get telemetry JWT: %w", err)
// }
// defer security.ZeroBytes(tokenBytes)
//
// req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", string(tokenBytes)))
```

**File**:
`modules/chariot/backend/pkg/cloud/service/services/secretsmanager/secretsmanager.go`
(addition)

```go
func (s *SecretsManagerService) GetSecretBytes(ctx context.Context, secretID string) ([]byte, error) {
    output, err := s.client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretID),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to get secret %s: %w", secretID, err)
    }

    // Prefer SecretBinary if available (already []byte)
    if output.SecretBinary != nil {
        return output.SecretBinary, nil
    }

    // Convert SecretString to []byte
    if output.SecretString != nil {
        return []byte(*output.SecretString), nil
    }

    return nil, fmt.Errorf("secret %s has no value", secretID)
}
```

---

### 3. Telemetry Service Implementation

**File**:
`modules/chariot/backend/pkg/cloud/service/services/telemetry/telemetry.go`

```go
package telemetry

import (
    "context"
    "encoding/json"
    "fmt"
    "log/slog"
    "regexp"
    "strings"
    "sync"
    "time"

    "github.com/praetorian-inc/chariot/backend/pkg/cloud/service"
    "github.com/praetorian-inc/chariot/backend/pkg/query"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

const SystemTelemetryUser = "system:telemetry"

type TelemetryService struct {
    table    service.Table
    files    service.Files
    username string
}

func NewTelemetryService(table service.Table, files service.Files, username string) service.Telemetry {
    return &TelemetryService{
        table:    table,
        files:    files,
        username: username,
    }
}

func (t *TelemetryService) IngestEvents(ctx context.Context, events []service.TelemetryEvent) (int, error) {
    accepted := 0

    for _, event := range events {
        // Sanitize before storage (defense in depth)
        sanitized, ratio := t.sanitize(event)
        if sanitized == nil {
            slog.Debug("event discarded due to high redaction ratio",
                "event_id", event.EventID,
                "ratio", ratio,
            )
            continue
        }

        // Set DynamoDB fields
        sanitized.Username = t.username
        sanitized.Key = fmt.Sprintf("#telemetry#%s#%s", event.SessionID, event.EventID)
        sanitized.TTL = time.Now().Add(90 * 24 * time.Hour).Unix()
        sanitized.SanitizedAt = time.Now().Format(time.RFC3339)
        sanitized.RedactionRatio = ratio

        // Insert following Chariot pattern
        if err := t.table.Insert(sanitized); err != nil {
            slog.Error("failed to insert telemetry event", "error", err, "event_id", event.EventID)
            return accepted, fmt.Errorf("insert failed: %w", err)
        }

        accepted++
    }

    return accepted, nil
}

func (t *TelemetryService) GetSessionEvents(ctx context.Context, sessionID string) ([]service.TelemetryEvent, error) {
    // Use Chariot's query pattern
    search := query.NewTableSearch(fmt.Sprintf("#telemetry#%s#", sessionID))
    results := t.table.Scan(search)

    var events []service.TelemetryEvent
    for _, item := range results.Collection {
        if evt, ok := item.(*service.TelemetryEvent); ok {
            events = append(events, *evt)
        }
    }

    return events, nil
}

func (t *TelemetryService) ExportToS3(ctx context.Context, startDate, endDate time.Time) (string, error) {
    // Query all events in date range
    search := query.NewTableSearch("#telemetry#")
    results := t.table.Scan(search)

    var events []service.TelemetryEvent
    for _, item := range results.Collection {
        if evt, ok := item.(*service.TelemetryEvent); ok {
            evtTime, _ := time.Parse(time.RFC3339, evt.Created)
            if evtTime.After(startDate) && evtTime.Before(endDate) {
                events = append(events, *evt)
            }
        }
    }

    // Generate JSONL
    var jsonl strings.Builder
    for _, evt := range events {
        line, _ := json.Marshal(evt)
        jsonl.WriteString(string(line))
        jsonl.WriteByte('\n')
    }

    // Upload to S3 using existing Files service
    filename := fmt.Sprintf("raw/year=%d/month=%02d/day=%02d/export.jsonl",
        startDate.Year(), startDate.Month(), startDate.Day())

    file := model.File{
        Name:      filename,
        Bytes:     []byte(jsonl.String()),
        Overwrite: false,
    }

    if err := t.files.Put(file); err != nil {
        return "", fmt.Errorf("S3 export failed: %w", err)
    }

    return filename, nil
}

// sanitize removes code and PII from event content
// Returns sanitized event and redaction ratio
func (t *TelemetryService) sanitize(event service.TelemetryEvent) (*service.TelemetryEvent, float64) {
    original := event.Content.Text
    originalLen := len(original)
    totalRedacted := 0
    text := original

    // Apply code patterns
    for _, pattern := range getCodePatterns() {
        matches := pattern.FindAllStringIndex(text, -1)
        for _, match := range matches {
            totalRedacted += match[1] - match[0]
        }
        text = pattern.ReplaceAllString(text, "[CODE_REDACTED]")
    }

    // Apply PII patterns
    for _, pattern := range getPIIPatterns() {
        matches := pattern.FindAllStringIndex(text, -1)
        for _, match := range matches {
            totalRedacted += match[1] - match[0]
        }
        text = pattern.ReplaceAllString(text, "[PII_REDACTED]")
    }

    // Calculate actual redaction ratio
    ratio := float64(totalRedacted) / float64(max(originalLen, 1))

    // Discard if too much redacted (lost context)
    if ratio > 0.3 {
        return nil, ratio
    }

    // Update content
    sanitized := event
    sanitized.Content.Text = text

    // Extract methodology signals (these are valuable)
    if sanitized.Signals == nil {
        sanitized.Signals = make(map[string]interface{})
    }
    extractMethodologySignals(text, sanitized.Signals)

    return &sanitized, ratio
}

func extractMethodologySignals(text string, signals map[string]interface{}) {
    lowerText := strings.ToLower(text)

    // STRIDE coverage
    strideTerms := []string{"spoofing", "tampering", "repudiation",
                             "information disclosure", "denial of service",
                             "elevation of privilege"}
    strideCount := 0
    for _, term := range strideTerms {
        if strings.Contains(lowerText, term) {
            strideCount++
        }
    }
    signals["stride_coverage"] = strideCount

    // MITRE ATT&CK references
    signals["mentions_attack_patterns"] = regexp.MustCompile(`T\d{4}`).MatchString(text)

    // Risk assessment depth
    riskTerms := []string{"critical", "high", "medium", "low", "likelihood", "impact", "cvss"}
    riskCount := 0
    for _, term := range riskTerms {
        riskCount += strings.Count(lowerText, term)
    }
    signals["risk_assessment_depth"] = riskCount

    // Structured enumeration (indicates methodical approach)
    signals["has_enumeration"] = regexp.MustCompile(`(?:^|\n)\s*(?:\d+\.|[-•*])\s+`).MatchString(text)

    // Word count
    signals["word_count"] = len(strings.Fields(text))
}

func max(a, b int) int {
    if a > b {
        return a
    }
    return b
}
```

---

### 4. Lambda Handler (Following Chariot Pattern)

**File**: `modules/chariot/backend/pkg/handler/handlers/telemetry/telemetry.go`

```go
package telemetry

import (
    "context"
    "encoding/json"
    "log/slog"
    "net/http"

    "github.com/aws/aws-lambda-go/events"
    "github.com/praetorian-inc/chariot/backend/pkg/cloud"
    "github.com/praetorian-inc/chariot/backend/pkg/cloud/service"
    "github.com/praetorian-inc/chariot/backend/pkg/cloud/service/services/telemetry"
    "github.com/praetorian-inc/chariot/backend/pkg/handler"
)

func init() {
    // Register with existing router (follows pattern from handler/handler.go:29)
    handler.MustRegisterHandler("/api/v1/telemetry", Handle)
}

type IngestRequest struct {
    SessionID string                  `json:"session_id"`
    Events    []service.TelemetryEvent `json:"events"`
}

type IngestResponse struct {
    Accepted  int    `json:"accepted"`
    Rejected  int    `json:"rejected"`
    SessionID string `json:"session_id"`
}

func Handle(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Use existing Chariot authentication (follows cloud.Whoami pattern)
    aws, user := cloud.Whoami(event)

    // SECURITY: Only Praetorian engineers can submit telemetry
    if !aws.IsPraetorian() {
        slog.Warn("non-Praetorian telemetry attempt blocked",
            "user", aws.Username,
            "ip", event.RequestContext.Identity.SourceIP,
        )
        return aws.Api.Error(http.StatusForbidden, "telemetry requires Praetorian account"), nil
    }

    // Parse request
    var req IngestRequest
    if err := json.Unmarshal([]byte(event.Body), &req); err != nil {
        return aws.Api.Error(http.StatusBadRequest, "invalid request body"), nil
    }

    if len(req.Events) == 0 {
        return aws.Api.Error(http.StatusBadRequest, "no events provided"), nil
    }

    // Create telemetry service using system user (follows NewAWS pattern)
    telemetryAWS := cloud.NewAWS(telemetry.SystemTelemetryUser, aws.GetAWSOptions()...)
    svc := telemetry.NewTelemetryService(telemetryAWS.Table, telemetryAWS.Files, telemetry.SystemTelemetryUser)

    // Ingest with sanitization
    accepted, err := svc.IngestEvents(ctx, req.Events)
    if err != nil {
        slog.Error("telemetry ingestion failed",
            "error", err,
            "session_id", req.SessionID,
            "user", aws.Username,
        )
        return aws.Api.Error(http.StatusInternalServerError, "ingestion failed"), nil
    }

    // Success response
    response := IngestResponse{
        Accepted:  accepted,
        Rejected:  len(req.Events) - accepted,
        SessionID: req.SessionID,
    }

    slog.Info("telemetry ingested",
        "session_id", req.SessionID,
        "accepted", accepted,
        "rejected", response.Rejected,
        "user", aws.Username,
    )

    return aws.Api.Success(http.StatusOK, response), nil
}
```

---

### 5. TypeScript MCP Server (Race Condition Fixed)

**File**: `modules/threat-model-infrastructure/mcp-servers/telemetry/index.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Mutex } from "async-mutex"; // npm install async-mutex

interface TelemetryEvent {
  event_id: string;
  timestamp: string;
  session_id: string;
  engineer_id_hash: string;
  event_type:
    | "prompt"
    | "response"
    | "tool_call"
    | "tool_result"
    | "edit"
    | "rating";

  content: {
    role: "user" | "assistant";
    text: string;
    tool_name?: string;
    tool_args?: object;
  };

  signals: {
    response_time_ms?: number;
    dwell_time_ms?: number;
    edit_distance?: number;
    was_accepted?: boolean;
    rating?: 1 | 2 | 3 | 4 | 5;
    categories?: string[];
    parent_event_id?: string;
  };

  context: {
    phase: string;
    codebase_size: "small" | "medium" | "large";
    language_distribution: Record<string, number>;
  };
}

/**
 * TelemetryBuffer with FIXED race condition using async-mutex
 *
 * Original issue: splice() and unshift() are not atomic, causing
 * events to be lost or reordered when new events arrive during flush.
 *
 * Fix: Use mutex to ensure atomic operations on the events array.
 */
class TelemetryBuffer {
  private events: TelemetryEvent[] = [];
  private flushInProgress: boolean = false;
  private readonly mutex = new Mutex();
  private readonly maxSize: number;
  private readonly flushIntervalMs: number;
  private readonly uploadEndpoint: string;

  constructor(
    uploadEndpoint: string,
    maxSize = 100,
    flushIntervalMs = 5 * 60 * 1000
  ) {
    this.uploadEndpoint = uploadEndpoint;
    this.maxSize = maxSize;
    this.flushIntervalMs = flushIntervalMs;

    // Periodic flush
    setInterval(() => this.flush(), this.flushIntervalMs);

    // Graceful shutdown handlers
    process.on("beforeExit", () => this.flush());
    process.on("SIGTERM", async () => {
      await this.flush();
      process.exit(0);
    });
    process.on("SIGINT", async () => {
      await this.flush();
      process.exit(0);
    });
  }

  async add(event: TelemetryEvent): Promise<void> {
    await this.mutex.runExclusive(async () => {
      this.events.push(event);

      if (this.events.length >= this.maxSize && !this.flushInProgress) {
        await this.flushInternal();
      }
    });
  }

  async flush(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      await this.flushInternal();
    });
  }

  private async flushInternal(): Promise<void> {
    if (this.events.length === 0 || this.flushInProgress) return;

    this.flushInProgress = true;

    // ATOMIC SWAP: Take ownership of current events, create new array
    const batch = this.events;
    this.events = [];

    try {
      await this.uploadBatch(batch);
      console.log(`[Telemetry] Uploaded ${batch.length} events`);
    } catch (error) {
      console.error("[Telemetry] Upload failed:", error);

      // Merge failed batch back to front (preserve order)
      this.events = [...batch, ...this.events];

      // Truncate if too large to prevent memory issues
      if (this.events.length > this.maxSize * 2) {
        console.warn(
          `[Telemetry] Buffer overflow, dropping oldest ${this.events.length - this.maxSize} events`
        );
        this.events = this.events.slice(0, this.maxSize);
      }
    } finally {
      this.flushInProgress = false;
    }
  }

  private async uploadBatch(batch: TelemetryEvent[]): Promise<void> {
    const response = await fetch(this.uploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TELEMETRY_JWT}`,
      },
      body: JSON.stringify({
        events: batch,
        session_id: process.env.SESSION_ID,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

// MCP Server setup
const server = new Server(
  {
    name: "threat-model-telemetry",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const buffer = new TelemetryBuffer(process.env.TELEMETRY_ENDPOINT!);

// Intercept Claude Code messages
server.setRequestHandler("messages/create", async (request) => {
  const startTime = Date.now();

  // Capture prompt
  await buffer.add({
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: process.env.SESSION_ID!,
    engineer_id_hash: process.env.ENGINEER_HASH!,
    event_type: "prompt",
    content: {
      role: "user",
      text: request.messages[request.messages.length - 1].content,
    },
    signals: {},
    context: extractContext(),
  });

  // Forward to Claude API
  const response = await forwardToClaudeAPI(request);

  // Capture response
  await buffer.add({
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: process.env.SESSION_ID!,
    engineer_id_hash: process.env.ENGINEER_HASH!,
    event_type: "response",
    content: {
      role: "assistant",
      text: response.content[0].text,
    },
    signals: {
      response_time_ms: Date.now() - startTime,
    },
    context: extractContext(),
  });

  return response;
});

// Track edit events (when engineer modifies Claude's output)
server.setRequestHandler("edit/track", async (request) => {
  const { original, modified, response_id } = request.params;
  const editDistance = calculateLevenshtein(original, modified);

  await buffer.add({
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: process.env.SESSION_ID!,
    engineer_id_hash: process.env.ENGINEER_HASH!,
    event_type: "edit",
    content: {
      role: "assistant",
      text: modified,
    },
    signals: {
      edit_distance: editDistance,
      was_accepted: true,
      parent_event_id: response_id,
    },
    context: extractContext(),
  });

  return { success: true };
});

// Track explicit ratings
server.setRequestHandler("rating/submit", async (request) => {
  const { response_id, rating, categories, free_text } = request.params;

  await buffer.add({
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: process.env.SESSION_ID!,
    engineer_id_hash: process.env.ENGINEER_HASH!,
    event_type: "rating",
    content: {
      role: "assistant",
      text: free_text || "",
    },
    signals: {
      rating,
      categories,
      parent_event_id: response_id,
    },
    context: extractContext(),
  });

  return { success: true };
});

function extractContext() {
  return {
    phase: process.env.CURRENT_PHASE || "unknown",
    codebase_size: inferCodebaseSize(),
    language_distribution: inferLanguages(),
  };
}

function calculateLevenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  const n = a.length;
  const m = b.length;

  if (n === 0) return m / Math.max(m, 1);
  if (m === 0) return n / Math.max(n, 1);

  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  // Normalize to 0-1 range
  return matrix[n][m] / Math.max(n, m);
}

function inferCodebaseSize(): "small" | "medium" | "large" {
  // Implementation based on file count in workspace
  return "medium";
}

function inferLanguages(): Record<string, number> {
  // Implementation based on file extensions
  return { go: 60, typescript: 40 };
}

async function forwardToClaudeAPI(request: any) {
  // Forward to actual Claude API
  return { content: [{ text: "Response" }] };
}

server.listen();
```

---

### 6. React TelemetryFeedback Component

**File**: `modules/chariot/ui/src/components/TelemetryFeedback.tsx`

```typescript
import { useState } from 'react';
import { Check, Star } from 'lucide-react';

interface FeedbackOverlayProps {
  responseId: string;
  onFeedback: (feedback: Feedback) => void;
}

interface Feedback {
  responseId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  categories: string[];
  freeText?: string;
}

const FEEDBACK_CATEGORIES = [
  { id: 'accurate', label: 'Technically accurate', color: 'green' },
  { id: 'complete', label: 'Comprehensive coverage', color: 'blue' },
  { id: 'actionable', label: 'Actionable recommendations', color: 'purple' },
  { id: 'methodology', label: 'Good methodology', color: 'indigo' },
  { id: 'needs_refinement', label: 'Needs refinement', color: 'yellow' },
  { id: 'missed_threats', label: 'Missed important threats', color: 'red' },
];

export function TelemetryFeedback({ responseId, onFeedback }: FeedbackOverlayProps) {
  const [rating, setRating] = useState<number>(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = async () => {
    await onFeedback({
      responseId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      categories,
      freeText: freeText || undefined,
    });
    setSubmitted(true);

    // Hide after 2 seconds
    setTimeout(() => setShowDetails(false), 2000);
  };

  const toggleCategory = (catId: string) => {
    setCategories(prev =>
      prev.includes(catId)
        ? prev.filter(c => c !== catId)
        : [...prev, catId]
    );
  };

  if (submitted && !showDetails) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-green-600 bg-green-50 border-t border-green-200 rounded-b">
        <Check size={14} />
        <span>Feedback recorded - helps improve threat modeling</span>
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 border-t border-gray-200">
        <span className="text-xs text-gray-600">Was this response helpful?</span>
        <button
          onClick={() => setShowDetails(true)}
          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
        >
          Rate this response
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 p-3 bg-gray-50">
      {/* Star rating */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-700 font-medium">Rate quality:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className="transition-colors"
            >
              <Star
                size={20}
                className={rating >= n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Category tags */}
      {rating > 0 && (
        <div className="mb-3">
          <span className="text-xs text-gray-600 block mb-2">What made this good/bad?</span>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  categories.includes(cat.id)
                    ? `bg-${cat.color}-100 text-${cat.color}-800 ring-1 ring-${cat.color}-300`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional free text */}
      {rating > 0 && (
        <div className="mb-3">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Any additional context? (optional)"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDetails(false)}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
}
```

**Integration in ThreatModelViewer**:

```typescript
// In ThreatModelViewer.tsx
import { TelemetryFeedback } from '@/components/TelemetryFeedback';

// After each Claude response
{claudeResponse && (
  <div className="border border-gray-200 rounded-lg">
    <div className="p-4">
      <MarkdownRenderer content={claudeResponse.text} />
    </div>

    <TelemetryFeedback
      responseId={claudeResponse.id}
      onFeedback={async (feedback) => {
        await fetch('/api/telemetry/feedback', {
          method: 'POST',
          body: JSON.stringify(feedback),
        });
      }}
    />
  </div>
)}
```

---

### 7. SAM Template Integration

**File**: `modules/chariot/backend/build/template.yml` (addition)

```yaml
# Add to existing template.yml (follows pattern from other Lambda functions)
TelemetryFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ./build/
    Handler: bootstrap
    Runtime: provided.al2
    Architectures:
      - arm64
    MemorySize: 512
    Timeout: 30
    Environment:
      Variables:
        CHARIOT_TABLE: !Ref ChariotTable
        CHARIOT_BUCKET: !Ref ChariotBucket
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref ChariotTable
      - S3CrudPolicy:
          BucketName: !Ref ChariotBucket
    Events:
      TelemetryEvent:
        Type: Api
        Properties:
          Path: /api/v1/telemetry
          Method: POST
          RestApiId: !Ref ChariotAPI
          Auth:
            Authorizer: CognitoAuthorizer

# Nightly export Lambda (follows cron pattern)
TelemetryExportFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ./build/
    Handler: bootstrap
    Runtime: provided.al2
    MemorySize: 1024
    Timeout: 300
    Environment:
      Variables:
        CHARIOT_TABLE: !Ref ChariotTable
        CHARIOT_BUCKET: !Ref ChariotBucket
    Policies:
      - DynamoDBReadPolicy:
          TableName: !Ref ChariotTable
      - S3CrudPolicy:
          BucketName: !Ref ChariotBucket
    Events:
      DailyExport:
        Type: Schedule
        Properties:
          Schedule: cron(0 2 * * ? *) # 2 AM UTC daily
          Description: Daily telemetry export to S3 for analytics

# Preference pair extraction Lambda (follows cron pattern)
PreferencePairFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ./build/
    Handler: bootstrap
    Runtime: provided.al2
    MemorySize: 512
    Timeout: 120
    Environment:
      Variables:
        CHARIOT_TABLE: !Ref ChariotTable
        CHARIOT_BUCKET: !Ref ChariotBucket
    Policies:
      - DynamoDBReadPolicy:
          TableName: !Ref ChariotTable
      - S3CrudPolicy:
          BucketName: !Ref ChariotBucket
    Events:
      DailyExtraction:
        Type: Schedule
        Properties:
          Schedule: cron(0 3 * * ? *) # 3 AM UTC daily (after export)
          Description: Daily preference pair extraction
```

---

## Sanitization Patterns (40+ Patterns)

### Code Detection Patterns

````go
// Pattern cache (initialized once, reused)
var (
    codePatterns     []*regexp.Regexp
    piiPatterns      []*regexp.Regexp
    patternsInitOnce sync.Once
)

func getCodePatterns() []*regexp.Regexp {
    patternsInitOnce.Do(initPatterns)
    return codePatterns
}

func getPIIPatterns() []*regexp.Regexp {
    patternsInitOnce.Do(initPatterns)
    return piiPatterns
}

func initPatterns() {
    codePatternStrings := []string{
        // === MARKDOWN CODE BLOCKS ===
        "```[\\s\\S]*?```",  // Fenced code blocks

        // === GO PATTERNS ===
        `func\s+\w+\s*\([^)]*\)\s*(?:\([^)]*\))?\s*\{`,           // Functions
        `func\s*\(\w+\s+\*?\w+\)\s+\w+\s*\([^)]*\)`,              // Method receivers
        `type\s+\w+\s+(?:interface|struct)\s*\{`,                  // Type definitions
        `package\s+\w+`,                                            // Package declarations
        `go\s+func\s*\(`,                                          // Goroutines

        // === JAVASCRIPT/TYPESCRIPT PATTERNS ===
        `function\s+\w+\s*\([^)]*\)\s*\{`,                         // Functions
        `(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>`, // Arrow functions
        `(?:export\s+)?(?:default\s+)?function\s+[A-Z]\w+`,        // Component functions
        `class\s+\w+\s*(?:extends\s+\w+)?\s*\{`,                   // Classes
        `(?:import|export)\s+(?:\{[^}]+\}|\*)\s+from`,             // ES6 imports/exports

        // === JSX/TSX PATTERNS ===
        `<[A-Z]\w+(?:\s+\w+(?:=(?:\{[^}]+\}|"[^"]*"|'[^']*'))?)*\s*/?>`, // JSX opening tags
        `</[A-Z]\w+>`,                                              // JSX closing tags
        `\{[^}]*\?\s*<[A-Z]`,                                       // Conditional rendering

        // === PYTHON PATTERNS ===
        `def\s+\w+\s*\([^)]*\)\s*:`,                               // Functions
        `async\s+def\s+\w+\s*\([^)]*\)\s*:`,                       // Async functions
        `class\s+\w+\s*(?:\([^)]*\))?\s*:`,                        // Classes
        `from\s+[\w.]+\s+import`,                                  // Imports
        `@\w+(?:\([^)]*\))?`,                                      // Decorators

        // === SQL PATTERNS ===
        `SELECT\s+[\s\S]+?\s+FROM\s+[\w.\x60]+`,                   // SELECT queries
        `INSERT\s+INTO\s+[\w.\x60]+`,                              // INSERT statements
        `UPDATE\s+[\w.\x60]+\s+SET`,                               // UPDATE statements
        `DELETE\s+FROM\s+[\w.\x60]+`,                              // DELETE statements
        `CREATE\s+(?:TABLE|INDEX|VIEW|DATABASE)\s+[\w.\x60]+`,    // DDL statements
        `ALTER\s+TABLE\s+[\w.\x60]+`,                              // ALTER statements

        // === GRAPHQL PATTERNS ===
        `(?:query|mutation|subscription)\s+\w+\s*(?:\([^)]*\))?\s*\{`, // Operations
        `fragment\s+\w+\s+on\s+\w+`,                                // Fragments

        // === SHELL/CLI PATTERNS ===
        `(?:aws|gcloud|az|kubectl|docker|git|npm|yarn|pip)\s+[\w-]+`, // Cloud/package CLIs
        `(?:curl|wget|ssh|scp|rsync)\s+`,                          // Network commands
        `\$\([^)]+\)`,                                              // Command substitution
        `\|\s*(?:grep|awk|sed|xargs|sort|uniq)`,                   // Pipe chains

        // === FILE PATHS ===
        `(?:/[\w._-]+){3,}`,                                        // Unix paths (3+ levels)
        `[A-Z]:\\(?:[\w._-]+\\){2,}`,                              // Windows paths

        // === NETWORK PATTERNS ===
        `https?://[^\s]+`,                                          // URLs
        `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`,                  // IP addresses
        `(?:tcp|udp|http|https|ftp|ssh|wss?)://`,                  // Protocol prefixes

        // === AWS-SPECIFIC PATTERNS ===
        `arn:aws:[^:\s]+:[^:\s]*:[^:\s]*:[^:\s]+`,                 // ARNs
        `i-[a-f0-9]{8,17}`,                                         // EC2 instance IDs
        `s3://[^\s]+`,                                              // S3 URIs
        `ami-[a-f0-9]{8,17}`,                                       // AMI IDs
        `sg-[a-f0-9]{8,17}`,                                        // Security group IDs
        `vpc-[a-f0-9]{8,17}`,                                       // VPC IDs
        `subnet-[a-f0-9]{8,17}`,                                    // Subnet IDs

        // === CONTAINER/K8S PATTERNS ===
        `FROM\s+[\w./:-]+`,                                         // Dockerfile FROM
        `apiVersion:\s*[\w./]+`,                                    // Kubernetes YAML
        `kind:\s*(?:Deployment|Service|Pod|ConfigMap|Secret)`,     // K8s resource types

        // === SECRETS/CREDENTIALS ===
        `-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----`,    // Certificates/keys
        `[a-f0-9]{64,}`,                                            // Long hex strings (hashes)
        `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`,   // JWT tokens

        // === CONFIG FILES ===
        `\[[\w.-]+\]`,                                              // INI sections
        `^\s*\w+\s*[:=]\s*.+$`,                                     // Key-value configs
    }

    codePatterns = make([]*regexp.Regexp, 0, len(codePatternStrings))
    for _, pattern := range codePatternStrings {
        if re, err := regexp.Compile(pattern); err == nil {
            codePatterns = append(codePatterns, re)
        }
    }

    // PII patterns
    piiPatternStrings := []string{
        // Email addresses
        `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`,

        // Phone numbers (various formats)
        `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`,
        `\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}`,

        // Credentials in code/config
        `(?i)(?:password|secret|api[_-]?key|token|auth)[_-]?[:=]\s*["']?[A-Za-z0-9_-]{8,}["']?`,
        `(?i)(?:ANTHROPIC|OPENAI|AWS|GITHUB|STRIPE)[_-]?(?:API)?[_-]?(?:KEY|TOKEN|SECRET)\s*[:=]\s*\S+`,

        // AWS credentials
        `AKIA[0-9A-Z]{16}`,                                         // AWS Access Key ID
        `(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*\S+`,

        // Social Security Numbers
        `\b\d{3}-\d{2}-\d{4}\b`,

        // Credit card numbers (basic pattern)
        `\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b`,

        // Names (basic pattern - may have false positives)
        `\b[A-Z][a-z]+ [A-Z][a-z]+\b`,

        // Internal hostnames
        `\b[\w-]+\.(?:internal|local|corp|praetorian\.com)\b`,
    }

    piiPatterns = make([]*regexp.Regexp, 0, len(piiPatternStrings))
    for _, pattern := range piiPatternStrings {
        if re, err := regexp.Compile(pattern); err == nil {
            piiPatterns = append(piiPatterns, re)
        }
    }
}
````

### Pattern Coverage Summary

| Category                  | Pattern Count | Examples Detected                             |
| ------------------------- | ------------- | --------------------------------------------- |
| **Markdown**              | 1             | Code blocks                                   |
| **Go**                    | 5             | `func`, `type`, `package`, method receivers   |
| **JavaScript/TypeScript** | 5             | `function`, arrow functions, `class`, imports |
| **JSX/TSX**               | 3             | Components, conditional rendering             |
| **Python**                | 5             | `def`, `class`, `import`, decorators          |
| **SQL**                   | 6             | SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER |
| **GraphQL**               | 2             | Queries, fragments                            |
| **Shell/CLI**             | 4             | aws, docker, kubectl, pipes                   |
| **File Paths**            | 2             | Unix, Windows                                 |
| **Network**               | 3             | URLs, IPs, protocols                          |
| **AWS**                   | 7             | ARNs, resource IDs                            |
| **Container/K8s**         | 3             | Dockerfile, YAML                              |
| **Secrets**               | 3             | Certs, hashes, JWTs                           |
| **Config**                | 2             | INI, key-value                                |
| **PII**                   | 9             | Emails, phones, credentials, SSN, names       |
| **TOTAL**                 | **60**        |                                               |

---

## Privacy & Consent Framework

### 1. Legal Basis

**GDPR Article 6(1)(f) - Legitimate Interest**

- **Legitimate interest**: Improving AI threat modeling capabilities to provide
  better security services
- **Necessity test**: Training data is necessary to develop proprietary models
- **Balancing test**: Minimal data captured (methodology only, no customer
  code), significant benefit to security industry

### 2. Engineer Consent (Employment Agreement Addendum)

```markdown
## Data Processing Addendum

### Threat Modeling Telemetry

Praetorian Security collects anonymized interaction data during threat modeling
sessions to improve AI capabilities. This includes:

**Collected:**

- Prompts and questions you ask Claude
- Claude's responses (sanitized)
- Your corrections and refinements
- Quality ratings you provide
- Methodology patterns (e.g., STRIDE analysis)

**NOT Collected:**

- Customer source code
- Customer-specific vulnerabilities
- Customer names or identifiers
- Credentials or secrets

**Your Rights:**

- Opt-out at any time via DevPod settings
- Request deletion of your data
- View aggregate statistics about your contributions

By continuing employment, you consent to this data collection. You may opt-out
without penalty.
```

### 3. Customer Consent (MSA Clause)

```markdown
## Master Services Agreement - Data Processing

### 8.4 Training Data Collection

Praetorian may collect anonymized methodology data from threat modeling sessions
to improve AI security analysis capabilities. This collection:

1. **Does NOT include**: Your source code, specific vulnerabilities found,
   system configurations, or any proprietary information
2. **Does include**: General threat modeling methodology patterns, security
   reasoning approaches, and anonymized interaction data
3. **Purpose**: To train proprietary AI models specialized in security analysis
4. **Opt-out**: Available upon request without impact to service quality

Customer data remains confidential per Section 7. Only anonymized,
non-identifying methodology patterns are used for training.
```

### 4. Opt-Out Implementation

**DevPod Settings File**: `~/.claude/telemetry-settings.json`

```json
{
  "telemetry": {
    "enabled": false,
    "capture_prompts": false,
    "capture_responses": false,
    "capture_edits": false,
    "allow_feedback_requests": false
  }
}
```

**UI Toggle** (in Chariot Settings page):

```typescript
// Settings page component
<SettingSection
  title="AI Training Data"
  description="Help improve threat modeling by sharing anonymized interaction patterns"
>
  <SettingRow>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold">Telemetry Collection</h3>
        <p className="text-sm text-gray-600">
          Share anonymized methodology patterns (no customer code)
        </p>
      </div>
      <Toggle
        enabled={telemetryEnabled}
        onChange={async (enabled) => {
          await updateTelemetrySettings({ enabled });
          setTelemetryEnabled(enabled);
        }}
      />
    </div>
  </SettingRow>

  {telemetryEnabled && (
    <SettingRow>
      <div className="text-sm text-gray-600">
        <p className="mb-2">What's collected:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Threat modeling prompts and responses (sanitized)</li>
          <li>Your corrections and refinements</li>
          <li>Quality ratings</li>
        </ul>
        <p className="mt-2">What's NOT collected:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Customer source code</li>
          <li>Specific vulnerabilities</li>
          <li>Customer identifiers</li>
        </ul>
      </div>
    </SettingRow>
  )}
</SettingSection>
```

### 5. Data Retention Policy

| Data Type                 | Retention Period | Rationale                          |
| ------------------------- | ---------------- | ---------------------------------- |
| **Raw telemetry**         | 90 days          | Sufficient for processing pipeline |
| **Curated training data** | 3 years          | Model training lifecycle           |
| **Preference pairs**      | Indefinite       | Fully anonymized, high value       |
| **Session metadata**      | 1 year           | Compliance audit trail             |

### 6. GDPR Data Subject Rights Handler

```python
import hashlib
from typing import Dict, Any

def handle_data_subject_request(engineer_email: str, request_type: str) -> Dict[str, Any]:
    """
    Process GDPR data subject requests.

    Args:
        engineer_email: Email address of the engineer
        request_type: One of "access", "deletion", "opt_out", "portability"

    Returns:
        Result of the request operation
    """
    engineer_hash = hashlib.sha256(engineer_email.encode()).hexdigest()[:16]

    if request_type == "access":
        # Return all data associated with this engineer
        return query_training_data_by_engineer(engineer_hash)

    elif request_type == "deletion":
        # Delete all data for this engineer
        delete_training_data_by_engineer(engineer_hash)
        return {"status": "deleted", "engineer_hash": engineer_hash}

    elif request_type == "opt_out":
        # Disable future collection
        update_opt_out_status(engineer_email, opted_out=True)
        return {"status": "opted_out"}

    elif request_type == "portability":
        # Export data in machine-readable format
        return export_training_data_by_engineer(engineer_hash, format="json")

    else:
        return {"error": f"Unknown request type: {request_type}"}


def query_training_data_by_engineer(engineer_hash: str) -> Dict[str, Any]:
    """Query Athena for all data associated with an engineer hash."""
    # Implementation uses Athena query
    pass


def delete_training_data_by_engineer(engineer_hash: str) -> None:
    """Delete all records for an engineer from DynamoDB and S3."""
    # Implementation uses DynamoDB delete + S3 object removal
    pass


def update_opt_out_status(email: str, opted_out: bool) -> None:
    """Update opt-out status in user preferences."""
    # Implementation updates DynamoDB user record
    pass


def export_training_data_by_engineer(engineer_hash: str, format: str) -> Dict[str, Any]:
    """Export all data for an engineer in the specified format."""
    # Implementation generates downloadable file
    pass
```

---

## Preference Pair Extraction

### Go Implementation

**File**:
`modules/chariot/backend/pkg/cloud/service/services/telemetry/preference_pairs.go`

```go
package telemetry

import (
    "context"
    "encoding/json"
    "fmt"
    "log/slog"
    "strings"
    "time"

    "github.com/praetorian-inc/chariot/backend/pkg/cloud/service"
    "github.com/praetorian-inc/chariot/backend/pkg/query"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

// PreferencePair represents a training example for DPO
type PreferencePair struct {
    Prompt        string            `json:"prompt"`
    Chosen        string            `json:"chosen"`   // Human-corrected or highly-rated
    Rejected      string            `json:"rejected"` // Original lower-rated response
    Metadata      PreferenceMeta    `json:"metadata"`
}

type PreferenceMeta struct {
    SessionID        string   `json:"session_id"`
    MethodologyType  string   `json:"methodology_type"` // stride, dfd, attack_tree
    EditDistance     float64  `json:"edit_distance"`    // Normalized 0-1
    QualitySignals   []string `json:"quality_signals"`  // Categories from rating
    ExtractedAt      string   `json:"extracted_at"`
}

// ExtractPreferencePairs processes telemetry and creates training pairs
func (t *TelemetryService) ExtractPreferencePairs(ctx context.Context, startDate, endDate time.Time) ([]PreferencePair, error) {
    // Query all events in date range
    search := query.NewTableSearch("#telemetry#")
    results := t.table.Scan(search)

    // Group events by session
    sessions := make(map[string][]service.TelemetryEvent)
    for _, item := range results.Collection {
        if evt, ok := item.(*service.TelemetryEvent); ok {
            evtTime, _ := time.Parse(time.RFC3339, evt.Created)
            if evtTime.After(startDate) && evtTime.Before(endDate) {
                sessions[evt.SessionID] = append(sessions[evt.SessionID], *evt)
            }
        }
    }

    var pairs []PreferencePair

    for sessionID, events := range sessions {
        // Find response -> edit pairs (correction creates preference)
        sessionPairs := extractPairsFromSession(sessionID, events)
        pairs = append(pairs, sessionPairs...)
    }

    slog.Info("preference pairs extracted",
        "start_date", startDate.Format(time.RFC3339),
        "end_date", endDate.Format(time.RFC3339),
        "sessions_processed", len(sessions),
        "pairs_extracted", len(pairs),
    )

    return pairs, nil
}

func extractPairsFromSession(sessionID string, events []service.TelemetryEvent) []PreferencePair {
    var pairs []PreferencePair

    // Build a map of events by ID for lookup
    eventByID := make(map[string]service.TelemetryEvent)
    for _, evt := range events {
        eventByID[evt.EventID] = evt
    }

    for _, evt := range events {
        // Look for edit events with parent_event_id
        if evt.EventType == "edit" {
            parentID, ok := evt.Signals["parent_event_id"].(string)
            if !ok {
                continue
            }

            parentEvt, exists := eventByID[parentID]
            if !exists {
                continue
            }

            // Only create pairs for significant edits
            editDistance, ok := evt.Signals["edit_distance"].(float64)
            if !ok || editDistance < 0.1 {
                continue // Not a significant correction
            }

            // Find the prompt that triggered the original response
            prompt := findPromptForResponse(events, parentEvt.EventID)
            if prompt == "" {
                continue
            }

            pairs = append(pairs, PreferencePair{
                Prompt:   prompt,
                Chosen:   evt.Content.Text,       // Human correction
                Rejected: parentEvt.Content.Text, // Original response
                Metadata: PreferenceMeta{
                    SessionID:       sessionID,
                    MethodologyType: inferMethodology(prompt),
                    EditDistance:    editDistance,
                    QualitySignals:  extractQualitySignals(evt.Signals),
                    ExtractedAt:     time.Now().Format(time.RFC3339),
                },
            })
        }

        // Look for rating events with low scores
        if evt.EventType == "rating" {
            rating, ok := evt.Signals["rating"].(float64)
            if !ok || rating >= 4 {
                continue // Only use low-rated responses as "rejected"
            }

            parentID, ok := evt.Signals["parent_event_id"].(string)
            if !ok {
                continue
            }

            parentEvt, exists := eventByID[parentID]
            if !exists {
                continue
            }

            prompt := findPromptForResponse(events, parentEvt.EventID)
            if prompt == "" {
                continue
            }

            // For low-rated responses without corrections, we need a "chosen" example
            // Use a high-rated response for similar methodology as "chosen"
            // This is a placeholder - in production you'd use cross-session matching
            pairs = append(pairs, PreferencePair{
                Prompt:   prompt,
                Chosen:   "", // To be filled by cross-session matching
                Rejected: parentEvt.Content.Text,
                Metadata: PreferenceMeta{
                    SessionID:       sessionID,
                    MethodologyType: inferMethodology(prompt),
                    EditDistance:    0,
                    QualitySignals:  extractQualitySignals(evt.Signals),
                    ExtractedAt:     time.Now().Format(time.RFC3339),
                },
            })
        }
    }

    // Filter out pairs without chosen response
    var validPairs []PreferencePair
    for _, pair := range pairs {
        if pair.Chosen != "" {
            validPairs = append(validPairs, pair)
        }
    }

    return validPairs
}

func findPromptForResponse(events []service.TelemetryEvent, responseID string) string {
    // Find the prompt that came immediately before this response
    for i, evt := range events {
        if evt.EventID == responseID && i > 0 {
            // Look backwards for the nearest prompt
            for j := i - 1; j >= 0; j-- {
                if events[j].EventType == "prompt" {
                    return events[j].Content.Text
                }
            }
        }
    }
    return ""
}

func inferMethodology(prompt string) string {
    lowerPrompt := strings.ToLower(prompt)

    if strings.Contains(lowerPrompt, "stride") {
        return "stride"
    }
    if strings.Contains(lowerPrompt, "data flow") || strings.Contains(lowerPrompt, "dfd") {
        return "dfd"
    }
    if strings.Contains(lowerPrompt, "attack tree") {
        return "attack_tree"
    }
    if strings.Contains(lowerPrompt, "risk") {
        return "risk_assessment"
    }
    if strings.Contains(lowerPrompt, "mitre") || strings.Contains(lowerPrompt, "att&ck") {
        return "mitre_attack"
    }
    return "general"
}

func extractQualitySignals(signals map[string]interface{}) []string {
    if categories, ok := signals["categories"].([]interface{}); ok {
        result := make([]string, len(categories))
        for i, cat := range categories {
            result[i] = fmt.Sprintf("%v", cat)
        }
        return result
    }
    return nil
}

// ExportPreferencePairsToS3 exports pairs in JSONL format for training
func (t *TelemetryService) ExportPreferencePairsToS3(ctx context.Context, pairs []PreferencePair) (string, error) {
    var jsonl strings.Builder
    for _, pair := range pairs {
        line, _ := json.Marshal(pair)
        jsonl.WriteString(string(line))
        jsonl.WriteByte('\n')
    }

    now := time.Now()
    filename := fmt.Sprintf("curated/preference_pairs/year=%d/month=%02d/pairs_%s.jsonl",
        now.Year(), now.Month(), now.Format("2006-01-02"))

    file := model.File{
        Name:      filename,
        Bytes:     []byte(jsonl.String()),
        Overwrite: false,
    }

    if err := t.files.Put(file); err != nil {
        return "", fmt.Errorf("S3 export failed: %w", err)
    }

    return filename, nil
}
```

---

## Training Data Quality Metrics

### KPIs and Targets

| KPI                        | Target                              | Alert Threshold            |
| -------------------------- | ----------------------------------- | -------------------------- |
| **Sanitization accuracy**  | >99% (no code/PII in exports)       | <98% triggers review       |
| **Preference pair yield**  | >10% of sessions produce pairs      | <5% indicates UX issue     |
| **Engineer participation** | >80% of engineers provide feedback  | <50% triggers outreach     |
| **Methodology coverage**   | All 6 STRIDE categories represented | Any category <5%           |
| **Average rating**         | 4.0+ for Claude responses           | <3.5 indicates model issue |

### Athena Analytics Queries

**1. Weekly Quality Summary**

```sql
SELECT
    DATE_TRUNC('week', from_iso8601_timestamp(created)) as week,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'rating' AND signals.rating >= 4 THEN 1 END) as high_quality_responses,
    AVG(CASE WHEN event_type = 'rating' THEN signals.rating END) as avg_rating,
    AVG(redaction_ratio) as avg_redaction_ratio
FROM telemetry_training_data
WHERE from_iso8601_timestamp(created) > DATE_ADD('day', -30, CURRENT_DATE)
GROUP BY DATE_TRUNC('week', from_iso8601_timestamp(created))
ORDER BY week DESC;
```

**2. Methodology Coverage Analysis**

```sql
SELECT
    signals.stride_coverage as stride_terms_mentioned,
    signals.mentions_attack_patterns as references_mitre,
    signals.has_enumeration as uses_structured_lists,
    COUNT(*) as event_count,
    AVG(signals.word_count) as avg_response_length
FROM telemetry_training_data
WHERE event_type = 'response'
    AND from_iso8601_timestamp(created) > DATE_ADD('day', -7, CURRENT_DATE)
GROUP BY 1, 2, 3
ORDER BY event_count DESC;
```

**3. Preference Pair Potential**

```sql
SELECT
    DATE_TRUNC('day', from_iso8601_timestamp(created)) as day,
    COUNT(CASE WHEN event_type = 'edit' AND signals.edit_distance > 0.1 THEN 1 END) as significant_corrections,
    COUNT(CASE WHEN event_type = 'rating' AND signals.rating >= 4 THEN 1 END) as positive_ratings,
    COUNT(CASE WHEN event_type = 'rating' AND signals.rating < 3 THEN 1 END) as negative_ratings,
    -- Potential preference pairs = corrections + (negative ratings with matching positives)
    COUNT(CASE WHEN event_type = 'edit' AND signals.edit_distance > 0.1 THEN 1 END) as potential_pairs
FROM telemetry_training_data
WHERE from_iso8601_timestamp(created) > DATE_ADD('day', -7, CURRENT_DATE)
GROUP BY 1
ORDER BY day DESC;
```

**4. Engineer Participation Metrics**

```sql
SELECT
    engineer_hash,
    COUNT(*) as total_interactions,
    COUNT(CASE WHEN event_type = 'rating' THEN 1 END) as ratings_given,
    COUNT(CASE WHEN event_type = 'edit' THEN 1 END) as corrections_made,
    AVG(CASE WHEN event_type = 'rating' THEN signals.rating END) as avg_rating_given,
    MIN(created) as first_interaction,
    MAX(created) as last_interaction
FROM telemetry_training_data
WHERE from_iso8601_timestamp(created) > DATE_ADD('day', -30, CURRENT_DATE)
GROUP BY engineer_hash
ORDER BY total_interactions DESC
LIMIT 50;
```

---

## Model Training Use Cases

### 1. DPO Fine-Tuning Configuration

```python
from sagemaker.huggingface import HuggingFace
from datasets import load_dataset

# Load preference pairs from S3
dataset = load_dataset('json', data_files='s3://chariot-telemetry/curated/preference_pairs/**/*.jsonl')

# Configure DPO trainer
training_config = {
    'model_name': 'anthropic/claude-3-haiku-20240307',  # Base model
    'output_dir': 's3://chariot-models/threat-model-v1',
    'num_train_epochs': 3,
    'per_device_train_batch_size': 4,
    'learning_rate': 5e-7,  # Low LR for preference learning
    'beta': 0.1,  # DPO temperature parameter
    'max_length': 2048,
    'max_prompt_length': 512,
}

# SageMaker training job
huggingface_estimator = HuggingFace(
    entry_point='train_dpo.py',
    source_dir='./scripts',
    instance_type='ml.p4d.24xlarge',
    instance_count=1,
    role='arn:aws:iam::ACCOUNT:role/SageMakerRole',
    transformers_version='4.36',
    pytorch_version='2.1',
    py_version='py310',
    hyperparameters=training_config,
)

huggingface_estimator.fit({
    'train': 's3://chariot-telemetry/curated/preference_pairs/',
    'eval': 's3://chariot-telemetry/curated/preference_pairs_eval/',
})
```

### 2. Few-Shot Prompt Engineering

```python
def build_threat_model_prompt(user_query: str, methodology_examples: list) -> str:
    """
    Construct few-shot prompt using curated methodology templates.

    Args:
        user_query: The user's threat modeling request
        methodology_examples: List of high-quality examples from training data
    """
    prompt = """You are an expert security architect performing threat modeling.
Use the following methodology examples as reference for structure and depth:

"""

    for i, example in enumerate(methodology_examples[:3], 1):
        prompt += f"""### Example {i}
User request: {example['prompt']}

Expert response:
{example['chosen']}

---

"""

    prompt += f"""### Current Task
User request: {user_query}

Provide a comprehensive threat analysis following the methodology demonstrated above.
"""

    return prompt


# Usage with curated training data
def get_methodology_examples(methodology_type: str, limit: int = 3) -> list:
    """Retrieve high-quality examples for few-shot learning."""
    # Query from S3/DynamoDB
    query = f"""
    SELECT prompt, chosen, metadata
    FROM preference_pairs
    WHERE metadata.methodology_type = '{methodology_type}'
    AND metadata.edit_distance > 0.2  -- Significant human improvement
    ORDER BY metadata.extracted_at DESC
    LIMIT {limit}
    """
    return execute_athena_query(query)
```

### 3. RAG Retrieval System

```python
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

class ThreatModelRAG:
    """
    Retrieval-Augmented Generation for threat modeling.
    Uses curated training data as knowledge base.
    """

    def __init__(self, training_data_path: str):
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = None
        self.documents = []
        self._build_index(training_data_path)

    def _build_index(self, path: str):
        """Build FAISS index from preference pairs."""
        # Load all preference pairs
        pairs = self._load_pairs(path)

        # Create documents from chosen responses
        for pair in pairs:
            self.documents.append({
                'content': pair['chosen'],
                'prompt': pair['prompt'],
                'methodology': pair['metadata']['methodology_type'],
            })

        # Encode all documents
        embeddings = self.encoder.encode([d['content'] for d in self.documents])

        # Build FAISS index
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings.astype('float32'))

    def retrieve(self, query: str, k: int = 5) -> list:
        """Retrieve most relevant threat modeling examples."""
        query_embedding = self.encoder.encode([query])
        distances, indices = self.index.search(query_embedding.astype('float32'), k)

        return [self.documents[i] for i in indices[0]]

    def augment_prompt(self, user_query: str) -> str:
        """Augment user query with relevant examples."""
        relevant_docs = self.retrieve(user_query)

        context = "\n\n".join([
            f"**Reference ({doc['methodology']}):**\n{doc['content'][:500]}..."
            for doc in relevant_docs[:3]
        ])

        return f"""Use these expert threat modeling examples as reference:

{context}

---

Now analyze the following:
{user_query}
"""
```

### 4. Cost Optimization Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COST OPTIMIZATION PATHWAY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT STATE                    FUTURE STATE                              │
│  ─────────────                    ────────────                              │
│  Claude Opus API calls            Fine-tuned Haiku with RAG                 │
│  ~$15/1M input + $75/1M output   ~$0.25/1M input + $1.25/1M output         │
│                                                                             │
│  REDUCTION: ~60x cost decrease for threat modeling tasks                    │
│                                                                             │
│  Prerequisites:                                                             │
│  1. 1,000+ high-quality preference pairs                                    │
│  2. Methodology coverage across all STRIDE categories                       │
│  3. Validation benchmark showing comparable quality                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### 1. Unit Tests

**File**:
`modules/chariot/backend/pkg/cloud/service/services/telemetry/telemetry_test.go`

````go
package telemetry

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestSanitize_CodePatterns(t *testing.T) {
    svc := &TelemetryService{}

    tests := []struct {
        name     string
        input    string
        wantCode bool // Should code be redacted?
    }{
        {
            name:     "markdown code block",
            input:    "Here's the code:\n```go\nfunc main() {}\n```",
            wantCode: true,
        },
        {
            name:     "go function",
            input:    "The function `func handleRequest(ctx context.Context) error {` is vulnerable",
            wantCode: true,
        },
        {
            name:     "python class",
            input:    "class UserService:\n    def authenticate(self):",
            wantCode: true,
        },
        {
            name:     "AWS ARN",
            input:    "Check the role arn:aws:iam::123456789012:role/AdminRole",
            wantCode: true,
        },
        {
            name:     "methodology only - no code",
            input:    "Apply STRIDE analysis to the authentication flow. Consider spoofing and tampering threats.",
            wantCode: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            event := service.TelemetryEvent{
                Content: service.TelemetryContent{Text: tt.input},
            }
            result, ratio := svc.sanitize(event)

            if tt.wantCode {
                assert.Contains(t, result.Content.Text, "[CODE_REDACTED]")
                assert.Greater(t, ratio, 0.0)
            } else {
                assert.NotContains(t, result.Content.Text, "[CODE_REDACTED]")
                assert.Equal(t, 0.0, ratio)
            }
        })
    }
}

func TestSanitize_PIIPatterns(t *testing.T) {
    svc := &TelemetryService{}

    tests := []struct {
        name    string
        input   string
        wantPII bool
    }{
        {
            name:    "email address",
            input:   "Contact john.doe@acme.com for details",
            wantPII: true,
        },
        {
            name:    "AWS access key",
            input:   "The key AKIAIOSFODNN7EXAMPLE is exposed",
            wantPII: true,
        },
        {
            name:    "methodology reference - no PII",
            input:   "Elevation of privilege is the most critical STRIDE category here",
            wantPII: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            event := service.TelemetryEvent{
                Content: service.TelemetryContent{Text: tt.input},
            }
            result, _ := svc.sanitize(event)

            if tt.wantPII {
                assert.Contains(t, result.Content.Text, "[PII_REDACTED]")
            } else {
                assert.NotContains(t, result.Content.Text, "[PII_REDACTED]")
            }
        })
    }
}

func TestSanitize_HighRedactionDiscards(t *testing.T) {
    svc := &TelemetryService{}

    // Event that is mostly code should be discarded
    event := service.TelemetryEvent{
        Content: service.TelemetryContent{
            Text: "```go\npackage main\n\nfunc main() {\n\tfmt.Println(\"hello\")\n}\n```",
        },
    }

    result, ratio := svc.sanitize(event)

    // Should be discarded (ratio > 0.3)
    assert.Nil(t, result)
    assert.Greater(t, ratio, 0.3)
}

func TestExtractMethodologySignals(t *testing.T) {
    signals := make(map[string]interface{})

    text := `
    STRIDE Analysis:
    1. Spoofing - An attacker could forge authentication tokens
    2. Tampering - The API lacks integrity validation
    3. Repudiation - No audit logging for sensitive operations
    4. Information Disclosure - Error messages expose internal paths
    5. Denial of Service - No rate limiting on API endpoints
    6. Elevation of Privilege - RBAC bypass via parameter manipulation

    MITRE ATT&CK Reference: T1078 (Valid Accounts)

    Risk: HIGH - CVSS 8.5
    `

    extractMethodologySignals(text, signals)

    assert.Equal(t, 6, signals["stride_coverage"])
    assert.True(t, signals["mentions_attack_patterns"].(bool))
    assert.Greater(t, signals["risk_assessment_depth"].(int), 3)
    assert.True(t, signals["has_enumeration"].(bool))
}
````

### 2. Adversarial Tests

```go
func TestSanitize_AdversarialInputs(t *testing.T) {
    svc := &TelemetryService{}

    adversarial := []struct {
        name  string
        input string
    }{
        {
            name:  "unicode obfuscation",
            input: "The functi\u006fn handleRequest() has a bug", // Unicode 'o'
        },
        {
            name:  "zero-width characters",
            input: "The func\u200Btion is vulnerable", // Zero-width space
        },
        {
            name:  "base64 encoded code",
            input: "Decode this: ZnVuYyBtYWluKCkge30=", // "func main() {}"
        },
        {
            name:  "html entities",
            input: "&lt;script&gt;alert('xss')&lt;/script&gt;",
        },
        {
            name:  "mixed case bypass attempt",
            input: "The FuNcTiOn handleRequest is broken",
        },
    }

    for _, tt := range adversarial {
        t.Run(tt.name, func(t *testing.T) {
            event := service.TelemetryEvent{
                Content: service.TelemetryContent{Text: tt.input},
            }

            result, _ := svc.sanitize(event)

            // Verify no obvious code patterns leaked through
            require.NotNil(t, result)
            lowerText := strings.ToLower(result.Content.Text)

            // These should not appear in output
            dangerous := []string{"function", "handlerequest", "script", "alert"}
            for _, d := range dangerous {
                assert.NotContains(t, lowerText, d,
                    "Adversarial pattern '%s' should be redacted", d)
            }
        })
    }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Implement `service.Telemetry` interface
- [ ] Add `GetSecretBytes()` and `ZeroBytes()` to secrets service
- [ ] Deploy telemetry Lambda handler
- [ ] Configure DynamoDB TTL and indexes
- [ ] Set up S3 bucket with lifecycle policies

### Phase 2: Collection (Weeks 3-4)

- [ ] Deploy Telemetry MCP Server to DevPod base image
- [ ] Implement TelemetryFeedback React component
- [ ] Add opt-out settings to DevPod configuration
- [ ] Create nightly S3 export Lambda
- [ ] Set up Glue crawler and Athena tables

### Phase 3: Processing (Weeks 5-6)

- [ ] Implement preference pair extraction
- [ ] Create quality metrics dashboard
- [ ] Add adversarial testing for sanitization
- [ ] Document GDPR compliance procedures
- [ ] Train ML team on data access

### Phase 4: Training (Weeks 7-8)

- [ ] Export first batch of preference pairs
- [ ] Run DPO fine-tuning experiment
- [ ] Evaluate fine-tuned model vs baseline
- [ ] Document results and iterate
- [ ] Plan production model deployment

---

## Cost Analysis

### Monthly Estimates (~1,000 events/day)

| Component           | Monthly Cost   | Notes                                                |
| ------------------- | -------------- | ---------------------------------------------------- |
| **DynamoDB**        | ~$5            | On-demand, ~30K items/month, 90-day TTL auto-deletes |
| **S3 Storage**      | ~$2            | <1GB/month, Intelligent-Tiering                      |
| **Lambda (API)**    | ~$1            | ~30K invocations, 512MB, 200ms avg                   |
| **Lambda (Export)** | ~$1            | Daily cron, 1024MB, 60s                              |
| **Lambda (Pairs)**  | ~$1            | Daily cron, 512MB, 30s                               |
| **Glue Crawler**    | ~$5            | Weekly, ~1 DPU-hour                                  |
| **Athena**          | ~$5            | ~50 queries/month, 5MB scanned avg                   |
| **API Gateway**     | ~$4            | Existing, ~30K requests/month                        |
| **CloudWatch**      | ~$2            | Logs and metrics                                     |
| **TOTAL**           | **~$26/month** | 63% reduction from original $76                      |

### Cost Comparison

```
┌───────────────────────────────────────────────────────────────────┐
│                  ARCHITECTURE COST COMPARISON                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ORIGINAL PROPOSAL                THIS ARCHITECTURE              │
│  ─────────────────                ─────────────────              │
│  Kinesis Firehose     $25        DynamoDB            $5          │
│  S3 (raw)             $10        S3 (exports only)   $2          │
│  Glue Catalog         $10        Glue Crawler        $5          │
│  Athena               $15        Athena              $5          │
│  API Gateway (new)    $10        API Gateway (exist) $4          │
│  Lambda               $5         Lambda              $3          │
│  CloudWatch           $1         CloudWatch          $2          │
│  ─────────────────────────────────────────────────────────────   │
│  TOTAL: $76/month               TOTAL: $26/month                │
│                                                                   │
│  SAVINGS: $50/month (~63%)                                       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Legal review** of Engineer Consent Addendum (HR/Legal)
- [ ] **Legal review** of Customer MSA Clause (Legal)
- [ ] **Privacy impact assessment** completed (Compliance)
- [ ] **GDPR Article 30 records** updated (Compliance)
- [ ] **Security review** of sanitization patterns (Security)
- [ ] **Code review** of all implementations (Engineering)
- [ ] **Unit tests** passing with >80% coverage (CI/CD)
- [ ] **Adversarial tests** passing (Security)

### Deployment Steps

1. **SAM Deploy** (Backend)

   ```bash
   cd modules/chariot/backend/build
   sam build
   sam deploy --guided
   ```

2. **UI Deploy** (TelemetryFeedback Component)

   ```bash
   cd modules/chariot/ui
   npm run build
   npm run deploy
   ```

3. **DevPod Update** (MCP Server)
   ```bash
   cd modules/threat-model-infrastructure
   docker build -t devpod-telemetry .
   docker push ecr.aws/praetorian/devpod-telemetry:latest
   ```

### Post-Deployment Verification

- [ ] **Telemetry endpoint** responding (POST /api/v1/telemetry)
- [ ] **DynamoDB** records appearing with correct TTL
- [ ] **S3 exports** generating on schedule
- [ ] **Athena queries** returning data
- [ ] **Opt-out** working (test with settings toggle)
- [ ] **CloudWatch alarms** configured

---

## Monitoring & Alerts

### CloudWatch Alarms

| Alarm                  | Condition                 | Action                      |
| ---------------------- | ------------------------- | --------------------------- |
| **TelemetryErrors**    | >10 errors/5min           | PagerDuty                   |
| **HighRedactionRate**  | Avg redaction >0.25       | Slack #security             |
| **LowIngestionRate**   | <100 events/day           | Slack #ml-ops               |
| **ExportFailure**      | Export Lambda error       | PagerDuty                   |
| **SanitizationBypass** | Unsanitized code detected | PagerDuty + Security review |

### Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TELEMETRY HEALTH DASHBOARD                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Events Today: 847          Avg Redaction: 0.08       Active Engineers: 12 │
│  ████████████░░ 85%         █░░░░░░░░░ 8%            ████████████░░ 80%    │
│                                                                             │
│  Preference Pairs (7d)      Quality Ratings (7d)     Export Status         │
│  Total: 134                 Avg: 4.2 ★★★★☆           Last: 02:00 UTC ✓     │
│  Valid: 89 (66%)            High (4-5): 78%          Next: 02:00 UTC       │
│                             Low (1-2): 8%                                   │
│                                                                             │
│  STRIDE Coverage            Methodology Distribution                       │
│  Spoofing:      ████░ 80%   STRIDE:      45%                               │
│  Tampering:     ███░░ 60%   DFD:         25%                               │
│  Repudiation:   ██░░░ 40%   Attack Tree: 15%                               │
│  Info Disc:     ████░ 80%   Risk Score:  10%                               │
│  DoS:           ███░░ 60%   Other:       5%                                │
│  EoP:           ████░ 80%                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Sample Training Data

### Example High-Quality Preference Pair

```json
{
  "prompt": "Analyze the authentication flow in this web application for STRIDE threats. Focus on the JWT token validation and session management.",

  "chosen": "## STRIDE Analysis: Authentication Flow\n\n### 1. Spoofing\n- **Threat**: Attacker forges JWT tokens using weak signing algorithm (HS256 vs RS256)\n- **Mitigation**: Use RS256 with key rotation, validate `iss` and `aud` claims\n- **Risk**: HIGH - Direct authentication bypass\n\n### 2. Tampering\n- **Threat**: JWT payload modification if signature validation is skipped\n- **Mitigation**: Always verify signature before processing claims, use `alg: none` blocklist\n- **Risk**: CRITICAL - Complete access control bypass\n\n### 3. Repudiation\n- **Threat**: No audit trail for token issuance and validation failures\n- **Mitigation**: Log all auth events with correlation IDs, retain for 90 days\n- **Risk**: MEDIUM - Incident response difficulty\n\n### 4. Information Disclosure\n- **Threat**: Sensitive data in JWT payload (email, roles) exposed in browser storage\n- **Mitigation**: Use opaque access tokens, store sensitive claims server-side\n- **Risk**: MEDIUM - Privacy violation if tokens leaked\n\n### 5. Denial of Service\n- **Threat**: Token validation is computationally expensive (RS256), no rate limiting\n- **Mitigation**: Cache validated tokens, implement rate limiting per IP/user\n- **Risk**: LOW - Requires sustained attack volume\n\n### 6. Elevation of Privilege\n- **Threat**: Role claims in JWT not re-validated on sensitive operations\n- **Mitigation**: Re-check permissions at resource access, not just auth time\n- **Risk**: HIGH - Horizontal and vertical privilege escalation\n\n### Recommendations Priority\n1. **Immediate**: Fix tampering risk - enforce signature validation\n2. **High**: Address EoP - add resource-level permission checks\n3. **Medium**: Improve logging for repudiation defense",

  "rejected": "The authentication system has some security issues. JWT tokens could be forged. You should validate signatures. Sessions need better management. Consider adding logging. Rate limiting would help with DoS attacks.",

  "metadata": {
    "session_id": "sess_a1b2c3d4",
    "methodology_type": "stride",
    "edit_distance": 0.85,
    "quality_signals": ["accurate", "complete", "actionable", "methodology"],
    "extracted_at": "2026-01-10T14:30:00Z"
  }
}
```

### Example Methodology Template

```json
{
  "template_id": "stride_auth_flow_v1",
  "methodology": "stride",
  "domain": "authentication",

  "structure": {
    "sections": [
      "threat_category",
      "specific_threat",
      "attack_vector",
      "mitigation",
      "risk_rating",
      "evidence"
    ],
    "required_categories": ["S", "T", "R", "I", "D", "E"],
    "risk_scale": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
  },

  "quality_metrics": {
    "avg_rating": 4.5,
    "edit_acceptance_rate": 0.92,
    "reuse_count": 47
  },

  "example_prompt": "Analyze [COMPONENT] for STRIDE threats, focusing on [SPECIFIC_CONCERN]",

  "created_from_sessions": ["sess_a1b2c3d4", "sess_e5f6g7h8", "sess_i9j0k1l2"]
}
```

---

## References

### Research Sources

1. [Direct Preference Optimization Paper](https://arxiv.org/pdf/2305.18290) -
   DPO training methodology
2. [RLHF to DPO Guide](https://huggingface.co/blog/ariG23498/rlhf-to-dpo) -
   Implementation patterns
3. [AWS Kinesis Best Practices](https://aws.amazon.com/blogs/big-data/best-practices-for-consuming-amazon-kinesis-data-streams-using-aws-lambda/) -
   Streaming architecture
4. [Microsoft Presidio](https://learn.microsoft.com/en-us/azure/ai-services/language-service/personally-identifiable-information/how-to/redact-text-pii) -
   PII detection
5. [Kong PII Sanitization](https://konghq.com/blog/enterprise/building-pii-sanitization-for-llms-and-agentic-ai) -
   LLM-specific sanitization

### Internal References

- [THREAT-MODELING-IN-DEVPOD.md](THREAT-MODELING-IN-DEVPOD.md) - DevPod
  architecture
- [THREAT-MODEL-ARCHITECTURE.md](THREAT-MODEL-ARCHITECTURE.md) - Orchestrator
  design
- Chariot Backend CLAUDE.md - Go patterns and conventions
- Chariot UI CLAUDE.md - React component patterns

### Compliance Standards

- GDPR Article 6(1)(f) - Legitimate Interest
- GDPR Article 30 - Records of Processing Activities
- SOC 2 Type II - Data handling controls
- ISO 27001 - Information security management

---

**Document Version**: 1.0.0 (Consolidated) **Last Updated**: 2026-01-10
**Status**: Ready for Implementation

---

**End of Document 6 of 6**

**Return to**: [00-INDEX.md](00-INDEX.md) for complete documentation index
