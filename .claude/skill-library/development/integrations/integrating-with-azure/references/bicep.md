# Azure Bicep Patterns

Bicep is Azure's domain-specific language for infrastructure as code, offering cleaner syntax than ARM templates.

---

## Basic Syntax

```bicep
param location string = resourceGroup().location
param storageAccountName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

output storageAccountId string = storageAccount.id
```

---

## Deployment

```bash
# Build bicep to ARM (optional - validation)
az bicep build --file main.bicep

# Deploy to resource group
az deployment group create \
  --resource-group myResourceGroup \
  --template-file main.bicep \
  --parameters location=eastus storageAccountName=mystorageacct
```

---

## Common Patterns

### Key Vault with RBAC

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: 'mykeyvault'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true  // Use RBAC, not access policies
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
  }
}
```

### User-Assigned Managed Identity

```bicep
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'myapp-identity'
  location: location
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, managedIdentity.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')  // Key Vault Secrets User
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
```

---

## Related Documentation

- [Infrastructure as Code](infrastructure-as-code.md) - IaC tool comparison
- [Terraform](terraform.md) - Alternative IaC tool
