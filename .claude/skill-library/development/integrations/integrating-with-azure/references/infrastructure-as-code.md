# Azure Infrastructure as Code

Overview of infrastructure as code tools for Azure: Terraform, Bicep, and ARM templates.

---

## Tool Comparison

| Tool              | Language  | Maintainer | State Management          | Best For                        |
| ----------------- | --------- | ---------- | ------------------------- | ------------------------------- |
| **Terraform**     | HCL       | HashiCorp  | Remote (Azure Storage)    | Multi-cloud, mature ecosystem   |
| **Bicep**         | Bicep DSL | Microsoft  | No state file (ARM-based) | Azure-only, modern syntax       |
| **ARM Templates** | JSON      | Microsoft  | No state file             | Legacy, complete Azure coverage |

---

## Quick Start

### Terraform

See [terraform.md](terraform.md) for complete patterns.

### Bicep

See [bicep.md](bicep.md) for complete patterns.

### ARM Templates

See [arm-templates.md](arm-templates.md) for complete patterns.

---

## Deployment Validation

### Pre-Deployment Validation

```bash
# Terraform
terraform plan
terraform validate

# Bicep
az bicep build --file main.bicep
az deployment group validate --template-file main.bicep

# ARM
az deployment group validate --template-file template.json --parameters parameters.json
```

---

## Related Documentation

- [Terraform](terraform.md) - Terraform Azure provider patterns
- [Bicep](bicep.md) - Bicep syntax and modules
- [ARM Templates](arm-templates.md) - ARM template patterns
- [Azure DevOps](azure-devops.md) - CI/CD pipeline integration
