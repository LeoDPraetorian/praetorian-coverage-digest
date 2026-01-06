# Azure Service Principal Configuration

Guide to service principal setup for non-Azure environments, CI/CD pipelines, and multi-cloud scenarios.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`

---

## ⚠️ Critical Security Warning

**The `az ad sp create-for-rbac` command has a serious vulnerability (GitHub Issue #32299)**:

- Looks up by display name instead of unique ID
- Can destroy existing credentials if display name matches
- May assign RBAC to wrong identity

**DO NOT USE THIS COMMAND** in production automation.

---

## Security Hierarchy

**From highest to lowest security**:

1. **Managed Identity** (Azure workloads only)
   - No credentials at all
   - Automatic rotation
   - Best security

2. **Federated Credentials** (Multi-cloud, GitHub Actions)
   - No stored secrets
   - Short-lived tokens (1 hour max)
   - OIDC-based trust

3. **Certificate-Based** (On-premises, long-lived services)
   - Tamper-resistant
   - HSM storage available
   - Expiration enforced

4. **Client Secrets** (Last resort only)
   - Stored in plaintext in Azure AD
   - No MFA enforcement
   - Manual rotation required
   - High exposure risk

---

## Federated Credentials (Recommended for Multi-Cloud)

### GitHub Actions Integration

**Setup**:

```bash
# Create app registration
az ad app create --display-name "myapp-github"
APP_ID=$(az ad app list --display-name "myapp-github" --query [0].appId -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Configure federation with GitHub
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-prod",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:my-org/my-repo:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Assign RBAC role
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/{subscription-id}/resourceGroups/myResourceGroup
```

**GitHub Actions Workflow**:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

permissions:
  id-token: write # Required for OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (Federated)
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy
        run: |
          az webapp deploy ...
```

**Benefits**:

- No secrets stored in GitHub
- Short-lived tokens (1 hour)
- Automatic rotation
- Supports conditional access policies

### AWS Integration (Federated)

```bash
# Configure Azure to trust AWS OIDC tokens
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "aws-integration",
    "issuer": "https://oidc.eks.us-east-1.amazonaws.com/id/{cluster-id}",
    "subject": "system:serviceaccount:default:my-service-account",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

---

## Certificate-Based Service Principal

### Creation with Self-Signed Certificate

```bash
# Generate self-signed certificate (4096-bit RSA, 365 days)
openssl req -x509 -newkey rsa:4096 \
  -keyout private.key \
  -out certificate.pem \
  -days 365 \
  -nodes \
  -subj "/CN=myapp-onpremise"

# Create app registration (SAFER METHOD)
az ad app create --display-name "myapp-onpremise"
APP_ID=$(az ad app list --display-name "myapp-onpremise" --query [0].appId -o tsv)

# Upload certificate
az ad app credential reset \
  --id $APP_ID \
  --cert @certificate.pem \
  --append

# Create service principal
SP_OBJECT_ID=$(az ad sp create --id $APP_ID --query id -o tsv)

# Assign RBAC role
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/myResourceGroup
```

### Application Usage

**Python**:

```python
from azure.identity import CertificateCredential

credential = CertificateCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    certificate_path="/path/to/certificate.pem"
)
```

**Go**:

```go
import "github.com/Azure/azure-sdk-for-go/sdk/azidentity"

certData, err := os.ReadFile("/path/to/certificate.pem")
if err != nil {
    return err
}

cred, err := azidentity.NewClientCertificateCredential(
    os.Getenv("AZURE_TENANT_ID"),
    os.Getenv("AZURE_CLIENT_ID"),
    certData,
    nil,
)
```

### HSM-Backed Certificates (Production)

Store certificate private keys in Azure Key Vault (Premium tier with HSM):

```bash
# Import certificate to Key Vault
az keyvault certificate import \
  --vault-name myKeyVault \
  --name myapp-cert \
  --file certificate.pem

# Use Key Vault certificate in application
```

---

## Client Secret Service Principal (Avoid)

### SAFER Creation Method

**DO NOT use `az ad sp create-for-rbac`** (vulnerable to credential destruction)

**Use this instead**:

```bash
# Create app registration
az ad app create --display-name "myapp-legacy"
APP_ID=$(az ad app list --display-name "myapp-legacy" --query [0].appId -o tsv)

# Create service principal
SP_OBJECT_ID=$(az ad sp create --id $APP_ID --query id -o tsv)

# Create client secret
SECRET_VALUE=$(az ad app credential reset \
  --id $APP_ID \
  --query password -o tsv)

# ⚠️ SAVE SECRET IMMEDIATELY - cannot retrieve later
echo "Client Secret: $SECRET_VALUE"
# Store in Key Vault or CI/CD secrets

# Assign RBAC role
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/myResourceGroup
```

### Application Usage

**Environment Variables**:

```bash
export AZURE_TENANT_ID="..."
export AZURE_CLIENT_ID="..."
export AZURE_CLIENT_SECRET="..."  # Never hardcode in code!
```

**Python**:

```python
from azure.identity import ClientSecretCredential
import os

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)
```

---

## Credential Rotation

### Rotation Requirements

| Framework | Period  | Scope                         |
| --------- | ------- | ----------------------------- |
| General   | 90 days | All service principal secrets |
| PCI DSS   | 60 days | Payment card data access      |
| HIPAA     | 60 days | PHI database access           |
| SOC 2     | 90 days | All credentials (automated)   |

### Automated Rotation Pattern

**Azure Logic App workflow**:

```python
# Triggered 30 days before expiration (Event Grid)

# Step 1: Generate new secret
def rotate_secret(app_id: str):
    # Create new secret (keeps old one active)
    result = subprocess.run(
        ["az", "ad", "app", "credential", "reset",
         "--id", app_id,
         "--append"],  # CRITICAL: --append keeps old secret active
        capture_output=True,
        text=True
    )

    new_secret = json.loads(result.stdout)["password"]

    # Step 2: Store in Key Vault
    keyvault_client.set_secret(
        "app-client-secret",
        new_secret,
        tags={"created": datetime.utcnow().isoformat()}
    )

    # Step 3: Update application configuration
    # (App Service, Functions, AKS restart to pick up new secret)

    # Step 4: Wait 48 hours (allow all instances to pick up)
    schedule_deletion(app_id, old_key_id, delay_hours=48)

def schedule_deletion(app_id: str, key_id: str, delay_hours: int):
    # Azure Function with timer trigger
    time.sleep(delay_hours * 3600)

    # Step 5: Delete old secret
    subprocess.run([
        "az", "ad", "app", "credential", "delete",
        "--id", app_id,
        "--key-id", key_id
    ])

    # Step 6: Notify
    send_notification(f"Secret rotation complete for {app_id}")
```

---

## Monitoring and Auditing

### Track Service Principal Usage

```kusto
// Azure AD sign-in logs
SigninLogs
| where AppId == "<service-principal-app-id>"
| project TimeGenerated, IPAddress, Location, ResultType, ResultDescription
| order by TimeGenerated desc
```

### Alert on Anomalies

```bash
# Alert on service principal sign-ins from unexpected locations
az monitor metrics alert create \
  --name ServicePrincipalAnomalousSignIn \
  --resource-group myResourceGroup \
  --scopes /subscriptions/{sub} \
  --condition "count signIns from unexpected countries > 0" \
  --window-size 5m \
  --action myActionGroup
```

---

## Migration from Client Secrets to Managed Identity

**Recommended migration path**:

```bash
# Phase 1: Enable managed identity on resource
az webapp identity assign \
  --resource-group myResourceGroup \
  --name myWebApp \
  --identities /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myapp-identity

# Phase 2: Grant RBAC permissions
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault

# Phase 3: Update application code
# OLD:
# credential = ClientSecretCredential(tenant_id, client_id, client_secret)

# NEW:
# credential = ManagedIdentityCredential(client_id=identity_client_id)

# Phase 4: Deploy and test
az webapp deploy ...

# Phase 5: Remove environment variables (after 48 hours)
az webapp config appsettings delete \
  -g $RG \
  -n $WEBAPP_NAME \
  --setting-names AZURE_CLIENT_SECRET

# Phase 6: Delete service principal (after 7 days)
az ad sp delete --id $APP_ID
```

---

## Related Documentation

- [Authentication](authentication.md) - Complete credential patterns
- [Managed Identity](managed-identity.md) - Preferred alternative
- [Security Patterns](security-patterns.md) - RBAC and least privilege
