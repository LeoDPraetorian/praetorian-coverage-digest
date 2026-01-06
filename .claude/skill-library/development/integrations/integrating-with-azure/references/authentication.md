# Azure Authentication Patterns

Complete guide to Azure authentication patterns, credential chains, and production best practices.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`

---

## DefaultAzureCredential Chain (Development)

**⚠️ DEVELOPMENT ONLY** - Do not use in production

### Complete 10-Step Chain

`DefaultAzureCredential` attempts authentication methods in this order:

1. **EnvironmentCredential**
   - Environment variables: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
   - Or: `AZURE_CLIENT_CERTIFICATE_PATH` for certificate-based
   - Use for: CI/CD pipelines, Docker containers

2. **WorkloadIdentityCredential**
   - Azure Kubernetes Service federated token
   - Token file: `/var/run/secrets/azure/tokens/azure-identity-token`
   - Use for: AKS pods with workload identity enabled

3. **ManagedIdentityCredential**
   - Azure Instance Metadata Service (IMDS) endpoint: `http://169.254.169.254`
   - Use for: Azure VMs, App Service, Functions, AKS, Container Instances

4. **SharedTokenCacheCredential** (Visual Studio)
   - Windows only
   - Token cache: `%LOCALAPPDATA%\.IdentityService`
   - Use for: Local development with Visual Studio

5. **VisualStudioCodeCredential**
   - Azure Account extension token
   - Token location: VS Code extension storage
   - Use for: Local development with VS Code

6. **AzureCliCredential**
   - `az login` token cache
   - Token location: `~/.azure/`
   - Use for: Local development, scripts

7. **AzurePowerShellCredential**
   - `Connect-AzAccount` token
   - Use for: PowerShell scripts

8. **AzureDeveloperCliCredential**
   - `azd auth login` token
   - Use for: Azure Developer CLI workflows

9. **InteractiveBrowserCredential**
   - OAuth browser flow (opens browser window)
   - Use for: Interactive local development

10. **AzureCliBrokerCredential**
    - Windows Account Manager integration
    - Windows only
    - Use for: Enterprise SSO scenarios

### Why Not Production?

**Performance Overhead**:

- 2-5 seconds added to first request
- Each failed method adds ~500ms latency
- IMDS timeout: 1 second per attempt

**Unpredictability**:

- Intermittent failures when one method fails
- Non-deterministic behavior (which method succeeds?)
- Difficult debugging (no clear indication of auth method used)

**Security Concerns**:

- Overly permissive (tries too many methods)
- May expose credentials via multiple channels
- No audit trail of which method succeeded

### Development Example

```go
// Go
import "github.com/Azure/azure-sdk-for-go/sdk/azidentity"

cred, err := azidentity.NewDefaultAzureCredential(nil)
if err != nil {
    return fmt.Errorf("failed to create credential: %w", err)
}
```

```python
# Python
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
```

```typescript
// TypeScript
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
```

---

## Managed Identity (Production - REQUIRED)

**Recommended for ALL Azure-hosted applications.**

### Benefits

- **No credential storage**: Eliminates 90% of credential management overhead
- **Automatic token rotation**: Azure refreshes tokens every 24 hours
- **Least privilege**: RBAC controls access per resource
- **No MFA bypass**: Cannot be used without MFA (unlike service principals with secrets)
- **Audit trail**: Azure AD sign-in logs track all authentication

### Types

#### User-Assigned Managed Identity (Recommended)

**Characteristics**:

- Independent lifecycle (not tied to resource)
- Portable across multiple resources
- Survives resource deletion
- Supports blue-green deployments

**When to use**:

- Multiple resources need same permissions
- Blue-green or canary deployments
- Disaster recovery scenarios
- Cross-region failover

**Setup**:

```bash
# Create user-assigned identity
az identity create \
  --resource-group myResourceGroup \
  --name myUserAssignedIdentity

# Get client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --resource-group myResourceGroup \
  --name myUserAssignedIdentity \
  --query clientId -o tsv)

# Assign to resource
az webapp identity assign \
  --resource-group myResourceGroup \
  --name myWebApp \
  --identities /subscriptions/{subscription-id}/resourcegroups/myResourceGroup/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myUserAssignedIdentity
```

#### System-Assigned Managed Identity

**Characteristics**:

- Tied to resource lifecycle (deleted with resource)
- One identity per resource
- Simpler setup (no separate identity resource)

**When to use**:

- Single resource needs permissions
- Short-lived resources (dev/test environments)
- Simple scenarios without cross-resource needs

**Setup**:

```bash
# Enable system-assigned identity
az webapp identity assign \
  --resource-group myResourceGroup \
  --name myWebApp
```

### Production Example

**Go**:

```go
import "github.com/Azure/azure-sdk-for-go/sdk/azidentity"

// Explicit client ID for predictability
cred, err := azidentity.NewManagedIdentityCredential(&azidentity.ManagedIdentityCredentialOptions{
    ID: azidentity.ClientID("<user-assigned-identity-client-id>"),
})
if err != nil {
    return fmt.Errorf("failed to create credential: %w", err)
}
```

**Python**:

```python
from azure.identity import ManagedIdentityCredential

# Explicit client ID for predictability
credential = ManagedIdentityCredential(
    client_id="<user-assigned-identity-client-id>"
)
```

**TypeScript**:

```typescript
import { ManagedIdentityCredential } from "@azure/identity";

// Explicit client ID for predictability
const credential = new ManagedIdentityCredential({
  clientId: "<user-assigned-identity-client-id>",
});
```

### Propagation Delays

**After enabling managed identity**:

- IMDS endpoint availability: 2-5 minutes
- Token acquisition: Immediate once IMDS is ready
- **Best practice**: Add explicit wait or retry logic after enabling

**After RBAC assignment**:

- Propagation delay: 5-10 minutes (sometimes up to 30 minutes)
- Regional differences: Varies by Azure region
- **Best practice**: Add 10-minute wait in deployment automation

### Troubleshooting

**Identity Not Found**:

```bash
# Verify identity is assigned to resource
az webapp identity show \
  --resource-group myResourceGroup \
  --name myWebApp

# Check IMDS endpoint (from within Azure VM/App Service)
curl -H "Metadata:true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"
```

**403 Forbidden Despite Identity**:

- Check RBAC role assignments (may not have propagated yet)
- Verify role scope (resource vs resource group vs subscription)
- Wait 10 minutes and retry

---

## Service Principal (Non-Azure Environments)

**⚠️ CRITICAL VULNERABILITY**: `az ad sp create-for-rbac` has a security flaw (GitHub Issue #32299)

### Security Hierarchy (Best to Worst)

1. **Federated Credentials** (Highest Security)
   - No stored secrets
   - Short-lived tokens (1 hour max)
   - OIDC-based trust
   - Use for: GitHub Actions, AWS, GCP integration

2. **Certificate-Based** (Medium-High Security)
   - Tamper-resistant
   - Expiration dates enforced
   - HSM storage available (Key Vault)
   - Use for: Enterprise on-premises, long-lived services

3. **Client Secrets** (Lowest Security - Avoid)
   - Stored in plaintext in Azure AD
   - No MFA enforcement
   - Manual rotation required
   - High risk of exposure

### Federated Credentials (Recommended for Multi-Cloud)

**Setup for GitHub Actions**:

```bash
# Create app registration
az ad app create --display-name "myapp-github-actions"
APP_ID=$(az ad app show --id $(az ad app list --display-name "myapp-github-actions" --query [0].appId -o tsv) --query appId -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Configure federation with GitHub
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-federation",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:my-org/my-repo:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Assign RBAC role
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/{subscription-id}
```

**GitHub Actions Workflow**:

```yaml
- name: Azure Login
  uses: azure/login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Certificate-Based (Recommended for On-Premises)

```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout private.key -out cert.pem -days 365 -nodes

# Create app registration
az ad app create --display-name "myapp-onpremise"
APP_ID=$(az ad app show --id $(az ad app list --display-name "myapp-onpremise" --query [0].appId -o tsv) --query appId -o tsv)

# Upload certificate
az ad app credential reset \
  --id $APP_ID \
  --cert @cert.pem \
  --append

# Create service principal
az ad sp create --id $APP_ID
```

**Application Usage**:

```python
from azure.identity import CertificateCredential

credential = CertificateCredential(
    tenant_id="<tenant-id>",
    client_id="<client-id>",
    certificate_path="/path/to/cert.pem"
)
```

### Client Secrets (Last Resort Only)

**⚠️ SAFER ALTERNATIVE to `az ad sp create-for-rbac`**:

```bash
# Create app registration
az ad app create --display-name "myapp-legacy"
APP_ID=$(az ad app show --id $(az ad app list --display-name "myapp-legacy" --query [0].appId -o tsv) --query appId -o tsv)

# Create service principal
SP_ID=$(az ad sp create --id $APP_ID --query id -o tsv)

# Create client secret
SECRET=$(az ad app credential reset --id $APP_ID --query password -o tsv)

# Assign RBAC role
az role assignment create \
  --assignee $SP_ID \
  --role Contributor \
  --scope /subscriptions/{subscription-id}/resourceGroups/myResourceGroup
```

**Why NOT `az ad sp create-for-rbac`?**

- Looks up by display name (not unique)
- Can destroy existing credentials
- May assign RBAC to wrong identity
- Use explicit app creation instead

### Credential Rotation

**Requirements**:

- **Standard**: 90 days maximum
- **PCI DSS**: 60 days for payment card data access
- **HIPAA**: 60 days for PHI access
- **SOC 2**: 90 days with automated rotation

**Automated Rotation Pattern**:

```bash
# Azure Logic App trigger: 30 days before expiration
# Step 1: Generate new secret
NEW_SECRET=$(az ad app credential reset --id $APP_ID --append --query password -o tsv)

# Step 2: Store in Key Vault with version
az keyvault secret set \
  --vault-name myKeyVault \
  --name "app-client-secret" \
  --value $NEW_SECRET

# Step 3: Wait 48 hours (allow all instances to pick up new secret)

# Step 4: Remove old secret
az ad app credential delete \
  --id $APP_ID \
  --key-id <old-key-id>
```

---

## Environment-Specific Configuration

### Local Development

**Tools**: Azure CLI, VS Code, Visual Studio
**Credential**: `DefaultAzureCredential` (acceptable for dev)
**Setup**:

```bash
az login
az account set --subscription <subscription-id>
```

### CI/CD Pipelines

**Preferred**: Federated credentials (GitHub Actions, Azure DevOps)
**Fallback**: Service principal with environment variables

**GitHub Actions Example**:

```yaml
env:
  AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Staging/Production (Azure-Hosted)

**Required**: `ManagedIdentityCredential` with explicit client ID
**Never**: `DefaultAzureCredential`

```python
from azure.identity import ManagedIdentityCredential

credential = ManagedIdentityCredential(
    client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
)
```

---

## Common Authentication Failures

### Issue 1: `AADSTS7000215: Invalid client secret`

**Causes**:

- Using secret ID instead of secret value
- Secret expired
- Clock skew > 5 minutes

**Solutions**:

- Copy secret value immediately when created (cannot retrieve later)
- Check secret expiration: `az ad app credential list --id $APP_ID`
- Sync NTP time on servers

### Issue 2: `ClientAuthenticationError: managed identity not found`

**Causes**:

- Managed identity not enabled on resource
- IMDS endpoint not available (propagation delay)
- Wrong client ID specified

**Solutions**:

- Verify identity assigned: `az webapp identity show`
- Wait 5 minutes after enabling identity
- Check client ID matches identity

### Issue 3: Context Deadline Exceeded

**Causes**:

- Token acquisition timeout too short
- Network connectivity issues
- IMDS endpoint slow to respond

**Solutions**:

- Increase acquisition timeout to 30 seconds
- Check network connectivity to IMDS endpoint
- Add retry logic with exponential backoff

---

## Best Practices

1. **Use explicit credentials in production** (never `DefaultAzureCredential`)
2. **Prefer managed identities** over service principals
3. **Use federated credentials** for multi-cloud scenarios
4. **Rotate service principal secrets** every 90 days (60 for compliance)
5. **Log authentication events** to Azure Monitor
6. **Add retry logic** for transient auth failures
7. **Cache tokens** (SDKs handle this automatically)
8. **Monitor token expiration** and refresh proactively

---

## Related Documentation

- [Managed Identity Setup](managed-identity.md) - Detailed managed identity configuration
- [Service Principal Configuration](service-principal.md) - Service principal best practices
- [Key Vault Integration](key-vault.md) - Key Vault authentication patterns
- [Security Patterns](security-patterns.md) - IAM and RBAC configuration
