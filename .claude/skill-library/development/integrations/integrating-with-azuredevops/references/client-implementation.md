# Azure DevOps Client Implementation

Complete implementation guides for Azure DevOps API integration.

---

## Language-Specific Implementations

| Language | Guide                                                    | Best For                               |
| -------- | -------------------------------------------------------- | -------------------------------------- |
| Go       | [Go Implementation](client-implementation-go.md)         | Backend services, Chariot integrations |
| Python   | [Python Implementation](client-implementation-python.md) | Scripts, automation, prototyping       |

## Cross-Language Patterns

[Common Patterns & Best Practices](client-implementation-common.md) - Shared patterns including:

- Connection reuse and pooling
- Context timeouts
- Batch operations
- Error handling strategies
- Rate limiting with exponential backoff

---

## Quick Start

### Go (Recommended for Chariot)

```go
import "github.com/microsoft/azure-devops-go-api/azuredevops"

connection := azuredevops.NewPatConnection(orgURL, pat)
gitClient, _ := git.NewClient(ctx, connection)
```

### Python

```python
from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication

credentials = BasicAuthentication('', pat)
connection = Connection(base_url=org_url, creds=credentials)
```

---

## Related Resources

- [API Reference](api-reference.md)
- [Authentication Guide](authentication.md)
- [Rate Limiting](rate-limiting.md)
- [Error Handling](error-handling.md)
