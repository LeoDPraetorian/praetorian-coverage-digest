# Terraform Azure Provider Patterns

Terraform configuration patterns for Azure infrastructure deployment.

---

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Remote state in Azure Storage
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
  }
}
```

---

## Common Resource Patterns

### Resource Group

```hcl
resource "azurerm_resource_group" "main" {
  name     = "myapp-${var.environment}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    Application = "myapp"
    ManagedBy   = "Terraform"
  }
}
```

### User-Assigned Managed Identity with RBAC

```hcl
resource "azurerm_user_assigned_identity" "app" {
  name                = "myapp-${var.environment}-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_role_assignment" "keyvault_access" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

### Key Vault with RBAC

```hcl
resource "azurerm_key_vault" "main" {
  name                       = "myapp-${var.environment}-kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"  # or "premium" for HSM

  # RBAC (not access policies)
  enable_rbac_authorization  = true

  # Security features
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  # Network restrictions
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = ["203.0.113.0/24"]
  }
}
```

---

## Authentication

### Local Development

```bash
az login
terraform plan
```

### CI/CD Pipeline

**Use service principal or federated credentials**:

```bash
# Environment variables
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."  # or use certificate
export ARM_TENANT_ID="..."
export ARM_SUBSCRIPTION_ID="..."

terraform apply
```

---

## Related Documentation

- [Infrastructure as Code](infrastructure-as-code.md) - IaC overview
- [Authentication](authentication.md) - Terraform authentication patterns
- For complete Terraform examples, see research output: `.claude/.output/research/2026-01-04-211427-azure-integration/SYNTHESIS.md`
