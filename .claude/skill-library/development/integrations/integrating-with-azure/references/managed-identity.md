# Azure Managed Identity Setup and Configuration

Detailed guide for configuring managed identities, the preferred authentication method for Azure workloads.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`

---

## Overview

Managed identities eliminate credential management for Azure-hosted applications by providing an automatically managed identity in Azure AD.

**Benefits**:

- No credentials in code/configuration
- Automatic token rotation (every 24 hours)
- No MFA bypass concerns
- Eliminates 90% of credential management overhead
- Complete audit trail

---

## Types

### User-Assigned Managed Identity (Recommended)

**Characteristics**:

- Independent Azure resource
- Shared across multiple resources
- Survives resource deletion
- Supports blue-green deployments
- Portable across regions

**When to use**:

- Multiple resources need same permissions
- Blue-green or canary deployments
- Disaster recovery scenarios
- Want identity to persist after resource deletion

**Creation**:

```bash
az identity create \
  --resource-group myResourceGroup \
  --name myapp-identity

# Get client ID and principal ID
az identity show \
  --resource-group myResourceGroup \
  --name myapp-identity \
  --query "{clientId:clientId, principalId:principalId}"
```

### System-Assigned Managed Identity

**Characteristics**:

- Tied to resource lifecycle
- Deleted when resource is deleted
- One identity per resource
- Simpler setup (no separate resource)

**When to use**:

- Single resource needs permissions
- Short-lived resources (dev/test)
- Simple scenarios without cross-resource needs

**Creation**:

```bash
az webapp identity assign \
  --resource-group myResourceGroup \
  --name myWebApp

# Get principal ID
az webapp identity show \
  --resource-group myResourceGroup \
  --name myWebApp \
  --query principalId
```

---

## Assignment to Resources

### App Service

```bash
# Assign user-assigned identity
az webapp identity assign \
  --resource-group myResourceGroup \
  --name myWebApp \
  --identities /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myapp-identity
```

### Azure Functions

```bash
az functionapp identity assign \
  --resource-group myResourceGroup \
  --name myFunctionApp \
  --identities /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myapp-identity
```

### Azure Kubernetes Service (AKS)

**Pod Identity** (deprecated - use Workload Identity instead):

```bash
# Enable pod identity
az aks pod-identity add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --namespace myNamespace \
  --name myapp-identity \
  --identity-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myapp-identity
```

**Workload Identity** (recommended):

```bash
# Enable workload identity on AKS
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Create federated credential
az identity federated-credential create \
  --identity-name myapp-identity \
  --resource-group myResourceGroup \
  --name aks-federated-credential \
  --issuer $(az aks show -g myResourceGroup -n myAKSCluster --query "oidcIssuerProfile.issuerUrl" -o tsv) \
  --subject "system:serviceaccount:myNamespace:myServiceAccount"
```

### Azure Virtual Machines

```bash
az vm identity assign \
  --resource-group myResourceGroup \
  --name myVM \
  --identities /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myapp-identity
```

---

## RBAC Role Assignment

After assigning identity to resource, grant permissions:

```bash
# Get identity principal ID
PRINCIPAL_ID=$(az identity show \
  --resource-group myResourceGroup \
  --name myapp-identity \
  --query principalId -o tsv)

# Assign Key Vault Secrets User role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault

# Assign Storage Blob Data Reader role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Reader" \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/mystorageaccount
```

**Propagation delay**: Wait 5-10 minutes (sometimes up to 30 minutes) after role assignment before testing access.

---

## Application Configuration

### Specify Client ID (Recommended)

**Why**: Avoids auto-discovery overhead, explicit configuration, better error messages

**Go**:

```go
credential, err := azidentity.NewManagedIdentityCredential(&azidentity.ManagedIdentityCredentialOptions{
    ID: azidentity.ClientID(os.Getenv("MANAGED_IDENTITY_CLIENT_ID")),
})
```

**Python**:

```python
credential = ManagedIdentityCredential(
    client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
)
```

**TypeScript**:

```typescript
const credential = new ManagedIdentityCredential({
  clientId: process.env.MANAGED_IDENTITY_CLIENT_ID,
});
```

**Environment Variable**:

```bash
# Set in App Service configuration
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name myWebApp \
  --settings MANAGED_IDENTITY_CLIENT_ID="abc12345-..."
```

---

## Troubleshooting

### Identity Not Found

**Error**: `ManagedIdentityCredentialUnavailableError: No managed identity found`

**Causes**:

- Managed identity not enabled on resource
- IMDS endpoint not available
- Wrong client ID specified

**Solutions**:

```bash
# Verify identity is assigned
az webapp identity show \
  --resource-group myResourceGroup \
  --name myWebApp

# Check if running in Azure (IMDS endpoint test)
curl -H "Metadata:true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01"

# Verify client ID matches
az identity show \
  --resource-group myResourceGroup \
  --name myapp-identity \
  --query clientId
```

### 403 Forbidden (Authorization Failure)

**Causes**:

- RBAC role not assigned
- Role assigned at wrong scope
- Propagation delay (5-30 minutes)
- Subscription Owner doesn't grant data plane access

**Solutions**:

```bash
# Check role assignments for identity
az role assignment list \
  --assignee $PRINCIPAL_ID \
  --all

# Wait 10 minutes after assignment
sleep 600

# Verify role scope matches resource
az role assignment list \
  --assignee $PRINCIPAL_ID \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault
```

---

## Production Deployment Pattern

**Complete setup workflow**:

```bash
#!/bin/bash
set -e

# Configuration
RG="myResourceGroup"
LOCATION="eastus"
IDENTITY_NAME="myapp-identity"
WEBAPP_NAME="myWebApp"
KEYVAULT_NAME="myKeyVault"

# 1. Create user-assigned identity
echo "Creating managed identity..."
az identity create --resource-group $RG --name $IDENTITY_NAME --location $LOCATION

# 2. Get IDs
IDENTITY_ID=$(az identity show -g $RG -n $IDENTITY_NAME --query id -o tsv)
IDENTITY_CLIENT_ID=$(az identity show -g $RG -n $IDENTITY_NAME --query clientId -o tsv)
IDENTITY_PRINCIPAL_ID=$(az identity show -g $RG -n $IDENTITY_NAME --query principalId -o tsv)

# 3. Assign identity to App Service
echo "Assigning identity to App Service..."
az webapp identity assign -g $RG -n $WEBAPP_NAME --identities $IDENTITY_ID

# 4. Grant RBAC permissions
echo "Granting Key Vault access..."
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{sub}/resourceGroups/$RG/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME

# 5. Configure application
echo "Configuring application..."
az webapp config appsettings set \
  -g $RG \
  -n $WEBAPP_NAME \
  --settings MANAGED_IDENTITY_CLIENT_ID=$IDENTITY_CLIENT_ID

# 6. Wait for propagation
echo "Waiting for RBAC propagation (10 minutes)..."
sleep 600

# 7. Test access
echo "Testing Key Vault access..."
az webapp ssh -g $RG -n $WEBAPP_NAME
# Inside app: curl IMDS endpoint to verify token acquisition
```

---

## Related Documentation

- [Authentication](authentication.md) - Complete authentication patterns
- [Security Patterns](security-patterns.md) - RBAC and least privilege
- [Service Principal](service-principal.md) - Alternative for non-Azure environments
