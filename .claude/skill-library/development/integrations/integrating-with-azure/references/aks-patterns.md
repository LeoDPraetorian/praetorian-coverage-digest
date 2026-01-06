# Azure Kubernetes Service (AKS) Patterns

AKS deployment patterns with workload identity, CSI drivers, and security best practices.

---

## Workload Identity (Recommended)

**Replaces pod identity** - uses Kubernetes service accounts with federated credentials.

### Setup

```bash
# Enable workload identity on AKS cluster
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get OIDC issuer URL
OIDC_ISSUER=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

# Create user-assigned managed identity
az identity create \
  --resource-group myResourceGroup \
  --name myapp-identity

# Create federated credential
az identity federated-credential create \
  --identity-name myapp-identity \
  --resource-group myResourceGroup \
  --name aks-federated-credential \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:myNamespace:myServiceAccount"
```

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myServiceAccount
  namespace: myNamespace
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: myServiceAccount
      containers:
        - name: myapp
          image: myregistry.azurecr.io/myapp:latest
```

---

## Key Vault CSI Driver

**Access Key Vault secrets as Kubernetes volumes**:

```bash
# Install CSI driver
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --resource-group myResourceGroup \
  --name myAKSCluster
```

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault-secrets
spec:
  provider: azure
  parameters:
    keyvaultName: "myKeyVault"
    tenantId: "<tenant-id>"
    usePodIdentity: "false"
    useVMManagedIdentity: "false"
    clientID: "<managed-identity-client-id>"
    objects: |
      array:
        - |
          objectName: database-password
          objectType: secret
---
apiVersion: v1
kind: Pod
spec:
  volumes:
    - name: secrets-store
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "azure-keyvault-secrets"
  containers:
    - name: myapp
      volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets"
          readOnly: true
      env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-password
              key: database-password
```

---

## Related Documentation

- [Managed Identity](managed-identity.md) - AKS workload identity setup
- [Key Vault](key-vault.md) - Key Vault integration patterns
