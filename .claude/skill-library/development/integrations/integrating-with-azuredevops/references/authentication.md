# Azure DevOps Authentication

Complete guide to authentication methods for Azure DevOps REST API integration.

---

## Authentication Methods Overview

| Method                           | Use Case                 | Security      | Lifespan           | Recommended |
| -------------------------------- | ------------------------ | ------------- | ------------------ | ----------- |
| **Workload Identity Federation** | Production services      | ✅ Excellent  | Short-lived (1h)   | ✅ Yes      |
| **Personal Access Token (PAT)**  | Development, prototyping | ⚠️ Good       | Up to 1 year       | ⚠️ Limited  |
| **OAuth 2.0**                    | User-driven apps         | ⚠️ Deprecated | Per access token   | ❌ No       |
| **Service Principal**            | Legacy automation        | ⚠️ Fair       | Client secret life | ❌ Migrate  |

**⚠️ CRITICAL:** OAuth 2.0 deprecated April 2025, fully deprecated by end of 2026. Migrate to Microsoft Entra ID or Workload Identity Federation immediately.

---

## 1. Workload Identity Federation (OIDF) - Recommended

**Why:** Eliminates secrets entirely. Short-lived tokens. Automatic credential rotation.

### Setup

```bash
# 1. Create Entra ID application registration
az ad app create --display-name "chariot-azuredevops-integration"

# 2. Create service principal
az ad sp create --id {app-id}

# 3. Configure federated credential
az ad app federated-credential create \
    --id {app-id} \
    --parameters '{
        "name": "chariot-azuredevops-fed-cred",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:praetorian-inc/chariot:ref:refs/heads/main",
        "audiences": ["api://AzureADTokenExchange"]
    }'

# 4. Grant Azure DevOps permissions
# Navigate to Azure DevOps → Organization Settings → Users → Add service principal
```

### Go Implementation

```go
import (
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "github.com/microsoft/azure-devops-go-api/azuredevops"
)

// Acquire token using federated credential
cred, err := azidentity.NewWorkloadIdentityCredential(&azidentity.WorkloadIdentityCredentialOptions{
    TenantID: os.Getenv("AZURE_TENANT_ID"),
    ClientID: os.Getenv("AZURE_CLIENT_ID"),
})

token, err := cred.GetToken(context.Background(), policy.TokenRequestOptions{
    Scopes: []string{"499b84ac-1321-427f-aa17-267ca6975798/.default"}, // Azure DevOps scope
})

connection := azuredevops.NewPatConnection(orgURL, token.Token)
```

---

## 2. Personal Access Token (PAT)

**Why:** Simple setup for development and prototyping. **Not recommended for production.**

### Creating a PAT

1. Navigate to Azure DevOps → User Settings → Personal Access Tokens
2. Click "+ New Token"
3. Configure:
   - **Name**: `chariot-dev-integration`
   - **Organization**: Select your org
   - **Expiration**: ≤90 days (recommended by Microsoft)
   - **Scopes**: Select minimum required:
     - Code: Read
     - Build: Read
     - Work Items: Read & Write
     - Service Hooks: Read & Write

### Go Implementation

```go
import "github.com/microsoft/azure-devops-go-api/azuredevops"

// PAT authentication uses Basic Auth with empty username
connection := azuredevops.NewPatConnection(orgURL, pat)
ctx := context.Background()

// Use connection for API clients
coreClient, err := core.NewClient(ctx, connection)
gitClient, err := git.NewClient(ctx, connection)
```

### HTTP Request Pattern

```go
req.SetBasicAuth("", pat) // Empty username, PAT as password
```

### Storage Best Practices

**❌ Never:**
- Hardcode PATs in source code
- Commit PATs to version control
- Share PATs between team members
- Use PATs with "Full access" scope

**✅ Always:**
- Store in environment variables or Azure Key Vault
- Set shortest acceptable expiration (≤90 days)
- Use minimum required scopes (least privilege)
- Rotate regularly and monitor via audit logs
- Revoke immediately if compromised

---

## 3. OAuth 2.0 (DEPRECATED)

**⚠️ CRITICAL:** OAuth 2.0 is deprecated. Do not use for new integrations.

- **April 2025:** Deprecated (warnings)
- **End of 2026:** Fully removed

**Migration Path:** OAuth 2.0 → Microsoft Entra ID OAuth

---

## 4. Service Principal (Legacy)

**Why:** Required for some Azure resource integrations. Prefer OIDF for new implementations.

### Creating Service Principal

```bash
# Create service principal
az ad sp create-for-rbac --name "chariot-azuredevops-sp" \
    --role Contributor \
    --scopes /subscriptions/{subscription-id}

# Output includes:
# - appId (client ID)
# - password (client secret)
# - tenant
```

### Go Implementation

```go
import "github.com/Azure/azure-sdk-for-go/sdk/azidentity"

cred, err := azidentity.NewClientSecretCredential(
    tenantID,
    clientID,
    clientSecret,
    nil,
)

token, err := cred.GetToken(context.Background(), policy.TokenRequestOptions{
    Scopes: []string{"499b84ac-1321-427f-aa17-267ca6975798/.default"},
})

connection := azuredevops.NewPatConnection(orgURL, token.Token)
```

---

## Security Best Practices

### For All Methods

1. **Least Privilege:** Grant minimum required permissions/scopes
2. **Audit Regularly:** Monitor authentication logs in Azure DevOps
3. **Rotate Credentials:** Regularly rotate secrets (OIDF does this automatically)
4. **Monitor for Breaches:** Set up alerts for suspicious authentication patterns
5. **Use HTTPS Only:** Never send credentials over unencrypted connections

### PAT Security

| Practice | Implementation |
|----------|----------------|
| Secure Storage | Azure Key Vault, environment variables |
| Expiration | ≤90 days (Microsoft recommendation) |
| Scope | Minimum required (Code Read, NOT Full Access) |
| Monitoring | Azure DevOps audit logs, track usage |
| Rotation | Automate renewal before expiration |
| Revocation | Immediate on compromise or employee departure |

### OIDF Security

| Practice | Implementation |
|----------|----------------|
| Federated Credential | Restrict to specific repos/branches |
| Token Lifetime | Short-lived (1 hour) - no rotation needed |
| Audience | Scope to specific Azure DevOps organizations |
| MFA | Enforce on Entra ID application |
| Conditional Access | Geographic restrictions, device compliance |

---

## Comparison Matrix

| Feature | OIDF | PAT | OAuth 2.0 | Service Principal |
|---------|------|-----|-----------|-------------------|
| Setup Complexity | Medium | Low | High | Medium |
| Security | Excellent | Good | Deprecated | Fair |
| Secret Management | None (tokens) | Manual | Manual | Manual |
| Token Lifetime | 1 hour | Up to 1 year | Varies | Client secret |
| Auto-Rotation | Yes | No | No | No |
| Production Ready | ✅ Yes | ⚠️ Limited | ❌ No | ⚠️ Legacy |
| Microsoft Recommendation | ✅ | ⚠️ Dev only | ❌ Migrate | ⚠️ Migrate to OIDF |

---

## Migration Roadmap

### From PATs to OIDF

**Week 1-2:**
- Set up Entra ID application registration
- Configure federated credentials for CI/CD environment
- Test OIDF authentication in non-production

**Week 3-4:**
- Migrate dev/staging environments to OIDF
- Update deployment pipelines
- Monitor for authentication failures

**Week 5-6:**
- Migrate production to OIDF
- Revoke PATs
- Document OIDF setup for team

### From Service Principals to OIDF

**Week 1:**
- Audit existing service principals
- Identify Azure DevOps integrations using service principals

**Week 2-3:**
- Create OIDF federated credentials for each integration
- Test in parallel with existing service principals

**Week 4:**
- Switch to OIDF
- Delete client secrets
- Monitor for issues

---

## Related Resources

- [Microsoft Entra ID Authentication](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/entra)
- [Workload Identity Federation](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity)
- [Personal Access Tokens](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Authentication Guidance](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/authentication-guidance)
