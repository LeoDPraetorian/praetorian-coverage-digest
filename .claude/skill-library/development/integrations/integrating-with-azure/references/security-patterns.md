# Azure Security Patterns

Comprehensive security best practices for Azure including IAM/RBAC, least privilege, PIM, and compliance requirements.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md` (Authentication & Security findings)

---

## IAM and RBAC Best Practices

### Least Privilege Principles

**Core Rules**:

1. **Maximum 3 subscription owners** (Microsoft recommendation)
2. **Use groups for assignments** (not individual users)
3. **Narrow scope to minimum** (resource > resource group > subscription)
4. **Use PIM for privileged roles** (Owner, Contributor, User Access Administrator)

### Scope Hierarchy

**From narrowest to broadest**:

```
Resource → Resource Group → Subscription → Management Group
```

**Example** (least privilege):

```bash
# ✅ CORRECT: Assign at resource scope
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault

# ❌ WRONG: Assign at subscription scope (overly broad)
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{sub}
```

### Built-in Roles Hierarchy

| Role                          | Permissions                               | When to Use                     |
| ----------------------------- | ----------------------------------------- | ------------------------------- |
| **Owner**                     | Full control + RBAC management            | Never assign directly (use PIM) |
| **Contributor**               | Create/manage resources (no RBAC changes) | DevOps automation, developers   |
| **Reader**                    | Read-only across all resources            | Auditors, monitoring tools      |
| **User Access Administrator** | Manage RBAC only (no resource access)     | Security team (use PIM)         |

**Service-Specific Roles** (Recommended for least privilege):

- `Key Vault Secrets User` (not `Contributor`)
- `Storage Blob Data Reader` (not `Storage Account Contributor`)
- `Cosmos DB Account Reader` (not `DocumentDB Account Contributor`)

---

## Privileged Identity Management (PIM)

**Just-in-Time Access for Privileged Roles**

### Configuration

```bash
# Requires Azure AD Premium P2 license

# Create eligible assignment (not active)
az role assignment create \
  --assignee $USER_PRINCIPAL_ID \
  --role "Owner" \
  --scope /subscriptions/{sub} \
  --assignee-object-id $USER_OBJECT_ID \
  --description "Owner access for emergency operations"

# Configure PIM settings
# - Max activation duration: 8 hours
# - Require MFA at activation
# - Require approval for Owner role
# - Require justification
```

### Activation Workflow

**User activates role**:

```bash
# Request activation (via Azure portal or API)
# - Select role: Owner
# - Duration: 4 hours
# - Justification: "Production incident #12345"
# - MFA prompt appears

# If approval required:
# - Approver receives notification
# - Reviews justification
# - Approves/denies

# After approval:
# - User has Owner role for 4 hours
# - Audit log records activation, approver, justification
# - After 4 hours, role automatically revoked
```

**Benefits**:

- Eliminates standing privileges
- MFA enforcement at activation
- Approval workflow for sensitive roles
- Complete audit trail
- Automatic expiration

---

## Custom Roles

**When built-in roles are too broad**:

```json
{
  "Name": "Key Vault Secret Rotator",
  "Description": "Can rotate secrets but not read secret values",
  "Actions": [
    "Microsoft.KeyVault/vaults/secrets/write",
    "Microsoft.KeyVault/vaults/secrets/delete"
  ],
  "NotActions": [
    "Microsoft.KeyVault/vaults/secrets/readMetadata/action",
    "Microsoft.KeyVault/vaults/secrets/getSecret/action"
  ],
  "DataActions": ["Microsoft.KeyVault/vaults/secrets/setSecret/action"],
  "NotDataActions": ["Microsoft.KeyVault/vaults/secrets/getSecret/action"],
  "AssignableScopes": ["/subscriptions/{subscription-id}/resourceGroups/myResourceGroup"]
}
```

**Create custom role**:

```bash
az role definition create --role-definition @custom-role.json

# Assign custom role
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Secret Rotator" \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault
```

---

## Group-Based Access Management

**Benefits**:

- Bulk user onboarding/offboarding
- Consistent permissions across teams
- Easier compliance auditing
- Reduced RBAC churn

**Pattern**:

```bash
# Create Azure AD group
az ad group create \
  --display-name "myapp-developers" \
  --mail-nickname "myapp-developers"

# Add users to group
az ad group member add \
  --group "myapp-developers" \
  --member-id $USER_OBJECT_ID

# Assign role to group (not individual users)
az role assignment create \
  --assignee $GROUP_OBJECT_ID \
  --role "Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/myapp-dev
```

**Standard Groups**:

- `{app}-developers` → Contributor on dev resource group
- `{app}-operators` → Reader on prod resource group
- `{app}-admins` → PIM-eligible for Owner on prod subscription

---

## Network Security

### Private Endpoints

**Eliminate public internet exposure**:

```bash
# Create private endpoint for Key Vault
az network private-endpoint create \
  --resource-group myResourceGroup \
  --name myKeyVault-privateEndpoint \
  --vnet-name myVNet \
  --subnet mySubnet \
  --private-connection-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault \
  --group-id vault \
  --connection-name myKeyVault-connection

# Disable public access
az keyvault update \
  --name myKeyVault \
  --public-network-access Disabled
```

**Benefits**:

- Traffic stays within Azure backbone
- No exposure to internet attacks
- Reduced data exfiltration risk
- Compliance requirement (PCI DSS, HIPAA)

### Network Security Groups

```bash
# Restrict inbound traffic
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name AllowHTTPSInbound \
  --priority 100 \
  --source-address-prefixes "VirtualNetwork" \
  --destination-port-ranges 443 \
  --access Allow \
  --protocol Tcp

# Deny all other inbound
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name DenyAllInbound \
  --priority 4096 \
  --access Deny \
  --protocol "*"
```

---

## Monitoring and Auditing

### Key Vault Audit Logs

**Enable diagnostic settings**:

```bash
az monitor diagnostic-settings create \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault \
  --name KeyVaultAuditLogs \
  --logs '[{"category": "AuditEvent", "enabled": true}]' \
  --workspace /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/myLogAnalytics
```

**Query audit logs**:

```kusto
// Key Vault access logs
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
| project TimeGenerated, CallerIPAddress, identity_claim_oid_g, requestUri_s
| order by TimeGenerated desc
```

### Azure AD Sign-In Logs

**Monitor authentication events**:

```kusto
SigninLogs
| where AppDisplayName == "Azure Key Vault"
| where ResultType != 0  // Failed sign-ins
| project TimeGenerated, UserPrincipalName, IPAddress, ResultType, ResultDescription
| order by TimeGenerated desc
```

### Security Alerts

**Azure Monitor alerts for suspicious activity**:

```bash
# Alert on failed Key Vault access (>5 failures in 5 minutes)
az monitor metrics alert create \
  --name KeyVaultAccessFailures \
  --resource-group myResourceGroup \
  --scopes /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault \
  --condition "count failedRequests > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action myActionGroup
```

**Alert types**:

- Failed authentication (>5 in 5 minutes)
- Suspicious IP addresses (geolocation)
- After-hours access (outside business hours)
- Bulk secret retrieval (>20 secrets in 1 minute)
- Secret deletion events

---

## Credential Rotation Requirements

### Industry Standards

| Framework   | Rotation Period | Scope                               |
| ----------- | --------------- | ----------------------------------- |
| **General** | 90 days         | All service principal secrets       |
| **PCI DSS** | 60 days         | Secrets accessing payment card data |
| **HIPAA**   | 60 days         | Secrets accessing PHI databases     |
| **SOC 2**   | 90 days         | All credentials (with automation)   |
| **FedRAMP** | 90 days         | Government cloud credentials        |

### Managed Identity Advantage

**No rotation needed** - Azure handles token refresh automatically:

- Token lifetime: 24 hours
- Automatic refresh: 12 hours before expiry
- No service disruption
- No rotation automation required

**This eliminates 90% of credential management overhead.**

---

## Compliance Checklists

### SOC 2 Requirements

- [ ] RBAC enforced for all Key Vaults
- [ ] PIM enabled for Owner/Contributor roles
- [ ] 90-day credential rotation automated
- [ ] Quarterly access reviews configured
- [ ] Audit logs sent to Log Analytics (90-day retention)
- [ ] Multi-factor authentication enforced
- [ ] Least privilege role assignments
- [ ] Network isolation (private endpoints or firewall rules)

### ISO 27001 Requirements

- [ ] Access control policies documented
- [ ] Incident response procedures defined
- [ ] Regular access reviews (quarterly)
- [ ] Cryptographic controls (Key Vault HSM for sensitive keys)
- [ ] Security monitoring configured
- [ ] Vulnerability scanning enabled

### HIPAA Requirements

- [ ] PHI access logging enabled
- [ ] Encryption at rest (Key Vault managed keys)
- [ ] 60-day credential rotation for PHI access
- [ ] Network isolation (private endpoints required)
- [ ] Access limited to minimum necessary (least privilege)
- [ ] Audit logs retained for 6 years

---

## Related Documentation

- [Authentication](authentication.md) - Managed identity and credential patterns
- [Key Vault](key-vault.md) - Key Vault integration and RBAC
- [Monitoring](monitoring.md) - Audit logging and alerts
- [IAM/RBAC](iam-rbac.md) - Detailed RBAC configuration
