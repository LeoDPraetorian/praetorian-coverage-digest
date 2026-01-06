# Azure Monitoring and Observability

Guide to Application Insights, Azure Monitor, distributed tracing, and observability patterns.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md` (SDK Implementation findings)

---

## ⚠️ Critical Migration: Application Insights

**DEADLINE: March 31, 2025**

**Instrumentation key ingestion ends permanently**. All applications must migrate to:

1. Connection strings (minimum requirement)
2. OpenTelemetry (recommended for new applications)

### Migration Steps

```bash
# Step 1: Find all instrumentation key references
grep -r "InstrumentationKey" . --include="*.config" --include="*.json" --include="*.yaml"
grep -r "APPINSIGHTS_INSTRUMENTATIONKEY" . --include="*.env"

# Step 2: Get connection string from Azure
az monitor app-insights component show \
  --app myAppInsights \
  --resource-group myResourceGroup \
  --query connectionString

# Step 3: Replace in application configuration
# OLD: InstrumentationKey=abc-123-def
# NEW: InstrumentationKey=abc-123-def;IngestionEndpoint=https://...;LiveEndpoint=https://...
```

---

## OpenTelemetry Integration (Recommended)

### Go SDK (Application Insights Go SDK Deprecated)

**⚠️ The Application Insights Go SDK is no longer maintained**

**Use OpenTelemetry instead**:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
    "go.opentelemetry.io/otel/sdk/trace"
    "github.com/Azure/azure-sdk-for-go/sdk/monitor/azexporter"
)

func initTelemetry() error {
    // Azure Monitor exporter
    exporter, err := azexporter.NewExporter(&azexporter.ExporterOptions{
        ConnectionString: os.Getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"),
    })
    if err != nil {
        return err
    }

    // Create tracer provider
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("myapp"),
            semconv.ServiceVersion("1.0.0"),
        )),
    )

    otel.SetTracerProvider(tp)
    return nil
}

// Create span for distributed tracing
func processRequest(ctx context.Context) error {
    tracer := otel.Tracer("myapp")
    ctx, span := tracer.Start(ctx, "processRequest")
    defer span.End()

    // W3C Trace-Context propagates automatically
    result, err := externalService.Call(ctx)
    if err != nil {
        span.RecordError(err)
        return err
    }

    span.SetAttributes(attribute.String("result", result))
    return nil
}
```

### Python SDK (Azure Monitor OpenTelemetry Distro)

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace, metrics
import os

# Auto-instrumentation for FastAPI, Django, Flask
configure_azure_monitor(
    connection_string=os.environ["APPLICATIONINSIGHTS_CONNECTION_STRING"]
)

# Get tracer for custom spans
tracer = trace.get_tracer(__name__)

def process_request():
    with tracer.start_as_current_span("process_request") as span:
        span.set_attribute("user_id", "12345")

        # External call (automatically traced)
        response = requests.get("https://api.example.com/data")

        span.set_attribute("status_code", response.status_code)
        return response.json()

# Custom metrics
meter = metrics.get_meter(__name__)
request_counter = meter.create_counter(
    name="http_requests",
    description="Number of HTTP requests",
    unit="1"
)

request_counter.add(1, {"method": "GET", "endpoint": "/api/data"})
```

### TypeScript SDK

**⚠️ CRITICAL**: Load SDK early (before other requires) for proper instrumentation

```typescript
// index.ts (FIRST import)
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
});

// NOW import other modules
import express from "express";
import { trace } from "@opentelemetry/api";

const app = express();
const tracer = trace.getTracer("myapp");

app.get("/api/data", async (req, res) => {
  const span = tracer.startSpan("getData");

  try {
    const data = await fetchData();
    span.setAttribute("record_count", data.length);
    res.json(data);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2 }); // ERROR status
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});
```

---

## Distributed Tracing

### W3C Trace-Context Standard

All Azure SDKs automatically propagate W3C Trace-Context headers:

**Headers**:

- `traceparent`: `00-{trace-id}-{span-id}-{flags}`
- `tracestate`: Vendor-specific data

**Example flow**:

```
Frontend Request → App Service → Azure Function → Cosmos DB
    |                  |              |              |
    traceparent: 00-abc123...-span1-01
                       |
                       traceparent: 00-abc123...-span2-01
                                    |
                                    traceparent: 00-abc123...-span3-01
```

**Application Insights correlation**:

- `operation_Id` = `trace-id` from traceparent
- All spans with same `operation_Id` appear in single transaction view

### Manual Span Creation

**Python**:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def complex_operation():
    with tracer.start_as_current_span("complex_operation") as span:
        # Sub-operation 1
        with tracer.start_as_current_span("step1") as step1_span:
            step1_span.set_attribute("input_size", 1024)
            result1 = process_step1()

        # Sub-operation 2
        with tracer.start_as_current_span("step2") as step2_span:
            step2_span.set_attribute("result1", result1)
            result2 = process_step2(result1)

        span.set_attribute("total_items", result2)
        return result2
```

---

## Custom Metrics

### Modern Pattern (GetMetric with Preaggregation)

**❌ OLD (Deprecated - trackMetric)**:

```python
telemetry_client.track_metric("queue_length", 42)
# Data not appearing in portal (deprecated API)
```

**✅ NEW (GetMetric with preaggregation)**:

```python
metric = telemetry_client.get_metric("queue_length")
metric.track_value(42)
# Preaggregated locally, then sent to portal
```

### OpenTelemetry Metrics

**Python**:

```python
from opentelemetry import metrics

meter = metrics.get_meter(__name__)

# Counter (monotonically increasing)
request_counter = meter.create_counter(
    name="http_requests_total",
    description="Total HTTP requests",
    unit="1"
)

request_counter.add(1, {"method": "GET", "status": "200"})

# Histogram (value distribution)
request_duration = meter.create_histogram(
    name="http_request_duration_seconds",
    description="HTTP request duration",
    unit="s"
)

request_duration.record(0.042, {"method": "GET", "endpoint": "/api/data"})

# Gauge (current value)
queue_length = meter.create_up_down_counter(
    name="queue_length",
    description="Current queue length"
)

queue_length.add(1)  # Increment
queue_length.add(-1)  # Decrement
```

---

## Sampling Configuration

### Adaptive Sampling (Recommended for Production)

**Purpose**: Reduce telemetry volume and costs while preserving statistical accuracy

**Python**:

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatioBased

configure_azure_monitor(
    connection_string=os.environ["APPLICATIONINSIGHTS_CONNECTION_STRING"],
    sampler=ParentBasedTraceIdRatioBased(0.1)  # 10% sampling
)
```

**Sampling Rates by Environment**:

- **Development**: 100% (no sampling)
- **Staging**: 50%
- **Production (low traffic)**: 50%
- **Production (high traffic)**: 10-20%

**Smart Sampling**:

- Always sample errors (100%)
- Sample successful requests based on rate
- Preserve parent-child relationships (if parent sampled, children sampled)

---

## Log Analytics Queries (KQL)

### Common Queries

**Request failures**:

```kusto
requests
| where success == false
| summarize count() by resultCode, operation_Name
| order by count_ desc
```

**Dependency failures**:

```kusto
dependencies
| where success == false
| summarize count() by type, target, resultCode
| order by count_ desc
```

**P95 latency**:

```kusto
requests
| summarize percentile(duration, 95) by bin(timestamp, 5m)
| render timechart
```

**Retry analysis**:

```kusto
dependencies
| where customDimensions.retry_count > 0
| summarize count() by target, tostring(customDimensions.retry_count)
```

---

## Related Documentation

- [Error Handling](error-handling.md) - Retry policies and error tracking
- [SDK Patterns](sdk-patterns.md) - SDK integration with monitoring
