# Environment-Specific Azure Configuration

Configuration patterns for development, staging, and production environments.

---

## Development

**Authentication**: Azure CLI (`az login`), DefaultAzureCredential
**Resources**: Development subscription or resource group
**Network**: Public access enabled
**Costs**: Optimize for development speed (not cost)
**Monitoring**: Basic logging, no alerts

**Configuration**:

```python
# Development
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()  # Tries Azure CLI, VS Code, etc.
```

---

## Staging

**Authentication**: Managed identity (matches production)
**Resources**: Separate staging subscription or resource group
**Network**: Production-like (private endpoints optional)
**Costs**: Balance between production-like and cost
**Monitoring**: Full observability, test alerts

**Configuration**:

```python
# Staging (production-like)
from azure.identity import ManagedIdentityCredential

credential = ManagedIdentityCredential(
    client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
)
```

---

## Production

**Authentication**: Managed identity only (no DefaultAzureCredential)
**Resources**: Dedicated production subscription
**Network**: Private endpoints, firewall rules
**Costs**: Optimize with reserved instances, auto-scaling
**Monitoring**: Full observability, alerts, PagerDuty integration

**Configuration**:

```python
# Production
from azure.identity import ManagedIdentityCredential

credential = ManagedIdentityCredential(
    client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
)
```

---

## Configuration Management

### App Service Settings

```bash
# Development
az webapp config appsettings set \
  -g myapp-dev-rg \
  -n myapp-dev \
  --settings \
    ENVIRONMENT=development \
    LOG_LEVEL=DEBUG

# Production
az webapp config appsettings set \
  -g myapp-prod-rg \
  -n myapp-prod \
  --settings \
    ENVIRONMENT=production \
    LOG_LEVEL=INFO \
    MANAGED_IDENTITY_CLIENT_ID=abc-123
```

---

## Related Documentation

- [Authentication](authentication.md) - Environment-specific authentication patterns
- [Monitoring](monitoring.md) - Environment-specific observability
