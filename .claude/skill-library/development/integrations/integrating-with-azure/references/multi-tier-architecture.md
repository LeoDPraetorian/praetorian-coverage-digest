# Multi-Tier Application Architecture on Azure

Reference architecture for multi-tier applications on Azure.

---

## Reference Architecture

```
Azure Front Door (CDN + WAF)
    ↓
App Service (Web Tier)
    ↓
Azure Functions (API/Business Logic Tier)
    ↓
Cosmos DB / SQL Database (Data Tier)
    ↓
Azure Key Vault (Secrets Management)
    ↓
Application Insights (Monitoring)
```

---

## Components

### Frontend Tier

- **Azure Front Door**: Global CDN, WAF, SSL termination
- **Static Web Apps** or **App Service**: Host React/Angular/Vue apps

### Application Tier

- **App Service**: Web tier (Python, Node.js, .NET)
- **Azure Functions**: Serverless API endpoints

### Data Tier

- **Cosmos DB**: NoSQL (multi-region, low latency)
- **Azure SQL Database**: Relational data
- **Azure Storage**: Blob/file storage

### Cross-Cutting

- **Key Vault**: Secrets, certificates, keys
- **Application Insights**: Monitoring, distributed tracing
- **Managed Identity**: Authentication across all tiers

---

## Authentication Flow

```
Frontend → Front Door (TLS termination)
    ↓ (HTTPS)
App Service (Managed Identity)
    ↓ (HTTPS with W3C Trace-Context)
Azure Function (Managed Identity)
    ↓ (TLS with managed identity token)
Cosmos DB / Key Vault
```

**No credentials in code** - all authentication via managed identities.

---

## Related Documentation

- [Authentication](authentication.md) - Managed identity configuration
- [SDK Patterns](sdk-patterns.md) - Service client integration
