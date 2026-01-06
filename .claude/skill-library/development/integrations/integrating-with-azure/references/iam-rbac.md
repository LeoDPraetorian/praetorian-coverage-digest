# Azure IAM and RBAC Configuration

Detailed guide to Azure Role-Based Access Control (RBAC), least privilege, and access management.

**Research Source**: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`

---

## RBAC Fundamentals

**Components**:

- **Security Principal**: Who (user, group, service principal, managed identity)
- **Role Definition**: What permissions (Owner, Contributor, Reader, custom)
- **Scope**: Where (resource, resource group, subscription, management group)

**Assignment Formula**:

```
RBAC Assignment = Security Principal + Role + Scope
```

---

## Scope Hierarchy

**From narrowest (most restrictive) to broadest**:

1. **Resource** - Single resource (e.g., one Key Vault, one Storage Account)

   ```bash
   --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault
   ```

2. **Resource Group** - All resources in the resource group

   ```bash
   --scope /subscriptions/{sub}/resourceGroups/{rg}
   ```

3. **Subscription** - All resources in the subscription

   ```bash
   --scope /subscriptions/{sub}
   ```

4. **Management Group** - Multiple subscriptions
   ```bash
   --scope /providers/Microsoft.Management/managementGroups/{mg}
   ```

**Best Practice**: Assign at narrowest scope possible (resource > resource group > subscription).

---

## Built-in Roles

### Management Plane Roles

| Role                          | Permissions                       | Recommended Usage             |
| ----------------------------- | --------------------------------- | ----------------------------- |
| **Owner**                     | Full control + RBAC management    | Emergency only (via PIM)      |
| **Contributor**               | Create/manage resources (no RBAC) | DevOps automation, developers |
| **Reader**                    | Read-only                         | Auditors, monitoring          |
| **User Access Administrator** | Manage RBAC only                  | Security team (via PIM)       |

**⚠️ Critical Rule**: Maximum 3 subscription owners (Microsoft recommendation)

### Data Plane Roles (Service-Specific)

**Key Vault**:

- `Key Vault Administrator` - Full control (use PIM)
- `Key Vault Secrets Officer` - Create/read/update/delete secrets
- `Key Vault Secrets User` - Read secrets only (applications)
- `Key Vault Reader` - Read vault properties (not secret values)

**Storage**:

- `Storage Blob Data Owner` - Full blob access
- `Storage Blob Data Contributor` - Read/write blobs
- `Storage Blob Data Reader` - Read blobs only
- `Storage Queue Data Contributor` - Read/write queue messages

**Cosmos DB**:

- `Cosmos DB Account Reader Role` - Read account properties
- `DocumentDB Account Contributor` - Full Cosmos DB access
- Built-in data plane roles via SDK (not RBAC)

---

## Least Privilege Implementation

### Group-Based Assignments

**✅ CORRECT**:

```bash
# Create Azure AD group
az ad group create --display-name "myapp-developers" --mail-nickname "myapp-developers"

# Assign role to group
az role assignment create \
  --assignee $GROUP_OBJECT_ID \
  --role "Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/myapp-dev
```

**❌ WRONG**:

```bash
# Assigning roles to individual users (hard to manage)
az role assignment create \
  --assignee user1@example.com \
  --role "Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/myapp-dev

az role assignment create \
  --assignee user2@example.com \
  --role "Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/myapp-dev
# ... (repeat for 50 users)
```

### Standard Group Structure

```
{application}-developers → Contributor on dev resource group
{application}-operators → Reader on prod resource group
{application}-admins → PIM-eligible for Owner on prod subscription
security-team → User Access Administrator (PIM-eligible)
auditors → Reader on all subscriptions
```

---

## Privileged Identity Management (PIM)

**Just-in-time access for privileged roles (requires Azure AD Premium P2)**

### Configuration

```bash
# Create PIM-eligible assignment (not active by default)
az role assignment create \
  --assignee $USER_PRINCIPAL_ID \
  --role "Owner" \
  --scope /subscriptions/{sub} \
  --description "Emergency access for production incidents"
```

### Activation Settings

**Configure via Azure Portal > PIM**:

- **Max duration**: 8 hours (default: 8 hours, range: 1-24 hours)
- **Require MFA**: Yes (enforced at activation time)
- **Require approval**: Yes for Owner, optional for Contributor
- **Require justification**: Yes (ticket number, incident ID)
- **Notification**: Email to approvers and resource owners

### Activation Workflow

```
User → Request Activation → Provide Justification + MFA → Approval (if required) → Active for N hours → Auto-expiration
```

**Benefits**:

- No standing privileges (reduces attack surface)
- MFA at activation (prevents credential theft)
- Approval workflow (oversight for sensitive roles)
- Time-limited (automatic expiration)
- Complete audit trail

---

## Custom Roles

**When built-in roles are too broad, create custom roles**

### Example: Secret Rotator Role

```json
{
  "Name": "Key Vault Secret Rotator",
  "Description": "Can create/update secrets but cannot read secret values",
  "Actions": ["Microsoft.KeyVault/vaults/secrets/write"],
  "NotActions": [],
  "DataActions": ["Microsoft.KeyVault/vaults/secrets/setSecret/action"],
  "NotDataActions": ["Microsoft.KeyVault/vaults/secrets/getSecret/action"],
  "AssignableScopes": ["/subscriptions/{subscription-id}"]
}
```

**Create and assign**:

```bash
az role definition create --role-definition @secret-rotator-role.json

az role assignment create \
  --assignee $ROTATION_SERVICE_PRINCIPAL_ID \
  --role "Key Vault Secret Rotator" \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault
```

---

## Access Reviews

### Quarterly Access Review (Compliance Requirement)

**Setup via Azure Portal > Azure AD > Access Reviews**:

1. **Review scope**: Subscription or resource group
2. **Reviewers**: Resource owners, managers, or self-review
3. **Frequency**: Quarterly (every 90 days)
4. **Actions**: Approve, deny, or remove access
5. **Automation**: Auto-remove access if not reviewed

**Programmatic access review**:

```bash
# List all role assignments for review
az role assignment list \
  --scope /subscriptions/{sub} \
  --include-inherited \
  --query "[].{principal:principalName, role:roleDefinitionName, scope:scope}"
```

---

## Monitoring and Auditing

### Azure Activity Log

**Track RBAC changes**:

```kusto
AzureActivity
| where OperationNameValue == "Microsoft.Authorization/roleAssignments/write"
| project TimeGenerated, Caller, ResourceGroup, ActivityStatus, Properties
| order by TimeGenerated desc
```

### Azure AD Audit Logs

**Track privileged access**:

```kusto
AuditLogs
| where Category == "RoleManagement"
| where OperationName in ("Add member to role", "Add eligible member to role")
| project TimeGenerated, InitiatedBy, TargetResources
```

---

## Compliance Checklists

### SOC 2

- [ ] Maximum 3 subscription owners
- [ ] PIM enabled for Owner/Contributor roles
- [ ] Group-based role assignments
- [ ] Quarterly access reviews configured
- [ ] Least privilege enforced (resource-level scopes)
- [ ] MFA required for all privileged access
- [ ] Complete audit trail (90-day retention)

### ISO 27001

- [ ] Access control policies documented
- [ ] Role definitions justified (why each permission needed)
- [ ] Regular access reviews (quarterly minimum)
- [ ] Segregation of duties (no single person has Owner + User Access Administrator)
- [ ] Incident response procedures (revocation process)

---

## Related Documentation

- [Security Patterns](security-patterns.md) - Overall security best practices
- [Authentication](authentication.md) - Credential and identity patterns
- [Key Vault](key-vault.md) - Key Vault RBAC configuration
