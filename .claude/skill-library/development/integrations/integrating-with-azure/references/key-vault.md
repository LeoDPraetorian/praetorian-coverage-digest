# Azure Key Vault Integration

Complete guide to Azure Key Vault integration with RBAC, managed identities, and production best practices.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md` (Authentication & Security findings)

---

## RBAC vs Access Policies (CRITICAL MIGRATION)

### RBAC (Recommended - Default for New Vaults)

**Benefits**:

- Integrated with Privileged Identity Management (PIM)
- Consistent permission model across Azure
- Supports deny assignments and conditions
- Required for compliance (SOC 2, ISO 27001, FedRAMP)
- Fine-grained scope control

**Enable RBAC**:

```bash
az keyvault update \
  --resource-group myResourceGroup \
  --name myKeyVault \
  --enable-rbac-authorization true
```

**⚠️ CRITICAL**: Vault can only use ONE permission model (RBAC OR access policies, not both)

### Access Policies (Legacy - Deprecated)

**Limitations**:

- No PIM support (cannot use just-in-time access)
- Vulnerabilities in permission inheritance
- Coarse-grained permissions
- Scheduled for deprecation (no official sunset date yet)

**Migration Required**: Migrate to RBAC before legacy support ends.

---

## RBAC Roles for Key Vault

### Built-in Roles

| Role                          | Permissions                               | Use For                           |
| ----------------------------- | ----------------------------------------- | --------------------------------- |
| **Key Vault Administrator**   | Full control including role management    | Operators, automation (use PIM)   |
| **Key Vault Secrets Officer** | Create, read, update, delete secrets      | DevOps pipelines, secret rotation |
| **Key Vault Secrets User**    | Read secrets only                         | Applications (least privilege)    |
| **Key Vault Reader**          | Read vault properties (not secret values) | Monitoring, auditing              |

**Application Best Practice**: Assign `Key Vault Secrets User` role to application's managed identity.

### RBAC Assignment

```bash
# Get managed identity principal ID
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --resource-group myResourceGroup \
  --name myUserAssignedIdentity \
  --query principalId -o tsv)

# Assign Key Vault Secrets User role at vault scope
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.KeyVault/vaults/myKeyVault
```

**Scope Levels** (narrowest to broadest):

1. **Vault** - Assign at `/providers/Microsoft.KeyVault/vaults/myKeyVault` (recommended)
2. **Resource Group** - Grants access to ALL vaults in resource group
3. **Subscription** - Grants access to ALL vaults in subscription (avoid)

**Best Practice**: Assign at vault scope for least privilege.

---

## Vault-Per-Application-Per-Environment Pattern

**Architecture**:

```
Production:
- app1-prod-keyvault (app1 production secrets)
- app2-prod-keyvault (app2 production secrets)

Staging:
- app1-staging-keyvault
- app2-staging-keyvault

Development:
- app1-dev-keyvault
- app2-dev-keyvault
```

**Benefits**:

- **Separate blast radius**: Dev compromise doesn't affect prod
- **Different RBAC policies**: Developers have access to dev vaults only
- **Compliance requirement**: Production data isolation (GDPR, HIPAA)
- **Independent backup/DR**: Separate recovery policies per environment

**Alternative** (avoid): Single vault with secret prefixes like `prod-app1-database-password`

- ❌ Shared blast radius
- ❌ Complex RBAC (cannot scope to individual secrets)
- ❌ Compliance violations

---

## SDK Integration Patterns

### Go SDK with Managed Identity

```go
import (
    "github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "context"
)

func NewKeyVaultClient(vaultURL string) (*azsecrets.Client, error) {
    // Production: explicit managed identity client ID
    credential, err := azidentity.NewManagedIdentityCredential(&azidentity.ManagedIdentityCredentialOptions{
        ID: azidentity.ClientID(os.Getenv("MANAGED_IDENTITY_CLIENT_ID")),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to create credential: %w", err)
    }

    client, err := azsecrets.NewClient(vaultURL, credential, &azsecrets.ClientOptions{
        ClientOptions: azcore.ClientOptions{
            Retry: policy.RetryOptions{
                MaxRetries:    5,
                TryTimeout:    30 * time.Second,
                RetryDelay:    1 * time.Second,
                MaxRetryDelay: 60 * time.Second,
            },
        },
    })

    return client, err
}

// Get secret with error handling
func GetSecret(ctx context.Context, client *azsecrets.Client, secretName string) (string, error) {
    response, err := client.GetSecret(ctx, secretName, "", nil)
    if err != nil {
        var respErr *azcore.ResponseError
        if errors.As(err, &respErr) {
            if respErr.StatusCode == 404 {
                return "", fmt.Errorf("secret %s not found", secretName)
            }
            if respErr.StatusCode == 403 {
                return "", fmt.Errorf("access denied to secret %s (check RBAC)", secretName)
            }
            return "", fmt.Errorf("failed to get secret (status=%d, request_id=%s): %w",
                respErr.StatusCode,
                respErr.RawResponse.Header.Get("x-ms-request-id"),
                err)
        }
        return "", fmt.Errorf("failed to get secret: %w", err)
    }

    return *response.Value, nil
}

// Connection pooling (reuse client)
var (
    keyVaultClients = make(map[string]*azsecrets.Client)
    clientMutex     sync.RWMutex
)

func GetCachedClient(vaultURL string) (*azsecrets.Client, error) {
    clientMutex.RLock()
    client, exists := keyVaultClients[vaultURL]
    clientMutex.RUnlock()

    if exists {
        return client, nil
    }

    clientMutex.Lock()
    defer clientMutex.Unlock()

    // Double-check after acquiring write lock
    if client, exists := keyVaultClients[vaultURL]; exists {
        return client, nil
    }

    client, err := NewKeyVaultClient(vaultURL)
    if err != nil {
        return nil, err
    }

    keyVaultClients[vaultURL] = client
    return client, nil
}
```

### Python SDK with Connection Pooling

```python
from azure.identity import ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ResourceNotFoundError, HttpResponseError
import os

# Module-level client cache (singleton pattern)
_keyvault_clients: dict[str, SecretClient] = {}

def get_keyvault_client(vault_url: str) -> SecretClient:
    """Get cached Key Vault client (connection pooling)."""
    if vault_url not in _keyvault_clients:
        credential = ManagedIdentityCredential(
            client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
        )

        _keyvault_clients[vault_url] = SecretClient(
            vault_url=vault_url,
            credential=credential,
            retry_total=5,
            retry_backoff_factor=0.8
        )

    return _keyvault_clients[vault_url]

def get_secret(vault_url: str, secret_name: str) -> str:
    """Retrieve secret with error handling."""
    client = get_keyvault_client(vault_url)

    try:
        secret = client.get_secret(secret_name)
        return secret.value
    except ResourceNotFoundError:
        raise ValueError(f"Secret '{secret_name}' not found in vault '{vault_url}'")
    except HttpResponseError as e:
        if e.status_code == 403:
            raise PermissionError(
                f"Access denied to secret '{secret_name}'. "
                f"Check RBAC role assignment (need 'Key Vault Secrets User' role). "
                f"Request ID: {e.response.headers.get('x-ms-request-id')}"
            )
        raise RuntimeError(
            f"Failed to get secret '{secret_name}' (status={e.status_code}): {e.message}"
        )

# Async pattern for high-throughput
from azure.keyvault.secrets.aio import SecretClient as AsyncSecretClient

async def get_secret_async(vault_url: str, secret_name: str) -> str:
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    async with AsyncSecretClient(vault_url, credential) as client:
        secret = await client.get_secret(secret_name)
        return secret.value

# Batch secret retrieval
async def get_secrets_batch(vault_url: str, secret_names: list[str]) -> dict[str, str]:
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    async with AsyncSecretClient(vault_url, credential) as client:
        tasks = [client.get_secret(name) for name in secret_names]
        secrets = await asyncio.gather(*tasks)
        return {name: secret.value for name, secret in zip(secret_names, secrets)}
```

---

## Secret Versioning

### Automatic Versioning

Key Vault automatically creates new versions when secrets are updated:

```python
# Create/update secret (new version created)
client.set_secret("database-password", "new-password-value")

# Get latest version (default)
secret = client.get_secret("database-password")

# Get specific version
secret = client.get_secret("database-password", version="abc123def456")

# List all versions
versions = client.list_properties_of_secret_versions("database-password")
for version in versions:
    print(f"Version: {version.version}, Created: {version.created_on}")
```

### Zero-Downtime Secret Rotation

**Pattern**:

1. Create new secret version
2. Wait for propagation (5-10 minutes)
3. Application automatically picks up new version (if using latest)
4. Wait 48 hours (allow all instances to refresh)
5. Disable old version (soft delete)

```python
# Step 1: Set new secret value
new_secret = client.set_secret("database-password", generate_new_password())
print(f"New version: {new_secret.properties.version}")

# Step 2: Wait for propagation
time.sleep(600)  # 10 minutes

# Step 3-4: Application picks up new version automatically
# (wait 48 hours in production)

# Step 5: Disable old version after 48 hours
old_version_id = get_previous_version_id("database-password")
client.update_secret_properties(
    "database-password",
    version=old_version_id,
    enabled=False
)
```

---

## Secret Metadata and Tagging

```python
# Set secret with metadata
from datetime import datetime, timedelta

expiration_date = datetime.utcnow() + timedelta(days=90)

client.set_secret(
    "api-key",
    "secret-value",
    content_type="application/password",
    expires_on=expiration_date,
    tags={
        "environment": "production",
        "application": "myapp",
        "rotation-policy": "90-days"
    }
)

# Query secrets by tag
secrets = client.list_properties_of_secrets()
prod_secrets = [s for s in secrets if s.tags.get("environment") == "production"]
```

---

## Soft Delete and Purge Protection

**Soft Delete** (Recommended for Production):

- Deleted secrets retained for 90 days (recoverable)
- Prevents accidental data loss
- Required for compliance scenarios

**Purge Protection** (Recommended for Critical Vaults):

- Cannot purge deleted secrets until retention period expires
- Prevents malicious/accidental permanent deletion
- Cannot be disabled once enabled

**Enable on vault creation**:

```bash
az keyvault create \
  --resource-group myResourceGroup \
  --name myKeyVault \
  --enable-soft-delete true \
  --enable-purge-protection true \
  --retention-days 90
```

**Recover deleted secret**:

```python
# List deleted secrets
deleted_secrets = client.list_deleted_secrets()

# Recover deleted secret
client.begin_recover_deleted_secret("database-password").wait()

# Purge deleted secret (if purge protection not enabled)
client.purge_deleted_secret("database-password")
```

---

## Propagation Delays

**RBAC Assignment Propagation**:

- **Typical**: 5-10 minutes
- **Maximum observed**: 30 minutes
- **Regional variance**: Varies by Azure region

**Workaround**:

```python
import time

# After RBAC assignment, wait before testing
az role assignment create ...
time.sleep(600)  # 10 minutes

# Verify access
try:
    secret = client.get_secret("test-secret")
except HttpResponseError as e:
    if e.status_code == 403:
        print("RBAC not propagated yet, wait longer")
```

---

## Common Key Vault Issues

### Issue 1: 403 Forbidden Despite RBAC Assignment

**Causes**:

1. Vault using Access Policies (not RBAC)
2. Role assigned at wrong scope
3. Propagation delay (5-10 minutes)
4. Subscription Owner role doesn't grant data plane access

**Solutions**:

```bash
# Check vault permission model
az keyvault show \
  --name myKeyVault \
  --query "properties.enableRbacAuthorization"

# If false, enable RBAC
az keyvault update \
  --name myKeyVault \
  --enable-rbac-authorization true

# Verify role assignment
az role assignment list \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault

# Wait 10 minutes after assignment
```

### Issue 2: Secret Not Found (404)

**Causes**:

- Secret name typo
- Secret deleted (check soft-delete)
- Wrong vault URL

**Solutions**:

```python
# List all secrets to verify name
secrets = client.list_properties_of_secrets()
secret_names = [s.name for s in secrets]
print(f"Available secrets: {secret_names}")

# Check deleted secrets
deleted = client.list_deleted_secrets()
deleted_names = [s.name for s in deleted]
print(f"Deleted secrets: {deleted_names}")

# Verify vault URL
print(f"Vault URL: {client.vault_url}")
```

### Issue 3: Firewall Blocking Key Vault Access

**Causes**:

- Key Vault firewall enabled
- IP not whitelisted
- Virtual network restrictions

**Solutions**:

```bash
# Add IP to firewall whitelist
az keyvault network-rule add \
  --name myKeyVault \
  --ip-address "203.0.113.0/24"

# Add virtual network
az keyvault network-rule add \
  --name myKeyVault \
  --vnet-name myVNet \
  --subnet mySubnet

# Allow trusted Azure services (for App Service, Functions)
az keyvault update \
  --name myKeyVault \
  --bypass AzureServices
```

---

## Secret Rotation Automation

### Automated Rotation with Azure Logic Apps

**Trigger**: 30 days before secret expiration

**Workflow**:

```python
# Azure Logic App steps
# 1. Event Grid trigger (secret near expiration)
# 2. Azure Function generates new password
def generate_new_password():
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    password = ''.join(secrets.choice(alphabet) for _ in range(32))
    return password

# 3. Update Key Vault secret (creates new version)
new_password = generate_new_password()
client.set_secret("database-password", new_password)

# 4. Trigger application restart (pick up new secret)
# Azure App Service restart via API

# 5. Wait 48 hours (allow all instances to pick up new version)
time.sleep(48 * 3600)

# 6. Disable old version
old_version_id = get_previous_version_id("database-password")
client.update_secret_properties(
    "database-password",
    version=old_version_id,
    enabled=False
)

# 7. Send notification
send_notification("Secret rotation completed")
```

### Event Grid Integration

**Subscribe to Key Vault events**:

```bash
az eventgrid event-subscription create \
  --name secret-expiration-alert \
  --source-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault \
  --endpoint https://myfunction.azurewebsites.net/api/rotate-secret \
  --included-event-types Microsoft.KeyVault.SecretNearExpiry
```

**Event payload**:

```json
{
  "subject": "myKeyVault/secrets/database-password",
  "eventType": "Microsoft.KeyVault.SecretNearExpiry",
  "data": {
    "Id": "https://myKeyVault.vault.azure.net/secrets/database-password/abc123",
    "VaultName": "myKeyVault",
    "ObjectType": "Secret",
    "ObjectName": "database-password",
    "Version": "abc123",
    "ExpiresOn": "2026-04-01T00:00:00Z"
  }
}
```

---

## Compliance Requirements

### GDPR

- **Data sovereignty**: Key Vault regional replication
- **Access logging**: Azure Monitor tracks all secret access
- **Encryption**: Secrets encrypted at rest (FIPS 140-2 validated)

### SOC 2

- **Access control**: RBAC with least privilege
- **Audit trail**: Key Vault audit logs to Log Analytics
- **Quarterly reviews**: PIM access reviews for administrative roles

### PCI DSS

- **60-day rotation**: Secrets protecting payment card data
- **Network isolation**: Private endpoints for Key Vault
- **HSM-backed keys**: Premium tier for cardholder data encryption

### HIPAA

- **Encryption at rest**: Key Vault encryption for PHI
- **Access logging**: All PHI secret access logged
- **60-day rotation**: Secrets accessing PHI databases

### ISO 27001

- **Access control**: RBAC policies enforced
- **Incident response**: Azure Security Center alerts
- **Cryptographic controls**: HSM-backed keys (Premium tier)

---

## Best Practices

1. **Use RBAC** (not access policies) - required for PIM and compliance
2. **Vault-per-application-per-environment** - separate blast radius
3. **Assign least privilege** - `Key Vault Secrets User` for applications (not Officer/Admin)
4. **Enable soft delete** - 90-day retention for recovery
5. **Enable purge protection** - prevents permanent deletion
6. **Use managed identities** - no credentials in code
7. **Connection pooling** - reuse SecretClient instances
8. **Monitor secret access** - send audit logs to Log Analytics
9. **Automate rotation** - 90-day maximum (60 for compliance)
10. **Use secret versioning** - zero-downtime rotation
11. **Tag secrets** - environment, application, rotation policy
12. **Private endpoints** - eliminate public internet exposure for production

---

## Related Documentation

- [Authentication](authentication.md) - Managed identity and credential patterns
- [Security Patterns](security-patterns.md) - IAM/RBAC configuration
- [Error Handling](error-handling.md) - SDK error handling and retry policies
- [Monitoring](monitoring.md) - Audit logging and alerting
