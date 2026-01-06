# Azure SDK Error Handling and Retry Policies

Complete guide to error handling, retry configuration, and production resilience patterns for Azure SDKs.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`

---

## Error Handling Hierarchy by Language

### Go SDK

**Error Types**:

```go
import "github.com/Azure/azure-sdk-for-go/sdk/azcore"

// HTTP errors
var respErr *azcore.ResponseError
if errors.As(err, &respErr) {
    fmt.Printf("Status Code: %d\n", respErr.StatusCode)
    fmt.Printf("Error Code: %s\n", respErr.ErrorCode)
    fmt.Printf("Request ID: %s\n", respErr.RawResponse.Header.Get("x-ms-request-id"))
}

// Context cancellation
if errors.Is(err, context.DeadlineExceeded) {
    // Timeout occurred
}
if errors.Is(err, context.Canceled) {
    // Operation was cancelled
}
```

**Error Wrapping**:

```go
func fetchBlob(ctx context.Context, client *azblob.Client) error {
    blob, err := client.DownloadStream(ctx, "container", "blob", nil)
    if err != nil {
        return fmt.Errorf("failed to download blob: %w", err)
    }
    // ...
}
```

### Python SDK

**Exception Hierarchy**:

```python
from azure.core.exceptions import (
    AzureError,           # Base class
    HttpResponseError,    # HTTP errors (404, 500, etc.)
    ServiceRequestError,  # Connection failures
    ResourceNotFoundError,
    ResourceExistsError,
    ClientAuthenticationError
)

try:
    blob_client.download_blob()
except ResourceNotFoundError:
    # Blob doesn't exist
    pass
except HttpResponseError as e:
    print(f"Status Code: {e.status_code}")
    print(f"Error Code: {e.error_code}")
    print(f"Message: {e.message}")
    print(f"Request ID: {e.response.headers.get('x-ms-request-id')}")
except ServiceRequestError:
    # Network connectivity issue
    pass
```

**Async Context Managers**:

```python
from azure.storage.blob.aio import BlobServiceClient
from azure.core.exceptions import HttpResponseError

async with BlobServiceClient(account_url, credential) as client:
    try:
        async with client.get_blob_client("container", "blob") as blob:
            data = await blob.download_blob()
    except HttpResponseError as e:
        if e.status_code == 404:
            # Handle missing blob
            pass
```

### TypeScript/JavaScript SDK

**Error Types**:

```typescript
import { RestError } from "@azure/core-rest-pipeline";

try {
  const blob = await blobClient.download();
} catch (error) {
  if (error instanceof RestError) {
    console.log(`Status Code: ${error.statusCode}`);
    console.log(`Error Code: ${error.code}`);
    console.log(`Request ID: ${error.request?.headers.get("x-ms-request-id")}`);

    // Check for specific errors
    if (error.statusCode === 404) {
      // Blob not found
    } else if (error.statusCode === 403) {
      // Authorization failure
    }
  }
}
```

**Promise Rejection Handling**:

```typescript
// Async/await
try {
  await blobClient.upload(data);
} catch (error) {
  // Handle error
}

// Promise chain
blobClient
  .upload(data)
  .then((result) => {
    // Success
  })
  .catch((error) => {
    // Handle error
  });
```

---

## Retry Policy Configuration

### Exponential Backoff Formula

**Universal formula across all Azure SDKs**:

```
delay = backoff_factor * (2 ** (retry_count - 1)) + jitter
```

**Example calculation** (backoff_factor = 0.8 seconds):

- Retry 1: 0.8 \* (2^0) + jitter = 0.8s + jitter
- Retry 2: 0.8 \* (2^1) + jitter = 1.6s + jitter
- Retry 3: 0.8 \* (2^2) + jitter = 3.2s + jitter
- Retry 4: 0.8 \* (2^3) + jitter = 6.4s + jitter

**Jitter**: Random milliseconds (0-1000ms) to prevent retry storms

### Go SDK Retry Configuration

```go
import (
    "github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
    "time"
)

retryOptions := policy.RetryOptions{
    MaxRetries:    10,                    // Default: 3
    TryTimeout:    15 * time.Minute,      // Per-attempt timeout
    RetryDelay:    1 * time.Second,       // Initial backoff
    MaxRetryDelay: 60 * time.Second,      // Maximum backoff
    StatusCodes:   []int{408, 429, 500, 502, 503, 504}, // Retry these status codes
}

clientOptions := &azblob.ClientOptions{
    ClientOptions: azcore.ClientOptions{
        Retry: retryOptions,
    },
}

client, err := azblob.NewClient(accountURL, credential, clientOptions)
```

### Python SDK Retry Configuration

```python
from azure.core.pipeline.policies import RetryPolicy
from azure.storage.blob import BlobServiceClient

# Custom retry policy
retry_policy = RetryPolicy(
    retry_total=10,                      # Max retries (default: 3)
    retry_backoff_factor=0.8,            # Backoff multiplier
    retry_backoff_max=60,                # Max backoff seconds
    retry_on_status_codes=[408, 429, 500, 502, 503, 504]
)

# Apply to client
client = BlobServiceClient(
    account_url,
    credential=credential,
    retry_policy=retry_policy
)
```

### TypeScript SDK Retry Configuration

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { exponentialRetryPolicy } from "@azure/core-rest-pipeline";

const retryPolicy = exponentialRetryPolicy({
  maxRetries: 10, // Default: 3
  retryDelayInMs: 1000, // Initial delay
  maxRetryDelayInMs: 60000, // Max delay
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
});

const client = new BlobServiceClient(accountURL, credential, {
  retryOptions: {
    maxRetries: 10,
    maxRetryDelayInMs: 60000,
    retryDelayInMs: 1000,
  },
});
```

---

## Production Retry Settings

### Default Settings vs Production

| Setting       | Default | Production (Low) | Production (High) | Long-Running |
| ------------- | ------- | ---------------- | ----------------- | ------------ |
| MaxRetries    | 3       | 5-7              | 10                | 10           |
| RetryDelay    | 800ms   | 1s               | 1s                | 4s           |
| MaxRetryDelay | 60s     | 60s              | 60s               | 120s         |
| TryTimeout    | 1m      | 5m               | 15m               | 30m          |

**Low-throughput**: <10 requests/second
**High-throughput**: >100 requests/second (Cosmos DB, Azure Monitor)
**Long-running**: Data export, batch processing, Azure Monitor Logs API

### Service-Specific Recommendations

**Cosmos DB**:

```python
# High rate-limiting, needs aggressive retry
retry_policy = RetryPolicy(
    retry_total=10,
    retry_backoff_factor=0.8,
    retry_backoff_max=60
)
```

**Azure Monitor Logs API**:

```python
# 3-10 minute timeout, use Prefer header
headers = {"Prefer": "wait=600"}  # 10 minutes
client.query_workspace(workspace_id, query, headers=headers)
```

**Storage Blobs**:

```python
# Standard retry sufficient for most cases
retry_policy = RetryPolicy(retry_total=3)
```

---

## Common SDK Errors

### Error 1: 429 Too Many Requests (Throttling)

**Causes**:

- Exceeded service rate limits
- Insufficient provisioned throughput (Cosmos DB)
- Burst traffic patterns

**Solutions**:

```python
# Check for Retry-After header
if error.status_code == 429:
    retry_after = error.response.headers.get('Retry-After', '60')
    time.sleep(int(retry_after))
    # Retry request

# Implement queue-based architecture
# Use exponential backoff with jitter
# Batch operations to reduce request count
```

**Service Rate Limits**:

- **Cosmos DB**: 400 RU/s per partition (default)
- **Azure Monitor Logs API**: 200 requests per 30 seconds
- **Storage**: 20,000 requests/second per account
- **Key Vault**: 2,000 GET operations per 10 seconds per vault

### Error 2: Context Deadline Exceeded (Go)

**Causes**:

- Context timeout too short for retry cycle
- HTTP/2 connection reuse issues
- Network latency higher than expected

**Solutions**:

```go
// Ensure context timeout > TryTimeout * MaxRetries
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
defer cancel()

// For HTTP/2 issues, use HTTP/1.1
transport := &http.Transport{
    ForceAttemptHTTP2: false,
}
client := &http.Client{Transport: transport}
```

### Error 3: TaskCanceledException (.NET)

**Causes**:

- `CancellationToken` timeout shorter than retry policy timeout
- Cancellation triggered before retry completes

**Solutions**:

```csharp
// Ensure CancellationToken timeout > retry policy timeout
var cts = new CancellationTokenSource(TimeSpan.FromMinutes(30));

// Retry policy: 10 retries * 60s max delay = 600s (10 minutes)
// CancellationToken: 30 minutes (safe margin)
```

### Error 4: Storage SDK Not Retrying 429

**Cause**: Breaking change in SDK API (v11 → v12 transition)

**Old API** (deprecated):

```python
from azure.storage.blob import ExponentialRetryPolicyFilter
# No longer works in SDK v12+
```

**New API**:

```python
from azure.storage.blob import BlobServiceClient
from azure.core.pipeline.policies import RetryPolicy

retry_policy = RetryPolicy(
    retry_total=10,
    retry_on_status_codes=[429]  # Explicit 429 handling
)
```

### Error 5: ClientSecretCredential Authentication Failures

**Error**: `AADSTS7000215: Invalid client secret provided`

**Common Causes**:

1. Using secret ID instead of secret value
2. Secret expired
3. Proxy/firewall blocking Azure AD endpoints
4. Clock skew > 5 minutes

**Solutions**:

```bash
# Verify secret validity
az ad app credential list --id $APP_ID

# Test connectivity to Azure AD
curl https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token

# Sync NTP time
sudo ntpdate -s time.nist.gov
```

---

## Retry-After Header Handling

### Automatic Handling (SDK Default)

All Azure SDKs automatically respect the `Retry-After` header:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60

SDK automatically waits 60 seconds before retrying
```

### Services WITH Retry-After Header

- Azure Storage (blob, queue, file)
- Cosmos DB (most requests)
- Key Vault
- Azure SQL Database

### Services WITHOUT Retry-After Header (Known Issues)

- **Azure Document Intelligence** (GitHub Issue #50904)
- **Azure Monitor Logs API** (use `Prefer: wait` header instead)
- Some Cognitive Services APIs

**Workaround for missing Retry-After**:

```python
def custom_retry_policy(response):
    if response.status_code == 429:
        if 'Retry-After' not in response.headers:
            # Fixed 60-second delay if header missing
            return 60
    return None

# Apply custom policy
```

---

## Error Handling Best Practices

### 1. Always Log Request IDs

```python
try:
    response = client.get_secret("secret-name")
except HttpResponseError as e:
    request_id = e.response.headers.get('x-ms-request-id')
    logger.error(f"Failed to get secret. Request ID: {request_id}")
    # Include request ID in support tickets
```

### 2. Classify Errors (Transient vs Permanent)

**Transient** (retry):

- HTTP 408 (Request Timeout)
- HTTP 429 (Too Many Requests)
- HTTP 500 (Internal Server Error)
- HTTP 502 (Bad Gateway)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)

**Permanent** (do NOT retry):

- HTTP 400 (Bad Request)
- HTTP 401 (Unauthorized)
- HTTP 403 (Forbidden)
- HTTP 404 (Not Found)
- HTTP 409 (Conflict)

### 3. Implement Circuit Breaker

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open

    def call(self, func, *args, **kwargs):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "half-open"
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise

    def on_success(self):
        self.failure_count = 0
        self.state = "closed"

    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

# Usage
breaker = CircuitBreaker()
response = breaker.call(client.get_secret, "secret-name")
```

### 4. Add Jitter to Prevent Retry Storms

```python
import random

def exponential_backoff_with_jitter(retry_count, base_delay=1, max_delay=60):
    delay = min(base_delay * (2 ** retry_count), max_delay)
    jitter = random.uniform(0, delay * 0.1)  # 10% jitter
    return delay + jitter

# Usage
for retry in range(max_retries):
    try:
        response = client.get_secret("secret-name")
        break
    except HttpResponseError as e:
        if e.status_code in [408, 429, 500, 502, 503, 504]:
            delay = exponential_backoff_with_jitter(retry)
            time.sleep(delay)
        else:
            raise
```

### 5. Calculate Total Retry Time

```python
def calculate_total_retry_time(max_retries, base_delay, max_delay):
    total = 0
    for retry in range(max_retries):
        delay = min(base_delay * (2 ** retry), max_delay)
        total += delay
    return total

# Example: 10 retries, 1s base, 60s max
# Total: ~10 minutes
# Ensure upstream timeout > 10 minutes to avoid cascading failures
```

---

## Service-Specific Timeout Constraints

| Service                | Fixed Timeout           | Configurable Timeout    | Max Timeout       |
| ---------------------- | ----------------------- | ----------------------- | ----------------- |
| App Service            | 230 seconds (FIXED)     | No                      | 230s              |
| Azure Functions        | 5 minutes (Consumption) | Yes (Premium/Dedicated) | 10m-unlimited     |
| Cosmos DB              | No fixed limit          | Yes                     | Service-dependent |
| Storage Blobs          | No fixed limit          | Yes                     | Client-dependent  |
| Azure Monitor Logs API | 3 minutes (default)     | Yes (via Prefer header) | 10 minutes        |
| Key Vault              | 30 seconds (default)    | Yes                     | Client-dependent  |

**App Service Workaround** (230s limit):

```python
# Use async processing for long operations
# 1. Return 202 Accepted immediately
# 2. Process in background (Azure Function, Service Bus)
# 3. Client polls for status

@app.route('/long-operation', methods=['POST'])
def start_operation():
    job_id = queue.enqueue(long_running_task, data)
    return jsonify({"job_id": job_id}), 202

@app.route('/status/<job_id>')
def check_status(job_id):
    status = queue.get_status(job_id)
    return jsonify(status)
```

---

## Monitoring and Observability

### Application Insights Error Tracking

```python
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    connection_string="InstrumentationKey=..."
)

try:
    response = client.get_secret("secret-name")
except Exception as e:
    # Automatically tracked by Application Insights
    logger.exception("Failed to get secret")
    raise
```

### Custom Metrics for Retry Analysis

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import metrics

meter = metrics.get_meter(__name__)
retry_counter = meter.create_counter(
    name="azure_sdk_retries",
    description="Number of SDK operation retries",
    unit="1"
)

# Track retries
for retry in range(max_retries):
    try:
        response = client.get_secret("secret-name")
        break
    except HttpResponseError as e:
        retry_counter.add(1, {
            "service": "key_vault",
            "status_code": str(e.status_code),
            "operation": "get_secret"
        })
        time.sleep(exponential_backoff(retry))
```

---

## Related Documentation

- [SDK Patterns](sdk-patterns.md) - Service-specific SDK usage
- [Monitoring](monitoring.md) - Application Insights integration
- [Authentication](authentication.md) - Authentication error handling
