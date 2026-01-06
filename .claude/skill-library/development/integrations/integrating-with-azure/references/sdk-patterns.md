# Azure SDK Service-Specific Patterns

Production-ready patterns for Azure service SDKs across Go, Python, and TypeScript.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`

---

## Universal SDK Architecture

All Azure SDKs (track 2) share common patterns:

- **HTTP Pipeline**: Transport + Policies (retry, auth, logging, telemetry)
- **Context-First**: All I/O operations accept context/cancellation tokens as first parameter
- **Credential Chain**: Consistent authentication across services
- **Built-in Retry**: Exponential backoff with jitter
- **OpenTelemetry**: Automatic distributed tracing

---

## Storage Blobs

### Go SDK

```go
import (
    "context"
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
    "time"
)

// Initialize client with production retry settings
func NewBlobClient() (*azblob.Client, error) {
    credential, err := azidentity.NewManagedIdentityCredential(&azidentity.ManagedIdentityCredentialOptions{
        ID: azidentity.ClientID(os.Getenv("MANAGED_IDENTITY_CLIENT_ID")),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to create credential: %w", err)
    }

    accountURL := fmt.Sprintf("https://%s.blob.core.windows.net", os.Getenv("STORAGE_ACCOUNT_NAME"))

    client, err := azblob.NewClient(accountURL, credential, &azblob.ClientOptions{
        ClientOptions: azcore.ClientOptions{
            Retry: policy.RetryOptions{
                MaxRetries:    10,
                TryTimeout:    15 * time.Minute,
                RetryDelay:    1 * time.Second,
                MaxRetryDelay: 60 * time.Second,
                StatusCodes:   []int{408, 429, 500, 502, 503, 504},
            },
        },
    })

    return client, err
}

// Upload with context and error handling
func UploadBlob(ctx context.Context, client *azblob.Client, data []byte) error {
    containerClient := client.ServiceClient().NewContainerClient("mycontainer")
    blobClient := containerClient.NewBlockBlobClient("myblob")

    _, err := blobClient.Upload(ctx, bytes.NewReader(data), &azblob.UploadBlockBlobOptions{
        HTTPHeaders: &azblob.BlobHTTPHeaders{
            BlobContentType: to.Ptr("application/octet-stream"),
        },
    })

    if err != nil {
        var respErr *azcore.ResponseError
        if errors.As(err, &respErr) {
            return fmt.Errorf("upload failed (status=%d, request_id=%s): %w",
                respErr.StatusCode,
                respErr.RawResponse.Header.Get("x-ms-request-id"),
                err)
        }
        return fmt.Errorf("upload failed: %w", err)
    }

    return nil
}
```

### Python SDK

```python
from azure.identity import ManagedIdentityCredential
from azure.storage.blob import BlobServiceClient, BlobClient
from azure.core.exceptions import HttpResponseError
import os

# Initialize client with production settings
def create_blob_client() -> BlobServiceClient:
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    account_url = f"https://{os.environ['STORAGE_ACCOUNT_NAME']}.blob.core.windows.net"

    return BlobServiceClient(
        account_url=account_url,
        credential=credential,
        retry_total=10,
        retry_backoff_factor=0.8,
        retry_backoff_max=60
    )

# Upload with error handling
def upload_blob(container_name: str, blob_name: str, data: bytes):
    client = create_blob_client()
    blob_client = client.get_blob_client(container=container_name, blob=blob_name)

    try:
        blob_client.upload_blob(data, overwrite=True)
    except HttpResponseError as e:
        request_id = e.response.headers.get('x-ms-request-id')
        raise Exception(f"Upload failed (status={e.status_code}, request_id={request_id}): {e.message}")

# Async pattern for high-throughput
from azure.storage.blob.aio import BlobServiceClient as AsyncBlobServiceClient

async def upload_blob_async(container_name: str, blob_name: str, data: bytes):
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    account_url = f"https://{os.environ['STORAGE_ACCOUNT_NAME']}.blob.core.windows.net"

    async with AsyncBlobServiceClient(account_url, credential=credential) as client:
        blob_client = client.get_blob_client(container=container_name, blob=blob_name)
        await blob_client.upload_blob(data, overwrite=True)
```

### TypeScript SDK

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { ManagedIdentityCredential } from "@azure/identity";

// Initialize client with production settings
function createBlobClient(): BlobServiceClient {
  const credential = new ManagedIdentityCredential({
    clientId: process.env.MANAGED_IDENTITY_CLIENT_ID,
  });

  const accountName = process.env.STORAGE_ACCOUNT_NAME;
  const accountUrl = `https://${accountName}.blob.core.windows.net`;

  return new BlobServiceClient(accountUrl, credential, {
    retryOptions: {
      maxRetries: 10,
      retryDelayInMs: 1000,
      maxRetryDelayInMs: 60000,
    },
  });
}

// Upload with error handling
async function uploadBlob(containerName: string, blobName: string, data: Buffer): Promise<void> {
  const client = createBlobClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blobClient.upload(data, data.length);
  } catch (error) {
    if (error instanceof RestError) {
      const requestId = error.request?.headers.get("x-ms-request-id");
      throw new Error(
        `Upload failed (status=${error.statusCode}, request_id=${requestId}): ${error.message}`
      );
    }
    throw error;
  }
}
```

---

## Key Vault Secrets

### Go SDK

```go
import (
    "github.com/Azure/azure-sdk-for-go/sdk/keyvault/azsecrets"
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
)

func NewKeyVaultClient(vaultURL string) (*azsecrets.Client, error) {
    credential, err := azidentity.NewManagedIdentityCredential(&azidentity.ManagedIdentityCredentialOptions{
        ID: azidentity.ClientID(os.Getenv("MANAGED_IDENTITY_CLIENT_ID")),
    })
    if err != nil {
        return nil, err
    }

    return azsecrets.NewClient(vaultURL, credential, nil)
}

func GetSecret(ctx context.Context, client *azsecrets.Client, secretName string) (string, error) {
    // Get latest version (pass empty string for version)
    response, err := client.GetSecret(ctx, secretName, "", nil)
    if err != nil {
        return "", fmt.Errorf("failed to get secret %s: %w", secretName, err)
    }

    return *response.Value, nil
}
```

### Python SDK

```python
from azure.identity import ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ResourceNotFoundError
import os

def create_keyvault_client(vault_url: str) -> SecretClient:
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    return SecretClient(vault_url=vault_url, credential=credential)

def get_secret(vault_url: str, secret_name: str) -> str:
    client = create_keyvault_client(vault_url)

    try:
        secret = client.get_secret(secret_name)
        return secret.value
    except ResourceNotFoundError:
        raise ValueError(f"Secret '{secret_name}' not found in vault")

# Connection pooling (reuse client)
_keyvault_clients = {}

def get_cached_secret(vault_url: str, secret_name: str) -> str:
    if vault_url not in _keyvault_clients:
        _keyvault_clients[vault_url] = create_keyvault_client(vault_url)

    client = _keyvault_clients[vault_url]
    secret = client.get_secret(secret_name)
    return secret.value
```

### TypeScript SDK

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { ManagedIdentityCredential } from "@azure/identity";

function createKeyVaultClient(vaultUrl: string): SecretClient {
  const credential = new ManagedIdentityCredential({
    clientId: process.env.MANAGED_IDENTITY_CLIENT_ID,
  });

  return new SecretClient(vaultUrl, credential);
}

async function getSecret(vaultUrl: string, secretName: string): Promise<string> {
  const client = createKeyVaultClient(vaultUrl);

  try {
    const secret = await client.getSecret(secretName);
    return secret.value!;
  } catch (error) {
    if (error.statusCode === 404) {
      throw new Error(`Secret '${secretName}' not found in vault`);
    }
    throw error;
  }
}

// Connection pooling (singleton pattern)
const keyVaultClients = new Map<string, SecretClient>();

export async function getCachedSecret(vaultUrl: string, secretName: string): Promise<string> {
  if (!keyVaultClients.has(vaultUrl)) {
    keyVaultClients.set(vaultUrl, createKeyVaultClient(vaultUrl));
  }

  const client = keyVaultClients.get(vaultUrl)!;
  const secret = await client.getSecret(secretName);
  return secret.value!;
}
```

---

## Cosmos DB

### Go SDK

```go
import (
    "github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
)

func NewCosmosClient(endpoint string) (*azcosmos.Client, error) {
    credential, err := azidentity.NewManagedIdentityCredential(&azidentity.ManagedIdentityCredentialOptions{
        ID: azidentity.ClientID(os.Getenv("MANAGED_IDENTITY_CLIENT_ID")),
    })
    if err != nil {
        return nil, err
    }

    // Production retry settings for Cosmos DB (rate-limited service)
    return azcosmos.NewClient(endpoint, credential, &azcosmos.ClientOptions{
        ClientOptions: azcore.ClientOptions{
            Retry: policy.RetryOptions{
                MaxRetries:    10,  // Higher for rate-limited service
                TryTimeout:    60 * time.Second,
                RetryDelay:    4 * time.Second,
                MaxRetryDelay: 60 * time.Second,
            },
        },
    })
}

func QueryItems(ctx context.Context, client *azcosmos.Client, databaseName, containerName string) ([]map[string]interface{}, error) {
    container, err := client.NewContainer(databaseName, containerName)
    if err != nil {
        return nil, err
    }

    query := "SELECT * FROM c WHERE c.status = 'active'"
    pager := container.NewQueryItemsPager(query, azcosmos.PartitionKey{}, nil)

    var items []map[string]interface{}

    for pager.More() {
        response, err := pager.NextPage(ctx)
        if err != nil {
            return nil, fmt.Errorf("query failed: %w", err)
        }

        for _, item := range response.Items {
            var doc map[string]interface{}
            if err := json.Unmarshal(item, &doc); err != nil {
                return nil, err
            }
            items = append(items, doc)
        }
    }

    return items, nil
}
```

### Python SDK

```python
from azure.cosmos import CosmosClient, PartitionKey
from azure.identity import ManagedIdentityCredential
import os

def create_cosmos_client(endpoint: str) -> CosmosClient:
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    # Production retry settings (Cosmos DB is rate-limited)
    return CosmosClient(
        url=endpoint,
        credential=credential,
        retry_total=10,
        retry_backoff_factor=0.8
    )

def query_items(endpoint: str, database_name: str, container_name: str):
    client = create_cosmos_client(endpoint)
    database = client.get_database_client(database_name)
    container = database.get_container_client(container_name)

    query = "SELECT * FROM c WHERE c.status = 'active'"

    items = list(container.query_items(
        query=query,
        enable_cross_partition_query=True
    ))

    return items

# Batch operations (reduce RU consumption)
def batch_upsert(endpoint: str, database_name: str, container_name: str, items: list):
    client = create_cosmos_client(endpoint)
    database = client.get_database_client(database_name)
    container = database.get_container_client(container_name)

    # Group by partition key
    batches = {}
    for item in items:
        pk = item['partitionKey']
        if pk not in batches:
            batches[pk] = []
        batches[pk].append(item)

    # Execute batches
    for pk, batch_items in batches.items():
        # Cosmos DB batch size limit: 100 items or 2MB
        for i in range(0, len(batch_items), 100):
            chunk = batch_items[i:i+100]
            # Use transactional batch
            container.execute_item_batch(chunk, partition_key=pk)
```

---

## Azure Service Bus

### TypeScript SDK (Production Pattern)

```typescript
import { ServiceBusClient, ServiceBusReceiver } from "@azure/service-bus";
import { ManagedIdentityCredential } from "@azure/identity";

function createServiceBusClient(namespace: string): ServiceBusClient {
  const credential = new ManagedIdentityCredential({
    clientId: process.env.MANAGED_IDENTITY_CLIENT_ID,
  });

  const fullyQualifiedNamespace = `${namespace}.servicebus.windows.net`;

  return new ServiceBusClient(fullyQualifiedNamespace, credential, {
    retryOptions: {
      maxRetries: 10,
      retryDelayInMs: 1000,
      maxRetryDelayInMs: 60000,
    },
  });
}

// Send message
async function sendMessage(namespace: string, queueName: string, message: any) {
  const client = createServiceBusClient(namespace);
  const sender = client.createSender(queueName);

  try {
    await sender.sendMessages({
      body: message,
      contentType: "application/json",
    });
  } finally {
    await sender.close();
    await client.close();
  }
}

// Receive messages (long-running listener)
async function receiveMessages(namespace: string, queueName: string) {
  const client = createServiceBusClient(namespace);
  const receiver = client.createReceiver(queueName, {
    receiveMode: "peekLock", // Ensures at-least-once delivery
  });

  const messageHandler = async (messageReceived) => {
    console.log(`Received: ${messageReceived.body}`);

    try {
      // Process message
      await processMessage(messageReceived.body);

      // Complete message (remove from queue)
      await receiver.completeMessage(messageReceived);
    } catch (error) {
      console.error(`Processing failed: ${error}`);

      // Abandon message (return to queue for retry)
      // Lock will expire and message becomes available again
      await receiver.abandonMessage(messageReceived);
    }
  };

  const errorHandler = async (error) => {
    console.error(`Error: ${error}`);
  };

  receiver.subscribe({
    processMessage: messageHandler,
    processError: errorHandler,
  });

  // Keep receiver running
  // Call receiver.close() and client.close() on shutdown
}
```

---

## SDK Client Lifecycle Best Practices

### 1. Client Reuse (Connection Pooling)

**❌ WRONG** (creates new connection per request):

```python
def get_secret(secret_name):
    # Creates new HTTP connection every time
    client = SecretClient(vault_url, credential)
    return client.get_secret(secret_name).value
```

**✅ CORRECT** (reuses client):

```python
# Module-level client (singleton)
_keyvault_client = SecretClient(vault_url, credential)

def get_secret(secret_name):
    # Reuses existing HTTP connection
    return _keyvault_client.get_secret(secret_name).value
```

### 2. Context/Cancellation Token Management

**Go**:

```go
// Set reasonable timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Pass to SDK operation
secret, err := client.GetSecret(ctx, "secret-name", "", nil)
```

**Python (async)**:

```python
import asyncio

async def fetch_with_timeout():
    try:
        # Set timeout via asyncio
        async with asyncio.timeout(30):
            secret = await client.get_secret("secret-name")
    except asyncio.TimeoutError:
        print("Operation timed out")
```

### 3. Error Context Enrichment

```python
try:
    secret = client.get_secret("database-password")
except HttpResponseError as e:
    # Add context to error
    raise RuntimeError(
        f"Failed to retrieve secret 'database-password' from vault '{vault_url}'. "
        f"Status: {e.status_code}, Request ID: {e.response.headers.get('x-ms-request-id')}"
    ) from e
```

---

## Performance Optimization

### 1. Batch Operations

**Cosmos DB** - Reduce RU consumption:

```python
# Group operations by partition key
# Execute in transactional batches (max 100 items per batch)
```

**Storage Blobs** - Parallel uploads:

```python
from concurrent.futures import ThreadPoolExecutor

def upload_blobs_parallel(blobs: list):
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(upload_blob, blob) for blob in blobs]
        results = [f.result() for f in futures]
    return results
```

### 2. Async/Await for High Throughput

**Python**:

```python
import asyncio
from azure.storage.blob.aio import BlobServiceClient

async def upload_many_blobs(blobs: list):
    async with BlobServiceClient(account_url, credential) as client:
        tasks = [upload_blob_async(client, blob) for blob in blobs]
        await asyncio.gather(*tasks)
```

### 3. Connection Pool Configuration

**Python** (increase connection pool for high throughput):

```python
import aiohttp

# Custom connection pool
connector = aiohttp.TCPConnector(limit=100)  # Default: 100
async with aiohttp.ClientSession(connector=connector) as session:
    # Use session with Azure SDK
    pass
```

---

## Related Documentation

- [Error Handling](error-handling.md) - Retry policies and error handling
- [Authentication](authentication.md) - Credential patterns
- [Monitoring](monitoring.md) - Application Insights integration
