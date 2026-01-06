---
name: integrating-with-azure
description: Integrates applications with Microsoft Azure services. Use when implementing Azure SDK authentication, infrastructure as code (Terraform/Bicep/ARM), Azure DevOps pipelines, or Azure security patterns (Key Vault, IAM, managed identities).
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion, WebFetch, WebSearch
---

# Integrating with Microsoft Azure

**Comprehensive patterns for integrating applications with Microsoft Azure cloud services, including SDK authentication, infrastructure as code, DevOps pipelines, and security best practices.**

## Prerequisites

- Azure subscription (free tier available)
- Azure CLI installed (`az --version`)
- Appropriate SDK for your language (Go, Python, TypeScript, etc.)
- Azure account with appropriate permissions

## Quick Reference

| Operation               | Pattern                              | Reference                                                                    |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| SDK Authentication      | DefaultAzureCredential chain         | [references/authentication.md](references/authentication.md)                 |
| Infrastructure as Code  | Terraform/Bicep/ARM templates        | [references/infrastructure-as-code.md](references/infrastructure-as-code.md) |
| Azure DevOps Pipelines  | YAML pipeline configuration          | [references/azure-devops.md](references/azure-devops.md)                     |
| Key Vault Integration   | Managed identity + RBAC              | [references/key-vault.md](references/key-vault.md)                           |
| Security Best Practices | Least privilege, credential rotation | [references/security-patterns.md](references/security-patterns.md)           |

## When to Use

Use this skill when:

- Implementing Azure SDK authentication for applications
- Creating infrastructure as code (Terraform, Bicep, ARM templates)
- Setting up Azure DevOps CI/CD pipelines
- Integrating with Azure security services (Key Vault, IAM, managed identities)
- Deploying multi-tier applications to Azure
- Implementing Azure-specific patterns and best practices

## ⚠️ Critical Production Warnings (2026)

**IMMEDIATE ACTIONS REQUIRED**:

1. **Application Insights Migration Deadline: March 31, 2025**
   - Instrumentation key ingestion ends permanently
   - **Action**: Replace all instrumentation keys with connection strings OR migrate to OpenTelemetry
   - Research: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md` (Section: Application Insights Migration)

2. **DefaultAzureCredential is NOT Production-Safe**
   - Causes unpredictable behavior and performance overhead (2-5 second latency on first request)
   - **Action**: Replace with `ManagedIdentityCredential(client_id="<explicit-id>")` in production code
   - Research: SYNTHESIS.md (Section: Credential Management Convergence)

3. **Critical Vulnerability: `az ad sp create-for-rbac` Command**
   - GitHub Issue #32299: Can destroy existing credentials and assign RBAC to wrong identities
   - **Action**: Use managed identities instead OR use `az ad sp create` with explicit `--id` parameter
   - Research: SYNTHESIS.md (Section: Service Principal Authentication Hierarchy)

4. **MSAL Version Regressions (December 2025)**
   - MSAL 4.67.1 and 4.70.0 break `ManagedIdentityCredential`
   - **Action**: Pin to MSAL 4.66.0 until upstream fix
   - Research: SYNTHESIS.md (Section: Production Issues & Solutions)

5. **Key Vault: RBAC is Mandatory for Compliance**
   - Access policies are deprecated (no PIM support, known vulnerabilities)
   - **Action**: Migrate all Key Vaults to RBAC with `az keyvault update --enable-rbac-authorization`
   - Research: SYNTHESIS.md (Section: Key Vault RBAC Architecture)

**For complete research findings**, see: `.claude/.output/research/2026-01-04-211427-azure-integration/`

## Authentication Patterns

### Development: DefaultAzureCredential

**⚠️ DEVELOPMENT ONLY** - Do not use in production (see warnings above)

`DefaultAzureCredential` attempts authentication methods in this order (10-step chain):

1. **Environment variables** (service principal credentials)
2. **Workload Identity** (Azure Kubernetes Service federated token)
3. **Managed identity** (when running in Azure)
4. **Visual Studio credential** (Windows only)
5. **VS Code credential** (Azure Account extension)
6. **Azure CLI** (`az login`)
7. **Azure PowerShell** (`Connect-AzAccount`)
8. **Azure Developer CLI** (`azd auth login`)
9. **Interactive browser** (OAuth flow)
10. **Azure CLI Broker** (Windows Account Manager)

**Development Example**:

```go
import "github.com/Azure/azure-sdk-for-go/sdk/azidentity"

// Development only - tries multiple auth methods
cred, err := azidentity.NewDefaultAzureCredential(nil)
if err != nil {
    return fmt.Errorf("failed to create credential: %w", err)
}
```

**Why not production?**

- Unpredictable failures when one method fails intermittently
- Performance overhead (2-5 seconds trying multiple methods)
- Difficult debugging (which method succeeded?)

**For detailed authentication patterns**, see [references/authentication.md](references/authentication.md).

### Production: Managed Identity (REQUIRED)

**Recommended for ALL Azure-hosted applications** (App Service, Functions, AKS, VMs):

- No credentials in code or configuration
- Automatic token rotation (every 24 hours)
- Least privilege via RBAC
- Eliminates 90% of credential management overhead

**Production Example**:

```python
from azure.identity import ManagedIdentityCredential

# Explicit client ID for predictability
credential = ManagedIdentityCredential(
    client_id="<user-assigned-identity-client-id>"
)
```

**Types**:

- **User-assigned** (recommended): Portable across resources, independent lifecycle
- **System-assigned**: Tied to resource lifecycle, simpler for single-resource scenarios

**For managed identity setup**, see [references/managed-identity.md](references/managed-identity.md).

### Service Principal (CI/CD)

**⚠️ SECURITY WARNING**: `az ad sp create-for-rbac` has a critical vulnerability (GitHub #32299)

- Looks up by display name instead of unique ID
- Can destroy existing credentials if display name matches
- May assign RBAC to wrong identity

**Safer alternatives**:

1. **Use managed identities** (if running in Azure)
2. **Use federated credentials** (for GitHub Actions, AWS, GCP)
3. **Use certificate-based auth** (more secure than client secrets)

**Security Hierarchy** (Best to Worst):

1. Managed Identity > Federated Credentials > Certificates > Client Secrets

**If service principal is unavoidable** (non-Azure environments):

```bash
# SAFER: Use explicit app creation
az ad app create --display-name "myapp-deploy"
az ad sp create --id <app-id-from-previous-command>
az role assignment create --assignee <sp-object-id> --role Contributor --scope /subscriptions/{subscription-id}
```

**Credential Rotation**: 90 days maximum (60 days for PCI DSS/HIPAA compliance)

**For service principal configuration**, see [references/service-principal.md](references/service-principal.md).

## Infrastructure as Code

### Terraform

**Azure Provider Configuration**:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

**Common Resources**:

- Resource Groups
- Virtual Networks
- Storage Accounts
- Azure Kubernetes Service (AKS)
- Azure Functions
- Azure Key Vault

**For Terraform patterns**, see [references/terraform.md](references/terraform.md).

### Bicep

Azure-native infrastructure as code with cleaner syntax than ARM templates:

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}
```

**For Bicep patterns**, see [references/bicep.md](references/bicep.md).

### ARM Templates

JSON-based infrastructure definitions (legacy but still widely used):

**For ARM template patterns**, see [references/arm-templates.md](references/arm-templates.md).

## Azure DevOps Pipelines

### Pipeline Structure

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: "ubuntu-latest"

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: UseDotNet@2
          - task: DotNetCoreCLI@2
            inputs:
              command: "build"

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployJob
        environment: "production"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
```

**For pipeline patterns**, see [references/azure-devops.md](references/azure-devops.md).

## Azure SDK Usage

### Storage Blobs (Go)

```go
import "github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"

client, err := azblob.NewClient(accountURL, cred, nil)
containerClient := client.ServiceClient().NewContainerClient("mycontainer")
blobClient := containerClient.NewBlockBlobClient("myblob")
```

### Key Vault Secrets (Python)

```python
from azure.keyvault.secrets import SecretClient

client = SecretClient(vault_url="https://myvault.vault.azure.net/", credential=credential)
secret = client.get_secret("my-secret")
```

### Cosmos DB (TypeScript)

```typescript
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({ endpoint, key });
const database = client.database("mydb");
const container = database.container("mycontainer");
```

**For service-specific SDK patterns**, see [references/sdk-patterns.md](references/sdk-patterns.md).

## Security Best Practices

### IAM and RBAC

- **Least privilege**: Assign minimum required roles
- **Managed identities**: Eliminate credential management
- **Azure AD groups**: Manage permissions at group level
- **Conditional access**: Enforce MFA and location policies

**For IAM patterns**, see [references/iam-rbac.md](references/iam-rbac.md).

### Key Vault Integration

```go
import "github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"

client, err := azsecrets.NewClient(vaultURL, cred, nil)
secret, err := client.GetSecret(context.TODO(), "database-password", "", nil)
```

**Best practices**:

- Store all secrets in Key Vault
- Use managed identity for access
- Enable soft delete and purge protection
- Implement secret rotation
- Audit secret access with Azure Monitor

**For Key Vault patterns**, see [references/key-vault.md](references/key-vault.md).

### Network Security

- **Virtual Networks**: Isolate resources
- **Network Security Groups**: Control traffic
- **Private Endpoints**: Eliminate public internet exposure
- **Azure Firewall**: Centralized network security

**For network security patterns**, see [references/network-security.md](references/network-security.md).

## Common Integration Patterns

### Multi-Tier Application

**Architecture**:

- Azure Front Door (CDN + WAF)
- App Service (web tier)
- Azure Functions (API tier)
- Cosmos DB / SQL Database (data tier)
- Key Vault (secrets)
- Application Insights (monitoring)

**For multi-tier patterns**, see [references/multi-tier-architecture.md](references/multi-tier-architecture.md).

### Microservices on AKS

**Components**:

- Azure Kubernetes Service (container orchestration)
- Azure Container Registry (image storage)
- Azure Service Bus (messaging)
- Azure Monitor (logging and metrics)
- Azure Key Vault (secrets via CSI driver)

**For AKS patterns**, see [references/aks-patterns.md](references/aks-patterns.md).

### Serverless Architecture

**Components**:

- Azure Functions (compute)
- Azure Logic Apps (workflows)
- Event Grid (event routing)
- Cosmos DB (NoSQL database)
- Storage Queues/Service Bus (messaging)

**For serverless patterns**, see [references/serverless-patterns.md](references/serverless-patterns.md).

## Error Handling

### Common SDK Errors

| Error                       | Cause                                        | Solution                                                 |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `AuthenticationFailed`      | Invalid credentials or expired token         | Verify service principal credentials, check token expiry |
| `ResourceNotFound`          | Resource doesn't exist or wrong subscription | Verify resource name and subscription ID                 |
| `AuthorizationFailed`       | Insufficient permissions                     | Check RBAC role assignments                              |
| `QuotaExceeded`             | Subscription limits reached                  | Request quota increase or use different region           |
| `InvalidTemplateDeployment` | IaC syntax error                             | Validate template syntax with `az deployment validate`   |

**For detailed error handling**, see [references/error-handling.md](references/error-handling.md).

### Retry Policies

Azure SDKs include automatic retry with exponential backoff:

```go
// Go: Configure retry policy
retryOptions := policy.RetryOptions{
    MaxRetries:    3,
    RetryDelay:    4 * time.Second,
    MaxRetryDelay: 120 * time.Second,
}
```

```python
# Python: Configure retry policy
from azure.core.pipeline.policies import RetryPolicy

retry_policy = RetryPolicy(
    retry_total=3,
    retry_backoff_factor=0.8
)
```

## Environment-Specific Configuration

### Development

- Azure CLI authentication (`az login`)
- Local service emulators (Azurite for Storage)
- Development subscriptions
- Relaxed network security

### Staging

- Managed identity authentication
- Separate subscription or resource group
- Production-like configuration
- Network security enabled

### Production

- Managed identity only
- Dedicated subscription
- Multi-region deployment
- Full security controls enabled
- Monitoring and alerting configured

**For environment configuration**, see [references/environment-configuration.md](references/environment-configuration.md).

## Monitoring and Observability

### Application Insights

Automatic instrumentation for:

- Request telemetry
- Dependency tracking
- Exception logging
- Custom metrics

```go
import "github.com/microsoft/ApplicationInsights-Go/appinsights"

client := appinsights.NewTelemetryClient(instrumentationKey)
client.TrackEvent("UserLogin")
```

**For monitoring patterns**, see [references/monitoring.md](references/monitoring.md).

### Azure Monitor

- Metrics and logs collection
- Alert rules and action groups
- Workbooks for visualization
- Log Analytics queries (KQL)

## Cost Optimization

- Use Azure Cost Management
- Implement auto-scaling policies
- Choose appropriate service tiers
- Use reserved instances for predictable workloads
- Clean up unused resources
- Implement resource tagging for chargeback

**For cost optimization strategies**, see [references/cost-optimization.md](references/cost-optimization.md).

## Related Resources

### Official Documentation

- **Azure Documentation**: https://docs.microsoft.com/azure/
- **Azure SDKs**: https://azure.github.io/azure-sdk/
- **Terraform Azure Provider**: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- **Bicep Documentation**: https://docs.microsoft.com/azure/azure-resource-manager/bicep/
- **Azure DevOps**: https://docs.microsoft.com/azure/devops/

## References

Detailed implementation guides (to be populated during research phase):

- [references/authentication.md](references/authentication.md) - Complete authentication patterns
- [references/infrastructure-as-code.md](references/infrastructure-as-code.md) - IaC comprehensive guide
- [references/azure-devops.md](references/azure-devops.md) - Pipeline patterns and best practices
- [references/key-vault.md](references/key-vault.md) - Key Vault integration patterns
- [references/security-patterns.md](references/security-patterns.md) - Security best practices
- [references/sdk-patterns.md](references/sdk-patterns.md) - Service-specific SDK usage
- [references/error-handling.md](references/error-handling.md) - Error handling and retry logic
- [references/monitoring.md](references/monitoring.md) - Observability and monitoring

## Related Skills

- `gateway-integrations` - Router to integration-specific skills
- `developing-integrations` - General integration development patterns
- `integrating-with-panorama` - Similar integration skill (Palo Alto Networks)
- `implementing-graphql-clients` - API client implementation patterns
