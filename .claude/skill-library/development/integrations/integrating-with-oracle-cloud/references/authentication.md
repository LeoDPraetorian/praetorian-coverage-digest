# OCI Authentication Patterns

**Complete guide to Oracle Cloud Infrastructure authentication methods, SDK initialization, and security considerations.**

## Overview

OCI provides four authentication methods, each suited for different deployment contexts:

1. **API Key-Based** - Local configuration files (development)
2. **Session Tokens** - Temporary authentication (time-limited access)
3. **Instance Principals** - Certificate-based for compute instances (production VMs)
4. **Resource Principals** - Certificate-based for serverless resources (production functions)

## Authentication Method Details

### 1. API Key-Based Authentication

**Use Cases:**

- Local development environments
- Secure network access
- Persistent authenticated access
- CI/CD pipelines with protected credentials

**Configuration File Structure** (`~/.oci/config`):

```ini
[DEFAULT]
user=ocid1.user.oc1..{unique-id}
fingerprint={key-fingerprint}
tenancy=ocid1.tenancy.oc1..{unique-id}
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
```

**Setup Methods:**

| Method                  | Command               | Approach                                                  |
| ----------------------- | --------------------- | --------------------------------------------------------- |
| Bootstrap (Recommended) | `oci setup bootstrap` | Browser-based; auto-creates config and uploads public key |
| Interactive CLI         | `oci setup config`    | Command-line prompts; manual public key upload required   |

**SDK Initialization:**

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

provider := common.DefaultConfigProvider()
client, err := core.NewComputeClientWithConfigurationProvider(provider)
```

**Python:**

```python
from oci import config
from oci.core import ComputeClient

config = config.from_file()
client = ComputeClient(config)
```

**TypeScript:**

```typescript
import * as common from "oci-common";
import * as core from "oci-core";

const provider = new common.ConfigFileAuthenticationDetailsProvider();
const client = new core.ComputeClient({ authenticationDetailsProvider: provider });
```

**Security Requirements:**

- File permissions: `chmod 600 ~/.oci/config ~/.oci/oci_api_key.pem`
- Never commit keys to version control
- Use environment variables for key paths in CI/CD
- Rotate keys every 90 days minimum

---

### 2. Session Token-Based Authentication

**Use Cases:**

- Temporary access (default: 60-minute expiration)
- Quick authentication without persistent config
- Time-limited developer access
- Temporary elevated privileges

**Setup:**

```bash
oci session authenticate
```

Opens browser for sign-in, then creates session config file.

**Configuration File** (`~/.oci/config`):

```ini
[DEFAULT]
user=ocid1.user.oc1..{unique-id}
fingerprint={key-fingerprint}
tenancy=ocid1.tenancy.oc1..{unique-id}
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
security_token_file=~/.oci/token  # Added for session tokens
```

**SDK Initialization:**

Same as API key method—SDKs automatically detect and use session token if present.

**Limitations:**

- Expires after 60 minutes (default; configurable via IAM)
- Not supported in PowerShell or Ruby SDKs
- Requires token refresh for long-running processes
- Browser access required for initial authentication

**Token Refresh Pattern (Python):**

```python
from oci import config
from oci.exceptions import ServiceError

def refresh_token_if_expired(client_operation):
    try:
        return client_operation()
    except ServiceError as e:
        if e.status == 401:
            # Token expired - refresh
            subprocess.run(['oci', 'session', 'refresh'])
            return client_operation()
        raise
```

---

### 3. Instance Principal Authentication

**Use Cases:**

- Production compute instances
- Container instances
- VM-based applications
- Services running on OCI infrastructure

**Key Features:**

- **Zero credential storage**: No config files or API keys
- **Automatic certificate rotation**: Managed by OCI
- **Dynamic group membership**: Define policies based on instance attributes
- **Best for production**: Eliminates credential management burden

**Prerequisites:**

1. **Create Dynamic Group:**

```
# Match all instances in a compartment
matching-rule: instance.compartment.id = 'ocid1.compartment.oc1..xxxxx'

# Match instances with specific tag
matching-rule: tag.environment.value = 'production'

# Match instances in specific availability domain
matching-rule: instance.availability-domain = 'us-ashburn-1-AD-1'
```

2. **Create IAM Policy:**

```
Allow dynamic-group my-instance-group to manage object-storage in compartment my-compartment
Allow dynamic-group my-instance-group to use virtual-network-family in compartment my-compartment
Allow dynamic-group my-instance-group to read instance-family in compartment my-compartment
```

**Setup:**

From an authenticated machine (like Cloud Shell):

```bash
oci setup instance-principal
```

**SDK Initialization:**

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common/auth"

provider, err := auth.InstancePrincipalConfigurationProvider()
if err != nil {
    log.Fatalf("Failed to create instance principal provider: %v", err)
}

client, err := objectstorage.NewObjectStorageClientWithConfigurationProvider(provider)
```

**Python:**

```python
from oci.auth.signers import InstancePrincipalsSecurityTokenSigner

signer = InstancePrincipalsSecurityTokenSigner()
client = ObjectStorageClient(config={}, signer=signer)
```

**TypeScript:**

```typescript
import * as common from "oci-common";
import * as objectstorage from "oci-objectstorage";

const provider = new common.InstancePrincipalsAuthenticationDetailsProvider();
const client = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
```

**Troubleshooting:**

| Error                             | Cause                           | Solution                                         |
| --------------------------------- | ------------------------------- | ------------------------------------------------ |
| `NotAuthenticated`                | Instance not in dynamic group   | Verify dynamic group matching rules              |
| `NotAuthorizedOrNotFound`         | Missing IAM policy              | Add required permissions to dynamic group policy |
| `Instance metadata not available` | Running outside OCI             | Use API key auth for local development           |
| Certificate expired               | Rare certificate rotation issue | Restart application or instance                  |

---

### 4. Resource Principal Authentication

**Use Cases:**

- OCI Functions (serverless)
- Container-based applications
- Serverless workloads
- Non-instance compute resources

**Key Differences from Instance Principals:**

- Designed for **serverless** resources (not VMs)
- Does NOT require instance-level configuration
- Automatically available in OCI Functions runtime
- Supports both RPv1.1 and RPv2.2 protocols

**SDK Initialization:**

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common/auth"

provider, err := auth.ResourcePrincipalConfigurationProvider()
if err != nil {
    log.Fatalf("Failed to create resource principal provider: %v", err)
}

client, err := objectstorage.NewObjectStorageClientWithConfigurationProvider(provider)
```

**Python:**

```python
from oci.auth.signers import get_resource_principals_signer

signer = get_resource_principals_signer()
client = ObjectStorageClient(config={}, signer=signer)
```

**TypeScript:**

```typescript
import * as common from "oci-common";

const provider = new common.ResourcePrincipalAuthenticationDetailsProvider();
const client = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
```

**OCI Functions Example (Python):**

```python
import io
import json
from fdk import response
from oci.auth.signers import get_resource_principals_signer
from oci.object_storage import ObjectStorageClient

def handler(ctx, data: io.BytesIO = None):
    # Automatic resource principal auth
    signer = get_resource_principals_signer()

    # Use OCI SDK with resource principal
    client = ObjectStorageClient(config={}, signer=signer)
    namespace = client.get_namespace().data

    return response.Response(
        ctx,
        response_data=json.dumps({"namespace": namespace}),
        headers={"Content-Type": "application/json"}
    )
```

---

## Authentication Decision Tree

```
Question: Where will the application run?

├─ Local Development
│  └─ Use: API Key-Based Authentication
│     Why: Easy setup, persistent access
│
├─ OCI Compute Instance (VM)
│  └─ Use: Instance Principal Authentication
│     Why: No credential storage, automatic rotation
│
├─ OCI Functions (Serverless)
│  └─ Use: Resource Principal Authentication
│     Why: Built-in serverless support, zero config
│
└─ Temporary Access / Testing
   └─ Use: Session Token Authentication
      Why: Time-limited, no persistent config
```

## Security Best Practices

### 1. Production Deployments

**❌ AVOID in Production:**

- API keys stored in application code
- Config files committed to version control
- Shared API keys across teams
- Long-lived session tokens

**✅ PREFER in Production:**

- Instance principals for VMs
- Resource principals for Functions
- Dynamic groups with least-privilege policies
- Separate credentials per environment

### 2. Credential Storage

**API Keys:**

```bash
# Secure file permissions
chmod 600 ~/.oci/config
chmod 600 ~/.oci/oci_api_key.pem

# Never commit
echo ".oci/" >> .gitignore
```

**Environment Variables (CI/CD):**

```bash
export OCI_CONFIG_FILE=/secure/path/config
export OCI_CLI_KEY_FILE=/secure/path/key.pem
```

### 3. Credential Rotation

**API Keys:**

- Rotate every 90 days minimum
- Generate new key before deleting old key
- Test new key before removing old key
- Update all applications using old key

**Rotation Process:**

```bash
# Generate new key pair
openssl genrsa -out new_api_key.pem 2048
openssl rsa -pubout -in new_api_key.pem -out new_api_key_public.pem

# Upload new public key to OCI Console
# Test applications with new key
# Delete old key from OCI Console
```

### 4. Least Privilege Policies

**Dynamic Group Policy Examples:**

```
# Read-only access to object storage
Allow dynamic-group app-servers to read buckets in compartment data

# Specific service access
Allow dynamic-group app-servers to use object-storage-namespaces in tenancy

# Limited to specific resources
Allow dynamic-group app-servers to manage objects in compartment data where target.bucket.name='app-data'
```

### 5. Audit and Monitoring

**Enable Logging:**

```python
import logging
from oci import config

# Enable SDK debug logging
logging.basicConfig(level=logging.DEBUG)
```

**Monitor Authentication Events:**

- OCI Audit logs track authentication attempts
- Set up alerts for failed authentication
- Monitor dynamic group membership changes
- Track IAM policy modifications

## Common Pitfalls

| Pitfall                  | Symptom                         | Solution                                                         |
| ------------------------ | ------------------------------- | ---------------------------------------------------------------- |
| **Wrong config profile** | `ProfileNotFound` error         | Specify profile: `export OCI_CLI_PROFILE=production`             |
| **Expired token**        | `NotAuthenticated` after 60 min | Refresh token: `oci session refresh`                             |
| **Missing key file**     | `InvalidKeyFile` error          | Check `key_file` path in config                                  |
| **Fingerprint mismatch** | `InvalidKeyId` error            | Regenerate fingerprint, verify upload                            |
| **Region mismatch**      | `NotFound` errors               | Ensure config region matches resource region                     |
| **No principal policy**  | `NotAuthorizedOrNotFound`       | Add IAM policy for dynamic group                                 |
| **Wrong principal type** | Provider initialization fails   | Use instance principal for VMs, resource principal for Functions |

## References

- **Official Docs**: [SDK Authentication Methods](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm)
- **Instance Principals**: [Calling Services from Instances](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/callingservicesfrominstances.htm)
- **Resource Principals**: [Accessing OCI Resources with Functions](https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionsaccessingociresources.htm)
- **Session Tokens**: [CLI Token Documentation](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/clitoken.htm)
