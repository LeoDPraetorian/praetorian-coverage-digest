---
name: integrating-with-oracle-cloud
description: Use when integrating with Oracle Cloud Infrastructure (OCI) - authentication, SDK setup, API patterns, resource management, best practices
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Integrating with Oracle Cloud

**Comprehensive guidance for integrating applications with Oracle Cloud Infrastructure (OCI) APIs, SDKs, and services.**

## Prerequisites

- OCI account with API access enabled
- OCI CLI installed (`brew install oci-cli` or equivalent)
- API signing key pair generated
- OCI config file configured (`~/.oci/config`)

## Configuration

### OCI Config File Structure

```ini
[DEFAULT]
user=ocid1.user.oc1..{unique-id}
fingerprint={key-fingerprint}
tenancy=ocid1.tenancy.oc1..{unique-id}
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
```

### Environment Variables

```bash
export OCI_CONFIG_FILE=~/.oci/config
export OCI_CONFIG_PROFILE=DEFAULT
```

## Quick Reference

| Operation          | Pattern                 | Notes                          |
| ------------------ | ----------------------- | ------------------------------ |
| Authentication     | API Key Signing         | Most common method             |
| Instance Auth      | Instance Principals     | For compute instances          |
| Resource Auth      | Resource Principals     | For functions/containers       |
| SDK Initialization | ConfigurationProvider   | Load from config file          |
| Error Handling     | ServiceError with codes | OCI-specific error types       |
| Pagination         | ListPager pattern       | Handle large result sets       |
| Rate Limiting      | Exponential backoff     | 429 Too Many Requests handling |

## When to Use

Use this skill when:

- Setting up OCI API authentication (API keys, instance principals, resource principals)
- Integrating applications with OCI services (compute, object storage, networking, databases)
- Implementing OCI SDK patterns in Go, Python, or TypeScript
- Managing OCI resources programmatically
- Following OCI best practices for security, cost optimization, and reliability

## Authentication Methods

### API Key Signing (Most Common)

Standard authentication using API key pair and config file.

**Go SDK:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

provider := common.DefaultConfigProvider()
// SDK clients automatically use this provider
```

**Python SDK:**

```python
from oci import config

config = config.from_file()
# Pass config to service clients
```

**TypeScript SDK:**

```typescript
import * as common from "oci-common";

const provider = new common.ConfigFileAuthenticationDetailsProvider();
```

### Instance Principals

For applications running on OCI compute instances.

**Go SDK:**

```go
import "github.com/oracle/oci-go-sdk/v65/common/auth"

provider, err := auth.InstancePrincipalConfigurationProvider()
```

**Python SDK:**

```python
from oci.auth.signers import InstancePrincipalsSecurityTokenSigner

signer = InstancePrincipalsSecurityTokenSigner()
```

### Resource Principals

For OCI Functions and container instances.

**Go SDK:**

```go
import "github.com/oracle/oci-go-sdk/v65/common/auth"

provider, err := auth.ResourcePrincipalConfigurationProvider()
```

See [references/authentication.md](references/authentication.md) for complete authentication patterns and troubleshooting.

## Common Service Patterns

### Object Storage

```go
import (
    "github.com/oracle/oci-go-sdk/v65/objectstorage"
    "github.com/oracle/oci-go-sdk/v65/common"
)

client, err := objectstorage.NewObjectStorageClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// Upload object
_, err = client.PutObject(ctx, objectstorage.PutObjectRequest{
    NamespaceName: common.String(namespace),
    BucketName:    common.String(bucket),
    ObjectName:    common.String(objectName),
    PutObjectBody: file,
})
```

### Compute

```go
import "github.com/oracle/oci-go-sdk/v65/core"

client, err := core.NewComputeClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// Launch instance
response, err := client.LaunchInstance(ctx, core.LaunchInstanceRequest{
    LaunchInstanceDetails: core.LaunchInstanceDetails{
        CompartmentId:      common.String(compartmentId),
        AvailabilityDomain: common.String(ad),
        Shape:              common.String("VM.Standard2.1"),
        DisplayName:        common.String("my-instance"),
        // ... additional configuration
    },
})
```

### Networking (VCN)

```go
import "github.com/oracle/oci-go-sdk/v65/core"

client, err := core.NewVirtualNetworkClientWithConfigurationProvider(provider)
if err != nil {
    return err
}

// Create VCN
vcn, err := client.CreateVcn(ctx, core.CreateVcnRequest{
    CreateVcnDetails: core.CreateVcnDetails{
        CidrBlock:     common.String("10.0.0.0/16"),
        CompartmentId: common.String(compartmentId),
        DisplayName:   common.String("my-vcn"),
    },
})
```

See [references/service-patterns.md](references/service-patterns.md) for comprehensive service integration examples.

## Error Handling

OCI SDKs use `ServiceError` for API errors:

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

if err != nil {
    if serviceErr, ok := err.(common.ServiceError); ok {
        switch serviceErr.GetHTTPStatusCode() {
        case 404:
            // Resource not found
        case 429:
            // Rate limit - implement backoff
        case 401:
            // Authentication failed
        default:
            log.Printf("OCI Error: Code=%s, Message=%s",
                serviceErr.GetCode(), serviceErr.GetMessage())
        }
    }
    return err
}
```

**Python:**

```python
from oci.exceptions import ServiceError

try:
    response = client.get_object(...)
except ServiceError as e:
    if e.status == 404:
        # Resource not found
    elif e.status == 429:
        # Rate limit
    else:
        print(f"OCI Error: {e.code} - {e.message}")
```

Common error codes:

| Code                    | Status | Meaning                       |
| ----------------------- | ------ | ----------------------------- |
| NotAuthenticated        | 401    | Authentication failed         |
| NotAuthorizedOrNotFound | 404    | Missing resource or no access |
| TooManyRequests         | 429    | Rate limit exceeded           |
| InternalServerError     | 500    | OCI service error             |

See [references/error-handling.md](references/error-handling.md) for complete error handling strategies.

## Pagination

OCI APIs return paginated results for list operations:

**Go SDK:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

// Manual pagination
request := core.ListInstancesRequest{
    CompartmentId: common.String(compartmentId),
    Limit:         common.Int(100),
}

for {
    response, err := client.ListInstances(ctx, request)
    if err != nil {
        return err
    }

    for _, instance := range response.Items {
        // Process instance
    }

    if response.OpcNextPage == nil {
        break
    }
    request.Page = response.OpcNextPage
}

// OR use ListPager helper (recommended)
pager := core.NewListInstancesPager(client, request)
for pager.HasNextPage() {
    page, err := pager.GetNextPage(ctx)
    if err != nil {
        return err
    }
    for _, instance := range page.Items {
        // Process instance
    }
}
```

See [references/pagination.md](references/pagination.md) for complete pagination patterns.

## Rate Limiting

OCI enforces rate limits per tenancy and service. Implement exponential backoff:

**Go:**

```go
import (
    "time"
    "math"
)

func retryWithBackoff(operation func() error, maxRetries int) error {
    for attempt := 0; attempt < maxRetries; attempt++ {
        err := operation()
        if err == nil {
            return nil
        }

        if serviceErr, ok := err.(common.ServiceError); ok {
            if serviceErr.GetHTTPStatusCode() == 429 {
                backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
                time.Sleep(backoff)
                continue
            }
        }
        return err
    }
    return fmt.Errorf("max retries exceeded")
}
```

See [references/rate-limiting.md](references/rate-limiting.md) for production-ready rate limit handling.

## Best Practices

### Security

- **Never commit API keys**: Use environment variables or secret management
- **Use least privilege**: Grant minimal IAM permissions required
- **Rotate keys regularly**: Follow security compliance requirements
- **Enable MFA**: For console access and sensitive operations
- **Use instance/resource principals**: Avoid embedding credentials in code

### Cost Optimization

- **Tag resources**: Enable cost tracking and allocation
- **Right-size compute**: Use appropriate shapes for workload
- **Leverage free tier**: 300 OCPUs, 200 GB storage always free
- **Delete unused resources**: Avoid charges for idle resources
- **Use reserved instances**: 20-50% cost savings for predictable workloads

### Reliability

- **Handle transient errors**: Implement retry with backoff
- **Use availability domains**: Distribute resources for high availability
- **Monitor API quotas**: Track usage to avoid rate limits
- **Implement circuit breakers**: Prevent cascade failures
- **Log API requests**: Enable audit trail for troubleshooting

See [references/best-practices.md](references/best-practices.md) for comprehensive guidance.

## SDK Installation

### Go

```bash
go get github.com/oracle/oci-go-sdk/v65
```

Import pattern:

```go
import (
    "github.com/oracle/oci-go-sdk/v65/common"
    "github.com/oracle/oci-go-sdk/v65/core"
    "github.com/oracle/oci-go-sdk/v65/objectstorage"
)
```

### Python

```bash
pip install oci
```

Import pattern:

```python
import oci
from oci.config import from_file
```

### TypeScript/Node.js

```bash
npm install oci-sdk
```

Import pattern:

```typescript
import * as core from "oci-core";
import * as objectstorage from "oci-objectstorage";
import * as common from "oci-common";
```

## Common Pitfalls

1. **Incorrect region configuration**: Ensure region matches resource location
2. **Missing IAM permissions**: Verify user/instance has required policies
3. **Invalid OCID format**: OCIDs must match pattern `ocid1.<resource-type>.oc1..<unique-id>`
4. **Config file not found**: Default location is `~/.oci/config`
5. **Key fingerprint mismatch**: Regenerate fingerprint if authentication fails
6. **Pagination omitted**: List operations may return partial results
7. **No retry logic**: Transient failures cause application errors

## Troubleshooting

### Authentication Issues

```bash
# Test OCI CLI authentication
oci iam region list

# Verify config file
cat ~/.oci/config

# Check key fingerprint
openssl rsa -in ~/.oci/oci_api_key.pem -pubout -outform DER | \
  openssl md5 -c | awk '{print $2}'
```

### API Errors

Enable debug logging:

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

common.EnableDebugLog()
```

**Python:**

```python
import logging

logging.basicConfig(level=logging.DEBUG)
```

See [references/troubleshooting.md](references/troubleshooting.md) for complete troubleshooting guide.

## Related Resources

### Official Documentation

- **OCI Documentation**: https://docs.oracle.com/en-us/iaas/Content/home.htm
- **OCI Go SDK**: https://github.com/oracle/oci-go-sdk
- **OCI Python SDK**: https://oracle-cloud-infrastructure-python-sdk.readthedocs.io/
- **OCI TypeScript SDK**: https://github.com/oracle/oci-typescript-sdk
- **API Reference**: https://docs.oracle.com/en-us/iaas/api/
- **OCI CLI**: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/

## References

- [references/authentication.md](references/authentication.md) - Complete authentication patterns
- [references/service-patterns.md](references/service-patterns.md) - Service integration examples
- [references/error-handling.md](references/error-handling.md) - Error handling strategies
- [references/pagination.md](references/pagination.md) - Pagination patterns
- [references/rate-limiting.md](references/rate-limiting.md) - Rate limit handling
- [references/best-practices.md](references/best-practices.md) - Security, cost, reliability
- [references/troubleshooting.md](references/troubleshooting.md) - Common issues and solutions
