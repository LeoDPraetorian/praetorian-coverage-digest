# Azure Network Security Patterns

Network isolation, private endpoints, NSGs, and network security best practices.

---

## Private Endpoints

**Eliminate public internet exposure** for Azure PaaS services.

### Key Vault Private Endpoint

```bash
# Create private endpoint
az network private-endpoint create \
  --resource-group myResourceGroup \
  --name myKeyVault-pe \
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

- Traffic stays on Azure backbone
- No internet exposure
- Compliance requirement (PCI DSS, HIPAA)

---

## Network Security Groups (NSGs)

```bash
# Create NSG
az network nsg create \
  --resource-group myResourceGroup \
  --name myNSG

# Allow HTTPS inbound from VNet only
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name AllowHTTPSFromVNet \
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

## Azure Firewall

Centralized network security for hub-and-spoke architectures.

**Use for**:

- Outbound internet filtering
- Threat intelligence-based filtering
- FQDN filtering for applications

---

## Related Documentation

- [Security Patterns](security-patterns.md) - Overall security best practices
