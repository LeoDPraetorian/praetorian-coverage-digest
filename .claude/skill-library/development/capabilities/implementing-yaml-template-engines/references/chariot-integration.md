# Chariot Integration

**Integration with Tabularium Risk model and Janus framework for Chariot platform.**

## Tabularium Risk Model Mapping

### Risk Entity Structure

```go
import "github.com/praetorian-inc/tabularium/models"

func templateResultToRisk(template *CompiledTemplate, match *MatchResult, target string) *models.Risk {
    return &models.Risk{
        Name:        template.Info.Name,
        Description: buildRiskDescription(template, match),
        Class:       template.ID, // Template ID as risk class
        Source:      "yaml-template-engine",
        Severity:    mapSeverity(template.Info.Severity),
        Status:      "A", // Active

        // Asset reference
        Asset: target,

        // Additional metadata
        Metadata: map[string]interface{}{
            "template_id":   template.ID,
            "template_tags": template.Info.Tags,
            "matched_at":    time.Now().Unix(),
            "matcher_type":  match.MatcherType,
        },
    }
}

func mapSeverity(templateSeverity string) string {
    // Map Nuclei severity to Tabularium severity
    mapping := map[string]string{
        "info":     "L", // Low
        "low":      "L",
        "medium":   "M", // Medium
        "high":     "H", // High
        "critical": "C", // Critical
    }

    if severity, ok := mapping[templateSeverity]; ok {
        return severity
    }
    return "L" // Default to low
}

func buildRiskDescription(template *CompiledTemplate, match *MatchResult) string {
    desc := template.Info.Description
    if desc == "" {
        desc = fmt.Sprintf("Detected via template: %s", template.Info.Name)
    }

    // Add match details
    if len(match.ExtractedData) > 0 {
        desc += "\n\nExtracted data:\n"
        for key, values := range match.ExtractedData {
            desc += fmt.Sprintf("- %s: %v\n", key, values)
        }
    }

    return desc
}
```

### Reporting Template Findings

```go
import "github.com/praetorian-inc/chariot/backend/pkg/risk"

func ReportTemplateFindings(results []*TemplateResult) error {
    riskClient := risk.NewClient()

    for _, result := range results {
        if !result.Matched {
            continue
        }

        risk := templateResultToRisk(result.Template, result.Match, result.Target)

        if err := riskClient.Create(risk); err != nil {
            log.Errorf("Failed to report risk for %s: %v", result.Template.ID, err)
            continue
        }

        log.Infof("Reported risk: %s on %s", risk.Name, risk.Asset)
    }

    return nil
}
```

## Janus Framework Integration

### Tool Registration

```go
// internal/registry/janus.go
package registry

import (
    "context"
    "github.com/praetorian-inc/janus"
)

func init() {
    // Self-register template executor as Janus tool
    janus.RegisterTool("yaml-template-executor", &TemplateExecutorTool{})
}

type TemplateExecutorTool struct {
    registry *TemplateRegistry
}

func (t *TemplateExecutorTool) Execute(ctx context.Context, input *janus.Input) (*janus.Output, error) {
    // Parse input
    templateID := input.Params["template_id"].(string)
    target := input.Params["target"].(string)

    // Get template from registry
    template, ok := t.registry.Get(templateID)
    if !ok {
        return nil, fmt.Errorf("template not found: %s", templateID)
    }

    // Execute template
    result, err := Execute(template, target)
    if err != nil {
        return nil, fmt.Errorf("execution failed: %w", err)
    }

    // Return Janus output
    return &janus.Output{
        Data: map[string]interface{}{
            "matched":        result.Matched,
            "template_id":    templateID,
            "extracted_data": result.ExtractedData,
        },
        Status: "success",
    }, nil
}

func (t *TemplateExecutorTool) Name() string {
    return "yaml-template-executor"
}

func (t *TemplateExecutorTool) Description() string {
    return "Execute YAML vulnerability detection templates"
}
```

### Janus Workflow Example

```go
// Example Janus workflow using template executor
func CreateTemplateWorkflow() *janus.Workflow {
    return &janus.Workflow{
        Name: "vulnerability-scan",
        Steps: []janus.Step{
            {
                Name: "discover-assets",
                Tool: "asset-discovery",
            },
            {
                Name: "scan-with-templates",
                Tool: "yaml-template-executor",
                Input: map[string]interface{}{
                    "template_id": "admin-panel-detection",
                    "target":      "{{.assets}}",
                },
            },
            {
                Name: "report-findings",
                Tool: "risk-reporter",
                Input: map[string]interface{}{
                    "results": "{{.scan-with-templates}}",
                },
            },
        },
    }
}
```

## Package Structure

Follow Chariot's `pkg/` patterns:

```
pkg/
├── templates/           # Public API
│   ├── parse.go         # YAML parsing
│   ├── compile.go       # Template compilation
│   └── execute.go       # Template execution
├── matchers/            # Matcher engine
│   ├── word.go
│   ├── regex.go
│   └── dsl.go
├── extractors/          # Extractor engine
│   ├── regex.go
│   ├── json.go
│   └── xpath.go
├── operators/           # DSL operators
│   └── dsl.go
internal/
├── registry/            # Template registry
│   ├── registry.go
│   └── janus.go         # Janus integration
└── cache/               # Template cache
    └── cache.go
```

## Configuration Integration

### Environment Variables

```go
// config/config.go
package config

import "os"

type TemplateEngineConfig struct {
    TemplateDir      string
    EnableHotReload  bool
    CacheSize        int
    WorkerCount      int
    RequestTimeout   time.Duration
}

func LoadConfig() *TemplateEngineConfig {
    return &TemplateEngineConfig{
        TemplateDir:     getEnv("TEMPLATE_DIR", "./templates"),
        EnableHotReload: getEnvBool("TEMPLATE_HOT_RELOAD", true),
        CacheSize:       getEnvInt("TEMPLATE_CACHE_SIZE", 1000),
        WorkerCount:     getEnvInt("TEMPLATE_WORKERS", 10),
        RequestTimeout:  getEnvDuration("TEMPLATE_TIMEOUT", 30*time.Second),
    }
}
```

### CloudFormation Parameters

```yaml
# For backend Lambda deployment
Parameters:
  TemplateS3Bucket:
    Type: String
    Description: S3 bucket containing YAML templates
  TemplateS3Prefix:
    Type: String
    Default: templates/
    Description: S3 prefix for templates

Resources:
  TemplateScannerFunction:
    Type: AWS::Lambda::Function
    Properties:
      Environment:
        Variables:
          TEMPLATE_S3_BUCKET: !Ref TemplateS3Bucket
          TEMPLATE_S3_PREFIX: !Ref TemplateS3Prefix
```

## Logging Integration

```go
import "github.com/praetorian-inc/chariot/backend/pkg/log"

func ExecuteWithLogging(template *CompiledTemplate, target string) (*Result, error) {
    log.WithFields(log.Fields{
        "template_id": template.ID,
        "target":      target,
    }).Info("Executing template")

    start := time.Now()
    result, err := Execute(template, target)
    duration := time.Since(start)

    if err != nil {
        log.WithFields(log.Fields{
            "template_id": template.ID,
            "target":      target,
            "duration_ms": duration.Milliseconds(),
            "error":       err.Error(),
        }).Error("Template execution failed")
        return nil, err
    }

    log.WithFields(log.Fields{
        "template_id": template.ID,
        "target":      target,
        "matched":     result.Matched,
        "duration_ms": duration.Milliseconds(),
    }).Info("Template execution completed")

    return result, nil
}
```

## Metrics Integration

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    templatesExecuted = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "template_executions_total",
            Help: "Total number of template executions",
        },
        []string{"template_id", "matched"},
    )

    executionDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "template_execution_duration_seconds",
            Help:    "Template execution duration",
            Buckets: prometheus.DefBuckets,
        },
        []string{"template_id"},
    )
)

func init() {
    prometheus.MustRegister(templatesExecuted, executionDuration)
}

func ExecuteWithMetrics(template *CompiledTemplate, target string) (*Result, error) {
    timer := prometheus.NewTimer(executionDuration.WithLabelValues(template.ID))
    defer timer.ObserveDuration()

    result, err := Execute(template, target)

    matched := "false"
    if result != nil && result.Matched {
        matched = "true"
    }

    templatesExecuted.WithLabelValues(template.ID, matched).Inc()

    return result, err
}
```

## Testing Integration

```go
// Integration test with Chariot backend
func TestChariotIntegration(t *testing.T) {
    // Start local Chariot backend
    backend := startTestBackend(t)
    defer backend.Stop()

    // Load templates
    registry := NewRegistry(NewFileLoader())
    registry.LoadFromDirectory("templates/")

    // Execute scan
    scanner := NewScanner(registry)
    results := scanner.Scan("http://test.target.local")

    // Report to Chariot
    err := ReportTemplateFindings(results)
    require.NoError(t, err)

    // Verify risks were created
    risks, err := backend.GetRisks()
    require.NoError(t, err)
    assert.Greater(t, len(risks), 0)
}
```
